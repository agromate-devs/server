import { FastifyInstance } from "fastify";
import type { PrismaClient } from "../../../generated/prisma/client";
import MqttService, { deleteAgrosmartFromMQTT, deleteWebcamFromMQTT } from "../../app/mqtt";
import InfluxDBConnector, { deleteAgrosmartFromInfluxDB } from "../../app/influxdb";

const mqttClient = MqttService.getClient();
const influxClient = InfluxDBConnector.getClient();

export function deleteUser(fastify: FastifyInstance, prisma: PrismaClient) {
    fastify.delete(
        '/user',
        {
            schema: {
                tags: ['User'],
                summary: 'Delete user',
                description: 'Delete a specific user and all related resources(wishlist entries and agrosmarts)',
                headers: {
                    type: 'object',
                    properties: {
                        authorization: { type: 'string', description: 'Bearer JWT token' },
                    },
                    required: ['authorization'],
                },
                response: {
                    200: {
                        description: 'User deleted successfully',
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: {
                                type: 'string'
                            },
                        },
                    },
                    401: {
                        description: 'Invalid or missing JWT token',
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' },
                        },
                    },
                    404: {
                        description: 'User not found',
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' },
                        },
                    },
                    500: {
                        description: 'Internal server error',
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
            const username = request.user;
            const logger = request.server.log;

            try {
                const user = await prisma.user.findUnique({
                    where: { username }
                });

                if (user == null) {
                    return reply.status(404).send({
                        success: false,
                        message: 'User does not exist',
                    })
                }

                const agrosmarts = await prisma.agrosmart.findMany({
                    where: {
                        username: username,
                    }
                });

                for (const agrosmart of agrosmarts) {
                    mqttClient.publish(
                        `agrosmart/${agrosmart.macAddress}/settings`,
                        JSON.stringify({
                            type: "delete",
                            delete: true
                        }),
                        { retain: false }
                    );
                    await deleteAgrosmartFromMQTT(agrosmart.macAddress, mqttClient);
                    await deleteAgrosmartFromInfluxDB(agrosmart.macAddress, influxClient);
                }

                const webcams = await prisma.webcam.findMany({
                    where: {
                        username: username,
                    }
                });

                for (const webcam of webcams) {
                    await deleteWebcamFromMQTT(webcam.id, mqttClient);
                }

                await prisma.$transaction([
                    prisma.agrosmart.deleteMany({
                        where: {
                            username: username,
                        }
                    }),
                    prisma.user.delete({
                        where: {
                            username: username,
                        }
                    })
                    // Wishlist entries, webcams and FIDs are deleted by DBMS due to constraint
                ]);

                return reply.send({ success: true, message: 'User successfully deleted!' });
            } catch (error) {
                logger.error({ error, username }, 'Error during user deletion');
                return reply.status(500).send({
                    success: false,
                    message: 'Error during user deletion. Check log for further information',
                });
            }
        }
    )
}