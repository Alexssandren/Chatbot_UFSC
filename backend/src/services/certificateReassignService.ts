import { assertCategoryBelongsToGroup } from '../domain/academicGuards'
import { validateAcademicReviewAgainstStoredValidation } from '../domain/academicValidationContract'
import { ValidationStatus, type ValidationStatusValue } from '../domain/academicRules'
import { prisma } from '../db'
import { HttpError } from './submissionService'

export type CertificateReassignInput = {
  activityGroupId: string
  activityCategoryId: string
  changeReason?: string | null
}

export type CertificateReassignResult = {
  certificateId: string
  grupo: string
  validation: {
    status: string
    requestedHours: number
    approvedHours: number | null
    reviewNotes: string | null
    activityGroup: { id: string; code: string; name: string }
    activityCategory: { id: string; name: string }
  }
}

function parseValidationStatus(raw: string): ValidationStatusValue {
  if (raw === ValidationStatus.pending || raw === ValidationStatus.approved || raw === ValidationStatus.rejected) {
    return raw
  }
  throw new HttpError('status academico invalido no certificado', 500)
}

function mapDomainErrorToHttp(err: unknown): HttpError {
  if (err instanceof HttpError) {
    return err
  }
  if (err instanceof Error) {
    if (err.message.startsWith('Inconsistencia:')) {
      return new HttpError(err.message, 400)
    }
    return new HttpError(err.message, 400)
  }
  return new HttpError('Erro de validacao', 400)
}

export async function reassignCertificateAcademicClassification(
  certificateId: string,
  input: CertificateReassignInput
): Promise<CertificateReassignResult> {
  const activityGroupId = String(input.activityGroupId ?? '').trim()
  const activityCategoryId = String(input.activityCategoryId ?? '').trim()
  if (!activityGroupId || !activityCategoryId) {
    throw new HttpError('activityGroupId e activityCategoryId sao obrigatorios', 400)
  }

  const cert = await prisma.certificate.findUnique({
    where: { id: certificateId },
    select: {
      id: true,
      grupo: true,
      validation: {
        select: {
          id: true,
          status: true,
          approvedHours: true,
          reviewNotes: true,
          requestedHours: true,
          activityGroupId: true,
          activityCategoryId: true,
          activityCategory: { select: { id: true, name: true, groupId: true } },
        },
      },
    },
  })
  if (!cert) {
    throw new HttpError('Certificado nao encontrado', 404)
  }
  const validation = cert.validation
  if (!validation) {
    throw new HttpError('Certificado sem registro de validacao academica', 404)
  }

  if (
    validation.activityGroupId === activityGroupId &&
    validation.activityCategoryId === activityCategoryId
  ) {
    const current = await prisma.certificateValidation.findUnique({
      where: { certificateId },
      include: {
        activityGroup: { select: { id: true, code: true, name: true } },
        activityCategory: { select: { id: true, name: true } },
      },
    })
    if (!current) {
      throw new HttpError('Validacao nao encontrada', 404)
    }
    return {
      certificateId: cert.id,
      grupo: cert.grupo,
      validation: {
        status: current.status,
        requestedHours: current.requestedHours,
        approvedHours: current.approvedHours,
        reviewNotes: current.reviewNotes,
        activityGroup: current.activityGroup,
        activityCategory: current.activityCategory,
      },
    }
  }

  const [group, category] = await Promise.all([
    prisma.activityGroup.findUnique({ where: { id: activityGroupId } }),
    prisma.activityCategory.findUnique({ where: { id: activityCategoryId } }),
  ])
  if (!group) {
    throw new HttpError('Grupo academico nao encontrado', 404)
  }
  if (!category) {
    throw new HttpError('Categoria academica nao encontrada', 404)
  }

  try {
    assertCategoryBelongsToGroup(category, activityGroupId)
    validateAcademicReviewAgainstStoredValidation({
      status: parseValidationStatus(validation.status),
      approvedHoursNorm: validation.approvedHours,
      reviewNotes: validation.reviewNotes,
      requestedHours: validation.requestedHours,
      activityGroupId,
      activityCategory: category,
    })
  } catch (err) {
    throw mapDomainErrorToHttp(err)
  }

  const grupoLabel = `${group.code} — ${category.name}`

  await prisma.$transaction(async (tx) => {
    await tx.certificate.update({
      where: { id: certificateId },
      data: { grupo: grupoLabel },
    })
    await tx.certificateValidation.update({
      where: { certificateId },
      data: {
        activityGroupId,
        activityCategoryId,
      },
    })
  })

  const updated = await prisma.certificateValidation.findUnique({
    where: { certificateId },
    include: {
      activityGroup: { select: { id: true, code: true, name: true } },
      activityCategory: { select: { id: true, name: true } },
    },
  })
  if (!updated) {
    throw new HttpError('Validacao nao encontrada', 404)
  }

  return {
    certificateId: cert.id,
    grupo: grupoLabel,
    validation: {
      status: updated.status,
      requestedHours: updated.requestedHours,
      approvedHours: updated.approvedHours,
      reviewNotes: updated.reviewNotes,
      activityGroup: updated.activityGroup,
      activityCategory: updated.activityCategory,
    },
  }
}
