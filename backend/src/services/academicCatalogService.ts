import { compareActivityGroupsByDisplayOrder } from '../domain/academicCatalog'
import { prisma } from '../db'

export type AcademicCatalogCategory = {
  id: string
  name: string
  description: string | null
  ruleNotes: string | null
  maxEligibleHours: number | null
}

export type AcademicCatalogGroup = {
  id: string
  code: string
  name: string
  minHours: number
  categories: AcademicCatalogCategory[]
}

export async function listAcademicCatalog(): Promise<AcademicCatalogGroup[]> {
  const groups = await prisma.activityGroup.findMany({
    include: {
      categories: {
        orderBy: { name: 'asc' },
      },
    },
  })
  groups.sort(compareActivityGroupsByDisplayOrder)

  return groups.map((g) => ({
    id: g.id,
    code: g.code,
    name: g.name,
    minHours: g.minHours,
    categories: g.categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      ruleNotes: c.ruleNotes,
      maxEligibleHours: c.maxEligibleHours,
    })),
  }))
}
