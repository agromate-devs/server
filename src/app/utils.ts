import Fastify, { FastifyBaseLogger, FastifyReply, FastifyRequest } from 'fastify';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../../generated/prisma/client';
import jwt, { JwtPayload } from 'jsonwebtoken';

export function createFastifyApp() {
    const isDevelopment = process.env.NODE_ENV !== 'production';

    const pinoLogger =
        isDevelopment
            ? {
                level: 'debug',
                transport: {
                    // target: 'pino/file',
                    target: 'pino-pretty',
                    options: {
                        //destination: '/tmp/log.txt'
                        colorize: true,
                        translateTime: 'SYS:standard',
                        ignore: 'pid,hostname',
                    },
                    file: '/tmp/log.txt'
                },
                file: '/tmp/log.txt'
            }
            : {
                level: 'info',
                file: '/tmp/log.txt'
            };

    return Fastify({
        logger: pinoLogger,
    });
}

export function createPrismaClient() {
    const connectionString = `${process.env.DATABASE_URL}`;
    const adapter = new PrismaBetterSqlite3({ url: connectionString });

    return new PrismaClient({ adapter });
}

export function generateJWT(user: User): string {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        throw new Error('JWT_SECRET is not defined in environment variables');
    }

    return jwt.sign({ username: user.username }, jwtSecret, { expiresIn: '12h' });
}

/**
 * Extracts credentials from an HTTP Basic Authorization header.
 *
 * @param authorization - Value of the Authorization header
 * @returns Username and password; `null` if the header is missing, is not Basic or is malformed
 */
export function parseBasicAuth(authorization: string | undefined): { username: string; password: string } | null {
    if (!authorization?.startsWith('Basic ')) {
        return null;
    }

    const decoded = Buffer.from(authorization.slice('Basic '.length), 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator === -1) {
        return null;
    }

    return {
        username: decoded.slice(0, separator),
        password: decoded.slice(separator + 1),
    };
}

/**
 * Validates cookie and extracts the authenticated username.
 *
 * @param request - Fastify request object
 * @param reply - Fastify reply object
 * @param prisma - Prisma client of the DB
 * @returns The username if validation succeeds; `null` if an error response was sent
 *
 */
export async function validateAndExtractUsername(
    request: FastifyRequest,
    reply: FastifyReply,
    prisma: PrismaClient
): Promise<string | null> {
    let session = request.headers.authorization;
    const logger = request.server.log;

    if (!session) {
        logger.info('Missing session token in Authorization header');
        await reply.status(401).send({
            success: false,
            message: 'Unauthorized: Missing session token in Authorization header',
        });
        return null;
    }

    session = session.replace("Bearer ", "");

    if (prisma == null) {
        prisma = createPrismaClient(); // TODO: Understand why prisma sometimes became null
    }
    const sessionInfo = await prisma.session.findUnique({
        where: {
            token: session
        }
    });

    if (sessionInfo == null) {
        logger.info('Invalid session token');
        await reply.status(401).send({
            success: false,
            message: 'Unauthorized: Invalid session token in Authorization header',
        });
        return null;
    } else if (sessionInfo.expire < new Date()) {
        logger.info('Invalid expired session token');
        await prisma.session.delete({
            where: {
                token: session
            }
        });
        await reply.status(401).send({
            success: false,
            message: 'Unauthorized: Invalid session token in Authorization header',
        });
        return null;
    }

    return sessionInfo.username;
}

/**
 * Prepares the plant configuration for Agrosmart.
 *
 * Validates the request parameters based on the irrigation mode (time-based or soil-moisture-based)
 * and on the humidification mode (time-based or humidity-based).
 * Returns an object on success else null
 *
 * @param request - Body from the /agrosmart request.
 * @param logger - Fastify logger instance.
 * @param reply - Fastify reply instance.
 * @returns An object with plant config. null in case of failure
 */
export async function preparePlantConfiguration(request: AgrosmartBody, logger: FastifyBaseLogger, reply: FastifyReply): Promise<PlantConfig | null> {
    const {
        soilMoisture,
        targetHumidity,
        lightIntensity,
        temperatureMin,
        temperatureMax,
        lightDuration,
        lightColor,
        isTimeBasedIrrigationEnabled,
        wateringFrequency,
        waterQuantity,
        isTimeBasedHumidificationEnabled,
        humidificationFrequency,
        humidificationDuration
    } = request;

    if (isTimeBasedIrrigationEnabled && (wateringFrequency == null || waterQuantity == null)) {
        logger.warn('Watering frequency and duration must be provided when time-based irrigation is enabled');
        await reply.status(401).send({
            success: false,
            message: 'Watering frequency and duration must be provided when time-based irrigation is enabled'
        });
        return null;
    } else if (!isTimeBasedIrrigationEnabled && soilMoisture == null) {
        logger.warn('Soil moisture threshold must be provided when time-based irrigation is disabled');
        await reply.status(401).send({
            success: false,
            message: 'Soil moisture threshold must be provided when time-based irrigation is disabled'
        });
        return null;
    }

    if (isTimeBasedHumidificationEnabled && (humidificationFrequency == null || humidificationDuration == null)) {
        logger.warn('Humidification frequency and duration must be provided when time-based humidification is enabled');
        await reply.status(401).send({
            success: false,
            message: 'Humidification frequency and duration must be provided when time-based humidification is enabled'
        });
        return null;
    }

    return {
        soilMoisture,
        targetHumidity,
        lightIntensity,
        temperatureMin,
        temperatureMax,
        lightDuration,
        lightColor,
        isTimeBasedIrrigationEnabled,
        wateringFrequency,
        waterQuantity,
        isTimeBasedHumidificationEnabled,
        humidificationFrequency,
        humidificationDuration
    };
}


/**
 * Checks if a base64 string represents a JPG image.
 *
 * Decodes the base64 string into a buffer and verifies the presence of the JPG file signature:
 *
 * @param {string} base64 - Base64 string (without data URL prefix) to check.
 * @returns {boolean} True if the string represents a valid JPG image, false otherwise.
 */
export function isBase64JPG(base64: string): boolean {
    const buffer = Buffer.from(base64, 'base64');
    // JPEG signature: first two bytes 0xFF 0xD8, last two bytes 0xFF 0xD9
    return (
        buffer.length > 4 &&
        buffer[0] === 0xFF &&
        buffer[1] === 0xD8 &&
        buffer[buffer.length - 2] === 0xFF &&
        buffer[buffer.length - 1] === 0xD9
    );
}