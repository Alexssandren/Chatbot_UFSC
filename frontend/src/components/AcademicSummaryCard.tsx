import type { AcademicSummary } from '../types';

type Props = {
  summary: AcademicSummary;
};

function requirementLabel(met: boolean): string {
  return met ? 'atendido' : 'pendente';
}

export function AcademicSummaryCard({ summary }: Props) {
  const { academicEligibility } = summary;
  const isApto = academicEligibility.status === 'apto';
  const bannerClass = isApto
    ? 'border-green-200 bg-green-50 text-green-700'
    : 'border-amber-200 bg-amber-50 text-amber-800';

  const pendingByGroupId = new Map(
    academicEligibility.pendingGroups.map((p) => [p.groupId, p])
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">Resumo acadêmico</h3>

      <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
        Elegibilidade acadêmica
      </h4>
      <div className={`mb-4 rounded-lg border px-4 py-3 text-sm font-medium ${bannerClass}`}>
        {isApto ? 'Aluno apto' : 'Aluno não apto'}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-sm text-gray-500">Horas elegíveis faltantes (mínimo total)</p>
          <p className="text-lg font-semibold text-gray-900">{academicEligibility.remainingHours}h</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Grupos válidos faltantes</p>
          <p className="text-lg font-semibold text-gray-900">
            {academicEligibility.remainingDistinctGroups}
          </p>
        </div>
      </div>

      {!isApto ? (
        <ul className="mb-6 space-y-1 text-sm text-gray-700">
          <li>
            Requisito de horas totais:{' '}
            <span className="font-medium">
              {requirementLabel(summary.requirements.meetsTotalHoursRequirement)}
            </span>
          </li>
          <li>
            Requisito de grupos distintos:{' '}
            <span className="font-medium">
              {requirementLabel(summary.requirements.meetsDistinctGroupsRequirement)}
            </span>
          </li>
        </ul>
      ) : null}

      <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
        Grupos pendentes
      </h4>
      {academicEligibility.pendingGroups.length === 0 ? (
        <p className="mb-6 text-sm text-gray-500">Nenhum grupo pendente.</p>
      ) : (
        <ul className="mb-6 space-y-2">
          {academicEligibility.pendingGroups.map((p) => (
            <li
              key={p.groupId}
              className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-sm text-amber-900"
            >
              <span className="font-medium">
                {p.code} — {p.name}
              </span>
              <span className="mt-1 block">
                {p.eligibleHours}h elegíveis · Faltam {p.hoursShortfall}h
              </span>
            </li>
          ))}
        </ul>
      )}

      <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
        Detalhamento normativo
      </h4>
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-sm text-gray-500">Horas homologadas (auditadas)</p>
          <p className="text-lg font-semibold text-gray-900">{summary.totalApprovedHours}h</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Horas elegíveis</p>
          <p className="text-lg font-semibold text-gray-900">{summary.totalEligibleHours}h</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Grupos válidos</p>
          <p className="text-lg font-semibold text-gray-900">{summary.validGroupsCount}</p>
        </div>
      </div>

      <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
        Grupos (GI–GV)
      </h4>
      <ul className="mb-6 space-y-2">
        {summary.groups.map((g) => {
          const pending = pendingByGroupId.get(g.groupId);
          const okClass = g.meetsMinimumHours
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-amber-100 bg-amber-50/60 text-amber-900';
          return (
            <li
              key={g.groupId}
              className={`rounded-lg border px-3 py-2 text-sm ${okClass}`}
            >
              <span className="font-medium">
                {g.code} — {g.eligibleHours}h elegíveis
              </span>
              {g.meetsMinimumHours ? (
                <span className="ml-2 text-green-700">✓</span>
              ) : pending ? (
                <span className="mt-1 block text-amber-800">Faltam {pending.hoursShortfall}h</span>
              ) : null}
            </li>
          );
        })}
      </ul>

      <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-600">Categorias</h4>
      {summary.categories.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma categoria com horas homologadas.</p>
      ) : (
        <ul className="space-y-3">
          {summary.categories.map((c) => (
            <li key={c.categoryId} className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-sm">
              <p className="font-medium text-gray-900">{c.name}</p>
              <p className="text-gray-600">
                {c.approvedHours}h aprovadas · {c.eligibleHours}h elegíveis
                {c.cappedHours > 0 ? (
                  <span className="block text-amber-800">{c.cappedHours}h excedentes</span>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
