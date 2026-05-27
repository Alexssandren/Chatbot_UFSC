import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { validateAcademicReviewAgainstStoredValidation } from '../src/domain/academicValidationContract'
import { ValidationStatus } from '../src/domain/academicRules'
import { buildAcademicRejectionContent } from '../src/modules/email/academicRejectionEmail'
import { buildTestApp, loginSessionCookie } from './buildTestApp'

const SEED_STUDENT_ID = '11111111-1111-4111-8111-000000000001'

async function firstPendingCertificateId(
  app: Awaited<ReturnType<typeof buildTestApp>>,
  cookie: string,
  studentId: string
): Promise<string> {
  const res = await app.inject({
    method: 'GET',
    url: `/api/students/${studentId}`,
    headers: { cookie },
  })
  assert.equal(res.statusCode, 200)
  const body = JSON.parse(res.body) as {
    submissions: { certificates: { id: string; validation?: { status: string } | null }[] }[]
  }
  for (const sub of body.submissions) {
    for (const cert of sub.certificates) {
      if (cert.validation?.status === 'pending') {
        return cert.id
      }
    }
  }
  throw new Error('certificado pendente nao encontrado no seed')
}

describe('academicValidationContract', () => {
  const base = {
    approvedHoursNorm: 0,
    requestedHours: 10,
    activityGroupId: 'group-1',
    activityCategory: { id: 'cat-1', name: 'Palestra', groupId: 'group-1' },
  }

  it('rejeicao sem parecer lanca erro', () => {
    assert.throws(
      () =>
        validateAcademicReviewAgainstStoredValidation({
          ...base,
          status: ValidationStatus.rejected,
          reviewNotes: null,
        }),
      /parecer obrigatorio/
    )
  })

  it('rejeicao com parecer em branco lanca erro', () => {
    assert.throws(
      () =>
        validateAcademicReviewAgainstStoredValidation({
          ...base,
          status: ValidationStatus.rejected,
          reviewNotes: '   ',
        }),
      /parecer obrigatorio/
    )
  })

  it('rejeicao com parecer valido passa', () => {
    assert.doesNotThrow(() =>
      validateAcademicReviewAgainstStoredValidation({
        ...base,
        status: ValidationStatus.rejected,
        reviewNotes: 'Documento ilegivel',
      })
    )
  })
})

describe('buildAcademicRejectionContent', () => {
  it('inclui dados do aluno e parecer no corpo', () => {
    const { subject, text } = buildAcademicRejectionContent({
      studentName: 'Maria Silva',
      studentEmail: 'maria@ufsc.br',
      certificateFilename: 'certificado.pdf',
      activityGroupLabel: 'GI — Ensino',
      activityCategoryName: 'Palestra',
      reviewNotes: 'Arquivo corrompido',
      reviewedAtIso: '2026-05-27T12:00:00.000Z',
    })
    assert.match(subject, /UFSC TIC/)
    assert.match(text, /Maria Silva/)
    assert.match(text, /certificado\.pdf/)
    assert.match(text, /Arquivo corrompido/)
    assert.match(text, /GI — Ensino/)
    assert.match(text, /Palestra/)
  })
})

describe('PATCH academic-review rejeicao e notificacao', () => {
  const appPromise = buildTestApp()

  it('rejeicao sem parecer retorna 400', async () => {
    const app = await appPromise
    const cookie = await loginSessionCookie(app)
    const certId = await firstPendingCertificateId(app, cookie, SEED_STUDENT_ID)

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/certificates/${certId}/academic-review`,
      headers: { cookie, 'content-type': 'application/json' },
      payload: { status: 'rejected', approvedHours: 0 },
    })
    assert.equal(res.statusCode, 400)
    const body = JSON.parse(res.body) as { error?: string }
    assert.match(body.error ?? '', /parecer obrigatorio/i)
  })

  it('rejeicao com parecer persiste e retorna notification com mail desligado', async () => {
    const app = await appPromise
    const cookie = await loginSessionCookie(app)
    const certId = await firstPendingCertificateId(app, cookie, SEED_STUDENT_ID)

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/certificates/${certId}/academic-review`,
      headers: { cookie, 'content-type': 'application/json' },
      payload: {
        status: 'rejected',
        approvedHours: 0,
        reviewNotes: 'Documento ilegivel para teste',
      },
    })
    assert.equal(res.statusCode, 200)
    const body = JSON.parse(res.body) as {
      validation: { status: string; reviewNotes: string | null }
      notification?: { attempted: boolean; smtpAccepted: boolean; skipped?: string }
    }
    assert.equal(body.validation.status, 'rejected')
    assert.equal(body.validation.reviewNotes, 'Documento ilegivel para teste')
    assert.ok(body.notification)
    assert.equal(body.notification.attempted, false)
    assert.equal(body.notification.smtpAccepted, false)
    assert.equal(body.notification.skipped, 'mail_disabled')
  })
})
