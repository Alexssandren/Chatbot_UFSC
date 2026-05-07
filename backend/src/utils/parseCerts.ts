export function parseTotalCertificados(raw: string | undefined): number | null {
  if (raw === undefined || raw === '') {
    return null
  }
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 0) {
    return null
  }
  return n
}

export function certArquivoField(index: number): string {
  return `cert_${index}_arquivo`
}

export function certGrupoField(index: number): string {
  return `cert_${index}_grupo`
}

export function certHorasField(index: number): string {
  return `cert_${index}_horas`
}
