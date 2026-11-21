import {FastifyInstance} from "fastify";
import type {PrismaClient} from '../../../generated/prisma/client';

export function addPlantToWishlist(fastify: FastifyInstance, prisma: PrismaClient) {
    fastify.post(
        '/wishlist',
        {
            schema: {
                tags: ['Wishlist'],
                summary: 'Add plant to the user Wishlist',
                description: 'Add plant to the user Wishlist',
                headers: {
                    type: 'object',
                    properties: {
                        authorization: {type: 'string'}
                    },
                    required: ['authorization']
                },
                body: {
                    type: 'object',
                    properties: {
                        plantId: {
                            type: 'string',
                            description: 'ID of the plant that will be added to the user wishlist'
                        },
                    },
                    required: ['plantId'],
                },
                response: {
                    200: {
                        description: 'Plant successfully added',
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
                    409: {
                        description: 'Plant already exists in the user Wishlist',
                        type: 'object',
                        properties: {
                            success: {type: 'boolean'},
                            message: {type: 'string'},
                        },
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
            const {plantId} = request.body as {
                plantId: number;
            };


            try {
                logger.info({username, plantId}, 'Adding plant to wishlist');
                await prisma.wishlist.create({
                    data: {
                        username,
                        id: +plantId
                    },
                });
                logger.info({username, plantId}, 'Plant successfully added to wishlist');
            } catch (error) {
                // @ts-ignore
                if (error.code === 'P2002') {
                    logger.info({username, plantId}, 'Plant already exists in wishlist');
                    return reply.status(409).send({
                        success: false,
                        message: 'Plant already exists in the user Wishlist'
                    });
                }
                logger.error({error, username, plantId}, 'Error during wishlist modification');
                return reply.status(500).send({
                    success: false,
                    message: 'Error during wishlist modification. Check log for further information',
                });
            }

            return reply.send({success: true, message: 'Plant added to the user Wishlist!'});
        },
    );
}