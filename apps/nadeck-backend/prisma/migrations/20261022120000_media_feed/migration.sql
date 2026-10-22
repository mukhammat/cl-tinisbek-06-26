-- Videos and photos shown under the catalog (the video feed and the photo gallery), managed
-- from the admin panel. One table: they share every field, `kind` tells them apart.
--
-- CreateTable
CREATE TABLE "MediaItem" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'video',
    "title" JSONB NOT NULL,
    "src" TEXT NOT NULL,
    "poster" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaItem_kind_sortOrder_idx" ON "MediaItem"("kind", "sortOrder");
