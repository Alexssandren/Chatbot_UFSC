import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildConsolidatedReportViewModel } from '../src/domain/consolidatedReportViewModel'
import { ValidationStatus } from '../src/domain/academicRules'
import type { AcademicConsolidation } from '../src/services/academicValidationService'

const emptyConsolidation = (): AcademicConsolidation => ({
  studentId: 'test',
  eligible: false,
  totalApprovedHours: 0,
  totalEligibleHours: 0,
  remainingEligibleHours: 144,
  validGroupsCount: 0,
  requirements: {
    minimumTotalHours: 144,
    minimumDistinctGroups: 3,
    minimumHoursPerGroup: 20,
    meetsTotalHoursRequirement: false,
    meetsDistinctGroupsRequirement: false,
  },
  groups: [],
  categories: [],
  academicEligibility: {
    status: 'nao_apto',
    remainingHours: 144,
    remainingDistinctGroups: 3,
    pendingGroups: [],
  },
})

describe('buildConsolidatedReportViewModel', () => {
  it('inclui apenas validacoes academicamente aprovadas', () => {
    const vm = buildConsolidatedReportViewModel(
      { nome: 'Teste', matricula: '123' },
      new Date('2026-05-27'),
      emptyConsolidation(),
      [
        {
          status: ValidationStatus.approved,
          approvedHours: 10,
          requestedHours: 10,
          activityGroupId: 'g1',
          activityGroup: { id: 'g1', code: 'GI' },
          activityCategory: { groupId: 'g1', name: 'Pesquisa' },
          certificate: { originalFilename: 'cert-a.pdf' },
        },
        {
          status: ValidationStatus.pending,
          approvedHours: null,
          requestedHours: 8,
          activityGroupId: 'g1',
          activityGroup: { id: 'g1', code: 'GI' },
          activityCategory: { groupId: 'g1', name: 'Pesquisa' },
          certificate: { originalFilename: 'cert-b.pdf' },
        },
        {
          status: ValidationStatus.rejected,
          approvedHours: 0,
          requestedHours: 5,
          activityGroupId: 'g2',
          activityGroup: { id: 'g2', code: 'GII' },
          activityCategory: { groupId: 'g2', name: 'Eventos' },
          certificate: { originalFilename: 'cert-c.pdf' },
        },
      ]
    )

    assert.equal(vm.approvedActivities.length, 1)
    assert.equal(vm.approvedActivities[0].certificateName, 'cert-a.pdf')
    assert.equal(vm.approvedActivities[0].approvedHours, 10)
  })
})
