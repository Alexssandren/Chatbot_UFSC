import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { buildTestApp, loginSessionCookie } from './buildTestApp'

const SEED_STUDENT_IDS = [
  '11111111-1111-4111-8111-000000000001',
  '11111111-1111-4111-8111-000000000002',
  '11111111-1111-4111-8111-000000000003',
  '11111111-1111-4111-8111-000000000004',
] as const
const FAKE_STUDENT_ID = '99999999-9999-4999-8999-999999999999'

let studentAptoId: string
let studentNaoAptoId: string

async function findStudentByEligibility(
  app: Awaited<ReturnType<typeof buildTestApp>>,
  cookie: string,
  target: 'apto' | 'nao_apto'
): Promise<string> {
  for (const id of SEED_STUDENT_IDS) {
    const res = await app.inject({
      method: 'GET',
      url: `/api/students/${id}/academic-summary`,
      headers: { cookie },
    })
    if (res.statusCode !== 200) {
      continue
    }
    const summary = JSON.parse(res.body) as {
      academicEligibility: { status: string }
    }
    if (summary.academicEligibility.status === target) {
      return id
    }
  }
  throw new Error(`nenhum aluno seed com elegibilidade ${target}`)
}
async function firstApprovedCertificateId(
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
      if (cert.validation?.status === 'approved') {
        return cert.id
      }
    }
  }
  throw new Error('certificado aprovado nao encontrado no seed')
}

