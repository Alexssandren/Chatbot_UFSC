import { prisma } from '../src/db'
import { execSync } from 'node:child_process'

async function main() {
  const userCount = await prisma.user.count()
  if (userCount > 0) {
    console.log(`[seed-if-empty] ${userCount} usuario(s) no banco; seed ignorado.`)
    return
  }
  console.log('[seed-if-empty] Banco sem usuarios. Executando npm run db:seed...')
  execSync('npm run db:seed', { stdio: 'inherit', cwd: process.cwd() })
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('[seed-if-empty] Falha:', err)
    process.exit(1)
  })
