import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { buildTestApp, loginSessionCookie } from './buildTestApp'

describe('GET /api/academic-catalog', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookie: string

  before(async () => {
    app = await buildTestApp()
    cookie = await loginSessionCookie(app)
  })

  after(async () => {
    await app.close()
  })

  it('retorna catalogo com grupos e categorias', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/academic-catalog',
      headers: { cookie },
    })
    assert.equal(res.statusCode, 200)
    const body = JSON.parse(res.body) as {
      code: string
      categories: { name: string; ruleNotes: string | null }[]
    }[]
    assert.ok(Array.isArray(body))
    assert.ok(body.length >= 1)
    assert.ok(body[0].code.length > 0)
    assert.ok(Array.isArray(body[0].categories))
  })

  it('rejeita acesso sem sessao', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/academic-catalog',
    })
    assert.equal(res.statusCode, 401)
  })
})

describe('GET /api/students?overview=1', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookie: string

  before(async () => {
    app = await buildTestApp()
    cookie = await loginSessionCookie(app)
  })

  after(async () => {
    await app.close()
  })

  it('inclui snapshot de elegibilidade por aluno', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/students?overview=1',
      headers: { cookie },
    })
    assert.equal(res.statusCode, 200)
    const body = JSON.parse(res.body) as {
      overview: {
        totalEligibleHours: number
        validGroupsCount: number
        academicEligibilityStatus: string
      }
    }[]
    assert.ok(Array.isArray(body))
    if (body.length > 0) {
      assert.ok(typeof body[0].overview.totalEligibleHours === 'number')
      assert.ok(['apto', 'nao_apto'].includes(body[0].overview.academicEligibilityStatus))
    }
  })
})
