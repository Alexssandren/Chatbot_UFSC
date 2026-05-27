import type { Prisma } from '@prisma/client'
import {
  buildHistoryRow,
  type AcademicReviewHistorySource,
  type AcademicReviewSnapshot,
} from '../domain/academicReviewHistory'

export type ApplyAcademicReviewChangeParams = {
  validationId: string
  certificateId: string
  before: AcademicReviewSnapshot
  after: AcademicReviewSnapshot
  source: AcademicReviewHistorySource
  changeReason?: string | null
  reviewedAt: Date
}

/**
 * Unico ponto de insert em AcademicReviewHistory + update em CertificateValidation.
 * Quem chama deve validar dominio e hasAcademicReviewChanged antes.
 */
export async function applyAcademicReviewChange(
  tx: Prisma.TransactionClient,
  params: ApplyAcademicReviewChangeParams
): Promise<void> {
  await tx.academicReviewHistory.create({
    data: buildHistoryRow(params.validationId, params.before, params.after, {
      source: params.source,
      changeReason: params.changeReason,
    }),
  })
  await tx.certificateValidation.update({
    where: { certificateId: params.certificateId },
    data: {
      status: params.after.status,
      approvedHours: params.after.approvedHours,
      reviewNotes: params.after.reviewNotes,
      reviewedAt: params.reviewedAt,
    },
  })
}
