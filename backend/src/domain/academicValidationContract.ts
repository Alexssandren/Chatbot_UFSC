/**
 * Contrato de revisao academica: valida entrada normalizada contra o registro persistido.
 * Lanca Error com mensagens em pt-BR (sem acentos), convertidas em HttpError na camada de servico.
 */
import { assertCategoryBelongsToGroup } from './academicGuards'
import {
  assertApprovedHoursWithinRequested,
  assertRequestedHoursValid,
  isValidApprovedHoursForStatus,
  ValidationStatus,
  type ValidationStatusValue,
} from './academicRules'

export type StoredCategoryForReview = {
  id: string
  name: string
  groupId: string
}

/**
 * Garante requestedHours valido, grupo/categoria coerentes e semantica status/horas
 * antes de persistir o PATCH de revisao academica.
 */
export function validateAcademicReviewAgainstStoredValidation(input: {
  status: ValidationStatusValue
  approvedHoursNorm: number | null
  requestedHours: number
  activityGroupId: string
  activityCategory: StoredCategoryForReview
}): void {
  assertRequestedHoursValid(input.requestedHours)
  assertCategoryBelongsToGroup(input.activityCategory, input.activityGroupId)
  if (!isValidApprovedHoursForStatus(input.status, input.approvedHoursNorm)) {
    throw new Error('combinacao status/horas invalida para revisao academica')
  }
  if (input.status === ValidationStatus.approved && input.approvedHoursNorm !== null) {
    assertApprovedHoursWithinRequested(input.approvedHoursNorm, input.requestedHours)
  }
}