describe('academic-completion', () => {
  const appPromise = buildTestApp()

  before(async () => {
    const app = await appPromise
    const cookie = await loginSessionCookie(app)
    studentAptoId = await findStudentByEligibility(app, cookie, 'apto')
    studentNaoAptoId = await findStudentByEligibility(app, cookie, 'nao_apto')
    for (const id of SEED_STUDENT_IDS) {
      await app.inject({
        method: 'POST',
        url: `/api/students/${id}/academic-completion/revoke`,
        headers: { cookie, 'content-type': 'application/json' },
        payload: {},
      })
    }
  })

  after(async () => {
    const app = await appPromise
    await app.close()
  })

  it('GET retorna 401 sem sessao', async () => {
    const app = await appPromise
    const res = await app.inject({
      method: 'GET',
      url: `/api/students/${studentAptoId}/academic-completion`,
    })
    assert.equal(res.statusCode, 401)
  })

  it('POST conclude retorna 422 para aluno nao apto', async () => {
    const app = await appPromise
    const cookie = await loginSessionCookie(app)
    const res = await app.inject({
      method: 'POST',
      url: `/api/students/${studentNaoAptoId}/academic-completion`,
      headers: { cookie, 'content-type': 'application/json' },
      payload: {},
    })
    assert.equal(res.statusCode, 422)
  })

  it('POST conclude retorna 201 para aluno apto com snapshot', async () => {
    const app = await appPromise
    const cookie = await loginSessionCookie(app)
    const summaryRes = await app.inject({
      method: 'GET',
      url: `/api/students/${studentAptoId}/academic-summary`,
      headers: { cookie },
    })
    assert.equal(summaryRes.statusCode, 200)
    const summary = JSON.parse(summaryRes.body) as {
      totalEligibleHours: number
      validGroupsCount: number
      academicEligibility: { status: string }
    }
    assert.equal(summary.academicEligibility.status, 'apto')

    const res = await app.inject({
      method: 'POST',
      url: `/api/students/${studentAptoId}/academic-completion`,
      headers: { cookie, 'content-type': 'application/json' },
      payload: { notes: 'Conclusao de teste' },
    })
    assert.equal(res.statusCode, 201)
    const body = JSON.parse(res.body) as {
      concluded: boolean
      snapshot: { totalEligibleHours: number; validGroupsCount: number } | null
      notes: string | null
    }
    assert.equal(body.concluded, true)
    assert.ok(body.snapshot)
    assert.equal(body.snapshot!.totalEligibleHours, summary.totalEligibleHours)
    assert.equal(body.snapshot!.validGroupsCount, summary.validGroupsCount)
    assert.equal(body.notes, 'Conclusao de teste')
  })

  it('segundo POST conclude retorna 409', async () => {
    const app = await appPromise
    const cookie = await loginSessionCookie(app)
    const res = await app.inject({
      method: 'POST',
      url: `/api/students/${studentAptoId}/academic-completion`,
      headers: { cookie, 'content-type': 'application/json' },
      payload: {},
    })
    assert.equal(res.statusCode, 409)
  })

  it('POST revoke deixa concluded false', async () => {
    const app = await appPromise
    const cookie = await loginSessionCookie(app)
    const revokeRes = await app.inject({
      method: 'POST',
      url: `/api/students/${studentAptoId}/academic-completion/revoke`,
      headers: { cookie, 'content-type': 'application/json' },
      payload: { notes: 'Revogacao de teste' },
    })
    assert.equal(revokeRes.statusCode, 200)
    const revoked = JSON.parse(revokeRes.body) as { concluded: boolean; revokedAt: string | null }
    assert.equal(revoked.concluded, false)
    assert.ok(revoked.revokedAt)

    const getRes = await app.inject({
      method: 'GET',
      url: `/api/students/${studentAptoId}/academic-completion`,
      headers: { cookie },
    })
    const getBody = JSON.parse(getRes.body) as { concluded: boolean }
    assert.equal(getBody.concluded, false)
  })

  it('POST conclude apos revoke reutiliza registro', async () => {
    const app = await appPromise
    const cookie = await loginSessionCookie(app)
    const before = await app.inject({
      method: 'GET',
      url: `/api/students/${studentAptoId}/academic-completion`,
      headers: { cookie },
    })
    const beforeBody = JSON.parse(before.body) as { revokedAt: string | null }

    const res = await app.inject({
      method: 'POST',
      url: `/api/students/${studentAptoId}/academic-completion`,
      headers: { cookie, 'content-type': 'application/json' },
      payload: {},
    })
    assert.equal(res.statusCode, 201)
    const body = JSON.parse(res.body) as {
      concluded: boolean
      revokedAt: string | null
      concludedAt: string | null
    }
    assert.equal(body.concluded, true)
    assert.equal(body.revokedAt, null)
    assert.ok(body.concludedAt)
    assert.ok(beforeBody.revokedAt)
  })

  it('apos conclude academic-summary pode divergir sem alterar conclusao', async () => {
    const app = await appPromise
    const cookie = await loginSessionCookie(app)
    const certId = await firstApprovedCertificateId(app, cookie, studentAptoId)

    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/certificates/${certId}/academic-review`,
      headers: { cookie, 'content-type': 'application/json' },
      payload: { status: 'rejected', approvedHours: 0, reviewNotes: 'Revertido para teste de conclusao' },
    })
    assert.equal(patchRes.statusCode, 200)

    const summaryRes = await app.inject({
      method: 'GET',
      url: `/api/students/${studentAptoId}/academic-summary`,
      headers: { cookie },
    })
    const summary = JSON.parse(summaryRes.body) as {
      academicEligibility: { status: string }
    }
    assert.equal(summary.academicEligibility.status, 'nao_apto')

    const completionRes = await app.inject({
      method: 'GET',
      url: `/api/students/${studentAptoId}/academic-completion`,
      headers: { cookie },
    })
    const completion = JSON.parse(completionRes.body) as { concluded: boolean }
    assert.equal(completion.concluded, true)

    await app.inject({
      method: 'PATCH',
      url: `/api/certificates/${certId}/academic-review`,
      headers: { cookie, 'content-type': 'application/json' },
      payload: { status: 'approved', approvedHours: 60 },
    })

    await app.inject({
      method: 'POST',
      url: `/api/students/${studentAptoId}/academic-completion/revoke`,
      headers: { cookie, 'content-type': 'application/json' },
      payload: {},
    })
  })

  it('POST revoke sem conclusao ativa retorna 404', async () => {
    const app = await appPromise
    const cookie = await loginSessionCookie(app)
    const res = await app.inject({
      method: 'POST',
      url: `/api/students/${FAKE_STUDENT_ID}/academic-completion/revoke`,
      headers: { cookie, 'content-type': 'application/json' },
      payload: {},
    })
    assert.equal(res.statusCode, 404)
  })
})
