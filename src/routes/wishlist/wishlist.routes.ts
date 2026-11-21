import type {FastifyInstance} from 'fastify';
import type {PrismaClient} from '../../../generated/prisma/client';
import {addPlantToWishlist} from "./wishlist.post";
import {getWishList} from "./wishlist.get";
import {deletePlantFromWishlist} from "./wishlist.delete";

export function registerWishlistRoutes(fastify: FastifyInstance, prisma: PrismaClient) {
    addPlantToWishlist(fastify, prisma);
    getWishList(fastify, prisma);
    deletePlantFromWishlist(fastify, prisma);
}

