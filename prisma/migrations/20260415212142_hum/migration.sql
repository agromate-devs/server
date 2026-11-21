/*
  Warnings:

  - You are about to drop the column `humidity` on the `Plant` table. All the data in the column will be lost.

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
    "temperatureMin" REAL NOT NULL DEFAULT 18.0,
    "temperatureMax" REAL NOT NULL DEFAULT 24.0,
    "targetHumidity" INTEGER NOT NULL DEFAULT 50,
    "lightColor" INTEGER NOT NULL DEFAULT 4294198070,
    "lightIntensity" INTEGER,
    "lightDuration" INTEGER,
    "wateringFrequency" INTEGER,
    "wateringDuration" INTEGER,
    "drynessThreshold" INTEGER,
    "wateringAtLight" BOOLEAN,
    "difficultyLevel" INTEGER,
    "plantColor" INTEGER NOT NULL DEFAULT 4283990532
);
INSERT INTO "new_Plant" ("description", "difficultyLevel", "drynessThreshold", "id", "image", "imageCopyright", "lightColor", "lightDuration", "lightIntensity", "name", "plantColor", "temperatureMax", "temperatureMin", "wateringAtLight", "wateringDuration", "wateringFrequency") SELECT "description", "difficultyLevel", "drynessThreshold", "id", "image", "imageCopyright", "lightColor", "lightDuration", "lightIntensity", "name", "plantColor", "temperatureMax", "temperatureMin", "wateringAtLight", "wateringDuration", "wateringFrequency" FROM "Plant";
DROP TABLE "Plant";
ALTER TABLE "new_Plant" RENAME TO "Plant";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
