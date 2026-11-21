/*
  Warnings:

  - You are about to drop the column `DrynessThreshold` on the `Plant` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Plant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "image" TEXT,
    "imageCopyright" TEXT,
    "description" TEXT,
    "name" TEXT NOT NULL,
    "temperatureMin" REAL,
    "temperatureMax" REAL,
    "humidity" REAL,
    "lightColor" TEXT,
    "lightIntensity" REAL,
    "lightDuration" INTEGER,
    "wateringFrequency" INTEGER,
    "wateringIfDry" BOOLEAN,
    "drynessThreshold" REAL,
    "wateringAtLight" BOOLEAN
);
INSERT INTO "new_Plant" ("description", "humidity", "id", "image", "lightColor", "lightDuration", "lightIntensity", "name", "temperatureMax", "temperatureMin", "wateringAtLight", "wateringFrequency", "wateringIfDry") SELECT "description", "humidity", "id", "image", "lightColor", "lightDuration", "lightIntensity", "name", "temperatureMax", "temperatureMin", "wateringAtLight", "wateringFrequency", "wateringIfDry" FROM "Plant";
DROP TABLE "Plant";
ALTER TABLE "new_Plant" RENAME TO "Plant";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
