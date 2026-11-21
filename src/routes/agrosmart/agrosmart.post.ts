import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client/extension";
import { preparePlantConfiguration } from "../../app/utils";
import MqttService from "../../app/mqtt";

const mqttClient = MqttService.getClient();

export function addAgrosmart(fastify: FastifyInstance, prisma: PrismaClient) {
    fastify.post<{ Body: AgrosmartBody }>(
        '/agrosmart',
        {
            schema: {
                tags: ['Agrosmart'],
                summary: 'Register a new Agrosmart to a specific user',
                description: 'Create a new agrosmart entry in the database and associate it with a user',
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
                        espPassword: { type: 'string' },
                        plantID: { type: 'string' },
                        soilMoisture: { type: ['number', 'null'] },
                        targetHumidity: { type: 'number' },
                        lightIntensity: { type: 'number' },
                        temperatureMin: { type: 'number' },
                        temperatureMax: { type: 'number' },
                        lightDuration: { type: 'string' },
                        lightColor: { type: 'string' },
                        isTimeBasedIrrigationEnabled: { type: 'boolean' },
                        wateringFrequency: { type: ['number', 'null'] },
                        waterQuantity: { type: 'number' },
                        isTimeBasedHumidificationEnabled: { type: 'boolean' },
                        humidificationFrequency: { type: ['number', 'null'] },
                        humidificationDuration: { type: ['number', 'null'] },
                    },
                    required: [
                        'macAddress',
                        'espPassword',
                        'plantID',
                        'targetHumidity',
                        'lightIntensity',
                        'temperatureMin',
                        'temperatureMax',
                        'lightDuration',
                        'lightColor',
                        'isTimeBasedIrrigationEnabled',
                        'isTimeBasedHumidificationEnabled'
                    ],
                },
                response: {
                    200: {
                        description: 'Agrosmart created successfully',
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
                        description: 'Error during agrosmart creation',
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
                const logger = request.server.log;
                const {
                    macAddress,
                    espPassword,
                    plantID
                } = request.body;

                const payload = await preparePlantConfiguration(request.body, logger, reply);
                if (payload == null) {
                    return;
                }


                if (plantID == null || espPassword == null) {
                    return reply.status(500).send({
                        success: false,
                        message: 'Missing plant ID or espPassword',
                    });
                }

                await prisma.agrosmart.create({
                    data: {
                        username: request.user,
                        macAddress,
                        plantID: +plantID,
                        plantConfig: payload
                    },
                });

                payload.type = "config";    // Add field for MQTT

                // Send the settings here so we are sure that when agrosmart connect to broker receive
                // this message first(not delete one in case of previously elimination)
                mqttClient.publish(
                    `agrosmart/${macAddress}/settings`,
                    JSON.stringify(payload),
                    { retain: true }
                );


                const mqttUsername = "agrosmart_" + macAddress;
                const mqttACL = {
                    "commands": [
                        {
                            "command": "createClient",
                            "username": mqttUsername,
                            "password": espPassword,
                            "roles": [
                                { "rolename": "agrosmart", "priority": 1 }
                            ]
                        }
                    ]
                }

                mqttClient.publish('$CONTROL/dynamic-security/v1', JSON.stringify(mqttACL));
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