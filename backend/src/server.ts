import { loadEnv, getEnv } from './env'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipartPlugin from './plugins/multipart'
import sessionPlugin from './plugins/session'
import authRoutes from './routes/auth'
import submissionsPublicRoutes from './routes/submissionsPublic'
import protectedRoutes from './routes/protected'
import { ensureUploadDirs } from './utils/uploadPaths'

async function main(): Promise<void> {
  loadEnv()
  await ensureUploadDirs()

  const env = getEnv()
  const app = Fastify({ logger: true })

  await app.register(cors, {
    origin: env.corsOrigin,
    credentials: true,
  })

  app.get('/health', async () => ({ status: 'ok' }))

  await app.register(sessionPlugin)

  await app.register(multipartPlugin)
  await app.register(authRoutes, { prefix: '/api' })
  await app.register(submissionsPublicRoutes, { prefix: '/api' })
  await app.register(protectedRoutes, { prefix: '/api' })

  await app.listen({ port: env.port, host: '0.0.0.0' })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
