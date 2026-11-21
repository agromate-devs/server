import { FastifyInstance } from "fastify";
import type { PrismaClient } from '../../../generated/prisma/client';
import MqttService, { deleteWebcamFromMQTT } from "../../app/mqtt";

const mqttClient = MqttService.getClient();

export function deleteWebcam(fastify: FastifyInstance, prisma: PrismaClient) {
    fastify.delete(
        '/webcam',
        {
            schema: {
                tags: ['Webcam'],
                summary: 'Delete a webcam',
                description: 'Remove the webcam of the authenticated user from the server and the MQTT broker',
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
                        id: {
                            type: 'string',
                            description: 'ID of the webcam'
                        },
                    },
                    required: ['id'],
                },
                response: {
                    200: {
                        description: 'Webcam deleted successfully',
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
                        description: 'Webcam not found',
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' },
                        }
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
            const { id } = request.body as {
                id: string;
            };

            try {
                logger.info({ username, id }, 'Deleting webcam');

                // Fails with P2025 if the webcam does not exist or is not owned by the user
                await prisma.webcam.delete({
                    where: {
                        id,
                        username,
                    },
                });

                await deleteWebcamFromMQTT(id, mqttClient);
                logger.info({ username, id }, 'Webcam successfully deleted');
            } catch (error) {
                // @ts-ignore
                if (error.code === 'P2025') {
                    logger.info({ username, id }, 'Webcam not found');
                    return reply.status(404).send({
                        success: false,
                        message: 'Webcam not found'
                    });
                }
                logger.error({ error, username, id }, 'Error during webcam deletion');
                return reply.status(500).send({
                    success: false,
                    message: 'Error during webcam deletion. Check log for further information',
                });
            }

            return reply.send({ success: true, message: 'Webcam deleted successfully!' });
        },
    );
}
