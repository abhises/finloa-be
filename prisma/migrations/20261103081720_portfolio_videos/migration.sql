-- CreateEnum
CREATE TYPE "VideoKind" AS ENUM ('LONG', 'SHORT');

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "kind" "VideoKind" NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "title" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Video_niche_kind_active_sortOrder_idx" ON "Video"("niche", "kind", "active", "sortOrder");
