/*
  Warnings:

  - Made the column `description` on table `Plant` required. This step will fail if there are existing NULL values in that column.
  - Made the column `humidity` on table `Plant` required. This step will fail if there are existing NULL values in that column.
  - Made the column `image` on table `Plant` required. This step will fail if there are existing NULL values in that column.
  - Made the column `imageCopyright` on table `Plant` required. This step will fail if there are existing NULL values in that column.
  - Made the column `temperatureMax` on table `Plant` required. This step will fail if there are existing NULL values in that column.
  - Made the column `temperatureMin` on table `Plant` required. This step will fail if there are existing NULL values in that column.

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
    "wateringAtLight" BOOLEAN
);
INSERT INTO "new_Plant" ("description", "drynessThreshold", "humidity", "id", "image", "imageCopyright", "lightColor", "lightDuration", "lightIntensity", "name", "temperatureMax", "temperatureMin", "wateringAtLight", "wateringFrequency", "wateringIfDry") SELECT "description", "drynessThreshold", "humidity", "id", "image", "imageCopyright", "lightColor", "lightDuration", "lightIntensity", "name", "temperatureMax", "temperatureMin", "wateringAtLight", "wateringFrequency", "wateringIfDry" FROM "Plant";
DROP TABLE "Plant";
ALTER TABLE "new_Plant" RENAME TO "Plant";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
