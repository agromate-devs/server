import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client/extension";
import MqttService, { deleteAgrosmartFromMQTT } from "../../app/mqtt";
import InfluxDBConnector, { deleteAgrosmartFromInfluxDB } from "../../app/influxdb";

const mqttClient = MqttService.getClient();
const influxClient = InfluxDBConnector.getClient();

export function deleteAgrosmart(fastify: FastifyInstance, prisma: PrismaClient) {
    fastify.delete(
        '/agrosmart',
        {
            schema: {
                tags: ['Agrosmart'],
                summary: 'Delete an Agrosmart',
                description: 'Delete a agrosmart entry',
                headers: {
                    type: 'object',
                    properties: {
                        authorization: { type: 'string' }
                    },
                    required: ['authorization']
                },
                querystring: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' }
                    },
                    required: [
                        'id'
                    ],
                },
                response: {
                    200: {
                        description: 'Agrosmart deleted successfully',
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
                    404: {
                        description: "Agrosmart not found",
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' },
                        }
                    },
                    500: {
                        description: 'Error during agrosmart deletion',
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
            const logger = request.server.log;

            try {
                const {
                    id
                } = request.query as { id: string };

                await prisma.agrosmart.delete({
                    where: {
                        username: request.user,
                        macAddress: id,
                    },
                });


                mqttClient.publish(
                    `agrosmart/${id}/settings`,
                    JSON.stringify({
                        type: "delete",
                        delete: true
                    }),
                    { retain: false }
                );

                await deleteAgrosmartFromMQTT(id, mqttClient);
                await deleteAgrosmartFromInfluxDB(id, influxClient);
            } catch (error) {
                // @ts-ignore
                if (error.code == "P2025") {
                    return reply.status(404).send({
                        success: false,
                        message: "Agrosmart not found",
                    });
                }

                // @ts-ignore
                logger.error({ error: error.message, username: username }, "Error during agrosmart deletion");

                return reply.status(500).send({
                    success: false,
                    message: 'Error during Agrosmart deletion. Check log for further information',
                });
            }

            return reply.send({ success: true, message: 'Agrosmart deleted!' });
        },
    );
}