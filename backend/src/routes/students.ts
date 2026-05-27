import type { FastifyPluginAsync } from 'fastify'
import { generateConsolidatedReportPdf } from '../services/academicReportService'
import { getStudentAcademicConsolidation } from '../services/academicValidationService'
import { HttpError } from '../services/submissionService'
import { getStudentWithSubmissions, listStudents } from '../services/studentService'

const studentsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/students', async (_request, reply) => {
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
