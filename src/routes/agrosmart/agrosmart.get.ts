import {FastifyInstance} from "fastify";
import {PrismaClient} from "../../../generated/prisma/client";

export function getAgrosmarts(fastify: FastifyInstance, prisma: PrismaClient) {
    fastify.get(
        '/agrosmart',
        {
            schema: {
                tags: ['Agrosmart'],
                summary: 'Get all Agrosmarts for a specific user',
                description: 'Retrieve all agrosmarts associated with a user, including plant details',
                headers: {
                    type: 'object',
                    properties: {
                        authorization: {type: 'string'}
                    },
                    required: ['authorization']
                },
                response: {
                    200: {
                        description: 'Successfully retrieved agrosmarts',
                        type: 'object',
                        properties: {
                            success: {type: 'boolean'},
                            data: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        macAddress: {type: 'string'},
                                        username: {type: 'string'},
                                        plantID: {type: 'number'},
                                        alias: {type: ['string', 'null']},
                                        plantConfig: {
                                            type: 'object',
                                            properties: {
                                                soilMoisture: {type: ['number', 'null']},
                                                targetHumidity: {type: 'number'},
                                                temperatureMin: {type: 'number'},
                                                temperatureMax: {type: 'number'},
                                                lightColor: {type: ['string']},
                                                lightIntensity: {type: ['number', 'null']},
                                                lightDuration: {type: ['string']},
                                                wateringFrequency: {type: ['number', 'null']},
                                                waterQuantity: {type: ['number', 'null']},
                                                isTimeBasedIrrigationEnabled: {type: ['boolean']},
                                                humidificationFrequency: {type: ['number', 'null']},
                                                humidificationDuration: {type: ['number', 'null']},
                                                isTimeBasedHumidificationEnabled: {type: ['boolean']},
                                            },
                                        },
                                        plant: {
                                            type: 'object',
                                            properties: {
                                                id: {type: 'number'},
                                                image: {type: 'string'},
                                                imageCopyright: {type: 'string'},
                                                description: {type: 'string'},
                                                name: {type: 'string'},
                                                temperatureMin: {type: 'number'},
                                                temperatureMax: {type: 'number'},
                                                targetHumidity: {type: 'number'},
                                                lightColor: {type: ['string']},
                                                lightIntensity: {type: ['number', 'null']},
                                                lightDuration: {type: 'string'},
                                                wateringFrequency: {type: ['number', 'null']},
                                                soilMoisture: {type: ['number', 'null']},
                                                humidificationFrequency: {type: ['number', 'null']},
                                                humidificationDuration: {type: ['number', 'null']},
                                                difficultyLevel: {type: ['number', 'null']},
                                                plantColor: {type: 'number'},
                                                docsArticle: {type: ['string', 'null'], description: 'Article of the plant in the website docs (e.g. "basil"), the client builds the URL'},
                                            },
                                        },
                                    },
                                },
                            },
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
                const username = request.user;

                const agrosmarts = await prisma.agrosmart.findMany({
                    where: {
                        username: username,
                    },
                    include: {
                        plant: true,
                    },
                });

                return reply.send({
                    success: true,
                    data: agrosmarts,
                });
            } catch (error) {
                console.log(error);
                return reply.status(500).send({
                    success: false,
                    message: 'Error retrieving agrosmarts. Check log for further information',
                });
            }
        },
    );
}
