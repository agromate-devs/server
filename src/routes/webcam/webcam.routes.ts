import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '../../../generated/prisma/client';
import { addWebcam } from "./webcam.post";
import { getWebcams } from "./webcam.get";
import { deleteWebcam } from "./webcam.delete";

export function registerWebcamRoutes(fastify: FastifyInstance, prisma: PrismaClient) {
    addWebcam(fastify, prisma);
    getWebcams(fastify, prisma);
    deleteWebcam(fastify, prisma);
}
