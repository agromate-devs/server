import { FastifyInstance } from "fastify";
import type { PrismaClient } from '../../../generated/prisma/client';
import fs from "fs";
import path from "path";

export function getUser(fastify: FastifyInstance, prisma: PrismaClient) {
    fastify.get(
        '/user',
        {
            schema: {
                tags: ['User'],
                summary: 'Get user profile and picture',
                description: 'Retrieve user data and profile picture',
                headers: {
                    type: 'object',
                    properties: {
                        authorization: { type: 'string', description: 'Bearer JWT token' },
                    },
                    required: ['authorization'],
                },
                response: {
                    200: {
                        description: 'User data retrieved successfully',
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: {
                                type: 'string',
                                properties: {
                                    username: { type: 'string' },
                                    email: { type: 'string' },
                                    profileImage: {
                                        type: 'string',
                                        nullable: true,
                                        description: 'Profile picture encoded in base64'
                                    },
                                },
                            },
                        },
                    },
                    401: {
                        description: 'Invalid or missing JWT token',
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' },
                        },
                    },
                    404: {
                        description: 'User not found',
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' },
                        },
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
            try {
                const user = await prisma.user.findUnique({
                    where: { username: request.user },
                    select: { username: true, email: true, profileImage: true },
                });

                if (!user) {
                    return reply.status(404).send({ success: false, message: 'User not found' });
                }

                let profileImage = null;

                if (user.profileImage) {
                    const profileImagePath = path.join(process.cwd(), 'data/profile_pictures/' + user.profileImage);

                    if (fs.existsSync(profileImagePath)) {
                        try {
                            const data = fs.readFileSync(profileImagePath);
                            profileImage = data.toString('base64');
                        } catch (error) {
                            fastify.log.error(error, 'Failed to read profile image');
                        }
                    }
                }

                return reply.send({
                    success: true,
                    message: JSON.stringify({
                        username: user.username,
                        email: user.email,
                        profileImage: profileImage,
                    }),
                });
            } catch (error) {
                fastify.log.error(error, 'Error retrieving user data');
                return reply.status(500).send({
                    success: false,
                    message: 'Error retrieving user data',
                });
            }
        },
    );
}
