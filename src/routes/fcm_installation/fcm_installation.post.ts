import {FastifyInstance} from "fastify";
import type {PrismaClient} from '../../../generated/prisma/client';

export function registerFcmInstallation(fastify: FastifyInstance, prisma: PrismaClient) {
    fastify.post(
        '/fcm_installation',
        {
            schema: {
                tags: ['Notifications'],
                summary: 'Register a Firebase Installation ID',
                description: 'Associate the Firebase Installation ID (FID) of an app installation to the authenticated user, so that it receives the agrosmart push notifications. Registering again a FID already owned by the authenticated user succeeds, while a FID owned by another user is rejected.',
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
                        description: 'FID successfully registered',
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
                        description: 'FID already associated to another user',
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
            const {fid} = request.body as { fid: string };

            const fidAlreadyUsed = () => reply.status(409).send({
                success: false,
                message: 'FID already associated to another user',
            });

            try {
                const existing = await prisma.fcmInstallation.findUnique({where: {fid}});
                if (existing && existing.username !== username) {
                    logger.info({username}, 'FID already associated to another user');
                    return fidAlreadyUsed();
                }
                if (existing) {
                    // Same user registering again (e.g. at app startup): only refresh updatedAt
                    await prisma.fcmInstallation.update({where: {fid}, data: {username}});
                } else {
                    await prisma.fcmInstallation.create({data: {fid, username}});
                }
                logger.info({username}, 'FID registered');
            } catch (error) {
                // @ts-ignore
                if (error.code === 'P2002') {
                    // Created by a concurrent request between findUnique and create
                    logger.info({username}, 'FID already associated to another user');
                    return fidAlreadyUsed();
                }
                logger.error({error, username}, 'Error during FID registration');
                return reply.status(500).send({
                    success: false,
                    message: 'Error during FID registration. Check log for further information',
                });
            }

            return reply.send({success: true, message: 'FID registered'});
        },
    );
}
