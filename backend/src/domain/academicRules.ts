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

/**
 * Indica se a validação entra no cálculo de consolidação acadêmica.
 * Usa apenas o status; horas aprovadas vêm de `approvedHours` (invariante na persistência).
 */
export function isAcademicallyApproved(validation: { status: string }): boolean {
  return validation.status === ValidationStatus.approved
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
