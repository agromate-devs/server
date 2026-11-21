import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '../../../generated/prisma/client';
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { parseBasicAuth, validateAndExtractUsername } from '../../app/utils';

const STATIC_SECRET = process.env.TURN_SECRET;
const TURN_URL = process.env.TURN_URL;
const TURN_TTL = 3600; // 1 hour for security reason

/**
 * Validates webcam credentials.
 *
 * @returns The webcam ID if credentials are valid, `null` otherwise
 */
async function validateWebcam(id: string, password: string, prisma: PrismaClient): Promise<string | null> {
    const webcam = await prisma.webcam.findUnique({
        where: { id }
    });

    if (!webcam || !(await bcrypt.compare(password, webcam.pswHash))) {
        return null;
    }
    return webcam.id;
}

export function getTurnCredentials(fastify: FastifyInstance, prisma: PrismaClient) {
    // Disable endpoint if TURN_SECRET or TURN_URL are not set
    if (!STATIC_SECRET || !TURN_URL) {
        fastify.log.warn(
            'TURN endpoint disabled: TURN_SECRET and/or TURN_URL not set in environment variables',
        );
        return;
    }

    fastify.get(
        '/turn',
        {
            schema: {
                tags: ['WebRTC'],
                summary: 'Get TURN credentials',
                description:
                    'Returns time-limited TURN credentials for WebRTC connectivity. ' +
                    'Accepts a user session (Bearer) or webcam credentials (Basic, webcam ID as username)',
                headers: {
                    type: 'object',
                    properties: {
                        authorization: { type: 'string' }
                    },
                    required: ['authorization']
                },
                response: {
                    200: {
                        description: 'TURN credentials generated successfully',
                        type: 'object',
                        properties: {
                            username: { type: 'string' },
                            password: { type: 'string' },
                            ttl: { type: 'number' },
                            urls: {
                                type: 'array',
                                items: { type: 'string' },
                            },
                        },
                    },
                    401: {
                        description: 'Unauthorized request',
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
            let identity: string | null;

            // Route is excluded from auth hooks since webcams don't have a session
            if (request.headers.authorization?.startsWith('Basic ')) {
                const credentials = parseBasicAuth(request.headers.authorization);
                identity = credentials
                    ? await validateWebcam(credentials.username, credentials.password, prisma)
                    : null;
                if (identity === null) {
                    request.server.log.info('Invalid webcam credentials');
                    return reply.status(401).send({
                        success: false,
                        message: 'Unauthorized: Invalid webcam credentials',
                    });
                }
            } else {
                identity = await validateAndExtractUsername(request, reply, prisma);
                if (identity === null) {
                    return reply;
                }
            }

            const timestamp =
                Math.floor(Date.now() / 1000) + TURN_TTL; // Convert to now() seconds and add TTL
            const username = `${timestamp}:${identity}`;

            const hmac = crypto.createHmac('sha1', STATIC_SECRET);
            hmac.update(username);
            const password = hmac.digest('base64');

            return reply.send({
                username,
                password,
                ttl: TURN_TTL,
                urls: [
                    `turn:${TURN_URL}?transport=udp`,
                    `turn:${TURN_URL}?transport=tcp`,
                ],
            });
        },
    );
}