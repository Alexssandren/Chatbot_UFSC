import { createWriteStream } from 'fs'
import { mkdir, rename, rm } from 'fs/promises'
import { join } from 'path'
import { pipeline } from 'stream/promises'
import { randomUUID } from 'crypto'
import type { FastifyRequest } from 'fastify'
import { prisma } from '../db'
import { getEnv } from '../env'
import {
  certArquivoField,
  certGrupoField,
  certHorasField,
  parseTotalCertificados,
} from '../utils/parseCerts'
import {
  certificadoDir,
  newStoredFilename,
  requerimentoDir,
  sanitizeOriginalFilename,
} from '../utils/uploadPaths'
import { assertCategoryBelongsToGroup } from '../domain/academicGuards'
import { assertRequestedHoursValid, isAcademicallyApproved, ValidationStatus } from '../domain/academicRules'
import { resolveCertificateAcademicLinks } from '../domain/resolveCertificateAcademicLinks'

const certificateAcademicInclude = {
  include: {
    validation: {
      include: {
        activityGroup: true,
        activityCategory: true,
      },
    },
  },
} as const

export class HttpError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

type SavedFile = { tempPath: string; originalFilename: string }

async function consumeMultipart(request: FastifyRequest): Promise<{
  fields: Record<string, string>
  files: Map<string, SavedFile>
  tmpDir: string
}> {
  const fields: Record<string, string> = {}
  const files = new Map<string, SavedFile>()
  const tmpDir = join(getEnv().uploadDir, 'tmp', randomUUID())
  await mkdir(tmpDir, { recursive: true })

  try {
    const parts = request.parts()
    for await (const part of parts) {
      if (part.type === 'file') {
        const originalFilename = sanitizeOriginalFilename(part.filename ?? 'file')
        const dest = join(tmpDir, `${part.fieldname}__${randomUUID()}`)
        await pipeline(part.file, createWriteStream(dest))
        files.set(part.fieldname, { tempPath: dest, originalFilename })
      } else {
        fields[part.fieldname] = String(part.value ?? '')
      }
    }
    return { fields, files, tmpDir }
  } catch (err) {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
    throw err
  }
}

function logMultipartParsed(
  log: FastifyRequest['log'],
  fields: Record<string, string>,
  files: Map<string, SavedFile>
): void {
  const env = getEnv()
  log.info(
    {
      fieldKeys: Object.keys(fields),
      fileKeys: [...files.keys()],
      total_certificados_raw: fields.total_certificados ?? '',
    },
    '[submission] multipart recebido'
  )
  if (env.submissionLogFieldValues) {
    log.info({ fields }, '[submission] valores dos campos texto')
  }
}

function requireNonEmpty(fields: Record<string, string>, key: string): string {
  const v = fields[key]
  if (v === undefined || v.trim() === '') {
    throw new HttpError(`Campo obrigatorio ausente ou vazio: ${key}`, 400)
  }
  return v.trim()
}

function parseHoras(raw: string, fieldKey: string): number {
  const n = Number(raw.replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) {
    throw new HttpError(`Valor invalido para ${fieldKey}`, 400)
  }
  return n
}

