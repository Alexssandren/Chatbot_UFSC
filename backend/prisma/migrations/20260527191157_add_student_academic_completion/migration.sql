-- CreateTable
CREATE TABLE "StudentAcademicCompletion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "concludedAt" DATETIME,
    "concludedById" TEXT,
    "notes" TEXT,
    "snapshotTotalEligibleHours" REAL,
    "snapshotValidGroupsCount" INTEGER,
    "revokedAt" DATETIME,
    "revokedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudentAcademicCompletion_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentAcademicCompletion_concludedById_fkey" FOREIGN KEY ("concludedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StudentAcademicCompletion_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentAcademicCompletion_studentId_key" ON "StudentAcademicCompletion"("studentId");
