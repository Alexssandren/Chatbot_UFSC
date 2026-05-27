-- CreateTable
CREATE TABLE "AcademicReviewHistory" (
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
    "changedBy" TEXT,
    CONSTRAINT "AcademicReviewHistory_validationId_fkey" FOREIGN KEY ("validationId") REFERENCES "CertificateValidation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AcademicReviewHistory_validationId_changedAt_idx" ON "AcademicReviewHistory"("validationId", "changedAt");
