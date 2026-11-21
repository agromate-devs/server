import 'dotenv/config';
import {parentPort} from 'node:worker_threads';
import {randomBytes} from 'node:crypto';
import mqtt from 'mqtt';
import {createPrismaClient} from '../app/utils';
import FirebaseService, {sendPushNotification} from '../app/firebase';
import {
    ActionEvent,
    Alert,
    AlertCooldown,
    evaluateActionEvent,
    evaluateAlerts,
    isActionEventType,
    Metric,
    MESSAGE_TYPE_METRIC,
} from './notificationRules';

/**
 * Worker thread that listens on agrosmart/metrics and sends push notifications through Firebase Cloud Messaging.
 * The topic carries both sensor metrics (`type: "metric"`, checked against the alert rules) and
 * action events (`type: "irrigation" | "humidification"`, each one notified to the owner).
 * It opens its own MQTT connection (same api_server user, different clientId) so it does not
 * interfere with the main MqttService client. Logs are forwarded to the main thread.
 */

const METRICS_TOPIC = 'agrosmart/metrics';
const AGROSMART_CACHE_TTL_MS = Number(process.env.AGROSMART_CACHE_TTL_MS) || 900000;
const COOLDOWN_MS = (Number(process.env.NOTIFICATION_COOLDOWN_MINUTES) || 360) * 60 * 1000;

type WorkerLogLevel = 'debug' | 'info' | 'warn' | 'error';

function log(level: WorkerLogLevel, msg: string) {
    parentPort?.postMessage({type: 'log', level, msg});
}

const url = process.env.MQTT_URL;
const password = process.env.MQTT_PASSWORD;

if (!url || !password) {
    throw new Error('MQTT_URL and MQTT_PASSWORD must be defined in environment variables');
}

const prisma = createPrismaClient();
const messaging = FirebaseService.getMessaging();
const cooldown = new AlertCooldown(COOLDOWN_MS);

if (!messaging) {
    log('warn', 'Notifications will only be logged (dry run)');
}

interface CachedAgrosmart {
    expire: number;
    agrosmart: { username: string, name: string, plantConfig: PlantConfig } | null;
}

// Metrics arrive often, so the owner and the plant config of each agrosmart are cached for a short time
const agrosmartCache = new Map<string, CachedAgrosmart>();

async function getAgrosmart(macAddress: string) {
    const cached = agrosmartCache.get(macAddress);
    if (cached && cached.expire > Date.now()) {
        return cached.agrosmart;
    }
    const row = await prisma.agrosmart.findUnique({
        where: {macAddress},
        select: {username: true, alias: true, plantConfig: true},
    });
    const agrosmart = row == null ? null : {
        username: row.username,
        name: row.alias || macAddress,
        plantConfig: row.plantConfig as PlantConfig,
    };
    agrosmartCache.set(macAddress, {expire: Date.now() + AGROSMART_CACHE_TTL_MS, agrosmart});
    return agrosmart;
}

async function notify(username: string, macAddress: string, alert: Alert) {
    const fids = (await prisma.fcmInstallation.findMany({where: {username}, select: {fid: true}}))
        .map((i) => i.fid);

    if (fids.length === 0) {
        log('debug', `Alert ${alert.type} for ${macAddress} not sent: user ${username} has no FID`);
        return;
    }

    if (!messaging) {
        log('info', `[dry run] Alert ${alert.type} for ${macAddress} to ${username} (${fids.length} FIDs): ${alert.notification.body}`);
        return;
    }

    log('info', "sending push");
    const result = await sendPushNotification(messaging, fids, alert.notification);
    log('info', `Alert ${alert.type} for ${macAddress} sent to ${username}: ${result.successCount}/${fids.length} delivered`);

    if (result.errors.length > 0) {
        log('warn', `FCM errors for ${username}: ${result.errors.join(', ')}`);
    }
    if (result.invalidFids.length > 0) {
        await prisma.fcmInstallation.deleteMany({where: {fid: {in: result.invalidFids}}});
        log('info', `Removed ${result.invalidFids.length} invalid FIDs of ${username}`);
    }
}

