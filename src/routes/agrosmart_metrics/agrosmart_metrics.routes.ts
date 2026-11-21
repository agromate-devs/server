import type {FastifyInstance} from 'fastify';
import type {PrismaClient} from '../../../generated/prisma/client';
import {getAgrosmartMetrics} from "./agrosmart_metrics.get";
import {getAgrosmartMeanMetrics} from "./agrosmart_mean_metrics.get";

export function registerAgrosmartMetricsRoutes(fastify: FastifyInstance, prisma: PrismaClient) {
    getAgrosmartMetrics(fastify, prisma);
    getAgrosmartMeanMetrics(fastify, prisma);
}


