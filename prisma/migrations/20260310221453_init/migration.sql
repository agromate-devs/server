-- CreateTable
CREATE TABLE "User" (
    "username" TEXT NOT NULL PRIMARY KEY,
    "profileImage" TEXT,
    "pswHash" TEXT NOT NULL,
    "email" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Plant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "image" TEXT,
    "description" TEXT,
    "name" TEXT NOT NULL,
    "temperature" REAL,
    "humidity" REAL,
    "lightColor" TEXT,
    "lightIntensity" REAL,
    "wateringFrequency" INTEGER
);

-- CreateTable
CREATE TABLE "Agrosmart" (
    "uuid" TEXT NOT NULL PRIMARY KEY,
    "version" TEXT,
    "username" TEXT NOT NULL,
    "idPianta" INTEGER NOT NULL,
    CONSTRAINT "Agrosmart_username_fkey" FOREIGN KEY ("username") REFERENCES "User" ("username") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Agrosmart_idPianta_fkey" FOREIGN KEY ("idPianta") REFERENCES "Plant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Wishlist" (
    "id" INTEGER NOT NULL,
    "username" TEXT NOT NULL,

    PRIMARY KEY ("username", "id"),
    CONSTRAINT "Wishlist_username_fkey" FOREIGN KEY ("username") REFERENCES "User" ("username") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Wishlist_id_fkey" FOREIGN KEY ("id") REFERENCES "Plant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Agrosmart_username_idx" ON "Agrosmart"("username");

-- CreateIndex
CREATE INDEX "Agrosmart_idPianta_idx" ON "Agrosmart"("idPianta");

-- CreateIndex
CREATE INDEX "Wishlist_username_idx" ON "Wishlist"("username");

-- CreateIndex
CREATE INDEX "Wishlist_id_idx" ON "Wishlist"("id");
