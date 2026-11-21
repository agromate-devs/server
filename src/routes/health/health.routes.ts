import type { FastifyInstance } from 'fastify';
import { health } from './health.get';

export function registerHealthRoutes(fastify: FastifyInstance) {
    health(fastify);
}
