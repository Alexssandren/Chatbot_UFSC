import { prisma } from '../db'
import { getEnv } from '../env'
import { buildConsolidatedReportViewModel } from '../domain/consolidatedReportViewModel'
import { renderConsolidatedReportPdf } from '../pdf/renderConsolidatedReportPdf'
import { getStudentAcademicConsolidation } from './academicValidationService'
import { HttpError } from './submissionService'

function formatDateForFilename(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

export async function generateConsolidatedReportPdf(
  studentId: string
): Promise<{ buffer: Buffer; filename: string }> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, nome: true, matricula: true },
  })
  if (!student) {
    throw new HttpError('Aluno nao encontrado', 404)
  }

  const consolidation = await getStudentAcademicConsolidation(studentId)

  const validations = await prisma.certificateValidation.findMany({
    where: { certificate: { submission: { studentId } } },
    include: {
      certificate: { select: { originalFilename: true } },
      activityGroup: { select: { id: true, code: true } },
      activityCategory: { select: { groupId: true, name: true } },
    },
  })

  const issuedAt = new Date()
  const env = getEnv()
  const viewModel = buildConsolidatedReportViewModel(
    { nome: student.nome, matricula: student.matricula },
    issuedAt,
    consolidation,
    validations,
    {
      requerimentoTitle: env.reportRequerimentoTitle,
      coordinatorName: env.reportCoordinatorName,
      coordinatorRole: env.reportCoordinatorRole,
    }
  )

  const buffer = await renderConsolidatedReportPdf(viewModel)
  const filename = `relatorio-${student.matricula}-${formatDateForFilename(issuedAt)}.pdf`

  return { buffer, filename }
}
