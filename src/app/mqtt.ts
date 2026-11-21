import mqtt, {MqttClient} from 'mqtt';

class MqttService {
    private static instance: MqttClient | null = null;
    private static logger: any = console;

    public static setLogger(logger: any) {
        this.logger = logger;
    }

    public static getClient(): MqttClient {
        if (!MqttService.instance) {
            const url = process.env.MQTT_URL;
            const password = process.env.MQTT_PASSWORD;

            if (!url) {
                throw new Error('MQTT_URL is not defined in environment variables');
            }
            if (!password) {
                throw new Error('MQTT_PASSWORD is not defined in environment variables');
            }

            MqttService.instance = mqtt.connect(url, {
                username: 'api_server',
                password: password
            });

            MqttService.instance.on('connect', () => {
                if (this.logger != null) {
                    this.logger.info('Connected to MQTT Broker');
                }
            });

            MqttService.instance.on('error', (err) => {
                if (this.logger != null) {
                    this.logger.error(`MQTT Connection Error: ${err}`);
                }
                throw new Error("MQTT Error: " + err);
            });
        }
        return MqttService.instance;
    }
}

export default MqttService;

export async function deleteAgrosmartFromMQTT(id: string, mqttClient: MqttClient) {
    const mqttUsername = "agrosmart_" + id;
    const mqttACL = {
        "commands": [
            {
                "command": "deleteClient",
                "username": mqttUsername,
                "roles": [
                    {"rolename": "agrosmart", "priority": 1}
                ]
            }
        ]
    }
    mqttClient.publish('$CONTROL/dynamic-security/v1', JSON.stringify(mqttACL));
}

/**
 * Creates the MQTT client of a webcam and a role, dedicated to the webcam, that grants access only to its signaling topics.
 * The role is also assigned to the owner so that only the owner can view the webcam.
 */
export async function createWebcamOnMQTT(id: string, password: string, owner: string, mqttClient: MqttClient) {
    const rolename = "webcam_" + id;
    const topic = `webrtc/${id}/#`;
    const mqttACL = {
        "commands": [
            {
                "command": "createRole",
                "rolename": rolename,
                "acls": [
                    {
                        "acltype": "publishClientSend",
                        "topic": topic,
                        "priority": -1,
                        "allow": true
                    },
                    {
                        "acltype": "publishClientReceive",
                        "topic": topic,
                        "priority": -1,
                        "allow": true
                    },
                    {
                        "acltype": "subscribePattern",
                        "topic": topic,
                        "priority": -1,
                        "allow": true
                    },
                    {
                        "acltype": "unsubscribePattern",
                        "topic": topic,
                        "priority": -1,
                        "allow": true
                    }
                ]
            },
            {
                "command": "createClient",
                "username": id,
                "password": password,
                "roles": [
                    {"rolename": rolename, "priority": 1}
                ]
            },
            {
                "command": "addClientRole",
                "username": owner,
                "rolename": rolename,
                "priority": 1
            }
        ]
    }
    mqttClient.publish('$CONTROL/dynamic-security/v1', JSON.stringify(mqttACL));
}

/**
 * Deletes the MQTT client of a webcam and its role. Deleting the role also removes it from the owner.
 */
export async function deleteWebcamFromMQTT(id: string, mqttClient: MqttClient) {
    const mqttACL = {
        "commands": [
            {
                "command": "deleteClient",
                "username": id
            },
            {
                "command": "deleteRole",
                "rolename": "webcam_" + id
            }
        ]
    }
    mqttClient.publish('$CONTROL/dynamic-security/v1', JSON.stringify(mqttACL));
}
