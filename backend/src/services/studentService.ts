import { prisma } from '../db'
import { getStudentAcademicConsolidation } from './academicValidationService'
import { computeSubmissionHourTotals, HttpError } from './submissionService'

export async function listStudents() {
  return prisma.student.findMany({
    orderBy: { nome: 'asc' },
    select: {
      id: true,
      externalUserId: true,
      matricula: true,
      nome: true,
      email: true,
      createdAt: true,
      _count: { select: { submissions: true } },
    },
  })
}

export type StudentOverviewSnapshot = {
  totalEligibleHours: number
  validGroupsCount: number
  academicEligibilityStatus: 'apto' | 'nao_apto'
}

export type StudentListRowWithOverview = {
  id: string
  matricula: string
  nome: string
  email: string
  submissionCount: number
  overview: StudentOverviewSnapshot
}

export async function listStudentsWithOverview(): Promise<StudentListRowWithOverview[]> {
  const rows = await listStudents()
  const result: StudentListRowWithOverview[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const consolidation = await getStudentAcademicConsolidation(row.id)
    result.push({
      id: row.id,
      matricula: row.matricula,
      nome: row.nome,
      email: row.email,
      submissionCount: row._count.submissions,
      overview: {
        totalEligibleHours: consolidation.totalEligibleHours,
        validGroupsCount: consolidation.validGroupsCount,
        academicEligibilityStatus: consolidation.academicEligibility.status,
      },
    })
  }

  return result
}

export async function getStudentWithSubmissions(id: string) {
  const student = await prisma.student.findUnique({
    where: { id },
        include: {
          submissions: {
            orderBy: { createdAt: 'desc' },
            include: {
              certificates: {
                include: {
                  validation: {
                    include: {
                      activityGroup: true,
                      activityCategory: true,
                    },
                  },
                },
              },
            },
          },
        },
  })
  if (!student) {
    throw new HttpError('Aluno nao encontrado', 404)
  }
  return {
    ...student,
    submissions: student.submissions.map((s) => ({
      ...s,
      ...computeSubmissionHourTotals(s.certificates),
    })),
  }
}
