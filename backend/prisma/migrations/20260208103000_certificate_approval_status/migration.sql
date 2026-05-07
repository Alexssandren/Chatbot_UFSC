-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'pending';

UPDATE "Certificate" SET "approvalStatus" = 'approved'
WHERE "submissionId" IN (SELECT "id" FROM "Submission" WHERE "status" = 'approved');

UPDATE "Certificate" SET "approvalStatus" = 'rejected'
WHERE "submissionId" IN (SELECT "id" FROM "Submission" WHERE "status" = 'rejected');

UPDATE "Submission" SET "status" = 'partial'
WHERE "id" IN (
  SELECT "submissionId" FROM "Certificate"
  GROUP BY "submissionId"
  HAVING SUM(CASE WHEN "approvalStatus" = 'pending' THEN 1 ELSE 0 END) = 0
     AND SUM(CASE WHEN "approvalStatus" = 'approved' THEN 1 ELSE 0 END) > 0
     AND SUM(CASE WHEN "approvalStatus" = 'rejected' THEN 1 ELSE 0 END) > 0
);
