import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { createPrismaClient } from '../src/app/utils';
import { Prisma, type Plant } from '../generated/prisma/client';

// Writes prisma/seed/plants.json (validated by prisma/validatePlants.ts) to the database.
//
// Seed plants are matched by Plant.idSeed (the "idSeed" in the JSON), never by the database id, so plants
// added by users (idSeed = NULL) are never touched. The seed version applied to the database is stored
// in the SeedVersion table and updated at the end of every run: a plant is checked only when it is
// missing or its "lastUpdate" in the JSON is greater than that version; pass --all to check every plant.
// Pass --force to ignore the version stored in the database: every plant is checked (like --all), the seed runs even
// if plants.json is older than the stored version, and the stored version is overwritten with the one of plants.json.
// Combine it with --yes to update every changed plant without asking.

type SeedPlant = Omit<Prisma.PlantUncheckedCreateInput, 'id' | 'idSeed'> & { idSeed: number; lastUpdate: number };
type SeedFile = { version: number; plants: SeedPlant[] };
type PlantData = Omit<Prisma.PlantUncheckedCreateInput, 'id'> & { idSeed: number };
type Entry = { data: PlantData; lastUpdate: number };

const SEED_NAME = 'plants';
const plantsFile = fileURLToPath(new URL('./seed/plants.json', import.meta.url));
const seed = JSON.parse(readFileSync(plantsFile, 'utf8')) as SeedFile;
const autoYes = process.argv.includes('--yes') || process.argv.includes('-y');
const force = process.argv.includes('--force');
const checkAll = force || process.argv.includes('--all');

const nullableFields = [
    'wateringFrequency',
    'soilMoisture',
    'humidificationFrequency',
    'humidificationDuration'
] as const;

// Plant columns the JSON can set (the database id is autoincrement); other fields are ignored
const plantFields = Object.values(Prisma.PlantScalarFieldEnum).filter((f) => f !== 'id');

// Bookkeeping fields: not shown as changes, but always written on create/update
const ignoredInDiff = new Set(['id', 'idSeed']);

type Change = { field: string; from: any; to: any };

function normalize(plant: SeedPlant): Entry {
    if (plant.idSeed === undefined) throw new Error(`Plant "${plant.name}" is missing idSeed`);
    const known = Object.fromEntries(Object.entries(plant).filter(([field]) => (plantFields as string[]).includes(field)));
    const data = known as PlantData;
    for (const field of nullableFields) (data as Record<string, unknown>)[field] = plant[field] ?? null;
    return { data, lastUpdate: plant.lastUpdate };
}

function diff(existing: Record<string, any>, data: PlantData): Change[] {
    return Object.entries(data)
        .filter(([field, value]) => !ignoredInDiff.has(field) && existing[field] !== value)
        .map(([field, to]) => ({ field, from: existing[field], to }));
}

const show = (value: object) => (value === null || value === undefined ? 'NULL' : JSON.stringify(value));

async function main() {
    const prisma = createPrismaClient();
    const rl = process.stdin.isTTY && !autoYes ? createInterface({ input: process.stdin, output: process.stdout }) : null;
    try {
        const seedVersion = await prisma.seedVersion.findUnique({ where: { name: SEED_NAME } });
        const dbVersion = seedVersion?.version ?? 0;
        if (force) {
            console.log(`--force: ignoring the seed version ${seedVersion ? dbVersion : '(never seeded)'} stored in the database.`);
        } else if (seed.version < dbVersion) {
            throw new Error(
                `plants.json has version ${seed.version}, older than the version ${dbVersion} applied to the database. Aborting (pass --force to apply it anyway).`,
            );
        }
        console.log(`Seed version: ${seed.version} (database: ${seedVersion ? dbVersion : 'never seeded'}).`);

        const entries = seed.plants.map(normalize);
        const seedIds = entries.map((e) => e.data.idSeed);

        const existing = new Map<number, Plant>(
            (await prisma.plant.findMany({ where: { idSeed: { in: seedIds } } })).map((p) => [p.idSeed!, p]),
        );

        const toCreate: PlantData[] = [];
        const toUpdate: { id: number; data: PlantData }[] = [];
        let updateAll = autoYes;
        let skipAll = false;
        let upToDate = 0;
        let unchanged = 0;
        let skipped = 0;

        for (const { data: plant, lastUpdate } of entries) {
            const current = existing.get(plant.idSeed);
            if (!current) {
                toCreate.push(plant);
                continue;
            }
            if (!checkAll && lastUpdate <= dbVersion) {
                upToDate++;
                continue;
            }
            const changes = diff(current, plant);
            if (changes.length === 0) {
                unchanged++;
                continue;
            }

            console.log(
                `\nPlant #${current.id} "${current.name}" (seed id ${plant.idSeed}, changed in version ${lastUpdate}) already exists, these fields would change:`,
            );
            for (const { field, from, to } of changes) console.log(`  - ${field}: ${show(from)} -> ${show(to)}`);

            if (updateAll) {
                toUpdate.push({ id: current.id, data: plant });
                continue;
            }
            if (skipAll) {
                skipped++;
                continue;
            }
            if (rl == null) {
                console.log('  Not updated (non-interactive shell, pass --yes to apply updates).');
                skipped++;
                continue;
            }

            // A closed stdin (Ctrl+D) counts as "skip all".
            const answer = (
                await rl.question('Update it? [y]es / [n]o / [a]ll / [s]kip all: ').catch(() => 's')
            ).trim().toLowerCase();
            if (answer === 'a') updateAll = true;
            if (answer === 's') skipAll = true;
            if (answer === 'y' || answer === 'a') toUpdate.push({ id: current.id, data: plant });
            else skipped++;
        }

        // Skipped plants are not proposed again once the version is stored: use --all to review them.
        await prisma.$transaction([
            ...toCreate.map((plant) => prisma.plant.create({ data: plant })),
            ...toUpdate.map(({ id, data }) => prisma.plant.update({ where: { id }, data })),
            prisma.seedVersion.upsert({
                where: { name: SEED_NAME },
                create: { name: SEED_NAME, version: seed.version },
                update: { version: seed.version },
            }),
        ]);

        console.log(
            `\nCreated: ${toCreate.length}, updated: ${toUpdate.length}, skipped: ${skipped}, unchanged: ${unchanged}, up to date: ${upToDate}.`,
        );
        console.log(`Database seed version set to ${seed.version}.`);
    } finally {
        rl?.close();
        await prisma.$disconnect();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
