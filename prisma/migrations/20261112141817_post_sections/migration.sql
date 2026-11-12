-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "css" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "html" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "htmlNl" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "sections" JSONB,
ADD COLUMN     "sectionsNl" JSONB;

-- CreateTable
CREATE TABLE "SectionType" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'Other',
    "description" TEXT NOT NULL DEFAULT '',
    "fields" JSONB NOT NULL DEFAULT '[]',
    "template" TEXT NOT NULL DEFAULT '',
    "css" TEXT NOT NULL DEFAULT '',
    "sample" JSONB NOT NULL DEFAULT '{}',
    "builtIn" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectionType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SectionType_key_key" ON "SectionType"("key");
