-- Plants created by the seed are linked to their id in prisma/seed/plants.json (idSeed).
-- Plants added by users keep it NULL.
ALTER TABLE "Plant" ADD COLUMN "idSeed" INTEGER;

CREATE UNIQUE INDEX "Plant_idSeed_key" ON "Plant"("idSeed");

-- Version of each seed dataset applied to the database (one row per dataset, e.g. "plants")
CREATE TABLE "SeedVersion" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
