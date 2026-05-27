import bcrypt from 'bcrypt'
import { prisma } from '../db'

export type PublicUser = {
  id: string
  username: string
  displayName: string
  role: string
}

export function toPublicUser(row: {
  id: string
  username: string
  displayName: string
  role: string
}): PublicUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    role: row.role,
  }
}

export async function verifyCredentials(
  username: string,
  password: string
): Promise<PublicUser | null> {
  const normalized = username.trim()
  if (normalized.length === 0 || password.length === 0) {
    return null
  }
  const user = await prisma.user.findUnique({
    where: { username: normalized },
  })
  if (!user) {
    return null
  }
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) {
    return null
  }
  return toPublicUser(user)
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    return null
  }
  return toPublicUser(user)
}
