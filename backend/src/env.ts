import { config } from 'dotenv'
import { resolve } from 'path'

config()

export type AppEnv = {
  port: number
  databaseUrl: string
  uploadDir: string
  nodeEnv: string
  sessionSecret: string
  sessionCookieSecure: boolean
  corsOrigin: string
  /** Loga valores dos campos texto da submissão (PII); chaves sempre podem ser logadas no handler. */
  submissionLogFieldValues: boolean
  mailEnabled: boolean
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUser: string
  smtpPass: string
  mailFrom: string
  reportCoordinatorName: string
  reportCoordinatorRole: string
  reportRequerimentoTitle: string
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
  const sessionSecret = process.env.SESSION_SECRET?.trim() ?? ''
  if (sessionSecret.length < 16) {
    throw new Error(
      'SESSION_SECRET ausente ou curto demais (minimo 16 caracteres). Copie .env.example para .env.'
    )
  }
  const sessionCookieSecureRaw = process.env.SESSION_COOKIE_SECURE?.trim().toLowerCase()
  const sessionCookieSecure =
    sessionCookieSecureRaw === 'true' || sessionCookieSecureRaw === '1'
      ? true
      : sessionCookieSecureRaw === 'false' || sessionCookieSecureRaw === '0'
        ? false
        : nodeEnv === 'production'
  const corsOrigin =
    process.env.CORS_ORIGIN?.trim() || 'http://localhost:5173'
  const debugFlag =
    process.env.DEBUG_SUBMISSIONS === '1' || process.env.DEBUG_SUBMISSIONS === 'true'
  const submissionLogFieldValues = nodeEnv !== 'production' || debugFlag
  const mailEnabled =
    process.env.MAIL_ENABLED === '1' || process.env.MAIL_ENABLED === 'true'
  const smtpHost = process.env.SMTP_HOST?.trim() ?? ''
  const smtpPort = Number(process.env.SMTP_PORT ?? 587)
  if (!Number.isFinite(smtpPort) || smtpPort <= 0) {
    throw new Error('SMTP_PORT invalido.')
  }
  const smtpSecure =
    process.env.SMTP_SECURE === '1' || process.env.SMTP_SECURE === 'true'
  const smtpUser = process.env.SMTP_USER?.trim() ?? ''
  const smtpPass = process.env.SMTP_PASS ?? ''
  const mailFrom = process.env.MAIL_FROM?.trim() ?? ''
  if (mailEnabled && nodeEnv === 'production') {
    if (!smtpHost) {
      throw new Error('SMTP_HOST ausente com MAIL_ENABLED=true em producao.')
    }
    if (!smtpUser) {
      throw new Error('SMTP_USER ausente com MAIL_ENABLED=true em producao.')
    }
    if (!smtpPass) {
      throw new Error('SMTP_PASS ausente com MAIL_ENABLED=true em producao.')
    }
    if (!mailFrom) {
      throw new Error('MAIL_FROM ausente com MAIL_ENABLED=true em producao.')
    }
  }
  const reportCoordinatorName =
    process.env.REPORT_COORDINATOR_NAME?.trim() || 'Coordenacao do curso TIC'
  const reportCoordinatorRole =
    process.env.REPORT_COORDINATOR_ROLE?.trim() || 'Coordenador(a) do curso'
  const reportRequerimentoTitle =
    process.env.REPORT_REQUERIMENTO_TITLE?.trim() ||
    'Requerimento de validacao de atividades complementares'

  cached = {
    port,
    databaseUrl,
    uploadDir,
    nodeEnv,
    sessionSecret,
    sessionCookieSecure,
    corsOrigin,
    submissionLogFieldValues,
    mailEnabled,
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPass,
    mailFrom,
    reportCoordinatorName,
    reportCoordinatorRole,
    reportRequerimentoTitle,
  }
  return cached
}

export function getEnv(): AppEnv {
  if (!cached) {
    throw new Error('loadEnv() deve ser chamado antes de getEnv().')
  }
  return cached
}
