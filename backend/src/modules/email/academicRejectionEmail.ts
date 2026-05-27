import nodemailer from 'nodemailer'
import { getEnv } from '../../env'

export type AcademicRejectionEmailDto = {
  studentName: string
  studentEmail: string
  certificateFilename: string
  activityGroupLabel: string
  activityCategoryName: string
  reviewNotes: string
  reviewedAtIso: string
}

export function buildAcademicRejectionContent(dto: AcademicRejectionEmailDto): {
  subject: string
  text: string
} {
  const subject = '[UFSC TIC] Parecer sobre certificado de atividade complementar'
  const text = [
    `Prezado(a) ${dto.studentName},`,
    '',
    `Informamos que o certificado "${dto.certificateFilename}" (grupo ${dto.activityGroupLabel}, categoria ${dto.activityCategoryName}) foi analisado e nao foi homologado.`,
    '',
    'Parecer:',
    dto.reviewNotes,
    '',
    `Data da analise: ${dto.reviewedAtIso}`,
    '',
    'Este e-mail e informativo. Consulte o coordenador ou orientador para orientacoes.',
  ].join('\n')
  return { subject, text }
}

let transport: nodemailer.Transporter | null = null

function getTransport(): nodemailer.Transporter {
  if (!transport) {
    const env = getEnv()
    transport = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    })
  }
  return transport
}

export async function sendAcademicRejectionEmail(
  dto: AcademicRejectionEmailDto
): Promise<{ smtpAccepted: boolean; error?: string }> {
  const env = getEnv()
  if (!env.mailEnabled) {
    return { smtpAccepted: false, error: 'mail_disabled' }
  }
  try {
    const { subject, text } = buildAcademicRejectionContent(dto)
    await getTransport().sendMail({
      from: env.mailFrom,
      to: dto.studentEmail,
      subject,
      text,
    })
    return { smtpAccepted: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'erro ao encaminhar notificacao'
    return { smtpAccepted: false, error: msg }
  }
}
