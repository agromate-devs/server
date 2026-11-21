import { FastifyInstance } from "fastify";
import type { PrismaClient } from '../../../generated/prisma/client';

export function getWebcams(fastify: FastifyInstance, prisma: PrismaClient) {
    fastify.get(
        '/webcam',
        {
            schema: {
                tags: ['Webcam'],
                summary: 'Get webcams of a user',
                description: 'Get all the webcams associated to the authenticated user',
                headers: {
                    type: 'object',
                    properties: {
                        authorization: { type: 'string' }
                    },
                    required: ['authorization']
                },
                response: {
                    200: {
                        description: 'Webcams retrieved successfully',
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
                const result = await prisma.webcam.findMany({
                    where: {
                        username
                    },
                    // Don't expose password
                    select: {
                        id: true,
                        name: true,
                    },
                });
                logger.info({ username }, "Webcams retrieved correctly");
                return reply.send({ success: true, message: JSON.stringify(result) });
            } catch (error) {
                logger.error({ error, username }, 'Error during retrieving webcams');
                return reply.status(500).send({
                    success: false,
                    message: 'Error during retrieving webcams. Check log for further information',
                });
            }
        },
    );
}