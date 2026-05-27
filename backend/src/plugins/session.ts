import fp from 'fastify-plugin'
import cookie from '@fastify/cookie'
import session from '@fastify/session'
import { getEnv } from '../env'

export default fp(async (app) => {
  const { sessionSecret, nodeEnv } = getEnv()

  await app.register(cookie)
  await app.register(session, {
    secret: sessionSecret,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: nodeEnv === 'production',
      path: '/',
    },
    saveUninitialized: false,
  })
})
