import { FastifyInstance } from "fastify";

export function health(fastify: FastifyInstance) {
    fastify.get(
        '/health',
        {
            logLevel: 'warn',
            schema: {
                tags: ['Health'],
                summary: 'Health check',
                description: 'Unauthenticated liveness probe used by the Docker HEALTHCHECK.',
                response: {
                    200: {
                        description: 'Server is up',
                        type: 'object',
                        properties: {
                            status: { type: 'string' },
                        },
                    },
                },
            },
        },
        async function handler(_request, reply) {
            return reply.status(200).send({ status: 'ok' });
        }
    );
}
