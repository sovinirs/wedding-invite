-- CreateEnum
CREATE TYPE "PhotoRole" AS ENUM ('BRIDE', 'GROOM');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'GENERATING_LAST_FRAME', 'AWAITING_APPROVAL', 'QUEUED_VIDEO', 'GENERATING_VIDEO', 'ENCODING', 'READY', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Invite" ADD COLUMN     "activeGenerationJobId" TEXT,
ADD COLUMN     "attireBrideId" TEXT,
ADD COLUMN     "attireGroomId" TEXT,
ADD COLUMN     "generatedVideoUrl" TEXT,
ADD COLUMN     "maxRegenerations" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "posterUrl" TEXT,
ADD COLUMN     "regenerationCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "venueArchetype" TEXT,
ALTER COLUMN "templateId" SET DEFAULT 'temple-1';

-- CreateTable
CREATE TABLE "FacePhoto" (
    "id" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "role" "PhotoRole" NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'PENDING',
    "validationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL,
    "inviteId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "lastFrameUrl" TEXT,
    "lastFrameApprovedAt" TIMESTAMP(3),
    "videoProviderRef" TEXT,
    "rawVideoUrl" TEXT,
    "finalVideoUrl" TEXT,
    "posterFrameUrl" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "supersededBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FacePhoto_inviteId_idx" ON "FacePhoto"("inviteId");

-- CreateIndex
CREATE INDEX "GenerationJob_inviteId_idx" ON "GenerationJob"("inviteId");

-- CreateIndex
CREATE INDEX "GenerationJob_status_idx" ON "GenerationJob"("status");

-- AddForeignKey
ALTER TABLE "FacePhoto" ADD CONSTRAINT "FacePhoto_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "Invite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "Invite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
