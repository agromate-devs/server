import { FastifyInstance } from "fastify";
import type { PrismaClient } from '../../../generated/prisma/client';
import bcrypt from 'bcrypt';
import MqttService from "../../app/mqtt";

const saltRounds = 10;
const mqttClient = MqttService.getClient();

export function addUser(fastify: FastifyInstance, prisma: PrismaClient) {
    fastify.post(
        '/register',
        {
            schema: {
                tags: ['Authentication'],
                summary: 'Register a new user',
                description: 'Create a new user account with email, username, and password',
                body: {
                    type: 'object',
                    properties: {
                        email: { type: 'string', format: 'email', description: 'User email address' },
                        username: { type: 'string', description: 'Username for login' },
                        password: { type: 'string', description: 'User password' },
                    },
                    required: ['email', 'username', 'password'],
                },
                response: {
                    200: {
                        description: 'User successfully registered',
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' },
                        },
                    },
                    400: {
                        description: 'Username too long',
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' },
                        }
                    },
                    409: {
                        description: 'User already exists',
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
            const { email, username, password } = request.body as {
                email: string;
                username: string;
                password: string;
            };

            if (username.length > 16) {
                return reply.status(400).send({ success: false, message: 'Username must be at most 16 characters long' });
            }

            const pswHash = await bcrypt.hash(password, saltRounds);

            const mqttACL = {
                "commands": [
                    {
                        "command": "createClient",
                        "username": username,
                        "password": password,
                        // Webcam roles are added when a webcam is associated to the user
                        "roles": []
                    }
                ]
            }

            mqttClient.publish('$CONTROL/dynamic-security/v1', JSON.stringify(mqttACL));

            try {
                await prisma.user.create({
                    data: {
                        email,
                        username,
                        pswHash: pswHash,
                    },
                });
            } catch (error) {
                // @ts-ignore
                if (error.code === 'P2002') {
                    return reply.status(409).send({ success: false, message: 'User already exists' });
                }
                request.server.log.error({ error, email, username }, "Error during registration.");
                return reply.status(500).send({
                    success: false,
                    message: 'Error during registration. Check log for further information',
                });
            }

            return reply.send({ success: true, message: 'User registered successfully!' });
        },
    );
}