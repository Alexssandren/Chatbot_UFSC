import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isGroupValidated,
  isStudentNormativelyEligible,
  meetsTotalEligibleHoursRequirement,
  meetsValidatedGroupsRequirement,
} from '../src/domain/academicRules'
import { resolveAcademicEligibilityStatus } from '../src/domain/studentAcademicEligibility'

describe('regras de aptidao normativa', () => {
  it('grupo validado com exatamente 20h elegiveis', () => {
    assert.equal(isGroupValidated(20), true)
    assert.equal(isGroupValidated(19.9), false)
  })

  it('exige 144h no total somando todos os grupos', () => {
    assert.equal(meetsTotalEligibleHoursRequirement(144), true)
    assert.equal(meetsTotalEligibleHoursRequirement(143), false)
    assert.equal(meetsTotalEligibleHoursRequirement(200), true)
  })

  it('exige pelo menos 3 grupos validados', () => {
    assert.equal(meetsValidatedGroupsRequirement(3), true)
    assert.equal(meetsValidatedGroupsRequirement(2), false)
    assert.equal(meetsValidatedGroupsRequirement(4), true)
  })

  it('apto somente quando total e grupos atendem juntos', () => {
    assert.equal(isStudentNormativelyEligible(144, 3), true)
    assert.equal(isStudentNormativelyEligible(144, 2), false)
    assert.equal(isStudentNormativelyEligible(120, 3), false)
    assert.equal(isStudentNormativelyEligible(200, 2), false)
  })

  it('resolveAcademicEligibilityStatus alinhado a isStudentNormativelyEligible', () => {
    assert.equal(resolveAcademicEligibilityStatus(144, 3), 'apto')
    assert.equal(resolveAcademicEligibilityStatus(143, 3), 'nao_apto')
    assert.equal(resolveAcademicEligibilityStatus(144, 2), 'nao_apto')
  })
})
