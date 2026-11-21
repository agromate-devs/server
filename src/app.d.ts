export { };

declare global {
    interface User {
        username: string;
        pswHash: string;
        profileImage: string | null;
    }

    interface PlantEntry {
        name: string;
        image: string;
        imageCopyright: string;
        description: string;
        temperatureMin: number;
        temperatureMax: number;
        humidity: number;
        lightColor: string;
        lightIntensity: number;
        lightDuration: string;
        wateringFrequency: number | null;
        waterQuantity: number;
        soilMoisture: number | null;
        humidificationFrequency: number | null;
        humidificationDuration: number | null;
        plantColor: string;
    }

    interface PlantConfig {
        soilMoisture: number | null;
        targetHumidity: number;
        lightIntensity: number;
        temperatureMin: number;
        temperatureMax: number;
        lightDuration: number;
        lightColor: string;
        isTimeBasedIrrigationEnabled: boolean;
        wateringFrequency: number; // Hours between irrigations
        waterQuantity: number; // Minutes per irrigation
        isTimeBasedHumidificationEnabled: boolean;
        humidificationFrequency: number; // Hours between humidifications
        humidificationDuration: number; // Minutes per humidification
        type?: string;
        [key: string]: any; // For prisma update
    }

    interface AgrosmartBody extends PlantConfig {
        macAddress: string;
        alias: string | null;
        espPassword: string | null;
        plantID: string | null;
    }
}

declare module 'fastify' {
    interface FastifyRequest {
        user: string;
    }
}