async function handleMetrics(metrics: Metric) {
    log('debug', `Metrics from ${metrics.id}: ${JSON.stringify(metrics)}`);

    const agrosmart = await getAgrosmart(metrics.id);
    if (!agrosmart) {
        log('debug', `Metrics from unknown agrosmart ${metrics.id}, ignored`);
        return;
    }

    const alerts = evaluateAlerts(metrics, agrosmart.plantConfig, agrosmart.name)
        .filter((alert) => cooldown.shouldSend(metrics.id, alert.type));

    // Marked before sending so that metrics arriving while FCM is answering do not trigger a duplicate
    alerts.forEach((alert) => cooldown.markSent(metrics.id, alert.type));

    for (const alert of alerts) {
        await notify(agrosmart.username, metrics.id, alert);
    }
}

/**
 * Irrigation/humidification events are sent once per action, so they are not subject to the alert cooldown.
 */
async function handleActionEvent(event: ActionEvent) {
    log('debug', `Event ${event.type} from ${event.id}: ${JSON.stringify(event)}`);

    const agrosmart = await getAgrosmart(event.id);
    if (!agrosmart) {
        log('debug', `Event from unknown agrosmart ${event.id}, ignored`);
        return;
    }

    const alert = evaluateActionEvent(event, agrosmart.name);
    if (!alert) {
        log('debug', `Event ${event.type} from ${event.id} not successful, no notification`);
        return;
    }
    await notify(agrosmart.username, event.id, alert);
}

function roundMetric(metric: Metric) {
    if (typeof metric.temperature === 'number')
        metric.temperature = Number(metric.temperature.toFixed(2));
    if (typeof metric.humidity === 'number')
        metric.humidity = Number(metric.humidity.toFixed(2));
    return metric;
}

const client = mqtt.connect(url, {
    username: 'api_server',
    password: password,
    clientId: 'api_server_notifier_' + randomBytes(4).toString('hex'),
    reconnectPeriod: 5000
});

client.on('connect', () => {
    log('info', `Connected to MQTT Broker, subscribing to ${METRICS_TOPIC}`);
    client.subscribe(METRICS_TOPIC, {qos: 0}, (err, granted) => {
        if (err) {
            log('error', `Subscribe to ${METRICS_TOPIC} failed: ${err}`);
            return;
        }
        // With MQTT 5 / dynsec a denied subscription is returned with a failure reason code (>= 0x80)
        const denied = granted?.filter((g) => g.qos >= 0x80) ?? [];
        if (denied.length > 0) {
            log('error', `Subscribe to ${METRICS_TOPIC} denied by broker (code ${denied[0].qos}), check the api_server ACLs`);
            return;
        }
        log('info', `Subscribed to ${METRICS_TOPIC}`);
    });
});

client.on('reconnect', () => log('warn', 'Reconnecting to MQTT Broker'));
client.on('close', () => log('warn', 'MQTT connection closed'));
client.on('error', (err) => log('error', `MQTT Connection Error: ${err}`));

client.on('message', (topic, payload) => {
    let message: { id?: unknown, type?: unknown };
    try {
        message = JSON.parse(payload.toString());
    } catch {
        log('warn', `Invalid JSON on ${topic}: ${payload.toString()}`);
        return;
    }

    if (typeof message !== 'object' || message === null || typeof message.id !== 'string' || message.id === '') {
        log('warn', `Message without id on ${topic}: ${payload.toString()}`);
        return;
    }

    let handling: Promise<void>;
    if (message.type === undefined || message.type === MESSAGE_TYPE_METRIC) {
        handling = handleMetrics(roundMetric(message as Metric));
    } else if (isActionEventType(message.type)) {
        handling = handleActionEvent(message as ActionEvent);
    } else {
        log('warn', `Unknown message type ${String(message.type)} from ${message.id}, ignored`);
        return;
    }
    handling.catch((err) => log('error', `Error while handling ${String(message.type ?? MESSAGE_TYPE_METRIC)} from ${message.id}: ${err}`));
});

parentPort?.on('message', (message) => {
    if (message?.type === 'stop') {
        client.end(false, () => {
            prisma.$disconnect().finally(() => process.exit(0));
        });
    }
});
