import type {FastifyInstance} from 'fastify';
import type {PrismaClient} from '../../../generated/prisma/client';
import {getPlants} from "./plant.get";
import {addPlant} from "./plant.post";
import {updatePlant} from "./plant.put";
import {deletePlant} from "./plant.delete";

export function registerPlantRoutes(fastify: FastifyInstance, prisma: PrismaClient) {
    getPlants(fastify, prisma);
    addPlant(fastify, prisma);
    updatePlant(fastify, prisma);
    deletePlant(fastify, prisma);
}
