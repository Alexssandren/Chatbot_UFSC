import { prisma } from '../db'
import { compareActivityGroupsByDisplayOrder } from '../domain/academicCatalog'
import { validateAcademicReviewAgainstStoredValidation } from '../domain/academicValidationContract'
import {
  applyCategoryEligibleCap,
  isAcademicallyApproved,
  isValidApprovedHoursForStatus,
  MIN_DISTINCT_GROUPS,
  MIN_HOURS_PER_GROUP,
  MIN_TOTAL_HOURS,
  ValidationStatus,
  type ValidationStatusValue,
} from '../domain/academicRules'
import { HttpError } from './submissionService'

/**
 * Contrato GET /api/students/:id/academic-summary (Fase 3).
 * totalApprovedHours: auditoria (soma apos status approved, antes do teto por categoria).
 * totalEligibleHours: base normativa (apos cap por categoria); elegibilidade e grupos usam eligible.
 */
export type AcademicConsolidation = {
  studentId: string
  eligible: boolean
  totalApprovedHours: number
  totalEligibleHours: number
  remainingEligibleHours: number
  validGroupsCount: number
  requirements: {
    minimumTotalHours: number
    minimumDistinctGroups: number
    minimumHoursPerGroup: number
    meetsTotalHoursRequirement: boolean
    meetsDistinctGroupsRequirement: boolean
  }
  groups: {
    groupId: string
    code: string
    name: string
    approvedHours: number
    eligibleHours: number
    minimumRequiredHours: number
    meetsMinimumHours: boolean
  }[]
  categories: {
    categoryId: string
    groupId: string
    name: string
    approvedHours: number
    eligibleHours: number
    maxEligibleHours: number | null
    cappedHours: number
  }[]
}

/** Resposta PATCH /api/certificates/:id/academic-review */
export type AcademicReviewResult = {
  certificateId: string
  validation: {
    status: string
    approvedHours: number | null
    reviewNotes: string | null
    reviewedAt: string | null
    requestedHours: number
    activityGroup: { code: string; name: string }
    activityCategory: { name: string }
  }
}

type CategoryAgg = {
  groupId: string
  name: string
  maxEligibleHours: number | null
  approvedHours: number
}

export async function getStudentAcademicConsolidation(
  studentId: string
): Promise<AcademicConsolidation> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true },
  })
  if (!student) {
    throw new HttpError('Aluno nao encontrado', 404)
  }

  const activityGroups = await prisma.activityGroup.findMany()
  activityGroups.sort(compareActivityGroupsByDisplayOrder)

  const validations = await prisma.certificateValidation.findMany({
    where: { certificate: { submission: { studentId } } },
    include: { activityCategory: true },
  })

  const byCategoryId = new Map<string, CategoryAgg>()

  for (let i = 0; i < validations.length; i++) {
    const v = validations[i]
    if (!isAcademicallyApproved(v)) {
      if (v.status === ValidationStatus.approved) {
        console.warn(
          `[academic-consolidation] ignorando validacao inconsistente certificateId=${v.certificateId}`
        )
      }
      continue
    }
    const cat = v.activityCategory
    const add = v.approvedHours ?? 0
    const cid = cat.id
    let agg = byCategoryId.get(cid)
    if (!agg) {
      agg = {
        groupId: cat.groupId,
        name: cat.name,
        maxEligibleHours: cat.maxEligibleHours,
        approvedHours: 0,
      }
      byCategoryId.set(cid, agg)
    }
    agg.approvedHours += add
  }

  const categories: AcademicConsolidation['categories'] = []
  for (const [categoryId, agg] of byCategoryId) {
    if (agg.approvedHours <= 0) {
      continue
    }
    const { eligibleHours, cappedHours } = applyCategoryEligibleCap(
      agg.approvedHours,
      agg.maxEligibleHours
    )
    categories.push({
      categoryId,
      groupId: agg.groupId,
      name: agg.name,
      approvedHours: agg.approvedHours,
      eligibleHours,
      maxEligibleHours: agg.maxEligibleHours,
      cappedHours,
    })
  }

  categories.sort((a, b) => {
    const g = compareActivityGroupsByDisplayOrder({ id: a.groupId }, { id: b.groupId })
    if (g !== 0) {
      return g
    }
    return a.name.localeCompare(b.name, 'pt-BR')
  })

  let totalApprovedHours = 0
  let totalEligibleHours = 0
  for (let i = 0; i < categories.length; i++) {
    const c = categories[i]
    totalApprovedHours += c.approvedHours
    totalEligibleHours += c.eligibleHours
  }

  const approvedByGroupId = new Map<string, number>()
  const eligibleByGroupId = new Map<string, number>()
  for (let i = 0; i < activityGroups.length; i++) {
    approvedByGroupId.set(activityGroups[i].id, 0)
    eligibleByGroupId.set(activityGroups[i].id, 0)
  }

  for (let i = 0; i < categories.length; i++) {
    const c = categories[i]
    const ap = approvedByGroupId.get(c.groupId) ?? 0
    const el = eligibleByGroupId.get(c.groupId) ?? 0
    approvedByGroupId.set(c.groupId, ap + c.approvedHours)
    eligibleByGroupId.set(c.groupId, el + c.eligibleHours)
  }

  const groups: AcademicConsolidation['groups'] = []
  let validGroupsCount = 0

  for (let i = 0; i < activityGroups.length; i++) {
    const g = activityGroups[i]
    const approvedHours = approvedByGroupId.get(g.id) ?? 0
    const eligibleHours = eligibleByGroupId.get(g.id) ?? 0
    const meetsMinimumHours = eligibleHours >= MIN_HOURS_PER_GROUP
    if (meetsMinimumHours) {
      validGroupsCount += 1
    }
    groups.push({
      groupId: g.id,
      code: g.code,
      name: g.name,
      approvedHours,
      eligibleHours,
      minimumRequiredHours: MIN_HOURS_PER_GROUP,
      meetsMinimumHours,
    })
  }

  const meetsTotalHoursRequirement = totalEligibleHours >= MIN_TOTAL_HOURS
  const meetsDistinctGroupsRequirement = validGroupsCount >= MIN_DISTINCT_GROUPS
  const eligible = meetsTotalHoursRequirement && meetsDistinctGroupsRequirement
  const remainingEligibleHours = Math.max(0, MIN_TOTAL_HOURS - totalEligibleHours)

  return {
    studentId,
    eligible,
    totalApprovedHours,
    totalEligibleHours,
    remainingEligibleHours,
    validGroupsCount,
    requirements: {
      minimumTotalHours: MIN_TOTAL_HOURS,
      minimumDistinctGroups: MIN_DISTINCT_GROUPS,
      minimumHoursPerGroup: MIN_HOURS_PER_GROUP,
      meetsTotalHoursRequirement,
      meetsDistinctGroupsRequirement,
    },
    groups,
    categories,
  }
}

