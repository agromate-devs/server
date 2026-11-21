import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '../../../generated/prisma/client';
import { forgotPassword } from './forgot_password.get';
import { resetPassword } from './reset_password.patch';

export function registerPasswordResetRoutes(fastify: FastifyInstance, prisma: PrismaClient) {
    forgotPassword(fastify, prisma);
    resetPassword(fastify, prisma);
}