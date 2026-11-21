/*
  Warnings:

  - You are about to alter the column `drynessThreshold` on the `Plant` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.
  - You are about to alter the column `humidity` on the `Plant` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.
  - You are about to alter the column `lightIntensity` on the `Plant` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Int`.

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
    "wateringIfDry" BOOLEAN,
    "drynessThreshold" INTEGER,
    "wateringAtLight" BOOLEAN,
    "difficultyLevel" INTEGER,
    "plantColor" TEXT NOT NULL
);
INSERT INTO "new_Plant" ("description", "difficultyLevel", "drynessThreshold", "humidity", "id", "image", "imageCopyright", "lightColor", "lightDuration", "lightIntensity", "name", "plantColor", "temperatureMax", "temperatureMin", "wateringAtLight", "wateringFrequency", "wateringIfDry") SELECT "description", "difficultyLevel", "drynessThreshold", "humidity", "id", "image", "imageCopyright", "lightColor", "lightDuration", "lightIntensity", "name", "plantColor", "temperatureMax", "temperatureMin", "wateringAtLight", "wateringFrequency", "wateringIfDry" FROM "Plant";
DROP TABLE "Plant";
ALTER TABLE "new_Plant" RENAME TO "Plant";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
