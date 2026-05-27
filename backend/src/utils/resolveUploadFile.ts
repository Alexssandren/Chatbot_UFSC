import { createReadStream, existsSync } from 'fs'
import { resolve, sep } from 'path'
import { getEnv } from '../env'

const ALLOWED_PREFIXES = ['requerimentos/', 'certificados/'] as const

export type ResolvedUploadFile = {
  absolutePath: string
  contentType: string
  stream: ReturnType<typeof createReadStream>
}

function contentTypeForFilename(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.pdf')) {
    return 'application/pdf'
  }
  return 'application/octet-stream'
}

/**
 * Resolve path relativo sob UPLOAD_DIR com protecao contra traversal.
 * @throws Error com mensagem segura para 400
 */
export function resolveUploadFile(relativePath: string): ResolvedUploadFile {
  const normalized = relativePath
    .split(/[/\\]/)
    .map((s) => decodeURIComponent(s).trim())
    .filter((s) => s.length > 0)
    .join('/')

  if (normalized.length === 0) {
    throw new Error('Caminho de arquivo invalido')
  }
  if (normalized.includes('..')) {
    throw new Error('Caminho de arquivo invalido')
  }
  const allowed = ALLOWED_PREFIXES.some((p) => normalized.startsWith(p))
  if (!allowed) {
    throw new Error('Caminho de arquivo nao permitido')
  }

  const uploadDir = resolve(getEnv().uploadDir)
  const absolutePath = resolve(uploadDir, ...normalized.split('/'))
  const uploadPrefix = uploadDir.endsWith(sep) ? uploadDir : uploadDir + sep
  if (!absolutePath.startsWith(uploadPrefix) && absolutePath !== uploadDir) {
    throw new Error('Caminho de arquivo invalido')
  }
  if (!existsSync(absolutePath)) {
    throw new Error('Arquivo nao encontrado')
  }

  return {
    absolutePath,
    contentType: contentTypeForFilename(normalized),
    stream: createReadStream(absolutePath),
  }
}
