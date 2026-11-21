import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '../../../generated/prisma/client';
import { logout } from './logout.delete';

export function registerLogoutRoutes(fastify: FastifyInstance, prisma: PrismaClient) {
    logout(fastify, prisma);
}