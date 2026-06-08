import { useState } from 'react';
import { ChevronDown, ChevronRight, BookOpen } from 'lucide-react';
import type { AcademicCatalogGroup } from '../types';

type Props = {
  catalog: AcademicCatalogGroup[];
};

export function AcademicCatalogPanel({ catalog }: Props) {
  const [openGroupId, setOpenGroupId] = useState<string | null>(
    catalog.length > 0 ? catalog[0].id : null
  );

  if (catalog.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-gray-500">
        Catalogo academico indisponivel.
      </p>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {catalog.map((group) => {
        const isOpen = openGroupId === group.id;
        return (
          <div key={group.id}>
            <button
              type="button"
              onClick={() => setOpenGroupId(isOpen ? null : group.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />
                )}
                <BookOpen className="h-4 w-4 text-indigo-600" />
                {group.code} — {group.name}
              </span>
              <span className="text-xs text-gray-500">min. {group.minHours}h no grupo</span>
            </button>
            {isOpen ? (
              <ul className="space-y-3 bg-gray-50/80 px-4 pb-4 pl-10">
                {group.categories.length === 0 ? (
                  <li className="text-sm text-gray-500">Nenhuma categoria cadastrada.</li>
                ) : (
                  group.categories.map((cat) => (
                    <li
                      key={cat.id}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                    >
                      <p className="font-medium text-gray-900">{cat.name}</p>
                      {cat.description ? (
                        <p className="mt-1 text-gray-600">{cat.description}</p>
                      ) : null}
                      {cat.ruleNotes ? (
                        <p className="mt-1 text-gray-500">
                          <span className="font-medium text-gray-700">Regra: </span>
                          {cat.ruleNotes}
                        </p>
                      ) : null}
                      {cat.maxEligibleHours != null ? (
                        <p className="mt-1 text-xs text-amber-800">
                          Teto elegivel: {cat.maxEligibleHours}h
                        </p>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
