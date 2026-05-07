import { config } from 'dotenv'
import { resolve } from 'path'

config()

export type AppEnv = {
  port: number
  databaseUrl: string
  uploadDir: string
  nodeEnv: string
  /** Loga valores dos campos texto da submissão (PII); chaves sempre podem ser logadas no handler. */
  submissionLogFieldValues: boolean
}

let cached: AppEnv | null = null

export function loadEnv(): AppEnv {
  if (cached) {
    return cached
  }
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl || databaseUrl.trim() === '') {
    throw new Error('DATABASE_URL ausente. Copie .env.example para .env.')
  }
  const port = Number(process.env.PORT ?? 3000)
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error('PORT invalido.')
  }
  const uploadDir = resolve(process.cwd(), process.env.UPLOAD_DIR ?? './uploads')
  const nodeEnv = process.env.NODE_ENV ?? 'development'
  const debugFlag =
    process.env.DEBUG_SUBMISSIONS === '1' || process.env.DEBUG_SUBMISSIONS === 'true'
  const submissionLogFieldValues = nodeEnv !== 'production' || debugFlag
  cached = {
    port,
    databaseUrl,
    uploadDir,
    nodeEnv,
    submissionLogFieldValues,
  }
  return cached
}

export function getEnv(): AppEnv {
  if (!cached) {
    throw new Error('loadEnv() deve ser chamado antes de getEnv().')
  }
  return cached
}
