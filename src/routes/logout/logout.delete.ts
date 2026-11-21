import { FastifyInstance } from "fastify";
import type { PrismaClient } from '../../../generated/prisma/client';

export function logout(fastify: FastifyInstance, prisma: PrismaClient) {
    fastify.delete(
        '/logout',
        {
            schema: {
                tags: ['Authentication'],
                summary: 'Logout user',
                description: 'Delete a session given the session token. The token must belong to the authenticated user.',
                headers: {
                    type: 'object',
                    properties: {
                        authorization: { type: 'string', description: 'Bearer session token' },
                    },
                    required: ['authorization'],
                },
                response: {
                    200: {
                        description: 'Session deleted successfully',
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' },
                        },
                    },
                    400: {
                        description: 'Missing token',
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
                        },
                    },
                    404: {
                        description: 'Session not found',
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
            const username = request.user as string;
            let sessionRequest = request.headers.authorization;
            if (!sessionRequest) {
                return reply.status(400).send({ success: false, message: 'Missing token in body' });

            }
            const token = sessionRequest.replace("Bearer ", "");

            if (token.trim() === '') {
                return reply.status(400).send({ success: false, message: 'Missing token in body' });
            }

            const session = await prisma.session.findUnique({
                where: { token },
            });

            if (!session) {
                return reply.status(404).send({ success: false, message: 'Session not found' });
            }

            if (session.username !== username) {
                return reply.status(401).send({ success: false, message: 'Unauthorized request' });
            }

            await prisma.session.delete({
                where: { token },
            });

            return reply.send({ success: true, message: 'Session deleted successfully' });
        },
    );
}