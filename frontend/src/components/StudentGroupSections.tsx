import type { AcademicCatalogGroup, AcademicSummary, Certificate } from '../types';
import { groupCertificatesForDisplay } from '../utils/groupCertificates';
import { FileText } from 'lucide-react';

const COURSE_NAME = 'Tecnologias da Informação e Comunicação';

export { COURSE_NAME };

type Props = {
  summary: AcademicSummary;
  catalog: AcademicCatalogGroup[];
  certificates: Certificate[];
  onViewCertificate?: (url: string, filename: string) => void;
};

export function StudentGroupSections({
  summary,
  catalog,
  certificates,
  onViewCertificate,
}: Props) {
  const groupedCerts = groupCertificatesForDisplay(certificates);
  const certsByGroupCode = new Map(groupedCerts.map((g) => [g.groupCode, g]));

  const groupsToShow =
    catalog.length > 0
      ? catalog
      : summary.groups.map((g) => ({
          id: g.groupId,
          code: g.code,
          name: g.name,
          minHours: g.minimumRequiredHours,
          categories: [],
        }));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-500">Curso</p>
        <p className="font-medium text-gray-900">{COURSE_NAME}</p>
      </div>

      <h3 className="text-lg font-semibold text-gray-900">Atividades por grupo (GI–GV)</h3>

      <div className="space-y-4">
        {groupsToShow.map((group) => {
          const summaryGroup = summary.groups.find((g) => g.groupId === group.id || g.code === group.code);
          const certGroup = certsByGroupCode.get(group.code);
          const eligibleHours = summaryGroup?.eligibleHours ?? 0;
          const meetsMin = summaryGroup?.meetsMinimumHours ?? false;

          return (
            <section
              key={group.id}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
                <h4 className="font-semibold text-gray-900">
                  {group.code} — {group.name}
                </h4>
                <span
                  className={
                    meetsMin
                      ? 'text-xs font-medium text-green-700'
                      : 'text-xs font-medium text-amber-700'
                  }
                >
                  {eligibleHours}h elegiveis (min. {group.minHours}h)
                  {meetsMin ? ' — atendido' : ''}
                </span>
              </header>

              <div className="p-4">
                {summaryGroup ? (
                  <p className="mb-3 text-sm text-gray-600">
                    {summaryGroup.approvedHours}h homologadas neste grupo.
                  </p>
                ) : null}

                {certGroup && certGroup.categories.length > 0 ? (
                  <div className="space-y-4">
                    {certGroup.categories.map((cat) => (
                      <div key={cat.categoryKey}>
                        <h5 className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                          {cat.categoryName}
                        </h5>
                        <ul className="space-y-2">
                          {cat.certificates.map((cert) => (
                            <li
                              key={cert.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-sm"
                            >
                              <span className="flex items-center gap-2 text-gray-900">
                                <FileText className="h-4 w-4 text-indigo-600" />
                                {cert.filename}
                                <span className="text-gray-500">({cert.hours}h envio)</span>
                              </span>
                              {onViewCertificate && cert.url && cert.url !== '#' ? (
                                <button
                                  type="button"
                                  onClick={() => onViewCertificate(cert.url, cert.filename)}
                                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                                >
                                  Ver PDF
                                </button>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Nenhuma atividade registrada neste grupo.</p>
                )}

                {group.categories.length > 0 ? (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-xs font-medium text-indigo-700">
                      Ver regras das categorias deste grupo
                    </summary>
                    <ul className="mt-2 space-y-2">
                      {group.categories.map((cat) => (
                        <li key={cat.id} className="rounded border border-gray-100 bg-white px-2 py-1.5 text-xs">
                          <span className="font-medium text-gray-800">{cat.name}</span>
                          {cat.ruleNotes ? (
                            <p className="mt-0.5 text-gray-600">{cat.ruleNotes}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
