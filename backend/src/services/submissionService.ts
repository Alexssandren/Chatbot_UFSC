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
    const alunoId = requireNonEmpty(fields, 'aluno_id')
    const alunoMatricula = requireNonEmpty(fields, 'aluno_matricula')
    const alunoNome = requireNonEmpty(fields, 'aluno_nome')
    const alunoEmail = requireNonEmpty(fields, 'aluno_email')
    const totalRaw = requireNonEmpty(fields, 'total_certificados')
    const total = parseTotalCertificados(totalRaw)
    if (total === null) {
      throw new HttpError('total_certificados deve ser inteiro >= 0', 400)
    }

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
    }

    const certificateInputs: CertDraft[] = []
    for (let i = 0; i < total; i++) {
      const grupo = requireNonEmpty(fields, certGrupoField(i))
      const horasRaw = requireNonEmpty(fields, certHorasField(i))
      const horas = parseHoras(horasRaw, certHorasField(i))
      const fieldName = certArquivoField(i)
      const f = files.get(fieldName)
      if (!f) {
        throw new HttpError(`Arquivo obrigatorio ausente: ${fieldName}`, 400)
      }
      const storedName = newStoredFilename(f.originalFilename)
      certificateInputs.push({
        grupo,
        horas,
        tempPath: f.tempPath,
        originalFilename: f.originalFilename,
        storedName,
        relativePath: `certificados/${submissionId}/${storedName}`,
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
        const student = await tx.student.upsert({
          where: { externalUserId: alunoId },
          create: {
            externalUserId: alunoId,
            matricula: alunoMatricula,
            nome: alunoNome,
            email: alunoEmail,
          },
          update: {
            matricula: alunoMatricula,
            nome: alunoNome,
            email: alunoEmail,
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

export async function listSubmissions(skip: number, take: number) {
  return prisma.submission.findMany({
    skip,
    take,
    orderBy: { createdAt: 'desc' },
    include: { student: true },
  })
}

export async function getSubmissionById(id: string) {
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: { student: true, certificates: true },
  })
  if (!submission) {
    throw new HttpError('Submissao nao encontrada', 404)
  }
  return submission
}

const ALLOWED_STATUS = ['pending', 'approved', 'rejected'] as const

export async function updateSubmissionStatus(id: string, status: string) {
  if (!ALLOWED_STATUS.includes(status as (typeof ALLOWED_STATUS)[number])) {
    throw new HttpError('status deve ser pending, approved ou rejected', 400)
  }
  const existing = await prisma.submission.findUnique({ where: { id } })
  if (!existing) {
    throw new HttpError('Submissao nao encontrada', 404)
  }
  return prisma.submission.update({
    where: { id },
    data: { status },
  })
}
