import type {FastifyInstance} from 'fastify';
import {PrismaClient} from "@prisma/client/extension";

export function getPlants(fastify: FastifyInstance, prisma: PrismaClient) {
    fastify.get(
        '/plants',
        {
            schema: {
                tags: ['Plants'],
                summary: 'Get all plants',
                description: 'Retrieve a list of all available plants',
                headers: {
                    type: 'object',
                    properties: {
                        authorization: {type: 'string'}
                    },
                    required: ['authorization']
                },
                response: {
                    200: {
                        description: 'Successfully retrieved plants',
                        type: 'object',
                        properties: {
                            success: {type: 'boolean'},
                            data: {type: 'array'},
                        },
                    },
                    401: {
                        description: 'Unauthorized request',
                        type: 'object',
                        properties: {
                            success: {type: 'boolean'},
                            message: {type: 'string'},
                        }
                    },
                    500: {
                        description: 'Error fetching plants',
                        type: 'object',
                        properties: {
                            success: {type: 'boolean'},
                            message: {type: 'string'},
                        },
                    },
                },
            },
        },
        async function handler(request, reply) {
            try {
                const plants = await prisma.plant.findMany();
                return reply.send({success: true, data: plants});
            } catch (error) {
                return reply.status(500).send({
                    success: false,
                    message: 'Error fetching plants. Check log for further information',
                });
            }
        },
    );
}