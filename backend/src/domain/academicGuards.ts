/**
 * Invariantes de domínio acadêmico (sem dependência de HTTP).
 */

export function assertCategoryBelongsToGroup(
  category: { groupId: string; id: string; name: string },
  activityGroupId: string
): void {
  if (category.groupId !== activityGroupId) {
    throw new Error(
      `Inconsistencia: a categoria "${category.name}" (${category.id}) nao pertence ao grupo ${activityGroupId}.`
    )
  }
}
