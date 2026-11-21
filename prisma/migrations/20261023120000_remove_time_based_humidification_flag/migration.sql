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
    "lightDuration" TEXT NOT NULL DEFAULT '09:00-19:00',
    "wateringFrequency" INTEGER,
    "waterQuantity" INTEGER NOT NULL,
    "soilMoisture" INTEGER,
    "humidificationFrequency" INTEGER,
    "humidificationDuration" INTEGER,
    "difficultyLevel" INTEGER NOT NULL DEFAULT 3
);
INSERT INTO "new_Plant" ("description", "difficultyLevel", "humidificationDuration", "humidificationFrequency", "id", "image", "imageCopyright", "lightColor", "lightDuration", "lightIntensity", "name", "soilMoisture", "targetHumidity", "temperatureMax", "temperatureMin", "waterQuantity", "wateringFrequency") SELECT "description", "difficultyLevel", "humidificationDuration", "humidificationFrequency", "id", "image", "imageCopyright", "lightColor", "lightDuration", "lightIntensity", "name", "soilMoisture", "targetHumidity", "temperatureMax", "temperatureMin", "waterQuantity", "wateringFrequency" FROM "Plant";
DROP TABLE "Plant";
ALTER TABLE "new_Plant" RENAME TO "Plant";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
