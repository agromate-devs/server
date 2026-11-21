import {FastifyBaseLogger, FastifyInstance} from "fastify";
import MqttService from "../../app/mqtt";

// Subset of commands that can be triggered from this route
const CONTROL_ACTIONS = ["update", "info", "reboot"];
type ControlAction = typeof CONTROL_ACTIONS[number];

const INFO_TIMEOUT_MS = 15000;

interface AgrosmartControlPostBody {
    macAddress: string;
    action: string;
}

interface ControlResponse {
    success: boolean;
    message: string;
}

const mqttClient = MqttService.getClient();

const isControlAction = (action: string): boolean => CONTROL_ACTIONS.includes(action);

async function publishCommand(macAddress: string, command: ControlAction): Promise<void> {
    try {
        await mqttClient.publishAsync(
            `agrosmart/${macAddress}/settings`,
            JSON.stringify({ type: command }),
            { retain: false, qos: 1 }
        );
    } catch (err: any) {
        throw new Error(`Failed to publish to settings topic: ${err.message}`);
    }
}

function waitForMessage(topic: string, timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const onMessage = (receivedTopic: string, message: Buffer) => {
            if (receivedTopic !== topic) return;
            cleanup();
            resolve(message.toString());
        };
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error("Timeout waiting for Agrosmart info response"));
        }, timeoutMs);
        const cleanup = () => {
            clearTimeout(timeout);
            mqttClient.removeListener('message', onMessage);
        };

        mqttClient.on('message', onMessage);
    });
}

async function handleInfoAction(logger: FastifyBaseLogger, macAddress: string): Promise<ControlResponse> {
    const infoTopic = `agrosmart/${macAddress}/info`;

    try {
        await mqttClient.subscribeAsync(infoTopic, { qos: 1 });
    } catch (err: any) {
        throw new Error(`Failed to subscribe to info topic: ${err.message}`);
    }

    try {
        const [info] = await Promise.all([
            waitForMessage(infoTopic, INFO_TIMEOUT_MS),
            publishCommand(macAddress, "info"),
        ]);
        return { success: true, message: info };
    } finally {
        await mqttClient.unsubscribeAsync(infoTopic).catch(() => {
            logger.error(`Can't unsubscribe infoTopic: ${infoTopic}`);
        });
    }
}

async function handleCommandAction(macAddress: string, action: ControlAction): Promise<ControlResponse> {
    await publishCommand(macAddress, action);
    return { success: true, message: `Agrosmart ${action} action sent successfully` };
}

export function agrosmartControlPost(fastify: FastifyInstance) {
    fastify.post<{ Body: AgrosmartControlPostBody }>(
        '/agrosmart_control',
        {
            schema: {
                tags: ['Agrosmart'],
                summary: 'Control agrosmart',
                description: 'Send an action (update, info or reboot) to an Agrosmart',
                headers: {
                    type: 'object',
                    properties: {
                        authorization: { type: 'string' }
                    },
                    required: ['authorization']
                },
                body: {
                    type: 'object',
                    properties: {
                        macAddress: { type: 'string' },
                        action: {
                            type: 'string',
                            enum: CONTROL_ACTIONS,
                            description: "Action to perform on the Agrosmart"
                        },
                    },
                    required: ['macAddress', 'action'],
                },
                response: {
                    200: {
                        description: 'Action executed successfully',
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' },
                            data: {
                                type: 'object',
                                description: 'Response data from Agrosmart (only for info action)',
                                additionalProperties: true,
                            },
                        },
                    },
                    400: {
                        description: 'Invalid action',
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' },
                        }
                    },
                    401: {
                        description: 'Unauthorized request',
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' },
                        }
                    },
                    500: {
                        description: 'Error during agrosmart communication',
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' },
                        },
                    },
                },
            },
        },
        async function handler(request, reply) {
            const { macAddress, action } = request.body;

            if (!isControlAction(action)) {
                return reply.status(400).send({
                    success: false,
                    message: `Invalid action '${action}'. Valid actions are: ${CONTROL_ACTIONS.join(", ")}`,
                });
            }

            try {
                const response = action === "info"
                    ? await handleInfoAction(fastify.log, macAddress)
                    : await handleCommandAction(macAddress, action);
                return reply.send(response);
            } catch (error: any) {
                fastify.log.error(error);
                const errorMessage = error?.message || 'Error during Agrosmart action. Check log for further information';
                return reply.status(500).send({
                    success: false,
                    message: errorMessage,
                });
            }
        },
    );
}
