import { mkdir } from 'fs/promises'
import { basename, extname, join } from 'path'
import { randomUUID } from 'crypto'
import { getEnv } from '../env'

export async function ensureUploadDirs(): Promise<void> {
  const root = getEnv().uploadDir
  await mkdir(join(root, 'requerimentos'), { recursive: true })
  await mkdir(join(root, 'certificados'), { recursive: true })
  await mkdir(join(root, 'tmp'), { recursive: true })
}

export function extensionFromOriginalName(originalFilename: string): string {
  const ext = extname(originalFilename).toLowerCase()
  if (!ext || ext.length > 12) {
    return ''
  }
  return ext
}

export function newStoredFilename(originalFilename: string): string {
  return `${randomUUID()}${extensionFromOriginalName(originalFilename)}`
}

export function sanitizeOriginalFilename(name: string): string {
  const base = basename(name).replace(/[/\\]/g, '_')
  const trimmed = base.trim().slice(0, 200)
  return trimmed.length > 0 ? trimmed : 'file'
}

export function requerimentoDir(submissionId: string): string {
  return join(getEnv().uploadDir, 'requerimentos', submissionId)
}

export function certificadoDir(submissionId: string): string {
  return join(getEnv().uploadDir, 'certificados', submissionId)
}
