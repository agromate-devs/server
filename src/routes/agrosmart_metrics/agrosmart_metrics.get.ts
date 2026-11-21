import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client/extension";
import InfluxDBConnector from "../../app/influxdb";

const influxClient = InfluxDBConnector.getQueryClient();

export function getAgrosmartMetrics(fastify: FastifyInstance, prisma: PrismaClient) {
    fastify.get(
        '/agrosmart_metrics',
        {
            schema: {
                tags: ['Agrosmart Metrics'],
                summary: 'Get metrics for a specific sensor',
                description: 'Retrieve metrics data (temperature, humidity, soil moisture, last irrigation, water reserve) for a specific sensor ID',
                headers: {
                    type: 'object',
                    properties: {
                        authorization: { type: 'string' }
                    },
                    required: ['authorization']
                },
                querystring: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', description: 'Agrosmart ID' },
                        limit: { type: 'number', description: 'Limit the number of results' },
                    },
                    required: ['id', 'limit'],
                },
                response: {
                    200: {
                        description: 'Successfully retrieved metrics',
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            data: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    additionalProperties: true,
                                    properties: {
                                        temperature: {
                                            type: ['number'],
                                            description: "Temperature in the agrosmart room"
                                        },
                                        humidity: {
                                            type: ['number'],
                                            description: "Humidity in the agrosmart room"
                                        },
                                        soil_moisture: {
                                            type: ['number'],
                                            description: "Soil moisture in the plant measured by the probe"
                                        },
                                        last_irrigation: {
                                            type: ['number'],
                                            description: 'Epoch time (seconds) of the last irrigation, 0 if never irrigated',
                                        },
                                        water_reserve: {
                                            type: ['boolean'],
                                            description: 'True if the water tank level sensor reports the reserve',
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: {
                        description: 'Missing required parameter',
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' },
                        },
                    },
                    401: {
                        description: 'Unauthorized request',
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' },
                        },
                    },
                    403: {
                        description: 'Forbidden request',
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' },
                        },
                    },
                    500: {
                        description: 'Internal server error',
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' },
                        },
                    },
                },
            },
        },
        async function handler(request, reply) {
            try {
                const { id, limit } = request.query as { id: string, limit: number };
                const logger = request.server.log;

                const ownedAgrosmart = await prisma.agrosmart.findFirst({
                    where: {
                        macAddress: id,
                        username: request.user,
                    },
                });

                if (!ownedAgrosmart) {
                    logger.info({ id, user: request.user }, 'Access denied: agrosmart not associated with authenticated user');
                    return reply.status(403).send({
                        success: false,
                        message: 'Forbidden: agrosmart does not belong to authenticated user',
                    });
                }

                const bucket = process.env.INFLUX_BUCKET;
                if (bucket == null) {
                    throw new Error("Missing bucket in env");
                }

                const query = `from(bucket:"${bucket}") 
                                |> range(start: 0) 
                                |> filter(fn: (r) => r._measurement == "mqtt_consumer")
                                |> filter(fn: (r) => r["id"] == "${id}")
                                |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
                                |> filter(fn: (r) => not exists r.type or r.type == "metric")
                                |> keep(columns: ["_time", "temperature", "humidity", "soil_moisture", "last_irrigation", "water_reserve"])
                                |> sort(columns: ["_time"], desc: true)
                                |> limit(n:${limit}, offset: 0)`;

                const result = await influxClient.collectRows(query);

                return reply.send({
                    success: true,
                    data: result,
                });
            } catch (error) {
                console.log(error);
                return reply.status(500).send({
                    success: false,
                    message: 'Error retrieving metrics. Check log for further information',
                });
            }
        },
    );
}