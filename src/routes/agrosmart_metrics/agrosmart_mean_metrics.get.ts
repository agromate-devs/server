import {FastifyInstance} from "fastify";
import {PrismaClient} from "@prisma/client/extension";
import InfluxDBConnector from "../../app/influxdb";

const influxClient = InfluxDBConnector.getQueryClient();

export function getAgrosmartMeanMetrics(fastify: FastifyInstance, prisma: PrismaClient) {
    fastify.get(
        '/agrosmart_mean_metrics',
        {
            schema: {
                tags: ['Agrosmart Metrics'],
                summary: 'Get mean metrics for a specific sensor',
                description: 'Retrieve mean metrics data (temperature, humidity) for a specific sensor ID',
                headers: {
                    type: 'object',
                    properties: {
                        authorization: {type: 'string'}
                    },
                    required: ['authorization']
                },
                querystring: {
                    type: 'object',
                    properties: {
                        id: {type: 'string', description: 'Agrosmart ID'},
                        interval: {type: 'number', description: 'Interval of metrics to select in hours'},
                        time_window: {
                            type: 'number',
                            description: 'Time window for the aggregation of interval for mean metrics in hours',
                        },
                    },
                    required: ['id', 'interval', 'time_window'],
                },
                response: {
                    200: {
                        description: 'Successfully retrieved metrics',
                        type: 'object',
                        properties: {
                            success: {type: 'boolean'},
                            data: {type: 'array'},
                        },
                    },
                    400: {
                        description: 'Missing required parameter',
                        type: 'object',
                        properties: {
                            success: {type: 'boolean'},
                            message: {type: 'string'},
                        },
                    },
                    401: {
                        description: 'Unauthorized request',
                        type: 'object',
                        properties: {
                            success: {type: 'boolean'},
                            message: {type: 'string'},
                        },
                    },
                    403: {
                        description: 'Forbidden request',
                        type: 'object',
                        properties: {
                            success: {type: 'boolean'},
                            message: {type: 'string'},
                        },
                    },
                    500: {
                        description: 'Internal server error',
                        type: 'object',
                        properties: {
                            success: {type: 'boolean'},
                            message: {type: 'string'},
                        },
                    },
                },
            },
        },
        async function handler(request, reply) {
            try {
                const {id, interval, time_window} = request.query as {
                    id: string,
                    interval: number,
                    time_window: number
                };
                const logger = request.server.log;

                const username = request.user;

                const ownedAgrosmart = await prisma.agrosmart.findFirst({
                    where: {
                        macAddress: id,
                        username,
                    },
                });

                if (!ownedAgrosmart) {
                    logger.info({id, username}, 'Access denied: agrosmart not associated with authenticated user');
                    return reply.status(403).send({
                        success: false,
                        message: 'Forbidden: agrosmart does not belong to authenticated user',
                    });
                }

                const query = `from(bucket:"agromate")
                    |> range(start: -${time_window}d)
                    |> filter(fn: (r) => r._measurement == "mqtt_consumer")
                    |> filter(fn: (r) => r["id"] == "${id}")
                    |> filter(fn: (r) => r._field == "temperature" or r._field == "humidity" or r._field == "soil_moisture")
                    |> aggregateWindow(every: ${interval}h, fn: mean, createEmpty: false)
                    |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
                    |> keep(columns: ["_time", "temperature", "humidity", "soil_moisture"])`;
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