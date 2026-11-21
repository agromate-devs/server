/*
  Warnings:

  - Made the column `plantColor` on table `Plant` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Plant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "image" TEXT NOT NULL,
    "imageCopyright" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "temperatureMin" REAL NOT NULL,
    "temperatureMax" REAL NOT NULL,
    "humidity" REAL NOT NULL,
    "lightColor" TEXT,
    "lightIntensity" REAL,
    "lightDuration" INTEGER,
    "wateringFrequency" INTEGER,
    "wateringIfDry" BOOLEAN,
    "drynessThreshold" REAL,
    "wateringAtLight" BOOLEAN,
    "difficultyLevel" INTEGER,
    "plantColor" TEXT NOT NULL
);
INSERT INTO "new_Plant" ("description", "difficultyLevel", "drynessThreshold", "humidity", "id", "image", "imageCopyright", "lightColor", "lightDuration", "lightIntensity", "name", "plantColor", "temperatureMax", "temperatureMin", "wateringAtLight", "wateringFrequency", "wateringIfDry") SELECT "description", "difficultyLevel", "drynessThreshold", "humidity", "id", "image", "imageCopyright", "lightColor", "lightDuration", "lightIntensity", "name", "plantColor", "temperatureMax", "temperatureMin", "wateringAtLight", "wateringFrequency", "wateringIfDry" FROM "Plant";
DROP TABLE "Plant";
ALTER TABLE "new_Plant" RENAME TO "Plant";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
