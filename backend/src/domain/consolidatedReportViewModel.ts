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

export type ReportRequerimentoHeader = {
  title: string
  studentName: string
  matricula: string
  issueDate: string
}

export type ReportSignatureBlock = {
  coordinatorName: string
  coordinatorRole: string
  signedAt: string
}

export type ConsolidatedReportViewModel = {
  student: ConsolidatedReportStudent
  issuedAt: Date
  consolidation: AcademicConsolidation
  approvedActivities: ApprovedActivityRow[]
  requerimentoHeader: ReportRequerimentoHeader
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

function formatDateBr(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export type ReportMetaInput = {
  requerimentoTitle: string
  coordinatorName: string
  coordinatorRole: string
}

export function buildConsolidatedReportViewModel(
  student: ConsolidatedReportStudent,
  issuedAt: Date,
  consolidation: AcademicConsolidation,
  validations: ValidationForReportRow[],
  reportMeta: ReportMetaInput
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

  const issueDate = formatDateBr(issuedAt)

  return {
    student,
    issuedAt,
    consolidation,
    approvedActivities,
    requerimentoHeader: {
      title: reportMeta.requerimentoTitle,
      studentName: student.nome,
      matricula: student.matricula,
      issueDate,
    },
    signature: {
      coordinatorName: reportMeta.coordinatorName,
      coordinatorRole: reportMeta.coordinatorRole,
      signedAt: issueDate,
    },
  }
}
