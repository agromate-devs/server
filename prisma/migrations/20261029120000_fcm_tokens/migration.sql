CREATE TABLE "FcmToken" (
    "token" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FcmToken_username_fkey" FOREIGN KEY ("username") REFERENCES "User" ("username") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "FcmToken_username_idx" ON "FcmToken"("username");
