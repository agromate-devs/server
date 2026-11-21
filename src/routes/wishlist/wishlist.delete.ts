import {FastifyInstance} from "fastify";
import type {PrismaClient} from '../../../generated/prisma/client';

export function deletePlantFromWishlist(fastify: FastifyInstance, prisma: PrismaClient) {
    fastify.delete(
        '/wishlist',
        {
            schema: {
                tags: ['Wishlist'],
                summary: 'Delete a plant to a user Wishlist',
                description: 'Delete a  plant to a user Wishlist',
                headers: {
                    type: 'object',
                    properties: {
                        authorization: {type: 'string'}
                    },
                    required: ['authorization']
                },
                querystring: {
                    type: 'object',
                    properties: {
                        plantId: {
                            type: 'string',
                            description: 'ID of the plant that will be deleted to the user wishlist'
                        },
                    },
                    required: ['plantId'],
                },
                response: {
                    200: {
                        description: 'Plant successfully deleted',
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
                    404: {
                        description: "Plant not found",
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
            const {plantId} = request.query as {
                plantId: number;
            };


            try {
                await prisma.wishlist.delete({
                    where: {
                        username_id: {
                            username,
                            id: +plantId
                        }
                    }
                });
                logger.info({username, plantId}, 'Plant successfully deleted to wishlist');
            } catch (error) {
                // @ts-ignore
                if (error.code == "P2025") {
                    return reply.status(404).send({
                        success: false,
                        message: "Agrosmart not found",
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