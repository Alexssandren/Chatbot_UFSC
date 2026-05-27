import { prisma } from '../db'
import {
  entryFromHistoryRow,
  type AcademicReviewHistoryResponse,
} from '../domain/academicReviewHistory'
import { HttpError } from './submissionService'

const HISTORY_READ_LIMIT = 500

/**
 * Leitura read-only do historico de revisao academica por certificado.
 * Nao revalida dominio normativo — apenas projeta transicoes persistidas.
 */
export async function getCertificateAcademicReviewHistory(
  certificateId: string
): Promise<AcademicReviewHistoryResponse> {
  const cert = await prisma.certificate.findUnique({
    where: { id: certificateId },
    select: {
      id: true,
      validation: { select: { id: true } },
    },
  })
  if (!cert) {
    throw new HttpError('Certificado nao encontrado', 404)
  }
  const validation = cert.validation
  if (!validation) {
    throw new HttpError(
      'Certificado sem registro de validacao academica (migration incompleta ou dado legado)',
      404
    )
  }

  const rows = await prisma.academicReviewHistory.findMany({
    where: { validationId: validation.id },
    orderBy: [{ changedAt: 'asc' }, { id: 'asc' }],
    take: HISTORY_READ_LIMIT,
  })

  if (rows.length >= HISTORY_READ_LIMIT) {
    console.warn(
      `Historico de revisao truncado em ${HISTORY_READ_LIMIT} entradas (certificateId=${certificateId})`
    )
  }

  return {
    certificateId: cert.id,
    validationId: validation.id,
    entries: rows.map(entryFromHistoryRow),
  }
}
