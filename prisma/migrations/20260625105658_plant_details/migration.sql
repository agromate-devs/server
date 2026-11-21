/*
  Warnings:

  - You are about to drop the column `plantColor` on the `Plant` table. All the data in the column will be lost.
  - You are about to drop the column `wateringAtLight` on the `Plant` table. All the data in the column will be lost.
  - You are about to drop the column `wateringDuration` on the `Plant` table. All the data in the column will be lost.

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
    "lightColor" TEXT NOT NULL DEFAULT '4294198070',
    "lightIntensity" INTEGER NOT NULL DEFAULT 5,
    "lightDuration" INTEGER NOT NULL DEFAULT 8,
    "wateringFrequency" INTEGER,
    "waterQuantity" INTEGER,
    "soilMoisture" INTEGER,
    "difficultyLevel" INTEGER NOT NULL DEFAULT 3
);
INSERT INTO "new_Plant" ("description", "difficultyLevel", "id", "image", "imageCopyright", "lightColor", "lightDuration", "lightIntensity", "name", "soilMoisture", "targetHumidity", "temperatureMax", "temperatureMin", "wateringFrequency") SELECT "description", coalesce("difficultyLevel", 3) AS "difficultyLevel", "id", "image", "imageCopyright", "lightColor", coalesce("lightDuration", 8) AS "lightDuration", coalesce("lightIntensity", 5) AS "lightIntensity", "name", "soilMoisture", "targetHumidity", "temperatureMax", "temperatureMin", "wateringFrequency" FROM "Plant";
DROP TABLE "Plant";
ALTER TABLE "new_Plant" RENAME TO "Plant";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
