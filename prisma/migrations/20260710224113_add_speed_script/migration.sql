-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "appEnabled" BOOLEAN NOT NULL DEFAULT false,
    "imageCompression" BOOLEAN NOT NULL DEFAULT false,
    "compressionQuality" INTEGER NOT NULL DEFAULT 80,
    "maxWidth" INTEGER NOT NULL DEFAULT 1920,
    "convertWebp" BOOLEAN NOT NULL DEFAULT false,
    "autoAltText" BOOLEAN NOT NULL DEFAULT false,
    "speedScript" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_Settings" ("appEnabled", "autoAltText", "compressionQuality", "convertWebp", "id", "imageCompression", "maxWidth", "shop") SELECT "appEnabled", "autoAltText", "compressionQuality", "convertWebp", "id", "imageCompression", "maxWidth", "shop" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
CREATE UNIQUE INDEX "Settings_shop_key" ON "Settings"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
