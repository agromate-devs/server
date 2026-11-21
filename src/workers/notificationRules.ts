import type {PushNotification} from '../app/firebase';

export type AlertType = 'water_reserve' | 'temperature_low' | 'temperature_high';
export type ActionEventType = 'irrigation' | 'humidification';
export type NotificationType = AlertType | ActionEventType;

export const MESSAGE_TYPE_METRIC = 'metric';
export const ACTION_EVENT_TYPES: readonly ActionEventType[] = ['irrigation', 'humidification'];

/**
 * Every message on agrosmart/metrics carries a `type`: `metric` for sensor readings,
 * `irrigation`/`humidification` when the device has watered/humidified the plant.
 * Messages without `type` come from older firmware and are treated as metrics.
 */
export interface Metric {
    id: string;
    type?: typeof MESSAGE_TYPE_METRIC;
    temperature?: number;
    humidity?: number;
    soil_moisture?: number;
    water_reserve?: boolean;
}

export interface ActionEvent {
    id: string;
    type: ActionEventType;
    success?: boolean;
}

export interface Alert {
    type: NotificationType;
    notification: PushNotification;
}

export function isActionEventType(type: unknown): type is ActionEventType {
    return ACTION_EVENT_TYPES.includes(type as ActionEventType);
}

/**
 * Returns the notification for an irrigation/humidification event, or null if the action did not succeed.
 */
export function evaluateActionEvent(event: ActionEvent, deviceName: string): Alert | null {
    if (event.success === false) {
        return null;
    }
    const data = {macAddress: event.id, type: event.type};
    if (event.type === 'irrigation') {
        return {
            type: 'irrigation',
            notification: {
                title: `${deviceName}: plant watered`,
                body: 'Your plant has just been watered.',
                data,
            },
        };
    }
    return {
        type: 'humidification',
        notification: {
            title: `${deviceName}: plant humidified`,
            body: 'Your plant has just been humidified.',
            data,
        },
    };
}

/**
 * Returns the alerts triggered by the metric, given the plant configuration of the agrosmart.
 */
export function evaluateAlerts(metric: Metric, plantConfig: PlantConfig, deviceName: string): Alert[] {
    const alerts: Alert[] = [];
    const data = {macAddress: metric.id};

    if (metric.water_reserve === true) {
        alerts.push({
            type: 'water_reserve',
            notification: {
                title: `${deviceName}: water reserve`,
                body: 'The water tank is almost empty, refill it to keep irrigating your plant.',
                data: {...data, type: 'water_reserve'},
            },
        });
    }

    const temp = metric.temperature;
    if (temp !== undefined && plantConfig.temperatureMin != null && temp < plantConfig.temperatureMin) {
        alerts.push({
            type: 'temperature_low',
            notification: {
                title: `${deviceName}: temperature too low`,
                body: `The temperature is ${temp}°C, below the minimum of ${plantConfig.temperatureMin}°C.`,
                data: {...data, type: 'temperature_low', value: String(temp)},
            },
        });
    }
    if (temp !== undefined && plantConfig.temperatureMax != null && temp > plantConfig.temperatureMax) {
        alerts.push({
            type: 'temperature_high',
            notification: {
                title: `${deviceName}: temperature too high`,
                body: `The temperature is ${temp}°C, above the maximum of ${plantConfig.temperatureMax}°C.`,
                data: {...data, type: 'temperature_high', value: String(temp)},
            },
        });
    }

    return alerts;
}

/**
 * Remembers when each alert was last sent so that the same alert of the same device
 * is sent at most once per cooldown. State is in memory and is lost on restart.
 */
export class AlertCooldown {
    private lastSent = new Map<string, number>();

    constructor(private cooldownMs: number) {
    }

    public shouldSend(macAddress: string, type: NotificationType, now = Date.now()): boolean {
        const last = this.lastSent.get(`${macAddress}:${type}`);
        return last === undefined || now - last >= this.cooldownMs;
    }

    public markSent(macAddress: string, type: NotificationType, now = Date.now()) {
        this.lastSent.set(`${macAddress}:${type}`, now);
    }
}
