import type { FastifyPluginAsync } from 'fastify'
import { requireAuthenticatedSession } from '../auth/session'
import {
  concludeStudent,
  getStudentAcademicCompletion,
  revokeStudentCompletion,
} from '../services/academicCompletionService'
import { generateConsolidatedReportPdf } from '../services/academicReportService'
import { getStudentAcademicConsolidation } from '../services/academicValidationService'
import { HttpError } from '../services/submissionService'
import {
  getStudentWithSubmissions,
  listStudents,
  listStudentsWithOverview,
} from '../services/studentService'

const studentsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/students', async (request, reply) => {
    const query = request.query as { overview?: string }
    if (query.overview === '1' || query.overview === 'true') {
      const rows = await listStudentsWithOverview()
      return reply.send(rows)
    }
    const rows = await listStudents()
    return reply.send(rows)
  })

  app.get('/students/:id/consolidated-report.pdf', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { buffer, filename } = await generateConsolidatedReportPdf(id)
      return reply
        .type('application/pdf')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(buffer)
    } catch (err) {
      if (err instanceof HttpError) {
        return reply.code(err.statusCode).send({ error: err.message })
      }
      request.log.error(err)
      return reply.code(500).send({ error: 'Erro interno' })
    }
  })

  app.get('/students/:id/academic-completion', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const completion = await getStudentAcademicCompletion(id)
      return reply.send(completion)
    } catch (err) {
      if (err instanceof HttpError) {
        return reply.code(err.statusCode).send({ error: err.message })
      }
      request.log.error(err)
      return reply.code(500).send({ error: 'Erro interno' })
    }
  })

  app.post('/students/:id/academic-completion', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const userId = requireAuthenticatedSession(request)
      const body = (request.body ?? {}) as { notes?: string | null }
      const notes = typeof body.notes === 'string' ? body.notes : undefined
      const completion = await concludeStudent(id, userId, notes)
      return reply.code(201).send(completion)
    } catch (err) {
      if (err instanceof HttpError) {
        return reply.code(err.statusCode).send({ error: err.message })
      }
      request.log.error(err)
      return reply.code(500).send({ error: 'Erro interno' })
    }
  })

  app.post('/students/:id/academic-completion/revoke', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const userId = requireAuthenticatedSession(request)
      const body = (request.body ?? {}) as { notes?: string | null }
      const notes = typeof body.notes === 'string' ? body.notes : undefined
      const completion = await revokeStudentCompletion(id, userId, notes)
      return reply.send(completion)
    } catch (err) {
      if (err instanceof HttpError) {
        return reply.code(err.statusCode).send({ error: err.message })
      }
      request.log.error(err)
      return reply.code(500).send({ error: 'Erro interno' })
    }
  })

  app.get('/students/:id/academic-summary', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const summary = await getStudentAcademicConsolidation(id)
      return reply.send(summary)
    } catch (err) {
      if (err instanceof HttpError) {
        return reply.code(err.statusCode).send({ error: err.message })
      }
      request.log.error(err)
      return reply.code(500).send({ error: 'Erro interno' })
    }
  })

  app.get('/students/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const row = await getStudentWithSubmissions(id)
      return reply.send(row)
    } catch (err) {
      if (err instanceof HttpError) {
        return reply.code(err.statusCode).send({ error: err.message })
      }
      request.log.error(err)
      return reply.code(500).send({ error: 'Erro interno' })
    }
  })
}

export default studentsRoutes
