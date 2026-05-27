import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import { buildTestApp, loginSessionCookie } from './buildTestApp'

const STUDENT_ID = '11111111-1111-4111-8111-000000000001'
const FAKE_STUDENT_ID = '99999999-9999-4999-8999-999999999999'

describe('GET /api/students/:id/consolidated-report.pdf', () => {
  const appPromise = buildTestApp()

  after(async () => {
    const app = await appPromise
    await app.close()
  })

  it('retorna 401 sem sessao', async () => {
    const app = await appPromise
    const res = await app.inject({
      method: 'GET',
      url: `/api/students/${STUDENT_ID}/consolidated-report.pdf`,
    })
    assert.equal(res.statusCode, 401)
  })

  it('retorna 404 para aluno inexistente', async () => {
    const app = await appPromise
    const cookie = await loginSessionCookie(app)
    const res = await app.inject({
      method: 'GET',
      url: `/api/students/${FAKE_STUDENT_ID}/consolidated-report.pdf`,
      headers: { cookie },
    })
    assert.equal(res.statusCode, 404)
  })

  it('retorna PDF com sessao valida', async () => {
    const app = await appPromise
    const cookie = await loginSessionCookie(app)
    const res = await app.inject({
      method: 'GET',
      url: `/api/students/${STUDENT_ID}/consolidated-report.pdf`,
      headers: { cookie },
    })
    assert.equal(res.statusCode, 200)
    assert.match(res.headers['content-type'] ?? '', /application\/pdf/)
    const body = res.rawPayload
    assert.ok(body.length > 100)
    assert.equal(body.subarray(0, 4).toString('utf8'), '%PDF')
  })
})
