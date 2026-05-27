/**
 * Script dev: corrige estados academicos obvios (status/horas) e registra avisos.
 * Writer oficial de dominio — altera CertificateValidation e gera AcademicReviewHistory.
 * Execute na pasta backend: npx tsx scripts/repair-academic-integrity.ts
 */
import '../src/env'
import { prisma } from '../src/db'
import {
  hasAcademicReviewChanged,
  snapshotFromValidation,
} from '../src/domain/academicReviewHistory'
import {
  isAcademicallyApproved,
  isValidApprovedHoursForStatus,
  ValidationStatus,
  type ValidationStatusValue,
} from '../src/domain/academicRules'
import { applyAcademicReviewChange } from '../src/services/academicReviewPersistence'

function parseStoredStatus(raw: string): ValidationStatusValue | null {
  if (raw === ValidationStatus.pending || raw === ValidationStatus.approved || raw === ValidationStatus.rejected) {
    return raw
  }
  return null
}

type RepairPlan = {
  after: { status: string; approvedHours: number | null; reviewNotes: string | null }
  changeReason: string
}

function planRepair(v: {
  status: string
  approvedHours: number | null
  reviewNotes: string | null
  requestedHours: number
  activityGroupId: string
  activityCategory: { groupId: string }
}): RepairPlan | null {
  const parsed = parseStoredStatus(v.status)
  const status = parsed ?? ValidationStatus.pending
  const reviewNotes = v.reviewNotes

  if (parsed === null) {
    return {
      after: {
        status: ValidationStatus.pending,
        approvedHours: null,
        reviewNotes,
      },
      changeReason: 'repair: status desconhecido corrigido para pending',
    }
  }

  if (!isValidApprovedHoursForStatus(status, v.approvedHours)) {
    if (status === ValidationStatus.rejected) {
      return {
        after: { status, approvedHours: 0, reviewNotes },
        changeReason: 'repair: combinacao status/horas invalida (rejected -> approvedHours 0)',
      }
    }
    if (status === ValidationStatus.pending) {
      return {
        after: { status, approvedHours: null, reviewNotes },
        changeReason: 'repair: combinacao status/horas invalida (pending -> approvedHours null)',
      }
    }
    return {
      after: {
        status: ValidationStatus.pending,
        approvedHours: null,
        reviewNotes,
      },
      changeReason: 'repair: combinacao status/horas invalida (approved -> pending)',
    }
  }

  if (status === ValidationStatus.approved) {
    if (
      !isAcademicallyApproved({
        status: v.status,
        approvedHours: v.approvedHours,
        requestedHours: v.requestedHours,
        activityGroupId: v.activityGroupId,
        activityCategory: { groupId: v.activityCategory.groupId },
      })
    ) {
      return {
        after: {
          status: ValidationStatus.pending,
          approvedHours: null,
          reviewNotes,
        },
        changeReason: 'repair: approved nao consolidavel -> pending',
      }
    }
  }

  return null
}

async function main(): Promise<void> {
  const vals = await prisma.certificateValidation.findMany({
    include: { activityCategory: true },
  })
  let fixed = 0
  const now = new Date()

  for (const v of vals) {
    const plan = planRepair(v)
    if (!plan) {
      continue
    }

    const before = snapshotFromValidation(v)
    const after = plan.after

    if (!hasAcademicReviewChanged(before, after)) {
      continue
    }

    console.warn(`[repair] certificateId=${v.certificateId}: ${plan.changeReason}`)

    await prisma.$transaction(async (tx) => {
      await applyAcademicReviewChange(tx, {
        validationId: v.id,
        certificateId: v.certificateId,
        before,
        after,
        source: 'repair_script',
        changeReason: plan.changeReason,
        reviewedAt: now,
      })
    })
    fixed += 1
  }
  console.log(`[repair] Concluido. Registros atualizados: ${fixed}.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
