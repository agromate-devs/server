import {FastifyInstance} from "fastify";
import type {PrismaClient} from '../../../generated/prisma/client';

export function getWishList(fastify: FastifyInstance, prisma: PrismaClient) {
    fastify.get(
        '/wishlist',
        {
            schema: {
                tags: ['Wishlist'],
                summary: 'Get wishlist of a user',
                description: 'Get all the plants associated to a username',
                headers: {
                    type: 'object',
                    properties: {
                        authorization: {type: 'string'}
                    },
                    required: ['authorization']
                },
                response: {
                    200: {
                        description: 'Wishlist retrieved successfully',
                        type: 'object',
                        properties: {
                            success: {type: 'boolean'},
                            message: {type: 'string'},
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
                        description: 'Internal server error',
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
            const username = request.user;

            const logger = request.server.log;


            try {
                const result = await prisma.wishlist.findMany({
                    where: {
                        username
                    },
                    include: {
                        plant: true
                    }
                });
                logger.info({username}, "Wishlist retrieved correctly");
                return reply.send({success: true, message: JSON.stringify(result)});
            } catch (error) {
                logger.error({error, username}, 'Error during retrieving wishlist');
                return reply.status(500).send({
                    success: false,
                    message: 'Error during retrieving wishlist. Check log for further information',
                });
            }
        },
    );
}