import {FastifyInstance} from "fastify";
import {PrismaClient} from "@prisma/client/extension";
import {isBase64JPG} from "../../app/utils";
import fs from "fs";
import path from "path";

export function updatePlant(fastify: FastifyInstance, prisma: PrismaClient) {
    fastify.put(
        '/plant',
        {
            schema: {
                tags: ['Plants'],
                summary: 'Update an existing plant',
                description: 'Update an existing plant entry in the database',
                headers: {
                    type: 'object',
                    properties: {
                        authorization: {type: 'string'}
                    },
                    required: ['authorization']
                },
                body: {
                    type: 'object',
                    properties: {
                        name: {type: 'string'},
                        image: {type: 'string'},
                        imageCopyright: {type: 'string'},
                        description: {type: 'string'},
                        temperatureMin: {type: 'number'},
                        temperatureMax: {type: 'number'},
                        targetHumidity: {type: 'number'},
                        lightColor: {type: 'string'},
                        lightIntensity: {type: 'number'},
                        lightDuration: {type: 'string'},
                        wateringFrequency: {type: ['number', 'null']},
                        waterQuantity: {type: 'number'},
                        soilMoisture: {type: ['number', 'null']},
                        humidificationFrequency: {type: ['number', 'null']},
                        humidificationDuration: {type: ['number', 'null']},
                        difficultyLevel: {type: 'number'},
                        docsArticle: {type: ['string', 'null'], pattern: '^[a-z0-9_-]+$', description: 'Article of the plant in the website docs (e.g. "basil")'},
                    }
                },
                response: {
                    200: {
                        description: 'Plant successfully updated',
                        type: 'object',
                        properties: {
                            success: {type: 'boolean'},
                            message: {type: 'string'},
                        },
                    },
                    400: {
                        description: 'Bad request due to invalid input',
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
                        }
                    },
                    404: {
                        description: 'Plant not found',
                        type: 'object',
                        properties: {
                            success: {type: 'boolean'},
                            message: {type: 'string'},
                        }
                    },
                    413: {
                        description: 'Image too large',
                        type: 'object',
                        properties: {
                            success: {type: 'boolean'},
                            message: {type: 'string'}
                        }
                    },
                    500: {
                        description: 'Error during plant update',
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
                if (!process.env.MAX_IMAGE_SIZE) {
                    throw new Error('Missing MAX_IMAGE_SIZE in .env');
                }

                const body = request.body as any;
                const id = body.id;

                const existingPlant = await prisma.plant.findUnique({
                    where: {id}
                });

                if (!existingPlant) {
                    return reply.status(404).send({
                        success: false,
                        message: 'Plant not found',
                    });
                }

                const wateringFrequency = body.wateringFrequency !== undefined ? body.wateringFrequency : existingPlant.wateringFrequency;
                const soilMoisture = body.soilMoisture !== undefined ? body.soilMoisture : existingPlant.soilMoisture;

                if ((wateringFrequency != null && soilMoisture != null) || (wateringFrequency == null && soilMoisture == null)) {
                    return reply.status(400).send({
                        success: false,
                        message: 'Bad Request: Either time-based irrigation or dryness-based irrigation can be set, not both. Please provide either wateringFrequency or soilMoisture',
                    });
                }

                const humidificationFrequency = body.humidificationFrequency !== undefined ? body.humidificationFrequency : existingPlant.humidificationFrequency;
                const humidificationDuration = body.humidificationDuration !== undefined ? body.humidificationDuration : existingPlant.humidificationDuration;

                if (humidificationFrequency != null && humidificationDuration == null) {
                    return reply.status(400).send({
                        success: false,
                        message: 'Bad Request: humidificationDuration must be provided when time-based humidification is set. Please provide humidificationDuration or set humidificationFrequency to null',
                    });
                }

                if (body.name !== undefined && (body.name.trim() === '' || /[^a-zA-Z0-9 ]/.test(body.name))) {
                    return reply.status(400).send({
                        success: false,
                        message: 'Bad Request: Name has invalid characters. Only letters, numbers and spaces are allowed.',
                    });
                }

                let newImagePath = existingPlant.image;

                if (body.image && !body.image.startsWith('/')) { // If it doesn't start with '/', we assume it's a new base64 image
                    const base64Data = body.image.replace(/^data:image\/\w+;base64,/, '');
                    if (!isBase64JPG(base64Data)) {
                        return reply.status(400).send({
                            success: false,
                            message: 'Bad Request: Image must be a base64-encoded JPG string.',
                        });
                    }

                    const buffer = Buffer.from(base64Data, 'base64');
                    if (buffer.length > +process.env.MAX_IMAGE_SIZE) {
                        return reply.status(413).send({
                            success: false,
                            message: 'Plant picture is too large. Maximum size is ' + process.env.MAX_IMAGE_SIZE + " bytes",
                        });
                    }

                    const nameToUse = body.name ? body.name.trim() : existingPlant.name.trim();
                    const fileName = nameToUse.replace(/ /g, '_') + "_" + Date.now() + ".jpg"; // Use timestamp to avoid cache issues
                    const plantImagePath = path.join(process.cwd(), 'public/plants/' + fileName);

                    // Delete old image if it's different and exists
                    if (existingPlant.image) {
                        const oldImagePath = path.join(process.cwd(), 'public/plants', existingPlant.image);
                        if (fs.existsSync(oldImagePath)) {
                            fs.unlinkSync(oldImagePath);
                        }
                    }

                    fs.writeFileSync(plantImagePath, buffer);
                    newImagePath = "/" + fileName;
                }

                const dataToUpdate = {...body, image: newImagePath};

                await prisma.plant.update({
                    where: {id},
                    data: dataToUpdate,
                });
            } catch (error) {
                console.log(error);
                fastify.log.error(error);
                return reply.status(500).send({
                    success: false,
                    message: 'Error during plant update. Check log for further information',
                });
            }

            return reply.send({success: true, message: 'Plant updated!'});
        },
    );
}
