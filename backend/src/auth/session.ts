import type { FastifyReply, FastifyRequest } from 'fastify'

export class UnauthorizedError extends Error {
  readonly statusCode = 401

  constructor(message = 'Nao autenticado') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

/** Retorna userId ou null — nao lanca. */
export function getAuthenticatedUserId(request: FastifyRequest): string | null {
  const userId = request.session?.userId
  if (typeof userId === 'string' && userId.length > 0) {
    return userId
  }
  return null
}

/** Retorna userId ou envia 401 e lanca UnauthorizedError. */
export function requireAuthenticatedSession(request: FastifyRequest): string {
  const userId = getAuthenticatedUserId(request)
  if (!userId) {
    throw new UnauthorizedError()
  }
  return userId
}

export function sendUnauthorized(reply: FastifyReply) {
  return reply.code(401).send({ error: 'Nao autenticado' })
}
