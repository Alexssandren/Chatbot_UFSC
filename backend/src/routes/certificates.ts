import type { FastifyPluginAsync } from 'fastify'
import { reviewCertificateAcademically, type AcademicReviewInput } from '../services/academicValidationService'
import { HttpError } from '../services/submissionService'

const certificatesRoutes: FastifyPluginAsync = async (app) => {
  app.patch('/certificates/:id/academic-review', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = request.body as AcademicReviewInput | null | undefined
      if (!body || typeof body !== 'object' || typeof body.status !== 'string') {
        return reply.code(400).send({ error: 'Body JSON deve conter status (string)' })
      }
      const result = await reviewCertificateAcademically(id, body)
      return reply.send(result)
    } catch (err) {
      if (err instanceof HttpError) {
        return reply.code(err.statusCode).send({ error: err.message })
      }
      request.log.error(err)
      return reply.code(500).send({ error: 'Erro interno' })
    }
  })
}

export default certificatesRoutes
