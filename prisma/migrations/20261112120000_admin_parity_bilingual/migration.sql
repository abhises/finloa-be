-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNl" TEXT NOT NULL DEFAULT '',
    "intro" TEXT NOT NULL DEFAULT '',
    "introNl" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Author" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "roleNl" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "bioNl" TEXT NOT NULL DEFAULT '',
    "email" TEXT,
    "avatarUrl" TEXT,
    "linkedinUrl" TEXT,
    "youtubeUrl" TEXT,
    "websiteUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Author_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "alt" TEXT NOT NULL DEFAULT '',
    "driver" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteText" (
    "key" TEXT NOT NULL,
    "en" TEXT,
    "nl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteText_pkey" PRIMARY KEY ("key")
);

-- AlterTable: new post columns
ALTER TABLE "Post" ADD COLUMN     "authorId" TEXT,
ADD COLUMN     "bodyNl" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "excerptNl" TEXT,
ADD COLUMN     "faqsNl" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "jsonLd" TEXT,
ADD COLUMN     "newsletterPopup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoDescriptionNl" TEXT,
ADD COLUMN     "seoTitle" TEXT,
ADD COLUMN     "seoTitleNl" TEXT,
ADD COLUMN     "tagsNl" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "titleNl" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "transcriptNl" TEXT;

-- Data: every distinct topic becomes a category
INSERT INTO "Category" ("id", "slug", "name", "sortOrder", "updatedAt")
SELECT 'cat_' || substr(md5("topic"), 1, 20),
       trim(both '-' from lower(regexp_replace("topic", '[^a-zA-Z0-9]+', '-', 'g'))),
       "topic",
       (row_number() OVER (ORDER BY "topic"))::int - 1,
       CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "topic" FROM "Post" WHERE trim("topic") <> '') t;

UPDATE "Post" SET "categoryId" = 'cat_' || substr(md5("topic"), 1, 20) WHERE trim("topic") <> '';

-- Data: every distinct author name becomes an author (role and bio from the newest post)
INSERT INTO "Author" ("id", "slug", "name", "role", "bio", "updatedAt")
SELECT DISTINCT ON ("authorName")
       'aut_' || substr(md5("authorName"), 1, 20),
       trim(both '-' from lower(regexp_replace("authorName", '[^a-zA-Z0-9]+', '-', 'g'))),
       "authorName",
       coalesce("authorRole", ''),
       coalesce("authorBio", ''),
       CURRENT_TIMESTAMP
FROM "Post" WHERE "authorName" IS NOT NULL AND trim("authorName") <> ''
ORDER BY "authorName", "updatedAt" DESC;

UPDATE "Post" SET "authorId" = 'aut_' || substr(md5("authorName"), 1, 20)
WHERE "authorName" IS NOT NULL AND trim("authorName") <> '';

-- Drop the old free-text columns
DROP INDEX "Post_topic_idx";
ALTER TABLE "Post" DROP COLUMN "authorBio",
DROP COLUMN "authorName",
DROP COLUMN "authorRole",
DROP COLUMN "topic";

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Author_slug_key" ON "Author"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Media_key_key" ON "Media"("key");

-- CreateIndex
CREATE INDEX "Post_categoryId_idx" ON "Post"("categoryId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE SET NULL ON UPDATE CASCADE;
