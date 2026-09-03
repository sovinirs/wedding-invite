-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL DEFAULT 'temple',
    "partnerOne" TEXT NOT NULL,
    "partnerTwo" TEXT NOT NULL,
    "eyebrow" TEXT NOT NULL DEFAULT 'The beginning of a sacred day',
    "taglineLead" TEXT NOT NULL DEFAULT 'Two families gather, one story begins.',
    "taglineSub" TEXT NOT NULL DEFAULT 'Scroll through the cinematic entrance and arrive at the invitation.',
    "arrivalNote" TEXT NOT NULL DEFAULT 'Step into the celebration',
    "blessing" TEXT NOT NULL DEFAULT 'With the blessings of our elders, we joyfully invite you to witness and celebrate our union.',
    "eventDate" TEXT NOT NULL,
    "eventTime" TEXT NOT NULL,
    "venueName" TEXT NOT NULL,
    "mapsUrl" TEXT,
    "closingNote" TEXT NOT NULL DEFAULT 'Your presence is our greatest blessing',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_slug_key" ON "Invite"("slug");

-- CreateIndex
CREATE INDEX "Invite_userId_idx" ON "Invite"("userId");
