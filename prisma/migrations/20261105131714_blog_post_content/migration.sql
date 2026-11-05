-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "authorBio" TEXT,
ADD COLUMN     "authorName" TEXT,
ADD COLUMN     "authorRole" TEXT,
ADD COLUMN     "body" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "faqs" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "transcript" TEXT,
ADD COLUMN     "videoLength" TEXT,
ADD COLUMN     "youtubeId" TEXT;
