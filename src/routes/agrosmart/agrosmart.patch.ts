import { FastifyInstance } from "fastify";
import { PrismaClient } from "../../../generated/prisma/client";
import { preparePlantConfiguration } from "../../app/utils";
import MqttService from "../../app/mqtt";

const mqttClient = MqttService.getClient();

export function modifyAgrosmart(fastify: FastifyInstance, prisma: PrismaClient) {
    fastify.patch<{ Body: AgrosmartBody }>(
        '/agrosmart',
        {
            schema: {
                tags: ['Agrosmart'],
                summary: 'Modify a specific Agrosmart',
                description: 'Modify a specific Agrosmart to a update plant config or set an alias',
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
                        alias: {
                            type: 'string',
                            nullable: true,
                            description: 'If alias is specified, configuration attributes will be ignored.'
                        },
                        soilMoisture: { type: ['number', 'null'] },
                        targetHumidity: { type: ['number', 'null'] },
                        lightIntensity: { type: ['number', 'null'] },
                        temperatureMin: { type: ['number', 'null'] },
                        temperatureMax: { type: ['number', 'null'] },
                        lightDuration: { type: 'string' },
                        lightColor: { type: 'string', nullable: true },
                        isTimeBasedIrrigationEnabled: { type: 'boolean' },
                        wateringFrequency: { type: ['number', 'null'] },
                        waterQuantity: { type: 'number' },
                        isTimeBasedHumidificationEnabled: { type: 'boolean' },
                        humidificationFrequency: { type: ['number', 'null'] },
                        humidificationDuration: { type: ['number', 'null'] },
                    },
                    required: [
                        'macAddress',
                    ],
                },
                response: {
                    200: {
                        description: 'Agrosmart modified successfully',
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
                        description: 'Error during agrosmart modification',
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
                const username = request.user;

                const logger = request.server.log;
                const {
                    macAddress,
                    alias
                } = request.body;

                let agrosmart;
                if (alias != null) {
                    agrosmart = await prisma.agrosmart.update({
                        where: {
                            macAddress
                        },
                        data: {
                            alias
                        }
                    });
                } else {
                    const payload = await preparePlantConfiguration(request.body, logger, reply);
                    if (payload == null) {
                        return;
                    }

                    payload.type = "config";    // Add field for MQTT

                    // Send the settings here so we are sure that when agrosmart connect to broker receive
                    // this message first(not delete one in case of previously elimination)
                    mqttClient.publish(
                        `agrosmart/${macAddress}/settings`,
                        JSON.stringify(payload),
                        { retain: true }
                    );

                    agrosmart = await prisma.agrosmart.update({
                        where: {
                            macAddress,
                            username
                        },
                        data: {
                            plantConfig: payload
                        }
                    });
                }

                if (agrosmart == null) {
                    return reply.status(403).send({
                        success: false,
                        message: 'You don\'t have permission to modify this Agrosmart',
                    });
                }
            } catch (error) {
                console.log(error);
                return reply.status(500).send({
                    success: false,
                    message: 'Error during Agrosmart creation. Check log for further information',
                });
            }

            return reply.send({ success: true, message: 'Agrosmart created!' });
        },
    );
}