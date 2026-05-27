import PDFDocument from 'pdfkit'
import {
  REPORT_COURSE_NAME,
  REPORT_INSTITUTION_NAME,
  REPORT_TITLE,
  type ConsolidatedReportViewModel,
} from '../domain/consolidatedReportViewModel'

function formatDateBr(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

function eligibilityLabel(status: 'apto' | 'nao_apto'): string {
  return status === 'apto' ? 'APTO' : 'NAO APTO'
}

export function renderConsolidatedReportPdf(vm: ConsolidatedReportViewModel): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const left = 50
    let y = 50

    doc.fontSize(14).font('Helvetica-Bold').text(REPORT_INSTITUTION_NAME, left, y)
    y = doc.y + 4
    doc.fontSize(11).text(REPORT_COURSE_NAME, left, y)
    y = doc.y + 10
    doc.fontSize(13).text(REPORT_TITLE, left, y)
    y = doc.y + 20

    doc.fontSize(11).font('Helvetica-Bold').text('Dados do aluno', left, y)
    y = doc.y + 8
    doc.font('Helvetica')
    doc.text(`Nome: ${vm.student.nome}`, left, y)
    y = doc.y + 4
    doc.text(`Matricula: ${vm.student.matricula}`, left, y)
    y = doc.y + 4
    doc.text(`Emissao: ${formatDateBr(vm.issuedAt)}`, left, y)
    y = doc.y + 18

    const { consolidation } = vm
    doc.font('Helvetica-Bold').text('Resumo normativo', left, y)
    y = doc.y + 8
    doc.font('Helvetica')
    doc.text(`Horas homologadas: ${consolidation.totalApprovedHours}`, left, y)
    y = doc.y + 4
    doc.text(`Horas elegiveis: ${consolidation.totalEligibleHours}`, left, y)
    y = doc.y + 4
    doc.text(
      `Situacao: ${eligibilityLabel(consolidation.academicEligibility.status)}`,
      left,
      y
    )
    y = doc.y + 18

    doc.font('Helvetica-Bold').text('Resumo por grupo', left, y)
    y = doc.y + 10

    const colGroup = left
    const colHours = 320
    const colMeets = 450
    doc.fontSize(10).font('Helvetica-Bold')
    doc.text('Grupo', colGroup, y)
    doc.text('Horas elegiveis', colHours, y)
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
        y = 50
      }
    }

    y = doc.y + 14
    doc.font('Helvetica-Bold').fontSize(11).text('Atividades homologadas', left, y)
    y = doc.y + 10
    doc.fontSize(10)

    const colCat = left
    const colCert = 180
    const colH = 480
    doc.font('Helvetica-Bold')
    doc.text('Categoria', colCat, y)
    doc.text('Certificado', colCert, y)
    doc.text('Horas homologadas', colH, y)
    y = doc.y + 6
    doc.font('Helvetica')

    if (vm.approvedActivities.length === 0) {
      doc.text('Nenhuma atividade homologada', colCat, y)
      y = doc.y + 4
    } else {
      for (let i = 0; i < vm.approvedActivities.length; i++) {
        const row = vm.approvedActivities[i]
        doc.text(row.categoryName, colCat, y, { width: 160 })
        doc.text(row.certificateName, colCert, y, { width: 280 })
        doc.text(String(row.approvedHours), colH, y)
        y = Math.max(doc.y, y + 14)
        if (y > 700) {
          doc.addPage()
          y = 50
        }
      }
    }

    y = doc.y + 24
    if (y > 720) {
      doc.addPage()
      y = 50
    }
    doc.fontSize(9).font('Helvetica-Oblique').text(
      'Documento gerado eletronicamente pelo sistema de validacao de atividades complementares.',
      left,
      y,
      { width: 500, align: 'center' }
    )

    doc.end()
  })
}
