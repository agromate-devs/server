import 'dotenv/config';
import {createFastifyApp, createPrismaClient} from './utils';
import {registerPlugins} from './registerPlugins';
import {registerRoutes} from '../routes';
import MqttService from './mqtt';
import InfluxDBConnector from "./influxdb";
import {setAuthHooks} from "./authHooks";
import {startMetricsNotifier} from "../workers/metricsNotifier";

const fastify = createFastifyApp();
const prisma = createPrismaClient();

export async function startServer() {
    MqttService.setLogger(fastify.log);
    InfluxDBConnector.setLogger(fastify.log);

    await registerPlugins(fastify);
    await registerRoutes(fastify, prisma);
    setAuthHooks(fastify, prisma);

    try {
        await fastify.ready();
        await fastify.listen({port: 3000, host: '0.0.0.0'});
        fastify.log.info('Server ready at: http://localhost:3000');
        startMetricsNotifier(fastify.log);
    } catch (err) {
        fastify.log.error(err, 'Failed to start server');
        process.exit(1);
    }
}

