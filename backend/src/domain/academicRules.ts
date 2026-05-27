/**
 * Regras globais UFSC (atividades complementares). Constantes explícitas e
 * helpers de domínio compartilhados (consolidação acadêmica, persistência).
 */
export const MIN_TOTAL_HOURS = 144
export const MIN_DISTINCT_GROUPS = 3
export const MIN_HOURS_PER_GROUP = 20

/**
 * Status de validação acadêmica (campo `CertificateValidation.status` no SQLite como TEXT).
 * O conector SQLite deste projeto não usa `enum` nativo do Prisma; estes valores são a fonte de verdade.
 */
export const ValidationStatus = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
} as const

export type ValidationStatusValue = (typeof ValidationStatus)[keyof typeof ValidationStatus]

/** Snapshot minimo para filtro contabil na consolidacao (I-40 / I-41). */
export type AcademicConsolidationValidationInput = {
  status: string
  approvedHours: number | null
  requestedHours: number
  activityGroupId: string
  activityCategory: { groupId: string }
}

/**
 * Indica se a validacao entra no calculo de consolidacao academica.
 * Exige status approved, requestedHours valido, approvedHours finito dentro do solicitado
 * e categoria pertencente ao grupo (defesa contra dados legados ou corrompidos).
 */
export function isAcademicallyApproved(validation: AcademicConsolidationValidationInput): boolean {
  if (validation.status !== ValidationStatus.approved) {
    return false
  }
  if (!isValidRequestedHours(validation.requestedHours)) {
    return false
  }
  if (validation.activityCategory.groupId !== validation.activityGroupId) {
    return false
  }
  const ah = validation.approvedHours
  if (ah === null || !Number.isFinite(ah) || ah <= 0) {
    return false
  }
  if (ah > validation.requestedHours) {
    return false
  }
  return true
}

export function isValidRequestedHours(requestedHours: number): boolean {
  return Number.isFinite(requestedHours) && requestedHours > 0
}

/**
 * Horas solicitadas invalidas no certificado (legado ou erro de carga).
 */
export function assertRequestedHoursValid(requestedHours: number): void {
  if (!isValidRequestedHours(requestedHours)) {
    throw new Error('requestedHours invalido no certificado; corrija os dados antes de revisar')
  }
}

/**
 * Homologacao nao pode exceder o solicitado no certificado (I-14).
 */
export function assertApprovedHoursWithinRequested(
  approvedHours: number,
  requestedHours: number
): void {
  if (approvedHours > requestedHours) {
    throw new Error(
      `approvedHours (${approvedHours}) nao pode exceder horas solicitadas (${requestedHours})`
    )
  }
}

/**
 * Teto normativo por categoria: soma aprovada ja agregada; aplica um unico min com maxEligibleHours.
 * maxEligibleHours null/undefined = sem limite (eligibleHours === approvedHours).
 */
export function applyCategoryEligibleCap(
  approvedHours: number,
  maxEligibleHours: number | null | undefined
): { eligibleHours: number; cappedHours: number } {
  const eligibleHours =
    maxEligibleHours == null ? approvedHours : Math.min(approvedHours, maxEligibleHours)
  return { eligibleHours, cappedHours: approvedHours - eligibleHours }
}

/**
 * Semântica de `CertificateValidation.approvedHours`:
 * - pending: null (ainda não revisado academicamente)
 * - rejected: 0 (rejeitado; distingue de "não revisado")
 * - approved: valor > 0 (horas efetivamente aprovadas na validação acadêmica)
 */
export function isValidApprovedHoursForStatus(
  status: ValidationStatusValue,
  approvedHours: number | null
): boolean {
  if (status === ValidationStatus.pending) {
    return approvedHours === null
  }
  if (status === ValidationStatus.rejected) {
    return approvedHours === 0
  }
  if (status === ValidationStatus.approved) {
    return approvedHours !== null && approvedHours > 0
  }
  return false
}
