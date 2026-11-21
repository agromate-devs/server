import cors from '@fastify/cors';
import formData from '@fastify/formbody';
import fastifyStatic from '@fastify/static';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import path from 'path';
import type {FastifyInstance} from 'fastify';

export async function registerPlugins(fastify: FastifyInstance) {
    await fastify.register(cors, () => {
        return (
            req: { headers: { origin: string } },
            callback: (arg0: null, arg1: { origin: boolean }) => void,
        ) => {
            const corsOptions = {
                origin: true,
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
            };

            // TODO: Remove this in production
            // do not include CORS headers for requests from localhost
            if (/^localhost$/m.test(req.headers.origin)) {
                corsOptions.origin = false
            }

            callback(null, corsOptions);
        };
    });

    await fastify.register(fastifySwagger, {
        mode: 'dynamic',
        openapi: {
            info: {
                title: 'Agromate Server API',
                description: 'API for Agromate plant management application',
                version: '1.0.0',
                contact: {
                    name: 'Agromate Team',
                },
            },
            servers: [
                {
                    url: 'http://localhost:3000',
                    description: 'Server',
                },
            ],
            components: {
                securitySchemes: {
                    authorizationHeader: {
                        type: 'apiKey',
                        name: 'authorization',
                        in: 'header'
                    }
                }
            }
        },
    });

    await fastify.register(fastifySwaggerUi, {
        routePrefix: '/docs',
        uiConfig: {
            docExpansion: 'full',
            deepLinking: false,
        },
        staticCSP: false,
    });

    await fastify.register(formData);

    await fastify.register(fastifyStatic, {
        root: path.join(__dirname, '../../public'),
    });
}

