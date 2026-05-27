import { mkdir, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'
import {
  CATEGORY_IDS,
  SEED_ACTIVITY_CATEGORIES,
  SEED_ACTIVITY_GROUPS,
} from '../src/domain/academicCatalog'
import { ValidationStatus } from '../src/domain/academicRules'
import { loadEnv } from '../src/env'

const prisma = new PrismaClient()

const DEMO_PDF = Buffer.from(
  '%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj trailer<</Root 1 0 R>>%%EOF\n',
  'utf8'
)

const STUDENTS = [
  {
    id: '11111111-1111-4111-8111-000000000001',
    externalUserId: 'moodle-1001',
    matricula: '2025123456',
    nome: 'Ana Silva',
    email: 'ana.silva@demo.edu',
  },
  {
    id: '11111111-1111-4111-8111-000000000002',
    externalUserId: 'moodle-1002',
    matricula: '2025123457',
    nome: 'Bruno Costa',
    email: 'bruno.costa@demo.edu',
  },
  {
    id: '11111111-1111-4111-8111-000000000003',
    externalUserId: 'moodle-1003',
    matricula: '2025123458',
    nome: 'Carla Dias',
    email: 'carla.dias@demo.edu',
  },
  {
    id: '11111111-1111-4111-8111-000000000004',
    externalUserId: 'moodle-1004',
    matricula: '2025123459',
    nome: 'Daniel Lima',
    email: 'daniel.lima@demo.edu',
  },
] as const

type CertSeed = {
  storedName: string
  originalFilename: string
  grupo: string
  horas: number
  activityGroupId: string
  activityCategoryId: string
  validationStatus?: 'pending' | 'approved' | 'rejected'
  approvedHours?: number | null
}

type SubmissionSeed = {
  id: string
  studentId: string
  status: 'pending' | 'approved' | 'rejected'
  requerimentoStoredName: string
  requerimentoOriginalName: string
  certificates: CertSeed[]
}

const SUBMISSIONS: SubmissionSeed[] = [
  {
    id: '22222222-2222-4222-8222-000000000001',
    studentId: STUDENTS[0].id,
    status: 'pending',
    requerimentoStoredName: 'ffffffff-ffff-4fff-bfff-ffffffff1001.pdf',
    requerimentoOriginalName: 'requerimento_ana_2026.pdf',
    certificates: [
      {
        storedName: 'ffffffff-ffff-4fff-bfff-ffffffff1101.pdf',
        originalFilename: 'cert_extensao_horas.pdf',
        grupo: 'Extensao',
        horas: 40,
        activityGroupId: SEED_ACTIVITY_GROUPS[4].id,
        activityCategoryId: CATEGORY_IDS.GV_DEMAIS,
      },
      {
        storedName: 'ffffffff-ffff-4fff-bfff-ffffffff1102.pdf',
        originalFilename: 'cert_pesquisa.pdf',
        grupo: 'Pesquisa',
        horas: 20,
        activityGroupId: SEED_ACTIVITY_GROUPS[0].id,
        activityCategoryId: CATEGORY_IDS.GI_PESQUISA,
      },
    ],
  },
  {
    id: '22222222-2222-4222-8222-000000000002',
    studentId: STUDENTS[1].id,
    status: 'approved',
    requerimentoStoredName: 'ffffffff-ffff-4fff-bfff-ffffffff1002.pdf',
    requerimentoOriginalName: 'req_bruno.pdf',
    certificates: [
      {
        storedName: 'ffffffff-ffff-4fff-bfff-ffffffff1201.pdf',
        originalFilename: 'evento_ciencia.pdf',
        grupo: 'Eventos',
        horas: 60,
        activityGroupId: SEED_ACTIVITY_GROUPS[1].id,
        activityCategoryId: CATEGORY_IDS.GII_CONGRESSOS,
        validationStatus: 'approved',
        approvedHours: 60,
      },
      {
        storedName: 'ffffffff-ffff-4fff-bfff-ffffffff1202.pdf',
        originalFilename: 'monitoria.pdf',
        grupo: 'Ensino',
        horas: 60,
        activityGroupId: SEED_ACTIVITY_GROUPS[0].id,
        activityCategoryId: CATEGORY_IDS.GI_ENSINO,
        validationStatus: 'approved',
        approvedHours: 60,
      },
      {
        storedName: 'ffffffff-ffff-4fff-bfff-ffffffff1203.pdf',
        originalFilename: 'projeto_interdisciplinar.pdf',
        grupo: 'Extensao',
        horas: 30,
        activityGroupId: SEED_ACTIVITY_GROUPS[4].id,
        activityCategoryId: CATEGORY_IDS.GV_DEMAIS,
        validationStatus: 'approved',
        approvedHours: 30,
      },
    ],
  },
  {
    id: '22222222-2222-4222-8222-000000000003',
    studentId: STUDENTS[0].id,
    status: 'rejected',
    requerimentoStoredName: 'ffffffff-ffff-4fff-bfff-ffffffff1003.pdf',
    requerimentoOriginalName: 'requerimento_duplicado.pdf',
    certificates: [
      {
        storedName: 'ffffffff-ffff-4fff-bfff-ffffffff1301.pdf',
        originalFilename: 'unico_certificado.pdf',
        grupo: 'Outros',
        horas: 5,
        activityGroupId: SEED_ACTIVITY_GROUPS[4].id,
        activityCategoryId: CATEGORY_IDS.GV_DEMAIS,
      },
    ],
  },
  {
    id: '22222222-2222-4222-8222-000000000004',
    studentId: STUDENTS[2].id,
    status: 'pending',
    requerimentoStoredName: 'ffffffff-ffff-4fff-bfff-ffffffff1004.pdf',
    requerimentoOriginalName: 'req_so_requerimento.pdf',
    certificates: [],
  },
  {
    id: '22222222-2222-4222-8222-000000000005',
    studentId: STUDENTS[3].id,
    status: 'approved',
    requerimentoStoredName: 'ffffffff-ffff-4fff-bfff-ffffffff1005.pdf',
    requerimentoOriginalName: 'req_daniel_final.pdf',
    certificates: [
      {
        storedName: 'ffffffff-ffff-4fff-bfff-ffffffff1501.pdf',
        originalFilename: 'hackathon.pdf',
        grupo: 'Eventos',
        horas: 25,
        activityGroupId: SEED_ACTIVITY_GROUPS[1].id,
        activityCategoryId: CATEGORY_IDS.GII_SEMINARIOS,
        validationStatus: 'approved',
        approvedHours: 25,
      },
      {
        storedName: 'ffffffff-ffff-4fff-bfff-ffffffff1502.pdf',
        originalFilename: 'curso_livre.pdf',
        grupo: 'Ensino',
        horas: 45,
        activityGroupId: SEED_ACTIVITY_GROUPS[0].id,
        activityCategoryId: CATEGORY_IDS.GI_ENSINO,
        validationStatus: 'approved',
        approvedHours: 45,
      },
    ],
  },
]

async function resetUploadDirs(uploadDir: string): Promise<void> {
  await rm(join(uploadDir, 'requerimentos'), { recursive: true, force: true })
  await rm(join(uploadDir, 'certificados'), { recursive: true, force: true })
  await mkdir(join(uploadDir, 'requerimentos'), { recursive: true })
  await mkdir(join(uploadDir, 'certificados'), { recursive: true })
}

async function writeDemoFiles(uploadDir: string): Promise<void> {
  for (const sub of SUBMISSIONS) {
    const reqDir = join(uploadDir, 'requerimentos', sub.id)
    const certDir = join(uploadDir, 'certificados', sub.id)
    await mkdir(reqDir, { recursive: true })
    await mkdir(certDir, { recursive: true })
    await writeFile(join(reqDir, sub.requerimentoStoredName), DEMO_PDF)
    for (const c of sub.certificates) {
      await writeFile(join(certDir, c.storedName), DEMO_PDF)
    }
  }
}

const DEMO_ADVISOR = {
  username: 'orientador',
  password: 'orientador123',
  displayName: 'Orientador Demo',
} as const

async function seedDemoUser(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_ADVISOR.password, 10)
  await prisma.user.upsert({
    where: { username: DEMO_ADVISOR.username },
    create: {
      username: DEMO_ADVISOR.username,
      passwordHash,
      displayName: DEMO_ADVISOR.displayName,
      role: 'advisor',
    },
    update: {
      passwordHash,
      displayName: DEMO_ADVISOR.displayName,
      role: 'advisor',
    },
  })
}

