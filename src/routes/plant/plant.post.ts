import { FastifyInstance } from "fastify";
import type { PrismaClient } from "../../../generated/prisma/client";
import { isBase64JPG } from "../../app/utils";
import fs from "fs";
import path from "path";

export function addPlant(fastify: FastifyInstance, prisma: PrismaClient) {
    fastify.post(
        '/plant',
        {
            schema: {
                tags: ['Plants'],
                summary: 'Add a new plant',
                description: 'Create a new plant entry in the database',
                headers: {
                    type: 'object',
                    properties: {
                        authorization: { type: 'string' }
                    },
                    required: ['authorization']
                },
                body: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        image: { type: 'string' },
                        imageCopyright: { type: 'string' },
                        description: { type: 'string' },
                        temperatureMin: { type: 'number' },
                        temperatureMax: { type: 'number' },
                        targetHumidity: { type: 'number' },
                        lightColor: { type: ['string'] },
                        lightIntensity: { type: ['number'] },
                        lightDuration: { type: ['number'] },
                        wateringFrequency: { type: ['number', 'null'] },
                        waterQuantity: { type: 'number' },
                        soilMoisture: { type: ['number', 'null'] },
                        humidificationFrequency: { type: ['number', 'null'] },
                        humidificationDuration: { type: ['number', 'null'] },
                        docsArticle: { type: ['string', 'null'], pattern: '^[a-z0-9_-]+$', description: 'Article of the plant in the website docs (e.g. "basil")' },
                    },
                    required: [
                        'name',
                        'image',
                        'imageCopyright',
                        'description',
                        'temperatureMin',
                        'temperatureMax',
                        'targetHumidity',
                        'lightColor',
                        'lightIntensity',
                        'lightDuration',
                    ],
                },
                response: {
                    200: {
                        description: 'Plant successfully created',
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' },
                        },
                    },
                    400: {
                        description: 'Bad request due to invalid input',
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
                        }
                    },
                    413: {
                        description: 'Image too large',
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' }
                        }
                    },
                    500: {
                        description: 'Error during plant creation',
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
                if (!process.env.MAX_IMAGE_SIZE) {
                    throw new Error('Missing MAX_IMAGE_SIZE in .env');
                }

                const body = request.body as PlantEntry;

                if ((body.wateringFrequency != null && body.soilMoisture != null) || (body.wateringFrequency == null && body.soilMoisture == null)) {
                    return reply.status(400).send({
                        success: false,
                        message: 'Bad Request: Either time-based irrigation or dryness-based irrigation can be set, not both. Please provide either wateringFrequency or soilMoisture',
                    });
                } else if (body.humidificationFrequency != null && body.humidificationDuration == null) {
                    return reply.status(400).send({
                        success: false,
                        message: 'Bad Request: humidificationDuration must be provided when time-based humidification is set. Please provide humidificationDuration or set humidificationFrequency to null',
                    });
                } else if (!isBase64JPG(body.image)) {
                    return reply.status(400).send({
                        success: false,
                        message: 'Bad Request: Image must be a base64-encoded JPG string.',
                    });
                } else if (body.name.trim() === '' || /[^a-zA-Z0-9 ]/.test(body.name)) {
                    return reply.status(400).send({
                        success: false,
                        message: 'Bad Request: Name has invalid characters. Only letters, numbers and spaces are allowed.',
                    });
                }

                const base64Data = body.image.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                if (buffer.length > +process.env.MAX_IMAGE_SIZE) {
                    return reply.status(413).send({
                        success: false,
                        message: 'Profile picture is too large. Maximum size is ' + process.env.MAX_IMAGE_SIZE + " bytes",
                    });
                }
                const fileName = body.name.trim().replace(/ /g, '_') + ".jpg";
                const plantImagePath = path.join(process.cwd(), 'public/plants/' + fileName);

                fs.writeFileSync(plantImagePath, buffer);

                body.image = "/" + fileName;

                await prisma.plant.create({
                    data: body,
                });
            } catch (error) {
                console.log(error);
                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    message: 'Error during plant creation. Check log for further information',
                });
            }

            return reply.send({ success: true, message: 'Plant created!' });
        },
    );
}