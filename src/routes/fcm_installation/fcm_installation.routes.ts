import type {FastifyInstance} from 'fastify';
import type {PrismaClient} from '../../../generated/prisma/client';
import {registerFcmInstallation} from "./fcm_installation.post";
import {deleteFcmInstallation} from "./fcm_installation.delete";

export function registerFcmInstallationRoutes(fastify: FastifyInstance, prisma: PrismaClient) {
    registerFcmInstallation(fastify, prisma);
    deleteFcmInstallation(fastify, prisma);
}
