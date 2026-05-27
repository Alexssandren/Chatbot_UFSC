import type { FastifyPluginAsync } from 'fastify'
import {
  getSubmissionById,
  HttpError,
  listSubmissions,
  updateCertificateApprovalStatus,
  updateSubmissionStatus,
} from '../services/submissionService'

const submissionsProtectedRoutes: FastifyPluginAsync = async (app) => {
  app.get('/submissions', async (request, reply) => {
    const q = request.query as Record<string, string | undefined>
    const skip = Math.max(0, Number(q.skip ?? 0) || 0)
    const takeRaw = Number(q.take ?? 20) || 20
    const take = Math.min(Math.max(1, takeRaw), 100)
    const rows = await listSubmissions(skip, take)
    return reply.send(rows)
  })

  app.get('/submissions/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const row = await getSubmissionById(id)
      return reply.send(row)
    } catch (err) {
      if (err instanceof HttpError) {
        return reply.code(err.statusCode).send({ error: err.message })
      }
      request.log.error(err)
      return reply.code(500).send({ error: 'Erro interno' })
    }
  })

  app.patch('/submissions/:submissionId/certificates/:certificateId/status', async (request, reply) => {
    try {
      const { submissionId, certificateId } = request.params as {
        submissionId: string
        certificateId: string
      }
      const body = request.body as { status?: string }
      if (!body || typeof body.status !== 'string') {
        return reply.code(400).send({ error: 'Body JSON deve conter status (string)' })
      }
      const updated = await updateCertificateApprovalStatus(submissionId, certificateId, body.status)
      return reply.send(updated)
    } catch (err) {
      if (err instanceof HttpError) {
        return reply.code(err.statusCode).send({ error: err.message })
      }
      request.log.error(err)
      return reply.code(500).send({ error: 'Erro interno' })
    }
  })

  app.patch('/submissions/:id/status', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = request.body as { status?: string }
      if (!body || typeof body.status !== 'string') {
        return reply.code(400).send({ error: 'Body JSON deve conter status (string)' })
      }
      const updated = await updateSubmissionStatus(id, body.status)
      return reply.send(updated)
    } catch (err) {
      if (err instanceof HttpError) {
        return reply.code(err.statusCode).send({ error: err.message })
      }
      request.log.error(err)
      return reply.code(500).send({ error: 'Erro interno' })
    }
  })
}

export default submissionsProtectedRoutes
