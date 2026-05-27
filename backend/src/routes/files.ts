import type { FastifyPluginAsync } from 'fastify'
import { resolveUploadFile } from '../utils/resolveUploadFile'

const filesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/files/*', async (request, reply) => {
    const params = request.params as { '*': string }
    const relativePath = params['*'] ?? ''
    try {
      const file = resolveUploadFile(relativePath)
      return reply.type(file.contentType).send(file.stream)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao abrir arquivo'
      if (message === 'Arquivo nao encontrado') {
        return reply.code(404).send({ error: message })
      }
      return reply.code(400).send({ error: message })
    }
  })
}

export default filesRoutes
