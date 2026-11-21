import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '../../generated/prisma/client';
import { registerPlantRoutes } from './plant/plant.routes';
import { registerUserRoutes } from './user/user.routes';
import { registerWishlistRoutes } from "./wishlist/wishlist.routes";
import { registerAgrosmartRoutes } from "./agrosmart/agrosmart.routes";
import { registerAgrosmartMetricsRoutes } from "./agrosmart_metrics/agrosmart_metrics.routes";
import { registerAgrosmartControlRoutes } from "./agrosmart_control/agrosmart_control.routes";
import { registerTelemetryRoutes } from "./telemetry/telemetry.routes";
import { registerLogoutRoutes } from "./logout/logout.routes";
import { registerWebcamRoutes } from "./webcam/webcam.routes";
import { registerTurnRoutes } from "./turn/turn.routes";
import {registerPasswordResetRoutes} from "./reset_password/password_reset.routes";
import { registerHealthRoutes } from "./health/health.routes";
import { registerFcmInstallationRoutes } from "./fcm_installation/fcm_installation.routes";

export async function registerRoutes(fastify: FastifyInstance, prisma: PrismaClient) {
    registerUserRoutes(fastify, prisma);
    registerPasswordResetRoutes(fastify, prisma);
    registerPlantRoutes(fastify, prisma);
    registerWishlistRoutes(fastify, prisma);
    registerAgrosmartRoutes(fastify, prisma);
    registerAgrosmartMetricsRoutes(fastify, prisma);
    registerAgrosmartControlRoutes(fastify, prisma);
    registerTelemetryRoutes(fastify, prisma);
    registerLogoutRoutes(fastify, prisma);
    registerWebcamRoutes(fastify, prisma);
    registerTurnRoutes(fastify, prisma);
    registerFcmInstallationRoutes(fastify, prisma);
    registerHealthRoutes(fastify);
}

