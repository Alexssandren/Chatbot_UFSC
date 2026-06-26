import { existsSync } from 'fs'
import { join } from 'path'
import PDFDocument from 'pdfkit'
import {
  REPORT_COURSE_NAME,
  REPORT_INSTITUTION_NAME,
  REPORT_TITLE,
  type ConsolidatedReportViewModel,
} from '../domain/consolidatedReportViewModel'

const PAGE_MARGIN = 50
const CONTENT_WIDTH = 595.28 - PAGE_MARGIN * 2
const UFSC_BLUE = '#004587'

const MONTHS_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const

function formatDateBr(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

function formatDateLongPt(d: Date): string {
  return `${d.getDate()} de ${MONTHS_PT[d.getMonth()]} de ${d.getFullYear()}`
}

function eligibilityLabel(status: 'apto' | 'nao_apto'): string {
  return status === 'apto' ? 'APTO' : 'NAO APTO'
}

function resolveLogoPath(): string | null {
  const candidates = [
    join(__dirname, '..', 'assets', 'ufsc-logo.png'),
    join(process.cwd(), 'src', 'assets', 'ufsc-logo.png'),
  ]
  for (let i = 0; i < candidates.length; i++) {
    if (existsSync(candidates[i])) {
      return candidates[i]
    }
  }
  return null
}

function drawCenteredText(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  y: number,
  options: { font?: string; size?: number; color?: string; bold?: boolean } = {}
): number {
  const font = options.bold ? 'Helvetica-Bold' : options.font ?? 'Helvetica'
  const size = options.size ?? 11
  if (options.color) {
    doc.fillColor(options.color)
  } else {
    doc.fillColor('#000000')
  }
  doc.font(font).fontSize(size).text(text, PAGE_MARGIN, y, {
    width: CONTENT_WIDTH,
    align: 'center',
  })
  return doc.y
}

export function renderConsolidatedReportPdf(vm: ConsolidatedReportViewModel): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'A4' })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const left = PAGE_MARGIN
    let y = PAGE_MARGIN

    const logoPath = resolveLogoPath()
    if (logoPath) {
      const logoWidth = 52
      const logoX = PAGE_MARGIN + (CONTENT_WIDTH - logoWidth) / 2
      doc.image(logoPath, logoX, y, { width: logoWidth })
      y += 58
    }

    y = drawCenteredText(doc, 'UFSC', y, { size: 20, color: UFSC_BLUE, bold: true }) + 6
    y = drawCenteredText(doc, REPORT_INSTITUTION_NAME, y, { size: 11 }) + 10
    y = drawCenteredText(doc, REPORT_TITLE, y, { size: 12, bold: true }) + 6
    y = drawCenteredText(doc, REPORT_COURSE_NAME, y, { size: 11 }) + 22

    doc.fillColor('#000000')
    doc.fontSize(11).font('Helvetica-Bold').text('Aluno', left, y)
    y = doc.y + 8
    doc.font('Helvetica').fontSize(10)
    doc.text(`Nome: ${vm.student.nome}`, left, y)
    y = doc.y + 4
    doc.text(`Matrícula: ${vm.student.matricula}`, left, y)
    y = doc.y + 4
    doc.text(`Data de emissão: ${formatDateBr(vm.issuedAt)}`, left, y)
    y = doc.y + 18

    const { consolidation } = vm
    doc.font('Helvetica-Bold').fontSize(11).text('Resumo normativo', left, y)
    y = doc.y + 8
    doc.font('Helvetica').fontSize(10)
    doc.text(`Horas homologadas: ${consolidation.totalApprovedHours}`, left, y)
    y = doc.y + 4
    doc.text(`Horas elegíveis: ${consolidation.totalEligibleHours}`, left, y)
    y = doc.y + 4
    doc.text(`Situação: ${eligibilityLabel(consolidation.academicEligibility.status)}`, left, y)
    y = doc.y + 18

    doc.font('Helvetica-Bold').fontSize(11).text('Resumo por grupo', left, y)
    y = doc.y + 10

    const colGroup = left
    const colHours = 320
    const colMeets = 450
    doc.fontSize(10).font('Helvetica-Bold')
    doc.text('Grupo', colGroup, y)
    doc.text('Horas elegíveis', colHours, y)
    doc.text('Atende (min. 20h)', colMeets, y)
    y = doc.y + 6
    doc.font('Helvetica')

    for (let i = 0; i < consolidation.groups.length; i++) {
      const g = consolidation.groups[i]
      const label = `${g.code} — ${g.name}`
      doc.text(label, colGroup, y, { width: 250 })
      doc.text(String(g.eligibleHours), colHours, y)
      doc.text(g.meetsMinimumHours ? 'Sim' : 'Nao', colMeets, y)
      y = doc.y + 4
      if (y > 700) {
        doc.addPage()
        y = PAGE_MARGIN
      }
    }

    y = doc.y + 14
    doc.font('Helvetica-Bold').fontSize(11).text('Atividades homologadas', left, y)
    y = doc.y + 10
    doc.fontSize(10)

    const colCat = left
    const colH = 460
    doc.font('Helvetica-Bold')
    doc.text('Categoria', colCat, y)
    doc.text('Horas homologadas', colH, y)
    y = doc.y + 6
    doc.font('Helvetica')

    if (vm.approvedActivities.length === 0) {
      doc.text('Nenhuma atividade homologada', colCat, y)
      y = doc.y + 4
    } else {
      for (let i = 0; i < vm.approvedActivities.length; i++) {
        const row = vm.approvedActivities[i]
        doc.text(row.categoryName, colCat, y, { width: 380 })
        doc.text(String(row.approvedHours), colH, y)
        y = Math.max(doc.y, y + 14)
        if (y > 700) {
          doc.addPage()
          y = PAGE_MARGIN
        }
      }
    }

    y = Math.max(y + 40, 620)
    if (y > 700) {
      doc.addPage()
      y = PAGE_MARGIN + 40
    }

    const lineWidth = 220
    const lineX = PAGE_MARGIN + (CONTENT_WIDTH - lineWidth) / 2
    doc
      .moveTo(lineX, y)
      .lineTo(lineX + lineWidth, y)
      .stroke()
    y += 14

    doc.font('Helvetica').fontSize(10).text(vm.signature.coordinatorRole, PAGE_MARGIN, y, {
      width: CONTENT_WIDTH,
      align: 'center',
    })
    y = doc.y + 4
    doc.text(formatDateLongPt(vm.issuedAt), PAGE_MARGIN, y, {
      width: CONTENT_WIDTH,
      align: 'center',
    })

    doc.end()
  })
}
