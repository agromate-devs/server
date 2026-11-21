import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Prisma } from '../generated/prisma/client';

// Validates prisma/seed/plants.json before `prisma/seed.ts` writes it to the database.
// Prints every problem found and exits with code 1 if there is at least one error
// (or at least one warning with --strict, used by the CI workflow).
//
// Format: { "version": <seed version>, "plants": [ { "id": <seed id>, "lastUpdate": <version>, ... } ] }
// - "version" must be increased every time a plant is added or changed.
// - "idSeed" (required) identifies the plant inside the seed; it is not the database id.
// - Unrecognized fields are reported as warnings and ignored by the seed.
// - "lastUpdate" is the seed version in which the plant was last added/changed: set it to the new
//   "version" when editing a plant: the seed checks only the plants with "lastUpdate" greater than
//   the version stored in the SeedVersion table.

const plantsFile = fileURLToPath(new URL('./seed/plants.json', import.meta.url));
const imagesDir = fileURLToPath(new URL('../public/plants/', import.meta.url));

// The database id is assigned by the database, the plant is identified by "idSeed"
const knownFields = new Set<string>(Object.values(Prisma.PlantScalarFieldEnum));
knownFields.delete('id');
knownFields.add('lastUpdate'); // seed-only field, not stored in Plant

type Plant = Record<string, unknown>;

const strict = process.argv.includes('--strict');

// Article name in the website docs (e.g. "basil" -> <docs>/docs?article=basil)
const DOCS_ARTICLE_REGEX = /^[a-z0-9_-]+$/;

const errors: string[] = [];
const warnings: string[] = [];

const isInt = (v: unknown): v is number => Number.isInteger(v);
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isNil = (v: unknown) => v === null || v === undefined;

function validatePlant(plant: Plant, label: string, version: unknown) {
    const error = (msg: string) => errors.push(`${label}: ${msg}`);

    for (const field of Object.keys(plant)) {
        if (!knownFields.has(field)) warnings.push(`${label}: unknown field "${field}" (ignored by the seed)`);
    }

    const { lastUpdate } = plant;
    if (!(isInt(lastUpdate) && lastUpdate > 0)) {
        error('"lastUpdate" is required and must be a positive integer (seed version of the last change)');
    } else if (isInt(version) && lastUpdate > version) {
        error(`"lastUpdate" (${lastUpdate}) can't be greater than the seed "version" (${version})`);
    }

    // Required strings
    for (const field of ['name', 'description', 'image', 'imageCopyright']) {
        if (typeof plant[field] !== 'string' || (plant[field] as string).trim() === '') {
            error(`"${field}" must be a non-empty string`);
        }
    }
    if (typeof plant.image === 'string' && plant.image !== '' && !existsSync(imagesDir + plant.image)) {
        warnings.push(`${label}: image "${plant.image}" not found in public/plants/`);
    }

    // Optional fields with a database default: checked only when present
    const { temperatureMin, temperatureMax, targetHumidity, lightColor, lightIntensity, lightDuration, difficultyLevel } = plant;

    if (!isNil(temperatureMin) && !isNumber(temperatureMin)) error('"temperatureMin" must be a number');
    if (!isNil(temperatureMax) && !isNumber(temperatureMax)) error('"temperatureMax" must be a number');
    if (isNumber(temperatureMin) && isNumber(temperatureMax) && temperatureMin >= temperatureMax) {
        error(`"temperatureMin" (${temperatureMin}) must be lower than "temperatureMax" (${temperatureMax})`);
    }

    if (!isNil(targetHumidity) && !(isInt(targetHumidity) && targetHumidity >= 0 && targetHumidity <= 100)) {
        error('"targetHumidity" must be an integer between 0 and 100');
    }

    // ARGB color as the decimal string of a 32-bit unsigned integer (e.g. "4294901760" = 0xFFFF0000)
    if (!isNil(lightColor) && !(typeof lightColor === 'string' && /^\d+$/.test(lightColor) && Number(lightColor) <= 0xffffffff)) {
        error('"lightColor" must be the decimal string of a 32-bit ARGB color (0-4294967295)');
    }

    if (!isNil(lightIntensity) && !(isInt(lightIntensity) && lightIntensity >= 0 && lightIntensity <= 10)) {
        error('"lightIntensity" must be an integer between 0 and 10');
    }

    if (!isNil(lightDuration)) {
        const match = typeof lightDuration === 'string' && /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(lightDuration);
        const [, h1, m1, h2, m2] = match ? match.map(Number) : [];
        if (!match || h1 > 23 || h2 > 23 || m1 > 59 || m2 > 59) {
            error('"lightDuration" must be in the format "HH:MM-HH:MM" (e.g. "09:00-17:00")');
        } else if (h1 * 60 + m1 === h2 * 60 + m2) {
            error('"lightDuration" start and end must be different');
        }
    }

    if (!isNil(difficultyLevel) && !(isInt(difficultyLevel) && difficultyLevel >= 1 && difficultyLevel <= 5)) {
        error('"difficultyLevel" must be an integer between 1 and 5');
    }

    // Article of the plant in the website docs (<docs>/docs?article=<docsArticle>): required for default plants,
    // it's the name of the page docs/plants/<docsArticle>.{en,it}.md in the website repository
    const { docsArticle } = plant;
    if (!(typeof docsArticle === 'string' && DOCS_ARTICLE_REGEX.test(docsArticle))) {
        error('"docsArticle" is required and must be a lowercase slug of letters, numbers, "-" or "_" (e.g. "basil"): the name of the plant page in the website docs');
    }

    // Irrigation: time based when wateringFrequency is set, soil-moisture based otherwise
    const { wateringFrequency, soilMoisture, waterQuantity } = plant;
    if (!isNil(wateringFrequency) && !(isInt(wateringFrequency) && wateringFrequency > 0)) {
        error('"wateringFrequency" must be a positive integer (hours) or null');
    }
    if (!isNil(soilMoisture) && !(isInt(soilMoisture) && soilMoisture >= 0 && soilMoisture <= 100)) {
        error('"soilMoisture" must be an integer between 0 and 100 or null');
    }
    if (!isNil(wateringFrequency) && !isNil(soilMoisture)) {
        error('set either "wateringFrequency" (time-based irrigation) or "soilMoisture" (moisture-based irrigation), not both');
    } else if (isNil(wateringFrequency) && isNil(soilMoisture)) {
        error('one of "wateringFrequency" (time-based irrigation) or "soilMoisture" (moisture-based irrigation) is required');
    }
    if (!(isInt(waterQuantity) && waterQuantity > 0)) error('"waterQuantity" is required and must be a positive integer');

    // Humidification: time based when humidificationFrequency is set, targetHumidity based otherwise
    const { humidificationFrequency, humidificationDuration } = plant;
    if (!isNil(humidificationFrequency)) {
        if (!(isInt(humidificationFrequency) && humidificationFrequency > 0)) {
            error('"humidificationFrequency" must be a positive integer (hours) or null');
        }
        if (!(isInt(humidificationDuration) && humidificationDuration > 0)) {
            error('"humidificationDuration" (minutes) is required when "humidificationFrequency" is set (time-based humidification)');
        }
    } else if (!isNil(humidificationDuration)) {
        error('"humidificationDuration" must be null when "humidificationFrequency" is null (humidity-based humidification)');
    }
}

