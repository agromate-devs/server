import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '../../../generated/prisma/client';
import { getTurnCredentials } from './turn.get';

export function registerTurnRoutes(fastify: FastifyInstance, prisma: PrismaClient) {
    getTurnCredentials(fastify, prisma);
}