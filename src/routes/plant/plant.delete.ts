import { FastifyInstance } from "fastify";
import type { PrismaClient } from '../../../generated/prisma/client';

export function deletePlant(fastify: FastifyInstance, prisma: PrismaClient) {
    fastify.delete<{ Querystring: { id: string } }>(
        '/plant',
        {
            schema: {
                tags: ['Plant'],
                summary: 'Delete a plant from the database',
                description: 'Delete a plant from the database entirely',
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
                        id: {
                            type: 'string',
                            description: 'ID of the plant that will be deleted'
                        },
                    },
                    required: ['id'],
                },
                response: {
                    200: {
                        description: 'Plant successfully deleted',
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
                        description: "Plant not found",
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' },
                        }
                    },
                    409: {
                        description: "Plant is still referenced by some Agrosmarts",
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
            const logger = request.server.log;
            const plantId = request.query.id;

            try {
                await prisma.plant.delete({
                    where: {
                        id: +plantId
                    }
                });
                logger.info({ user: request.user, plantId }, 'Plant successfully deleted');
            } catch (error) {
                // @ts-ignore
                if (error.code == "P2025") {
                    return reply.status(404).send({
                        success: false,
                        message: "Plant not found",
                    });
                }
                // @ts-ignore
                if (error.code == "P2003") {
                    return reply.status(409).send({
                        success: false,
                        message: "Cannot delete plant, it is still referenced by some Agrosmarts",
                    });
                }
                logger.error({ error, user: request.user, plantId }, 'Error during plant deletion');
                return reply.status(500).send({
                    success: false,
                    message: 'Error during plant deletion. Check log for further information',
                });
            }

            return reply.send({ success: true, message: 'Plant successfully deleted!' });
        },
    );
}
