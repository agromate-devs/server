import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '../../../generated/prisma/client';
import { randomBytes } from 'node:crypto';
import nodemailer from 'nodemailer';

const TOKEN_LIFETIME = 30 * 60 * 1000;  // In ms
const TOKEN_SIZE = 16; // In bytes

export function forgotPassword(fastify: FastifyInstance, prisma: PrismaClient) {
    fastify.get(
        '/forgot_password',
        {
            schema: {
                tags: ['Authentication'],
                summary: 'Request password reset instructions',
                querystring: {
                    type: 'object',
                    properties: { email: { type: 'string', format: 'email' } },
                    required: ['email'],
                },
            },
        },
        async (request, reply) => {
            const query = request.query as { email?: unknown };
            const email = typeof query?.email === 'string' ? query.email.trim() : '';
            if (!email) {
                return reply.status(400).send({ success: false, message: 'A valid email address is required.' });
            }

            try {
                const user = await prisma.user.findUnique({ where: { email } });
                if (user) {
                    const smtpHost = process.env.SMTP_HOST;
                    const smtpPort = Number(process.env.SMTP_PORT || 587);
                    const smtpUser = process.env.SMTP_USER;
                    const smtpPassword = process.env.SMTP_PASSWORD;
                    const from = process.env.SMTP_FROM;
                    const resetPageUrl = process.env.RESET_PASSWORD_URL;

                    if (!smtpHost || !smtpUser || !smtpPassword || !from || !resetPageUrl) {
                        throw new Error('Password reset SMTP settings are incomplete');
                    }

                    const transporter = nodemailer.createTransport({
                        host: smtpHost,
                        port: smtpPort,
                        secure: process.env.SMTP_SECURE === 'true',
                        auth: { user: smtpUser, pass: smtpPassword },
                    });
                    const token = randomBytes(TOKEN_SIZE).toString('hex');
                    await prisma.$transaction([
                        prisma.passwordResetToken.deleteMany({ where: { username: user.username } }),
                        prisma.passwordResetToken.create({
                            data: {
                                token,
                                username: user.username,
                                expire: new Date(Date.now() + TOKEN_LIFETIME),
                            },
                        }),
                    ]);
                    const resetUrl = new URL(resetPageUrl);
                    resetUrl.searchParams.set('token', token);
                    resetUrl.searchParams.set('email', user.email);

                    await transporter.sendMail({
                        from,
                        to: user.email,
                        subject: 'Reset your Agromate password',
                        text: `Reset your password using this link (valid for 30 minutes): ${resetUrl.toString()}`,
                        html: `<p>Use the link below to reset your Agromate password. It is valid for 30 minutes.</p><p><a href="${resetUrl.toString()}">Reset password</a></p>`,
                    });
                }

                return reply.send({
                    success: true,
                    message: 'If an account exists for this email, you will receive password reset instructions.',
                });
            } catch (error) {
                request.server.log.error({ error }, 'Failed to process password reset request');
                return reply.status(500).send({ success: false, message: 'Unable to process the password reset request.' });
            }
        },
    );
}