export type AcademicReviewInput = {
  status: string
  approvedHours?: number | null
  reviewNotes?: string | null
}

function parseValidationStatus(raw: string): ValidationStatusValue {
  if (raw === ValidationStatus.pending || raw === ValidationStatus.approved || raw === ValidationStatus.rejected) {
    return raw
  }
  throw new HttpError('status academico deve ser pending, approved ou rejected', 400)
}

function normalizeApprovedHoursForPersist(
  status: ValidationStatusValue,
  bodyHours: number | null | undefined
): number | null {
  if (status === ValidationStatus.pending) {
    return null
  }
  if (status === ValidationStatus.rejected) {
    return 0
  }
  if (bodyHours === null || bodyHours === undefined) {
    throw new HttpError('approvedHours obrigatorio quando status e approved', 400)
  }
  const n = Number(bodyHours)
  if (!Number.isFinite(n) || n <= 0) {
    throw new HttpError('approvedHours deve ser um numero maior que zero', 400)
  }
  return n
}

function normalizeReviewNotes(raw: string | null | undefined): string | null {
  if (raw == null) {
    return null
  }
  const t = String(raw).trim()
  return t.length === 0 ? null : t
}

function mapDomainErrorToHttp(err: unknown): HttpError {
  if (err instanceof HttpError) {
    return err
  }
  if (err instanceof Error) {
    if (err.message.startsWith('Inconsistencia:')) {
      return new HttpError(err.message, 500)
    }
    return new HttpError(err.message, 400)
  }
  return new HttpError('Erro de validacao', 400)
}

export async function reviewCertificateAcademically(
  certificateId: string,
  input: AcademicReviewInput
): Promise<AcademicReviewResult> {
  const status = parseValidationStatus(String(input.status ?? ''))
  const approvedHoursNorm = normalizeApprovedHoursForPersist(status, input.approvedHours)
  if (!isValidApprovedHoursForStatus(status, approvedHoursNorm)) {
    throw new HttpError('combinacao status/horas invalida para revisao academica', 400)
  }
  const reviewNotes = normalizeReviewNotes(input.reviewNotes)

  const cert = await prisma.certificate.findUnique({
    where: { id: certificateId },
    select: {
      id: true,
      validation: {
        select: {
          id: true,
          requestedHours: true,
          activityGroupId: true,
          activityCategory: { select: { id: true, name: true, groupId: true } },
        },
      },
    },
  })
  if (!cert) {
    throw new HttpError('Certificado nao encontrado', 404)
  }
  if (!cert.validation) {
    throw new HttpError('Certificado sem registro de validacao academica (migration incompleta ou dado legado)', 404)
  }

  try {
    validateAcademicReviewAgainstStoredValidation({
      status,
      approvedHoursNorm,
      requestedHours: cert.validation.requestedHours,
      activityGroupId: cert.validation.activityGroupId,
      activityCategory: cert.validation.activityCategory,
    })
  } catch (err) {
    throw mapDomainErrorToHttp(err)
  }

  const now = new Date()
  await prisma.certificateValidation.update({
    where: { certificateId },
    data: {
      status,
      approvedHours: approvedHoursNorm,
      reviewNotes,
      reviewedAt: now,
    },
  })

  const v = await prisma.certificateValidation.findUnique({
    where: { certificateId },
    include: {
      activityGroup: { select: { code: true, name: true } },
      activityCategory: { select: { name: true } },
    },
  })
  if (!v) {
    throw new HttpError('Validacao nao encontrada', 404)
  }

  return {
    certificateId: cert.id,
    validation: {
      status: v.status,
      approvedHours: v.approvedHours,
      reviewNotes: v.reviewNotes ?? null,
      reviewedAt: v.reviewedAt ? v.reviewedAt.toISOString() : null,
      requestedHours: v.requestedHours,
      activityGroup: { code: v.activityGroup.code, name: v.activityGroup.name },
      activityCategory: { name: v.activityCategory.name },
    },
  }
}
