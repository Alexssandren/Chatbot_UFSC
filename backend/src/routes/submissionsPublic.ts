import type { FastifyPluginAsync } from 'fastify'
import {
  createSubmissionFromMultipart,
  HttpError,
} from '../services/submissionService'

/** Integracao Moodle/chatbot — permanece sem autenticacao de sessao. */
const submissionsPublicRoutes: FastifyPluginAsync = async (app) => {
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
}

export default submissionsPublicRoutes
