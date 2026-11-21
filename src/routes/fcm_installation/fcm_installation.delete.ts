import {FastifyInstance} from "fastify";
import type {PrismaClient} from '../../../generated/prisma/client';
import {PrismaClientKnownRequestError} from "@prisma/client/runtime/client";

export function deleteFcmInstallation(fastify: FastifyInstance, prisma: PrismaClient) {
    fastify.delete(
        '/fcm_installation',
        {
            schema: {
                tags: ['Notifications'],
                summary: 'Unregister a Firebase Installation ID',
                description: 'Remove the Firebase Installation ID (FID) of an app installation, e.g. on logout. The FID must belong to the authenticated user.',
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
                        fid: {
                            type: 'string',
                            minLength: 1,
                            description: 'Firebase Installation ID of the app installation'
                        },
                    },
                    required: ['fid'],
                },
                response: {
                    200: {
                        description: 'FID successfully removed',
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
                        description: 'FID not found',
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
            const {fid} = request.query as { fid: string };

            try {
                await prisma.fcmInstallation.delete({
                    where: {fid, username},
                });
                logger.info({username}, 'FID removed');
            } catch (error) {
                if (error instanceof PrismaClientKnownRequestError && error.code === "P2025") {
                    return reply.status(404).send({
                        success: false,
                        message: 'FID not found.',
                    });
                }
                logger.error({error, username}, 'Error during FID removal');
                return reply.status(500).send({
                    success: false,
                    message: 'Error during FID removal. Check log for further information',
                });
            }

            return reply.send({success: true, message: 'FID removed'});
        },
    );
}
