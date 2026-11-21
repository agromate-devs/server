-- Webcams are no longer users: remove old webcams (they have no password) and camera users.
-- Sessions of camera users are deleted by cascade.
DELETE FROM "Webcam";
DELETE FROM "User" WHERE "email" LIKE '%@agromate.camera';

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Webcam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "pswHash" TEXT NOT NULL,
    CONSTRAINT "Webcam_username_fkey" FOREIGN KEY ("username") REFERENCES "User" ("username") ON DELETE CASCADE ON UPDATE CASCADE
);
DROP TABLE "Webcam";
ALTER TABLE "new_Webcam" RENAME TO "Webcam";
CREATE INDEX "Webcam_username_idx" ON "Webcam"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
