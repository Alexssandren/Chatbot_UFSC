import { loadEnv } from './env'
import Fastify from 'fastify'
import multipartPlugin from './plugins/multipart'
import submissionsRoutes from './routes/submissions'
import { ensureUploadDirs } from './utils/uploadPaths'

async function main(): Promise<void> {
  loadEnv()
  await ensureUploadDirs()

  const app = Fastify({ logger: true })

  app.get('/health', async () => ({ ok: true }))

  await app.register(multipartPlugin)
  await app.register(submissionsRoutes, { prefix: '/api' })

  const { port } = loadEnv()
  await app.listen({ port, host: '0.0.0.0' })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
