/*
  Warnings:

  - You are about to drop the column `temperature` on the `Plant` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Plant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "image" TEXT,
    "description" TEXT,
    "name" TEXT NOT NULL,
    "temperatureMin" REAL,
    "temperatureMax" REAL,
    "humidity" REAL,
    "lightColor" TEXT,
    "lightIntensity" REAL,
    "wateringFrequency" INTEGER,
    "wateringIfDry" BOOLEAN
);
INSERT INTO "new_Plant" ("description", "humidity", "id", "image", "lightColor", "lightIntensity", "name", "wateringFrequency") SELECT "description", "humidity", "id", "image", "lightColor", "lightIntensity", "name", "wateringFrequency" FROM "Plant";
DROP TABLE "Plant";
ALTER TABLE "new_Plant" RENAME TO "Plant";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
