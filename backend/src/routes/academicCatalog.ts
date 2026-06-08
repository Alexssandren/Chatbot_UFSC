import type { FastifyPluginAsync } from 'fastify'
import { listAcademicCatalog } from '../services/academicCatalogService'

const academicCatalogRoutes: FastifyPluginAsync = async (app) => {
  app.get('/academic-catalog', async (_request, reply) => {
    const catalog = await listAcademicCatalog()
    return reply.send(catalog)
  })
}

export default academicCatalogRoutes
