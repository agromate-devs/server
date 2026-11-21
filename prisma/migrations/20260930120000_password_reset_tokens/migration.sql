CREATE TABLE "PasswordResetToken" (
    "token" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "expire" DATETIME NOT NULL,
    CONSTRAINT "PasswordResetToken_username_fkey" FOREIGN KEY ("username") REFERENCES "User" ("username") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "PasswordResetToken_username_idx" ON "PasswordResetToken"("username");
CREATE INDEX "PasswordResetToken_expire_idx" ON "PasswordResetToken"("expire");