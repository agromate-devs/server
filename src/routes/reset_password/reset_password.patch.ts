import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '../../../generated/prisma/client';
import bcrypt from 'bcrypt';

const saltRounds = 10;

export function resetPassword(fastify: FastifyInstance, prisma: PrismaClient) {
    fastify.patch(
        '/reset_password',
        {
            schema: {
                tags: ['Authentication'],
                summary: 'Set a new password using a reset token',
                querystring: {
                    type: 'object',
                    properties: { email: { type: 'string', format: 'email' } },
                    required: ['email'],
                },
                body: {
                    type: 'object',
                    properties: {
                        token: { type: 'string' },
                        password: { type: 'string', minLength: 8 },
                    },
                    required: ['token', 'password'],
                },
            },
        },
        async (request, reply) => {
            const query = request.query as { email?: unknown };
            const body = request.body as { token?: unknown; password?: unknown };
            if (typeof query?.email !== 'string' || !query.email.trim() || typeof body?.token !== 'string' || typeof body.password !== 'string' || body.password.length < 8) {
                return reply.status(400).send({ success: false, message: 'A valid reset token and a password of at least 8 characters are required.' });
            }

            try {
                const storedToken = await prisma.passwordResetToken.findUnique({ where: { token: body.token as string } });
                if (!storedToken || storedToken.expire <= new Date()) {
                    return reply.status(400).send({ success: false, message: 'The reset link is invalid or expired.' });
                }

                const user = await prisma.user.findUnique({ where: { username: storedToken.username } });
                if (!user || user.email !== query.email.trim()) {
                    return reply.status(400).send({ success: false, message: 'The reset link is invalid or expired.' });
                }

                const pswHash = await bcrypt.hash(body.password, saltRounds);
                await prisma.$transaction([
                     prisma.passwordResetToken.delete({
                        where: { token: body.token as string },
                    }),

                    prisma.user.update({ where: { username: user.username }, data: { pswHash } }),
                    prisma.session.deleteMany({ where: { username: user.username } })
                ]);

                return reply.send({ success: true, message: 'Password reset successfully.' });
            } catch (error) {
                request.server.log.error({ error }, 'Failed to reset password');
                return reply.status(500).send({ success: false, message: 'Unable to reset password.' });
            }
        },
    );
}