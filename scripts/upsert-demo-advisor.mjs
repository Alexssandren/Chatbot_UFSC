import bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEMO_ADVISOR = {
  username: 'Vilson',
  password: '1234',
  displayName: 'Vilson Gruber',
  role: 'advisor',
}

const passwordHash = await bcrypt.hash(DEMO_ADVISOR.password, 10)
const user = await prisma.user.upsert({
  where: { username: DEMO_ADVISOR.username },
  create: {
    username: DEMO_ADVISOR.username,
    passwordHash,
    displayName: DEMO_ADVISOR.displayName,
    role: DEMO_ADVISOR.role,
  },
  update: {
    passwordHash,
    displayName: DEMO_ADVISOR.displayName,
    role: DEMO_ADVISOR.role,
  },
})

console.log(
  JSON.stringify(
    {
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    },
    null,
    2
  )
)

await prisma.$disconnect()
