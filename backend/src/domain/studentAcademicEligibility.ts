import {
  MIN_DISTINCT_GROUPS,
  MIN_HOURS_PER_GROUP,
  MIN_TOTAL_HOURS,
} from './academicRules'

export type AcademicEligibilityStatus = 'apto' | 'nao_apto'

export type ConsolidationGroupRow = {
  groupId: string
  code: string
  name: string
  eligibleHours: number
  meetsMinimumHours: boolean
  minimumRequiredHours: number
}

export type PendingGroupRow = {
  groupId: string
  code: string
  name: string
  eligibleHours: number
  hoursShortfall: number
}

export type AcademicEligibility = {
  status: AcademicEligibilityStatus
  remainingHours: number
  remainingDistinctGroups: number
  pendingGroups: PendingGroupRow[]
}

export type AcademicEligibilityInput = {
  totalEligibleHours: number
  validGroupsCount: number
  groups: readonly ConsolidationGroupRow[]
}

export function computeRemainingHours(totalEligibleHours: number): number {
  return Math.max(0, MIN_TOTAL_HOURS - totalEligibleHours)
}

export function computeRemainingDistinctGroups(validGroupsCount: number): number {
  return Math.max(0, MIN_DISTINCT_GROUPS - validGroupsCount)
}

export function resolveAcademicEligibilityStatus(
  totalEligibleHours: number,
  validGroupsCount: number
): AcademicEligibilityStatus {
  const meetsTotal = totalEligibleHours >= MIN_TOTAL_HOURS
  const meetsGroups = validGroupsCount >= MIN_DISTINCT_GROUPS
  return meetsTotal && meetsGroups ? 'apto' : 'nao_apto'
}

export function computePendingGroups(
  groups: readonly ConsolidationGroupRow[]
): PendingGroupRow[] {
  const pending: PendingGroupRow[] = []
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i]
    if (g.meetsMinimumHours) {
      continue
    }
    pending.push({
      groupId: g.groupId,
      code: g.code,
      name: g.name,
      eligibleHours: g.eligibleHours,
      hoursShortfall: Math.max(0, g.minimumRequiredHours - g.eligibleHours),
    })
  }
  return pending
}

export function deriveAcademicEligibility(input: AcademicEligibilityInput): AcademicEligibility {
  const status = resolveAcademicEligibilityStatus(
    input.totalEligibleHours,
    input.validGroupsCount
  )
  return {
    status,
    remainingHours: computeRemainingHours(input.totalEligibleHours),
    remainingDistinctGroups: computeRemainingDistinctGroups(input.validGroupsCount),
    pendingGroups: computePendingGroups(input.groups),
  }
}