function main() {
    let seed: unknown;
    try {
        seed = JSON.parse(readFileSync(plantsFile, 'utf8'));
    } catch (err) {
        console.error(`Cannot read ${plantsFile}: ${(err as Error).message}`);
        process.exit(1);
    }
    if (typeof seed !== 'object' || seed === null || Array.isArray(seed)) {
        console.error(`${plantsFile} must contain an object { "version": <number>, "plants": [...] }`);
        process.exit(1);
    }
    const { version, plants, ...extra } = seed as Record<string, unknown>;
    for (const field of Object.keys(extra)) warnings.push(`unknown top-level field "${field}" (ignored by the seed)`);
    if (!(isInt(version) && version > 0)) errors.push('"version" is required and must be a positive integer');
    if (!Array.isArray(plants)) {
        console.error(`${plantsFile}: "plants" must be a JSON array of plants`);
        process.exit(1);
    }

    const ids = new Map<number, number>();
    const names = new Map<string, number>();

    plants.forEach((plant: unknown, index) => {
        if (typeof plant !== 'object' || plant === null || Array.isArray(plant)) {
            errors.push(`plant at index ${index}: must be an object`);
            return;
        }
        const p = plant as Plant;
        const label = `plant at index ${index}${typeof p.name === 'string' ? ` ("${p.name}")` : ''}`;

        if (!(isInt(p.idSeed) && p.idSeed > 0)) {
            errors.push(`${label}: "idSeed" is required and must be a positive integer`);
        } else if (ids.has(p.idSeed)) {
            errors.push(`${label}: duplicate idSeed ${p.idSeed} (already used at index ${ids.get(p.idSeed)})`);
        } else {
            ids.set(p.idSeed, index);
        }

        if (typeof p.name === 'string') {
            const key = p.name.trim().toLowerCase();
            if (names.has(key)) warnings.push(`${label}: same name as plant at index ${names.get(key)}`);
            else names.set(key, index);
        }

        validatePlant(p, label, version);
    });

    if (isInt(version) && plants.length > 0 && !plants.some((p) => (p as Plant).lastUpdate === version)) {
        warnings.push(`no plant has "lastUpdate" equal to the seed version ${version}: was "version" bumped without changing a plant?`);
    }

    for (const w of warnings) console.warn(`WARNING ${w}`);
    for (const e of errors) console.error(`ERROR ${e}`);

    if (errors.length > 0) {
        console.error(`\nplants.json is invalid: ${errors.length} error(s). The seed was not run.`);
        process.exit(1);
    }
    if (strict && warnings.length > 0) {
        console.error(`\nplants.json has ${warnings.length} warning(s), not allowed with --strict.`);
        process.exit(1);
    }

    if(warnings.length > 0)
        console.log(`plants.json has valid fields but there are some warning: version ${version}, ${plants.length} plant(s), ${warnings.length} warning(s).`);
    else
        console.log(`plants.json is valid: version ${version}, ${plants.length} plant(s), ${warnings.length} warning(s).`);
}

main();
