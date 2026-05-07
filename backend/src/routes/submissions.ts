import type { FastifyPluginAsync } from 'fastify'
import {
  createSubmissionFromMultipart,
  getSubmissionById,
  HttpError,
  listSubmissions,
  updateSubmissionStatus,
} from '../services/submissionService'

const submissionsRoutes: FastifyPluginAsync = async (app) => {
  app.post('/submissions', async (request, reply) => {
    try {
      const result = await createSubmissionFromMultipart(request)
      return reply.code(201).send({
        success: true,
        submissionId: result.submissionId,
      })
    } catch (err) {
      if (err instanceof HttpError) {
        request.log.warn({ err }, '[submission] validacao ou regra http')
        return reply.code(err.statusCode).send({
          success: false,
          message: err.message,
        })
      }
      request.log.error({ err }, '[submission] erro interno ou parsing')
      return reply.code(500).send({
        success: false,
        message: 'Erro interno',
      })
    }
  })

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

export default submissionsRoutes