async function main(): Promise<void> {
  const { uploadDir } = loadEnv()

  await seedDemoUser()

  await prisma.certificateValidation.deleteMany()
  await prisma.certificate.deleteMany()
  await prisma.submission.deleteMany()
  await prisma.student.deleteMany()
  await prisma.activityCategory.deleteMany()
  await prisma.activityGroup.deleteMany()

  await resetUploadDirs(uploadDir)
  await writeDemoFiles(uploadDir)

  await prisma.activityGroup.createMany({
    data: SEED_ACTIVITY_GROUPS.map(({ id, code, name, minHours }) => ({ id, code, name, minHours })),
  })
  await prisma.activityCategory.createMany({
    data: SEED_ACTIVITY_CATEGORIES.map(
      ({ id, groupId, name, maxHours, maxEligibleHours, description, ruleNotes }) => ({
        id,
        groupId,
        name,
        maxHours,
        maxEligibleHours,
        description,
        ruleNotes,
      })
    ),
  })

  for (const s of STUDENTS) {
    await prisma.student.create({ data: { ...s } })
  }

  for (const sub of SUBMISSIONS) {
    const reqRel = `requerimentos/${sub.id}/${sub.requerimentoStoredName}`
    const certApproval =
      sub.status === 'approved' ? 'approved' : sub.status === 'rejected' ? 'rejected' : 'pending'

    await prisma.submission.create({
      data: {
        id: sub.id,
        studentId: sub.studentId,
        status: sub.status,
        requerimentoRelativePath: reqRel,
        requerimentoOriginalName: sub.requerimentoOriginalName,
        certificates: {
          create: sub.certificates.map((c) => {
            const academicStatus = c.validationStatus ?? ValidationStatus.pending
            let approvedHoursVal: number | null = null
            if (academicStatus === ValidationStatus.approved) {
              const explicit = c.approvedHours
              if (explicit != null && explicit > 0) {
                approvedHoursVal = explicit
              } else {
                approvedHoursVal = c.horas > 0 ? c.horas : null
              }
              if (approvedHoursVal == null || approvedHoursVal <= 0) {
                throw new Error(`Seed: certificado aprovado sem horas validas (${c.originalFilename})`)
              }
              if (approvedHoursVal > c.horas) {
                throw new Error(
                  `Seed: approvedHours (${approvedHoursVal}) excede horas (${c.horas}) em ${c.originalFilename}`
                )
              }
            } else if (academicStatus === ValidationStatus.rejected) {
              approvedHoursVal = 0
            }
            return {
              grupo: c.grupo,
              horas: c.horas,
              fileRelativePath: `certificados/${sub.id}/${c.storedName}`,
              originalFilename: c.originalFilename,
              approvalStatus: certApproval,
              validation: {
                create: {
                  activityGroupId: c.activityGroupId,
                  activityCategoryId: c.activityCategoryId,
                  requestedHours: c.horas,
                  approvedHours: approvedHoursVal,
                  status: academicStatus,
                },
              },
            }
          }),
        },
      },
    })
  }

  console.log(
    `Seed concluido: usuario ${DEMO_ADVISOR.username}, grupos/categorias academicas, ${STUDENTS.length} alunos, ${SUBMISSIONS.length} submissoes, arquivos em ${uploadDir}.`
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
