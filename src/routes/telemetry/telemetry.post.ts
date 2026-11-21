import {FastifyInstance} from "fastify";
import {PrismaClient} from "@prisma/client/extension";

interface TelemetryBody {
    message: string;
}

export function postTelemetry(fastify: FastifyInstance, prisma: PrismaClient) {
    fastify.post<{ Body: TelemetryBody }>(
        '/telemetry',
        {
            schema: {
                tags: ['Telemetry'],
                summary: 'Log a telemetry message',
                description: 'Accepts a textual telemetry message authenticated via macAddress header',
                headers: {
                    type: 'object',
                    properties: {
                        macaddress: {type: 'string'}
                    },
                    required: ['macaddress']
                },
                body: {
                    type: 'object',
                    properties: {
                        message: {type: 'string'},
                    },
                    required: ['message'],
                },
                response: {
                    200: {
                        description: 'Telemetry logged successfully',
                        type: 'object',
                        properties: {
                            success: {type: 'boolean'},
                            message: {type: 'string'},
                        },
                    },
                    401: {
                        description: 'Unauthorized — invalid or missing macAddress',
                        type: 'object',
                        properties: {
                            success: {type: 'boolean'},
                            message: {type: 'string'},
                        },
                    },
                    500: {
                        description: 'Error during telemetry logging',
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
                const macAddress = request.headers.macaddress as string | undefined;

                if (!macAddress) {
                    return reply.status(401).send({
                        success: false,
                        message: 'Unauthorized: Missing macAddress header',
                    });
                }

                // Validate macAddress format: exactly 12 uppercase hex characters
                const macRegex = /^[0-9A-F]{12}$/;
                if (!macRegex.test(macAddress)) {
                    return reply.status(401).send({
                        success: false,
                        message: 'Unauthorized: Invalid macAddress format. Expected 12 uppercase hex characters (e.g. AABBCCDDEEFF)',
                    });
                }

                // Verify the macAddress exists in the database
                const agrosmart = await prisma.agrosmart.findUnique({
                    where: {macAddress},
                });

                if (!agrosmart) {
                    return reply.status(401).send({
                        success: false,
                        message: 'Unauthorized: Unknown macAddress',
                    });
                }

                const {message} = request.body;

                fastify.log.info({macAddress, message}, 'Telemetry message received');

                return reply.send({
                    success: true,
                    message: 'Telemetry logged successfully',
                });
            } catch (error) {
                console.log(error);
                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    message: 'Error during telemetry logging. Check log for further information',
                });
            }
        },
    );
}