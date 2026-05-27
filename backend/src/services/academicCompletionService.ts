import { prisma } from '../db'
import { getStudentAcademicConsolidation } from './academicValidationService'
import { HttpError } from './submissionService'

export type AcademicCompletionDto = {
  concluded: boolean
  concludedAt: string | null
  concludedBy: { displayName: string } | null
  revokedAt: string | null
  snapshot: {
    totalEligibleHours: number
    validGroupsCount: number
  } | null
  notes: string | null
}

function isCurrentlyConcluded(row: {
  concludedAt: Date | null
  revokedAt: Date | null
}): boolean {
  return row.concludedAt != null && row.revokedAt == null
}

function toDto(row: {
  concludedAt: Date | null
  revokedAt: Date | null
  notes: string | null
  snapshotTotalEligibleHours: number | null
  snapshotValidGroupsCount: number | null
  concludedBy: { displayName: string } | null
}): AcademicCompletionDto {
  const concluded = isCurrentlyConcluded(row)
  return {
    concluded,
    concludedAt: concluded && row.concludedAt ? row.concludedAt.toISOString() : null,
    concludedBy: concluded && row.concludedBy ? { displayName: row.concludedBy.displayName } : null,
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
    snapshot:
      concluded &&
      row.snapshotTotalEligibleHours != null &&
      row.snapshotValidGroupsCount != null
        ? {
            totalEligibleHours: row.snapshotTotalEligibleHours,
            validGroupsCount: row.snapshotValidGroupsCount,
          }
        : null,
    notes: row.notes,
  }
}

const completionInclude = {
  concludedBy: { select: { displayName: true } },
} as const

export async function getStudentAcademicCompletion(
  studentId: string
): Promise<AcademicCompletionDto> {
  const student = await prisma.student.findUnique({ where: { id: studentId } })
  if (!student) {
    throw new HttpError('Aluno nao encontrado', 404)
  }

  const row = await prisma.studentAcademicCompletion.findUnique({
    where: { studentId },
    include: completionInclude,
  })

  if (!row) {
    return {
      concluded: false,
      concludedAt: null,
      concludedBy: null,
      revokedAt: null,
      snapshot: null,
      notes: null,
    }
  }

  return toDto(row)
}

export async function concludeStudent(
  studentId: string,
  userId: string,
  notes?: string | null
): Promise<AcademicCompletionDto> {
  const student = await prisma.student.findUnique({ where: { id: studentId } })
  if (!student) {
    throw new HttpError('Aluno nao encontrado', 404)
  }

  const existing = await prisma.studentAcademicCompletion.findUnique({
    where: { studentId },
    include: completionInclude,
  })

  if (existing && isCurrentlyConcluded(existing)) {
    throw new HttpError('Aluno ja possui conclusao oficial registrada', 409)
  }

  const consolidation = await getStudentAcademicConsolidation(studentId)
  if (consolidation.academicEligibility.status !== 'apto') {
    throw new HttpError('Aluno nao esta apto para conclusao no momento', 422)
  }

  const now = new Date()
  const data = {
    concludedAt: now,
    concludedById: userId,
    notes: notes?.trim() ? notes.trim() : null,
    snapshotTotalEligibleHours: consolidation.totalEligibleHours,
    snapshotValidGroupsCount: consolidation.validGroupsCount,
    revokedAt: null,
    revokedById: null,
  }

  const row = existing
    ? await prisma.studentAcademicCompletion.update({
        where: { studentId },
        data,
        include: completionInclude,
      })
    : await prisma.studentAcademicCompletion.create({
        data: { studentId, ...data },
        include: completionInclude,
      })

  return toDto(row)
}

export async function revokeStudentCompletion(
  studentId: string,
  userId: string,
  notes?: string | null
): Promise<AcademicCompletionDto> {
  const row = await prisma.studentAcademicCompletion.findUnique({
    where: { studentId },
    include: completionInclude,
  })

  if (!row || !isCurrentlyConcluded(row)) {
    throw new HttpError('Nao ha conclusao ativa para revogar', 404)
  }

  const updated = await prisma.studentAcademicCompletion.update({
    where: { studentId },
    data: {
      revokedAt: new Date(),
      revokedById: userId,
      notes: notes?.trim() ? notes.trim() : row.notes,
    },
    include: completionInclude,
  })

  return toDto(updated)
}
