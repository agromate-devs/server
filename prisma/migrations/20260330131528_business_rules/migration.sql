/*
  Warnings:

  - You are about to drop the column `wateringIfDry` on the `Plant` table. All the data in the column will be lost.

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
    "humidity" INTEGER NOT NULL,
    "lightColor" TEXT DEFAULT 'WHITE',
    "lightIntensity" INTEGER,
    "lightDuration" INTEGER,
    "wateringFrequency" INTEGER,
    "wateringDuration" INTEGER,
    "drynessThreshold" INTEGER,
    "wateringAtLight" BOOLEAN,
    "difficultyLevel" INTEGER,
    "plantColor" TEXT NOT NULL
);
INSERT INTO "new_Plant" ("description", "difficultyLevel", "drynessThreshold", "humidity", "id", "image", "imageCopyright", "lightColor", "lightDuration", "lightIntensity", "name", "plantColor", "temperatureMax", "temperatureMin", "wateringAtLight", "wateringDuration", "wateringFrequency") SELECT "description", "difficultyLevel", "drynessThreshold", "humidity", "id", "image", "imageCopyright", "lightColor", "lightDuration", "lightIntensity", "name", "plantColor", "temperatureMax", "temperatureMin", "wateringAtLight", "wateringDuration", "wateringFrequency" FROM "Plant";
DROP TABLE "Plant";
ALTER TABLE "new_Plant" RENAME TO "Plant";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
