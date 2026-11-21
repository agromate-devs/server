import type {FastifyInstance} from 'fastify';
import type {PrismaClient} from '../../../generated/prisma/client';
import {addAgrosmart} from "./agrosmart.post";
import {getAgrosmarts} from "./agrosmart.get";
import {deleteAgrosmart} from "./agrosmart.delete";
import {modifyAgrosmart} from "./agrosmart.patch";

export function registerAgrosmartRoutes(fastify: FastifyInstance, prisma: PrismaClient) {
    addAgrosmart(fastify, prisma);
    getAgrosmarts(fastify, prisma);
    deleteAgrosmart(fastify, prisma);
    modifyAgrosmart(fastify, prisma);
}

