-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'advisor',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AcademicReviewHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "validationId" TEXT NOT NULL,
    "previousStatus" TEXT NOT NULL,
    "newStatus" TEXT NOT NULL,
    "previousApprovedHours" REAL,
    "newApprovedHours" REAL,
    "previousReviewNotes" TEXT,
    "newReviewNotes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'academic_review_patch',
    "changeReason" TEXT,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" TEXT,
    CONSTRAINT "AcademicReviewHistory_validationId_fkey" FOREIGN KEY ("validationId") REFERENCES "CertificateValidation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AcademicReviewHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AcademicReviewHistory" ("id", "validationId", "previousStatus", "newStatus", "previousApprovedHours", "newApprovedHours", "previousReviewNotes", "newReviewNotes", "source", "changeReason", "changedAt", "changedById") SELECT "id", "validationId", "previousStatus", "newStatus", "previousApprovedHours", "newApprovedHours", "previousReviewNotes", "newReviewNotes", "source", "changeReason", "changedAt", NULL FROM "AcademicReviewHistory";
DROP TABLE "AcademicReviewHistory";
ALTER TABLE "new_AcademicReviewHistory" RENAME TO "AcademicReviewHistory";
CREATE INDEX "AcademicReviewHistory_validationId_changedAt_idx" ON "AcademicReviewHistory"("validationId", "changedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
