import { compareActivityGroupsByDisplayOrder } from './academicCatalog'
import { isAcademicallyApproved } from './academicRules'
import type { AcademicConsolidation } from '../services/academicValidationService'

export const REPORT_INSTITUTION_NAME = 'Universidade Federal de Santa Catarina'
export const REPORT_COURSE_NAME = 'Curso de Tecnologias da Informação e Comunicação'
export const REPORT_TITLE = 'Relatório consolidado de atividades complementares'

export type ConsolidatedReportStudent = {
  nome: string
  matricula: string
}

export type ApprovedActivityRow = {
  categoryName: string
  approvedHours: number
}

export type ReportSignatureBlock = {
  coordinatorRole: string
}

export type ConsolidatedReportViewModel = {
  student: ConsolidatedReportStudent
  issuedAt: Date
  consolidation: AcademicConsolidation
  approvedActivities: ApprovedActivityRow[]
  signature: ReportSignatureBlock
}

export type ValidationForReportRow = {
  status: string
  approvedHours: number | null
  requestedHours: number
  activityGroupId: string
  activityCategory: { groupId: string; name: string }
  activityGroup: { id: string; code: string }
  certificate: { originalFilename: string }
}

export type ReportMetaInput = {
  coordinatorRole: string
}

function aggregateApprovedActivitiesByCategory(
  validations: ValidationForReportRow[]
): ApprovedActivityRow[] {
  const byCategory = new Map<string, { hours: number; groupId: string }>()

  for (let i = 0; i < validations.length; i++) {
    const v = validations[i]
    if (!isAcademicallyApproved(v)) {
      continue
    }
    const existing = byCategory.get(v.activityCategory.name)
    const hours = (existing?.hours ?? 0) + (v.approvedHours ?? 0)
    byCategory.set(v.activityCategory.name, {
      hours,
      groupId: existing?.groupId ?? v.activityGroup.id,
    })
  }

  return Array.from(byCategory.entries())
    .sort((a, b) => {
      const g = compareActivityGroupsByDisplayOrder({ id: a[1].groupId }, { id: b[1].groupId })
      if (g !== 0) {
        return g
      }
      return a[0].localeCompare(b[0], 'pt-BR')
    })
    .map(([categoryName, { hours }]) => ({
      categoryName,
      approvedHours: hours,
    }))
}

export function buildConsolidatedReportViewModel(
  student: ConsolidatedReportStudent,
  issuedAt: Date,
  consolidation: AcademicConsolidation,
  validations: ValidationForReportRow[],
  reportMeta: ReportMetaInput
): ConsolidatedReportViewModel {
  return {
    student,
    issuedAt,
    consolidation,
    approvedActivities: aggregateApprovedActivitiesByCategory(validations),
    signature: {
      coordinatorRole: reportMeta.coordinatorRole,
    },
  }
}
