import { FastifyInstance } from "fastify";
import MqttService from "../../app/mqtt";

interface AgrosmartControlBody { // Private interface of this endpoint, not exported to app.d.ts
    macAddress: string;
    hydrate: number | null;
    humidify: number | null;
}

const mqttClient = MqttService.getClient();

export function agrosmartControl(fastify: FastifyInstance) {
    fastify.patch<{ Body: AgrosmartControlBody }>(
        '/agrosmart_control',
        {
            schema: {
                tags: ['Agrosmart'],
                summary: 'Control Agrosmart',
                description: 'Control Agrosmart irrigation and humidification. Default values to false',
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
                        hydrate: {
                            type: ['number', 'null'],
                            description: "Duration in minutes of hydration. Set to null or 0 make Agrosmart ignore this field"
                        },
                        humidify: {
                            type: ['number', 'null'],
                            description: "Duration in minutes of humidification. Set to null or 0 make Agrosmart ignore this field",
                        },
                    },
                    required: [
                        'macAddress'
                    ],
                },
                response: {
                    200: {
                        description: 'Agrosmart controlled successfully',
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' },
                        },
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
            try {
                let {
                    macAddress,
                    hydrate,
                    humidify,
                } = request.body;

                if (humidify == null) {
                    humidify = 0;
                }

                if (hydrate == null) {
                    hydrate = 0;
                }

                // Avoid to send a useless MQTT message if both are false
                if (!humidify && !hydrate) {
                    return reply.send({ success: true, message: 'Agrosmart controlled successfully' });
                }

                mqttClient.publish(
                    `agrosmart/${macAddress}/settings`,
                    JSON.stringify({
                        type: "control",
                        hydrate,
                        humidify,
                    }),
                    { retain: false }
                );

            } catch (error) {
                console.log(error);
                return reply.status(500).send({
                    success: false,
                    message: 'Error during Agrosmart control. Check log for further information',
                });
            }

            return reply.send({ success: true, message: 'Agrosmart controlled successfully!' });
        },
    );
}