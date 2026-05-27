/**
 * Diff e builder para AcademicReviewHistory (Fase 6).
 * Sem persistencia aqui — apenas regras explicitas de comparacao e montagem da row.
 */
export type AcademicReviewSnapshot = {
  status: string
  approvedHours: number | null
  reviewNotes: string | null
}

export type AcademicReviewHistorySource = 'academic_review_patch' | 'repair_script'

export type AcademicReviewHistoryChangedBy = {
  id: string
  displayName: string
}

export type AcademicReviewHistoryEntry = {
  id: string
  changedAt: string
  source: AcademicReviewHistorySource
  changeReason: string | null
  changedBy?: AcademicReviewHistoryChangedBy
  before: AcademicReviewSnapshot
  after: AcademicReviewSnapshot
}

export type AcademicReviewHistoryResponse = {
  certificateId: string
  validationId: string
  entries: AcademicReviewHistoryEntry[]
}

/** Row minima de AcademicReviewHistory para mapeamento read-only. */
export type AcademicReviewHistoryDbRow = {
  id: string
  previousStatus: string
  newStatus: string
  previousApprovedHours: number | null
  newApprovedHours: number | null
  previousReviewNotes: string | null
  newReviewNotes: string | null
  source: string
  changeReason: string | null
  changedAt: Date
  changedBy: { id: string; displayName: string } | null
}

function parseHistorySource(raw: string): AcademicReviewHistorySource {
  return raw === 'repair_script' ? 'repair_script' : 'academic_review_patch'
}

/** Converte row persistida em DTO publico (GET history). */
export function entryFromHistoryRow(row: AcademicReviewHistoryDbRow): AcademicReviewHistoryEntry {
  const entry: AcademicReviewHistoryEntry = {
    id: row.id,
    changedAt: row.changedAt.toISOString(),
    source: parseHistorySource(row.source),
    changeReason: normalizeChangeReason(row.changeReason),
    before: {
      status: row.previousStatus,
      approvedHours: row.previousApprovedHours,
      reviewNotes: normalizeReviewNotes(row.previousReviewNotes),
    },
    after: {
      status: row.newStatus,
      approvedHours: row.newApprovedHours,
      reviewNotes: normalizeReviewNotes(row.newReviewNotes),
    },
  }
  if (row.changedBy) {
    entry.changedBy = {
      id: row.changedBy.id,
      displayName: row.changedBy.displayName,
    }
  }
  return entry
}

export function normalizeReviewNotes(raw: string | null | undefined): string | null {
  if (raw == null) {
    return null
  }
  const t = String(raw).trim()
  return t.length === 0 ? null : t
}

export function snapshotFromValidation(row: {
  status: string
  approvedHours: number | null
  reviewNotes: string | null
}): AcademicReviewSnapshot {
  return {
    status: row.status,
    approvedHours: row.approvedHours,
    reviewNotes: normalizeReviewNotes(row.reviewNotes),
  }
}

export function hasAcademicReviewChanged(
  before: AcademicReviewSnapshot,
  after: AcademicReviewSnapshot
): boolean {
  if (before.status !== after.status) {
    return true
  }
  if (before.approvedHours !== after.approvedHours) {
    return true
  }
  if (before.reviewNotes !== after.reviewNotes) {
    return true
  }
  return false
}

export function normalizeChangeReason(raw: string | null | undefined): string | null {
  if (raw == null) {
    return null
  }
  const t = String(raw).trim()
  return t.length === 0 ? null : t
}

export function buildHistoryRow(
  validationId: string,
  before: AcademicReviewSnapshot,
  after: AcademicReviewSnapshot,
  opts: {
    source: AcademicReviewHistorySource
    changeReason?: string | null
    changedById?: string | null
  }
) {
  return {
    validationId,
    previousStatus: before.status,
    newStatus: after.status,
    previousApprovedHours: before.approvedHours,
    newApprovedHours: after.approvedHours,
    previousReviewNotes: before.reviewNotes,
    newReviewNotes: after.reviewNotes,
    source: opts.source,
    changeReason: normalizeChangeReason(opts.changeReason),
    changedById: opts.changedById ?? null,
  }
}
