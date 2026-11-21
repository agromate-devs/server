/*
  Warnings:

  - The primary key for the `Agrosmart` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `uuid` on the `Agrosmart` table. All the data in the column will be lost.
  - Added the required column `macAddress` to the `Agrosmart` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Agrosmart" (
    "macAddress" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "plantID" INTEGER NOT NULL,
    CONSTRAINT "Agrosmart_username_fkey" FOREIGN KEY ("username") REFERENCES "User" ("username") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Agrosmart_plantID_fkey" FOREIGN KEY ("plantID") REFERENCES "Plant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Agrosmart" ("plantID", "username") SELECT "plantID", "username" FROM "Agrosmart";
DROP TABLE "Agrosmart";
ALTER TABLE "new_Agrosmart" RENAME TO "Agrosmart";
CREATE INDEX "Agrosmart_username_idx" ON "Agrosmart"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
