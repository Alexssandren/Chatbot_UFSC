import { prisma } from '../db'
import { HttpError } from './submissionService'

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
  return student
}
