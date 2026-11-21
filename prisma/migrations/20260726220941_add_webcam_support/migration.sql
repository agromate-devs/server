-- CreateTable
CREATE TABLE "Webcam" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    CONSTRAINT "Webcam_id_fkey" FOREIGN KEY ("id") REFERENCES "User" ("username") ON DELETE CASCADE ON UPDATE CASCADE
);
