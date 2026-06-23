import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { CATEGORY_IDS, GROUP_IDS } from '../src/domain/academicCatalog'
import { buildTestApp, loginSessionCookie } from './buildTestApp'

describe('PATCH /api/certificates/:id/academic-classification', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookie: string
  let certificateId: string

  before(async () => {
    app = await buildTestApp()
    cookie = await loginSessionCookie(app)

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/submissions?take=10&skip=0',
      headers: { cookie },
    })
    assert.equal(listRes.statusCode, 200)
    const rows = JSON.parse(listRes.body) as {
      certificates?: { id: string; validation?: { activityGroup?: { id: string } } }[]
    }[]
    const firstCert = rows.flatMap((r) => r.certificates ?? []).find((c) => c.id)
    assert.ok(firstCert, 'seed deve conter ao menos um certificado')
    certificateId = firstCert.id
  })

  after(async () => {
    await app.close()
  })

  it('remaneja certificado para outro grupo e categoria', async () => {
    const toGv = await app.inject({
      method: 'PATCH',
      url: `/api/certificates/${certificateId}/academic-classification`,
      headers: { cookie, 'content-type': 'application/json' },
      payload: {
        activityGroupId: GROUP_IDS.GV,
        activityCategoryId: CATEGORY_IDS.GV_DEMAIS,
      },
    })
    assert.equal(toGv.statusCode, 200)

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/certificates/${certificateId}/academic-classification`,
      headers: { cookie, 'content-type': 'application/json' },
      payload: {
        activityGroupId: GROUP_IDS.GII,
        activityCategoryId: CATEGORY_IDS.GII_SEMINARIOS,
      },
    })
    assert.equal(res.statusCode, 200)
    const body = JSON.parse(res.body) as {
      certificateId: string
      grupo: string
      validation: {
        activityGroup: { code: string }
        activityCategory: { name: string }
      }
    }
    assert.equal(body.certificateId, certificateId)
    assert.equal(body.validation.activityGroup.code, 'GII')
    assert.match(body.grupo, /GII/)
  })

  it('rejeita categoria que nao pertence ao grupo', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/certificates/${certificateId}/academic-classification`,
      headers: { cookie, 'content-type': 'application/json' },
      payload: {
        activityGroupId: GROUP_IDS.GI,
        activityCategoryId: CATEGORY_IDS.GII_SEMINARIOS,
      },
    })
    assert.equal(res.statusCode, 400)
  })

  it('rejeita acesso sem sessao', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/certificates/${certificateId}/academic-classification`,
      headers: { 'content-type': 'application/json' },
      payload: {
        activityGroupId: GROUP_IDS.GV,
        activityCategoryId: CATEGORY_IDS.GV_DEMAIS,
      },
    })
    assert.equal(res.statusCode, 401)
  })
})
