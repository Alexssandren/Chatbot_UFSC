import { compareActivityGroupsByDisplayOrder } from './academicCatalog'
import { isAcademicallyApproved } from './academicRules'
import type { AcademicConsolidation } from '../services/academicValidationService'

export const REPORT_INSTITUTION_NAME = 'Universidade Federal de Santa Catarina'
export const REPORT_COURSE_NAME = 'Curso TIC'
export const REPORT_TITLE = 'Relatorio consolidado de atividades complementares'

export type ConsolidatedReportStudent = {
  nome: string
  matricula: string
}

export type ApprovedActivityRow = {
  categoryName: string
  certificateName: string
  approvedHours: number
}

export type ConsolidatedReportViewModel = {
  student: ConsolidatedReportStudent
  issuedAt: Date
  consolidation: AcademicConsolidation
  approvedActivities: ApprovedActivityRow[]
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

export function buildConsolidatedReportViewModel(
  student: ConsolidatedReportStudent,
  issuedAt: Date,
  consolidation: AcademicConsolidation,
  validations: ValidationForReportRow[]
): ConsolidatedReportViewModel {
  const rows: {
    groupId: string
    groupCode: string
    categoryName: string
    certificateName: string
    approvedHours: number
  }[] = []

  for (let i = 0; i < validations.length; i++) {
    const v = validations[i]
    if (!isAcademicallyApproved(v)) {
      continue
    }
    rows.push({
      groupId: v.activityGroup.id,
      groupCode: v.activityGroup.code,
      categoryName: v.activityCategory.name,
      certificateName: v.certificate.originalFilename,
      approvedHours: v.approvedHours ?? 0,
    })
  }

  rows.sort((a, b) => {
    const g = compareActivityGroupsByDisplayOrder({ id: a.groupId }, { id: b.groupId })
    if (g !== 0) {
      return g
    }
    const c = a.categoryName.localeCompare(b.categoryName, 'pt-BR')
    if (c !== 0) {
      return c
    }
    return a.certificateName.localeCompare(b.certificateName, 'pt-BR')
  })

  const approvedActivities: ApprovedActivityRow[] = rows.map((r) => ({
    categoryName: r.categoryName,
    certificateName: r.certificateName,
    approvedHours: r.approvedHours,
  }))

  return {
    student,
    issuedAt,
    consolidation,
    approvedActivities,
  }
}
