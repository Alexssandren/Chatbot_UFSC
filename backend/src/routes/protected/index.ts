import type { FastifyPluginAsync } from 'fastify'
import { getAuthenticatedUserId, sendUnauthorized } from '../../auth/session'
import academicCatalogRoutes from '../academicCatalog'
import certificatesRoutes from '../certificates'
import filesRoutes from '../files'
import studentsRoutes from '../students'
import submissionsProtectedRoutes from '../submissionsProtected'

const protectedRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (request, reply) => {
    if (!getAuthenticatedUserId(request)) {
      return sendUnauthorized(reply)
    }
  })

  await app.register(studentsRoutes)
  await app.register(academicCatalogRoutes)
  await app.register(certificatesRoutes)
  await app.register(submissionsProtectedRoutes)
  await app.register(filesRoutes)
}

export default protectedRoutes
