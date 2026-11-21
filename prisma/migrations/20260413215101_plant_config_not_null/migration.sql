/*
  Warnings:

  - Made the column `plantConfig` on table `Agrosmart` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Agrosmart" (
    "macAddress" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "plantID" INTEGER NOT NULL,
    "plantConfig" JSONB NOT NULL,
    CONSTRAINT "Agrosmart_username_fkey" FOREIGN KEY ("username") REFERENCES "User" ("username") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Agrosmart_plantID_fkey" FOREIGN KEY ("plantID") REFERENCES "Plant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Agrosmart" ("macAddress", "plantConfig", "plantID", "username") SELECT "macAddress", "plantConfig", "plantID", "username" FROM "Agrosmart";
DROP TABLE "Agrosmart";
ALTER TABLE "new_Agrosmart" RENAME TO "Agrosmart";
CREATE INDEX "Agrosmart_username_idx" ON "Agrosmart"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