export async function createSubmissionFromMultipart(request: FastifyRequest): Promise<{
  submissionId: string
  studentId: string
}> {
  const { fields, files, tmpDir } = await consumeMultipart(request)
  let tmpDirToCleanup = tmpDir

  try {
    logMultipartParsed(request.log, fields, files)

    const alunoMatricula = requireNonEmpty(fields, 'aluno_matricula')
    const alunoNome = requireNonEmpty(fields, 'aluno_nome')
    const alunoEmail = requireNonEmpty(fields, 'aluno_email')
    const alunoIdOpt = (fields.aluno_id ?? '').trim()
    const externalUserIdForDb = alunoIdOpt || alunoMatricula

    const totalRaw = requireNonEmpty(fields, 'total_certificados')
    const total = parseTotalCertificados(totalRaw)
    if (total === null) {
      throw new HttpError('total_certificados deve ser inteiro >= 0', 400)
    }

    request.log.info({ total_certificados: total }, '[submission] total_certificados interpretado')

    const reqFile = files.get('requerimento')
    if (!reqFile) {
      throw new HttpError('Arquivo obrigatorio ausente: requerimento', 400)
    }

    const submissionId = randomUUID()
    const reqStoredName = newStoredFilename(reqFile.originalFilename)
    const reqRel = `requerimentos/${submissionId}/${reqStoredName}`

    type CertDraft = {
      grupo: string
      horas: number
      tempPath: string
      originalFilename: string
      storedName: string
      relativePath: string
      activityGroupId: string
      activityCategoryId: string
    }

    const certificateInputs: CertDraft[] = []
    for (let i = 0; i < total; i++) {
      const grupo = requireNonEmpty(fields, certGrupoField(i))
      const horasRaw = requireNonEmpty(fields, certHorasField(i))
      const horas = parseHoras(horasRaw, certHorasField(i))
      try {
        assertRequestedHoursValid(horas)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Horas solicitadas invalidas'
        throw new HttpError(msg, 400)
      }
      const fieldName = certArquivoField(i)
      const f = files.get(fieldName)
      if (!f) {
        throw new HttpError(`Arquivo obrigatorio ausente: ${fieldName}`, 400)
      }
      const storedName = newStoredFilename(f.originalFilename)
      const academic = resolveCertificateAcademicLinks(grupo)
      certificateInputs.push({
        grupo,
        horas,
        tempPath: f.tempPath,
        originalFilename: f.originalFilename,
        storedName,
        relativePath: `certificados/${submissionId}/${storedName}`,
        activityGroupId: academic.activityGroupId,
        activityCategoryId: academic.activityCategoryId,
      })
    }

    const reqDir = requerimentoDir(submissionId)
    const certsRoot = certificadoDir(submissionId)

    try {
      await mkdir(reqDir, { recursive: true })
      await rename(reqFile.tempPath, join(reqDir, reqStoredName))

      await mkdir(certsRoot, { recursive: true })
      for (const c of certificateInputs) {
        await rename(c.tempPath, join(certsRoot, c.storedName))
      }

      await rm(tmpDir, { recursive: true, force: true })
      tmpDirToCleanup = ''
    } catch (err) {
      await rm(reqDir, { recursive: true, force: true }).catch(() => {})
      await rm(certsRoot, { recursive: true, force: true }).catch(() => {})
      throw err
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        for (const c of certificateInputs) {
          const category = await tx.activityCategory.findUnique({ where: { id: c.activityCategoryId } })
          if (!category) {
            throw new HttpError(
              'Configuracao academica incompleta no servidor (categoria inexistente). Execute o seed ou as migrations.',
              500
            )
          }
          try {
            assertCategoryBelongsToGroup(category, c.activityGroupId)
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Erro de consistencia grupo/categoria'
            throw new HttpError(msg, 500)
          }
        }

        const student = await tx.student.upsert({
          where: { matricula: alunoMatricula },
          create: {
            externalUserId: externalUserIdForDb,
            matricula: alunoMatricula,
            nome: alunoNome,
            email: alunoEmail,
          },
          update: {
            nome: alunoNome,
            email: alunoEmail,
            ...(alunoIdOpt !== '' ? { externalUserId: alunoIdOpt } : {}),
          },
        })

        await tx.submission.create({
          data: {
            id: submissionId,
            studentId: student.id,
            status: 'pending',
            requerimentoRelativePath: reqRel,
            requerimentoOriginalName: reqFile.originalFilename,
            certificates: {
              create: certificateInputs.map((c) => ({
                grupo: c.grupo,
                horas: c.horas,
                fileRelativePath: c.relativePath,
                originalFilename: c.originalFilename,
                validation: {
                  create: {
                    activityGroupId: c.activityGroupId,
                    activityCategoryId: c.activityCategoryId,
                    requestedHours: c.horas,
                    approvedHours: null,
                    status: ValidationStatus.pending,
                  },
                },
              })),
            },
          },
        })

        return { studentId: student.id }
      })

      return { submissionId, studentId: result.studentId }
    } catch (err) {
      await rm(reqDir, { recursive: true, force: true }).catch(() => {})
      await rm(certsRoot, { recursive: true, force: true }).catch(() => {})
      throw err
    }
  } finally {
    if (tmpDirToCleanup) {
      await rm(tmpDirToCleanup, { recursive: true, force: true }).catch(() => {})
    }
  }
}

type CertificateWithValidationRow = {
  horas: number
  validation: null | {
    status: string
    approvedHours: number | null
    requestedHours: number
    activityGroupId: string
    activityCategory: { groupId: string }
  }
}

/**
 * totalDeclaredHours: soma de Certificate.horas (valor do envio).
 * totalAcademicApprovedHours: soma de approvedHours apenas para validacoes que entram na consolidacao.
 */
