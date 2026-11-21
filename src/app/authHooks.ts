import { FastifyInstance } from "fastify";
import { validateAndExtractUsername } from "./utils";
import type { PrismaClient } from "../../generated/prisma/client";

const noAuthRoutes = ["login", "register", "forgot_password" ,"reset_password.html", "reset_password", "docs", "telemetry", "version.txt", "agrosmart.bin", "turn", "health"];

export function setAuthHooks(fastify: FastifyInstance, prisma: PrismaClient): void {
    fastify.decorateRequest('user', '');

    fastify.addHook('preHandler', async (req, reply) => {
        if (noAuthRoutes.includes(req.url.split('/')[1].split('?')[0])) {
            return;
        }
        const username = await validateAndExtractUsername(req, reply, prisma);
        if (username === null) {
            return;
        }
        req.user = username;
    });
}
