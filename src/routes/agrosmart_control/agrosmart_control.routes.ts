import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '../../../generated/prisma/client';
import { agrosmartControl } from "./agrosmart_control.patch";
import { agrosmartControlPost } from "./agrosmart_control.post";

export function registerAgrosmartControlRoutes(fastify: FastifyInstance, prisma: PrismaClient) {
    agrosmartControl(fastify);
    agrosmartControlPost(fastify);
}

