-- CreateTable
CREATE TABLE "ActivityGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minHours" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ActivityCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxHours" INTEGER,
    "description" TEXT,
    "ruleNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActivityCategory_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ActivityGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CertificateValidation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "certificateId" TEXT NOT NULL,
    "activityGroupId" TEXT NOT NULL,
    "activityCategoryId" TEXT NOT NULL,
    "requestedHours" REAL NOT NULL,
    "approvedHours" REAL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewNotes" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CertificateValidation_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CertificateValidation_activityGroupId_fkey" FOREIGN KEY ("activityGroupId") REFERENCES "ActivityGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CertificateValidation_activityCategoryId_fkey" FOREIGN KEY ("activityCategoryId") REFERENCES "ActivityCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ActivityGroup_code_key" ON "ActivityGroup"("code");

-- CreateIndex
CREATE INDEX "ActivityCategory_groupId_idx" ON "ActivityCategory"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateValidation_certificateId_key" ON "CertificateValidation"("certificateId");
