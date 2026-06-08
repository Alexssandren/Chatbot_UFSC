import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildConsolidatedReportViewModel } from '../src/domain/consolidatedReportViewModel'
import { renderConsolidatedReportPdf } from '../src/pdf/renderConsolidatedReportPdf'
import type { AcademicConsolidation } from '../src/services/academicValidationService'

const consolidation: AcademicConsolidation = {
  studentId: 'test',
  eligible: true,
  totalApprovedHours: 144,
  totalEligibleHours: 144,
  remainingEligibleHours: 0,
  validGroupsCount: 3,
  requirements: {
    minimumTotalHours: 144,
    minimumDistinctGroups: 3,
    minimumHoursPerGroup: 20,
    meetsTotalHoursRequirement: true,
    meetsDistinctGroupsRequirement: true,
  },
  groups: [],
  categories: [],
  academicEligibility: {
    status: 'apto',
    remainingHours: 0,
    remainingDistinctGroups: 0,
    pendingGroups: [],
  },
}

describe('renderConsolidatedReportPdf', () => {
  it('gera PDF com cabecalho do requerimento e assinatura', async () => {
    const vm = buildConsolidatedReportViewModel(
      { nome: 'Ana Silva', matricula: '2025123456' },
      new Date('2026-06-04'),
      consolidation,
      [],
      {
        requerimentoTitle: 'Requerimento de validacao',
        coordinatorName: 'Vilson Gruber',
        coordinatorRole: 'Coordenador do curso',
      }
    )

    const buffer = await renderConsolidatedReportPdf(vm)
    assert.ok(buffer.length > 400)
    assert.equal(buffer.subarray(0, 4).toString('utf8'), '%PDF')
    assert.equal(vm.signature.coordinatorName, 'Vilson Gruber')
    assert.equal(vm.requerimentoHeader.title, 'Requerimento de validacao')
  })
})
