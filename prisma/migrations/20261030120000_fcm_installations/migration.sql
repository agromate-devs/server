-- Registration tokens are replaced by Firebase Installation IDs, the old tokens can't be converted
DROP TABLE "FcmToken";

CREATE TABLE "FcmInstallation" (
    "fid" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FcmInstallation_username_fkey" FOREIGN KEY ("username") REFERENCES "User" ("username") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "FcmInstallation_username_idx" ON "FcmInstallation"("username");
