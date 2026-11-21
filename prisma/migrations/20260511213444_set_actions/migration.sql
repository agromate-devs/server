-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Wishlist" (
    "id" INTEGER NOT NULL,
    "username" TEXT NOT NULL,

    PRIMARY KEY ("username", "id"),
    CONSTRAINT "Wishlist_username_fkey" FOREIGN KEY ("username") REFERENCES "User" ("username") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Wishlist_id_fkey" FOREIGN KEY ("id") REFERENCES "Plant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Wishlist" ("id", "username") SELECT "id", "username" FROM "Wishlist";
DROP TABLE "Wishlist";
ALTER TABLE "new_Wishlist" RENAME TO "Wishlist";
CREATE INDEX "Wishlist_username_idx" ON "Wishlist"("username");
CREATE INDEX "Wishlist_id_idx" ON "Wishlist"("id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
