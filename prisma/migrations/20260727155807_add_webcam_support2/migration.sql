/*
  Warnings:

  - Added the required column `username` to the `Webcam` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Webcam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    CONSTRAINT "Webcam_username_fkey" FOREIGN KEY ("username") REFERENCES "User" ("username") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Webcam" ("id", "name") SELECT "id", "name" FROM "Webcam";
DROP TABLE "Webcam";
ALTER TABLE "new_Webcam" RENAME TO "Webcam";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
