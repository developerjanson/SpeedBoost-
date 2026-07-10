-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "appEnabled" BOOLEAN NOT NULL DEFAULT false,
    "imageCompression" BOOLEAN NOT NULL DEFAULT false,
    "compressionQuality" INTEGER NOT NULL DEFAULT 80,
    "maxWidth" INTEGER NOT NULL DEFAULT 1920,
    "convertWebp" BOOLEAN NOT NULL DEFAULT false,
    "autoAltText" BOOLEAN NOT NULL DEFAULT false
);

-- CreateIndex
CREATE UNIQUE INDEX "Settings_shop_key" ON "Settings"("shop");