export function computeSubmissionHourTotals(
  certificates: CertificateWithValidationRow[]
): { totalDeclaredHours: number; totalAcademicApprovedHours: number } {
  let totalDeclaredHours = 0
  let totalAcademicApprovedHours = 0
  for (let i = 0; i < certificates.length; i++) {
    const c = certificates[i]
    totalDeclaredHours += c.horas
    const v = c.validation
    if (
      v &&
      isAcademicallyApproved({
        status: v.status,
        approvedHours: v.approvedHours,
        requestedHours: v.requestedHours,
        activityGroupId: v.activityGroupId,
        activityCategory: { groupId: v.activityCategory.groupId },
      })
    ) {
      totalAcademicApprovedHours += v.approvedHours ?? 0
    }
  }
  return { totalDeclaredHours, totalAcademicApprovedHours }
}

export async function listSubmissions(skip: number, take: number) {
  const rows = await prisma.submission.findMany({
    skip,
    take,
    orderBy: { createdAt: 'desc' },
    include: { student: true, certificates: certificateAcademicInclude },
  })
  return rows.map((r) => ({
    ...r,
    ...computeSubmissionHourTotals(r.certificates),
  }))
}

export async function getSubmissionById(id: string) {
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: { student: true, certificates: certificateAcademicInclude },
  })
  if (!submission) {
    throw new HttpError('Submissao nao encontrada', 404)
  }
  return {
    ...submission,
    ...computeSubmissionHourTotals(submission.certificates),
  }
}

export async function syncSubmissionStatusFromCertificates(submissionId: string): Promise<void> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      certificates: {
        include: {
          validation: true,
        },
      },
    },
  })
  if (!submission || submission.certificates.length === 0) {
    return
  }

  const statuses = submission.certificates.map((c) => c.validation?.status ?? 'pending')
  if (statuses.some((s) => s === 'pending')) {
    await prisma.submission.update({ where: { id: submissionId }, data: { status: 'pending' } })
    return
  }
  if (statuses.every((s) => s === 'approved')) {
    await prisma.submission.update({ where: { id: submissionId }, data: { status: 'approved' } })
    return
  }
  if (statuses.every((s) => s === 'rejected')) {
    await prisma.submission.update({ where: { id: submissionId }, data: { status: 'rejected' } })
    return
  }
  await prisma.submission.update({ where: { id: submissionId }, data: { status: 'partial' } })
}

const ALLOWED_CERT_APPROVAL = ['pending', 'approved', 'rejected'] as const

export async function updateCertificateApprovalStatus(
  submissionId: string,
  certificateId: string,
  status: string
): Promise<Awaited<ReturnType<typeof getSubmissionById>>> {
  if (!ALLOWED_CERT_APPROVAL.includes(status as (typeof ALLOWED_CERT_APPROVAL)[number])) {
    throw new HttpError('status do certificado deve ser pending, approved ou rejected', 400)
  }

  const cert = await prisma.certificate.findFirst({
    where: { id: certificateId, submissionId },
  })
  if (!cert) {
    throw new HttpError('Certificado nao encontrado', 404)
  }

  await prisma.certificate.update({
    where: { id: certificateId },
    data: { approvalStatus: status },
  })

  await syncSubmissionStatusFromCertificates(submissionId)

  return getSubmissionById(submissionId)
}

const ALLOWED_STATUS = ['pending', 'approved', 'rejected', 'partial'] as const

export async function updateSubmissionStatus(id: string, status: string) {
  if (!ALLOWED_STATUS.includes(status as (typeof ALLOWED_STATUS)[number])) {
    throw new HttpError('status deve ser pending, approved, rejected ou partial', 400)
  }
  const existing = await prisma.submission.findUnique({
    where: { id },
    include: { certificates: true },
  })
  if (!existing) {
    throw new HttpError('Submissao nao encontrada', 404)
  }

  if (existing.certificates.length > 0) {
    if (status === 'approved' || status === 'rejected' || status === 'pending') {
      const certStatus =
        status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending'
      
      const certificates = await prisma.certificate.findMany({
        where: { submissionId: id },
        include: { validation: true },
      })

      for (const cert of certificates) {
        if (cert.validation) {
          const approvedHours = certStatus === 'approved' ? cert.horas : (certStatus === 'rejected' ? 0 : null)
          await prisma.certificateValidation.update({
            where: { id: cert.validation.id },
            data: {
              status: certStatus,
              approvedHours,
            },
          })
        }
      }
    }
  }

  const updated = await prisma.submission.update({
    where: { id },
    data: { status },
    include: { student: true, certificates: certificateAcademicInclude },
  })
  return {
    ...updated,
    ...computeSubmissionHourTotals(updated.certificates),
  }
}
