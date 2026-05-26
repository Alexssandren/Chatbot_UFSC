import { loadEnv, getEnv } from './env'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import multipartPlugin from './plugins/multipart'
import certificatesRoutes from './routes/certificates'
import studentsRoutes from './routes/students'
import submissionsRoutes from './routes/submissions'
import { ensureUploadDirs } from './utils/uploadPaths'

async function main(): Promise<void> {
  loadEnv()
  await ensureUploadDirs()

  const app = Fastify({ logger: true })

  await app.register(cors, {
    origin: true,
  })

  app.get('/health', async () => ({ status: 'ok' }))

  await app.register(fastifyStatic, {
    root: getEnv().uploadDir,
    prefix: '/uploads/',
    decorateReply: false,
  })

  await app.register(multipartPlugin)
  await app.register(studentsRoutes, { prefix: '/api' })
  await app.register(submissionsRoutes, { prefix: '/api' })
  await app.register(certificatesRoutes, { prefix: '/api' })

  const { port } = loadEnv()
  await app.listen({ port, host: '0.0.0.0' })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
