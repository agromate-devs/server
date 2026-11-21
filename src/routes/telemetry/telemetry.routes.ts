import type {FastifyInstance} from 'fastify';
import type {PrismaClient} from '../../../generated/prisma/client';
import {postTelemetry} from "./telemetry.post";

export function registerTelemetryRoutes(fastify: FastifyInstance, prisma: PrismaClient) {
    postTelemetry(fastify, prisma);
}