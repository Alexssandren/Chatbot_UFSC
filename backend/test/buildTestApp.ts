import Fastify, { type FastifyInstance } from 'fastify'
import { loadEnv } from '../src/env'
import sessionPlugin from '../src/plugins/session'
import authRoutes from '../src/routes/auth'
import protectedRoutes from '../src/routes/protected'

export async function buildTestApp(): Promise<FastifyInstance> {
  loadEnv()
  const app = Fastify({ logger: false })
  await app.register(sessionPlugin)
  await app.register(authRoutes, { prefix: '/api' })
  await app.register(protectedRoutes, { prefix: '/api' })
  await app.ready()
  return app
}

export async function loginSessionCookie(app: FastifyInstance): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { username: 'Vilson', password: '1234' },
  })
  if (res.statusCode !== 200) {
    throw new Error(`login falhou: ${res.statusCode} ${res.body}`)
  }
  const setCookie = res.headers['set-cookie']
  if (Array.isArray(setCookie)) {
    return setCookie.map((c) => c.split(';')[0]).join('; ')
  }
  if (typeof setCookie === 'string') {
    return setCookie.split(';')[0]
  }
  throw new Error('cookie de sessao ausente')
}
