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
  it('gera PDF com cabecalho institucional e assinatura do coordenador', async () => {
    const vm = buildConsolidatedReportViewModel(
      { nome: 'Ana Silva', matricula: '2025123456' },
      new Date('2026-06-04'),
      consolidation,
      [],
      {
        coordinatorRole: 'Coordenador do curso de Tecnologias da Informação e Comunicação',
      }
    )

    const buffer = await renderConsolidatedReportPdf(vm)
    assert.ok(buffer.length > 400)
    assert.equal(buffer.subarray(0, 4).toString('utf8'), '%PDF')
    assert.equal(
      vm.signature.coordinatorRole,
      'Coordenador do curso de Tecnologias da Informação e Comunicação'
    )
  })

  it('espaca linhas longas no resumo por grupo', async () => {
    const longNameConsolidation: AcademicConsolidation = {
      ...consolidation,
      groups: [
        {
          groupId: '1',
          code: 'GI',
          name: 'Grupo I — Atividades de iniciação à docência e pesquisa',
          approvedHours: 0,
          eligibleHours: 0,
          meetsMinimumHours: false,
        },
        {
          groupId: '2',
          code: 'GII',
          name: 'Grupo II — Congressos, seminários, conferências e outras atividades assistidas',
          approvedHours: 0,
          eligibleHours: 0,
          meetsMinimumHours: false,
        },
        {
          groupId: '5',
          code: 'GV',
          name: 'Grupo V — Cursos de formação complementar',
          approvedHours: 8.8,
          eligibleHours: 8.8,
          meetsMinimumHours: false,
        },
      ],
    }

    const compactVm = buildConsolidatedReportViewModel(
      { nome: 'Felipe Matar', matricula: '23201012' },
      new Date('2026-07-02'),
      { ...consolidation, groups: [] },
      [],
      { coordinatorRole: 'Coordenador do curso de Tecnologias da Informação e Comunicação' }
    )
    const longVm = buildConsolidatedReportViewModel(
      { nome: 'Felipe Matar', matricula: '23201012' },
      new Date('2026-07-02'),
      longNameConsolidation,
      [],
      { coordinatorRole: 'Coordenador do curso de Tecnologias da Informação e Comunicação' }
    )

    const compactBuffer = await renderConsolidatedReportPdf(compactVm)
    const longBuffer = await renderConsolidatedReportPdf(longVm)

    assert.ok(longBuffer.length > compactBuffer.length + 200)
  })
})
