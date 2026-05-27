import type { FastifyPluginAsync } from 'fastify'
import { getAuthenticatedUserId, sendUnauthorized } from '../auth/session'
import { getUserById, verifyCredentials } from '../services/authService'

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/auth/login', async (request, reply) => {
    const body = request.body as { username?: string; password?: string } | null
    if (
      !body ||
      typeof body.username !== 'string' ||
      typeof body.password !== 'string'
    ) {
      return reply.code(400).send({ error: 'Body JSON deve conter username e password' })
    }
    const user = await verifyCredentials(body.username, body.password)
    if (!user) {
      return reply.code(401).send({ error: 'Credenciais invalidas' })
    }
    request.session.userId = user.id
    return reply.send({ user })
  })

  app.post('/auth/logout', async (request, reply) => {
    await request.session.destroy()
    return reply.code(204).send()
  })

  /** Session-aware: valida cookie sem exigir plugin de painel. */
  app.get('/auth/me', async (request, reply) => {
    const userId = getAuthenticatedUserId(request)
    if (!userId) {
      return sendUnauthorized(reply)
    }
    const user = await getUserById(userId)
    if (!user) {
      request.session.userId = undefined
      return sendUnauthorized(reply)
    }
    return reply.send({ user })
  })
}

export default authRoutes
