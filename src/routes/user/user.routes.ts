import type {FastifyInstance} from 'fastify';
import type {PrismaClient} from '../../../generated/prisma/client';
import {addUser} from "./user.post";
import {login} from "../login/login.get";
import {editUser} from "./user.patch";
import {getUser} from "./user.get";
import {deleteUser} from "./user.delete";

export function registerUserRoutes(fastify: FastifyInstance, prisma: PrismaClient) {
    addUser(fastify, prisma);
    login(fastify, prisma);
    editUser(fastify, prisma);
    getUser(fastify, prisma);
    deleteUser(fastify,prisma);
}
