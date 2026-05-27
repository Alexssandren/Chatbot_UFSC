/**
 * Script dev: corrige estados academicos obvios (status/horas) e registra avisos.
 * Execute na pasta backend: npx tsx scripts/repair-academic-integrity.ts
 */
import '../src/env'
import { prisma } from '../src/db'
import {
  isAcademicallyApproved,
  isValidApprovedHoursForStatus,
  ValidationStatus,
} from '../src/domain/academicRules'

function parseStoredStatus(raw: string): ValidationStatusValue | null {
  if (raw === ValidationStatus.pending || raw === ValidationStatus.approved || raw === ValidationStatus.rejected) {
    return raw
  }
  return null
}

async function main(): Promise<void> {
  const vals = await prisma.certificateValidation.findMany({
    include: { activityCategory: true },
  })
  let fixed = 0
  for (const v of vals) {
    const parsed = parseStoredStatus(v.status)
    const status = parsed ?? ValidationStatus.pending
    const data: {
      status?: string
      approvedHours?: number | null
      reviewedAt?: Date | null
    } = {}
    let needsUpdate = false

    if (parsed === null) {
      console.warn(`[repair] status desconhecido "${v.status}" em certificateId=${v.certificateId} -> pending`)
      data.status = ValidationStatus.pending
      data.approvedHours = null
      needsUpdate = true
    } else if (!isValidApprovedHoursForStatus(status, v.approvedHours)) {
      console.warn(`[repair] combinacao status/horas invalida certificateId=${v.certificateId}`)
      if (status === ValidationStatus.rejected) {
        data.approvedHours = 0
      } else if (status === ValidationStatus.pending) {
        data.approvedHours = null
      } else {
        data.status = ValidationStatus.pending
        data.approvedHours = null
      }
      needsUpdate = true
    } else if (status === ValidationStatus.approved) {
      if (
        !isAcademicallyApproved({
          status: v.status,
          approvedHours: v.approvedHours,
          requestedHours: v.requestedHours,
          activityGroupId: v.activityGroupId,
          activityCategory: { groupId: v.activityCategory.groupId },
        })
      ) {
        console.warn(
          `[repair] approved nao consolidavel (dados inconsistentes) certificateId=${v.certificateId} -> pending`
        )
        data.status = ValidationStatus.pending
        data.approvedHours = null
        needsUpdate = true
      }
    }

    if (needsUpdate) {
      await prisma.certificateValidation.update({
        where: { certificateId: v.certificateId },
        data,
      })
      fixed += 1
    }
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
