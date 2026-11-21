import fs from 'fs';
import path from 'path';
import { FastifyInstance } from 'fastify';
import type { PrismaClient } from '../../../generated/prisma/client';
import { isBase64JPG } from '../../app/utils';
import * as crypto from "node:crypto";
import bcrypt from "bcrypt";
import MqttService from "../../app/mqtt";

const saltRounds = 10;
const mqttClient = MqttService.getClient();

export function editUser(fastify: FastifyInstance, prisma: PrismaClient) {
    fastify.patch(
        '/user',
        {
            schema: {
                tags: ['User'],
                summary: 'Edit user profile',
                description: 'Allows authenticated users to change their password and/or profile picture',
                headers: {
                    type: 'object',
                    properties: {
                        authorization: { type: 'string' }
                    },
                    required: ['authorization']
                },
                body: {
                    type: 'object',
                    properties: {
                        username: { type: 'string', nullable: true, description: 'New username' },
                        password: { type: 'string', nullable: true, description: "New password" },
                        profilePicture: {
                            type: 'string',
                            nullable: true,
                            description: 'Base64 encoded image without prefix (e.g. data:image/jpeg;base64,). Only JPG format is supported. Max size ' + process.env.MAX_IMAGE_SIZE + " bytes"
                        }
                    }
                },
                response: {
                    200: {
                        description: 'User updated successfully',
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' }
                        }
                    },
                    400: {
                        description: 'Bad request',
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' }
                        }
                    },
                    401: {
                        description: 'Unauthorized',
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' }
                        }
                    },
                    413: {
                        description: 'Image too large',
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' }
                        }
                    }
                }
            }
        },
        async function handler(request, reply) {
            const { username, password, profileImage } = request.body as {
                username?: string | null;
                password?: string | null;
                profileImage?: string | null
            };

            console.log("Body: ", request.body);

            if (!password && !profileImage) {
                return reply.status(400).send({
                    success: false,
                    message: 'Nothing to update. Provide password or profilePicture.'
                });
            }

            const updateData: { username?: string; pswHash?: string; profileImage?: string | null } = {};

            if (username) {
                updateData.username = username;
                if (username.length > 16) {
                    return reply.status(400).send({
                        success: false,
                        message: 'Username must be at most 16 characters long'
                    });
                }
            }

            if (password) {
                updateData.pswHash = await bcrypt.hash(password, saltRounds);
            }

            if (profileImage) {
                if (!process.env.MAX_IMAGE_SIZE) {
                    throw new Error('Missing MAX_IMAGE_SIZE in .env');
                }

                if (!isBase64JPG(profileImage)) {
                    return reply.status(400).send({
                        success: false,
                        message: 'Invalid profile picture format. Only base64 encoded JPG images are supported.'
                    });
                }

                // Save profile picture to a local inaccessible(from web server) folder
                const uploadDir = path.join(process.cwd(), 'data/profile_pictures');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                const fileName = crypto.randomUUID();
                const filePath = path.join(uploadDir, `${fileName}.jpg`);
                const parsedImage = Buffer.from(profileImage, 'base64');
                if (parsedImage.length > +process.env.MAX_IMAGE_SIZE) {
                    return reply.status(413).send({
                        success: false,
                        message: 'Profile picture is too large. Maximum size is ' + process.env.MAX_IMAGE_SIZE + " bytes",
                    });
                }

                fs.writeFileSync(filePath, parsedImage);

                updateData.profileImage = `${fileName}.jpg`;
            }

            await prisma.user.update({
                where: { username: request.user },
                data: updateData
            });

            if (password) {
                // MQTT password is used by the app to view webcams
                const mqttACL = {
                    "commands": [
                        {
                            "command": "setClientPassword",
                            "username": request.user,
                            "password": password
                        }
                    ]
                }
                mqttClient.publish('$CONTROL/dynamic-security/v1', JSON.stringify(mqttACL));
            }

            return reply.send({ success: true, message: 'User updated successfully' });
        }
    );
}

