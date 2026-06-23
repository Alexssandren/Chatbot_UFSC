import type { FastifyPluginAsync } from 'fastify'
import { requireAuthenticatedSession } from '../auth/session'
import { reviewCertificateAcademically, type AcademicReviewInput } from '../services/academicValidationService'
import {
  reassignCertificateAcademicClassification,
  type CertificateReassignInput,
} from '../services/certificateReassignService'
import { getCertificateAcademicReviewHistory } from '../services/academicReviewHistoryReadService'
import { HttpError } from '../services/submissionService'

const certificatesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/certificates/:id/academic-review/history', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const result = await getCertificateAcademicReviewHistory(id)
      return reply.send(result)
    } catch (err) {
      if (err instanceof HttpError) {
        return reply.code(err.statusCode).send({ error: err.message })
      }
      request.log.error(err)
      return reply.code(500).send({ error: 'Erro interno' })
    }
  })

  app.patch('/certificates/:id/academic-classification', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = request.body as CertificateReassignInput | null | undefined
      if (
        !body ||
        typeof body !== 'object' ||
        typeof body.activityGroupId !== 'string' ||
        typeof body.activityCategoryId !== 'string'
      ) {
        return reply
          .code(400)
          .send({ error: 'Body JSON deve conter activityGroupId e activityCategoryId (string)' })
      }
      requireAuthenticatedSession(request)
      const result = await reassignCertificateAcademicClassification(id, body)
      return reply.send(result)
    } catch (err) {
      if (err instanceof HttpError) {
        return reply.code(err.statusCode).send({ error: err.message })
      }
      request.log.error(err)
      return reply.code(500).send({ error: 'Erro interno' })
    }
  })

  app.patch('/certificates/:id/academic-review', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = request.body as AcademicReviewInput | null | undefined
      if (!body || typeof body !== 'object' || typeof body.status !== 'string') {
        return reply.code(400).send({ error: 'Body JSON deve conter status (string)' })
      }
      const userId = requireAuthenticatedSession(request)
      const result = await reviewCertificateAcademically(id, body, userId)
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
