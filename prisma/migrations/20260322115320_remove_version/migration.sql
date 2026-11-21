/*
  Warnings:

  - You are about to drop the column `version` on the `Agrosmart` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Agrosmart" (
    "uuid" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "idPianta" INTEGER NOT NULL,
    CONSTRAINT "Agrosmart_username_fkey" FOREIGN KEY ("username") REFERENCES "User" ("username") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Agrosmart_idPianta_fkey" FOREIGN KEY ("idPianta") REFERENCES "Plant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Agrosmart" ("idPianta", "username", "uuid") SELECT "idPianta", "username", "uuid" FROM "Agrosmart";
DROP TABLE "Agrosmart";
ALTER TABLE "new_Agrosmart" RENAME TO "Agrosmart";
CREATE INDEX "Agrosmart_username_idx" ON "Agrosmart"("username");
CREATE INDEX "Agrosmart_idPianta_idx" ON "Agrosmart"("idPianta");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
