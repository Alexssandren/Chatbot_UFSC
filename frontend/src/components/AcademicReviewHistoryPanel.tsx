import { useEffect, useState } from 'react';
import type { AcademicReviewHistoryEntry } from '../types';
import { api } from '../services/api';

type Props = {
  certificateId: string;
  refreshKey?: number;
};

function formatAcademicStatus(status: string): string {
  switch (status) {
    case 'approved':
      return 'Aprovado';
    case 'rejected':
      return 'Rejeitado';
    default:
      return 'Pendente';
  }
}

function formatHours(hours: number | null): string {
  if (hours == null) {
    return '—';
  }
  return `${hours} h`;
}

function FieldChange({
  label,
  before,
  after,
}: {
  label: string;
  before: string;
  after: string;
}) {
  if (before === after) {
    return null;
  }
  return (
    <p className="text-sm text-gray-700">
      <span className="font-medium text-gray-600">{label}:</span>{' '}
      <span className="text-gray-500">{before}</span>
      <span className="mx-1 text-gray-400">→</span>
      <span className="text-gray-900">{after}</span>
    </p>
  );
}

function HistoryEntryItem({ entry }: { entry: AcademicReviewHistoryEntry }) {
  const isRepair = entry.source === 'repair_script';
  const changedAtLabel = new Date(entry.changedAt).toLocaleString('pt-BR');

  const statusBefore = formatAcademicStatus(entry.before.status);
  const statusAfter = formatAcademicStatus(entry.after.status);
  const hoursBefore = formatHours(entry.before.approvedHours);
  const hoursAfter = formatHours(entry.after.approvedHours);
  const notesBefore = entry.before.reviewNotes?.trim() ? entry.before.reviewNotes : '—';
  const notesAfter = entry.after.reviewNotes?.trim() ? entry.after.reviewNotes : '—';

  return (
    <li
      className={`rounded-md border px-3 py-3 ${
        isRepair ? 'border-amber-200 bg-amber-50/50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <time className="text-xs text-gray-500" dateTime={entry.changedAt}>
          {changedAtLabel}
        </time>
        {isRepair ? (
          <span className="inline-flex rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
            Correção automática de integridade
          </span>
        ) : (
          <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-800">
            Revisão manual
          </span>
        )}
      </div>

      <div className="space-y-1">
        <FieldChange label="Status" before={statusBefore} after={statusAfter} />
        <FieldChange label="Horas homologadas" before={hoursBefore} after={hoursAfter} />
        <FieldChange label="Parecer" before={notesBefore} after={notesAfter} />
      </div>

      {entry.changeReason ? (
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-medium text-gray-700">Motivo desta alteração:</span>{' '}
          <span className="italic">{entry.changeReason}</span>
        </p>
      ) : null}
    </li>
  );
}

export function AcademicReviewHistoryPanel({ certificateId, refreshKey = 0 }: Props) {
  const [entries, setEntries] = useState<AcademicReviewHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getCertificateAcademicReviewHistory(certificateId);
        if (!cancelled) {
          setEntries(data.entries);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar historico.');
          setEntries([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [certificateId, refreshKey]);

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50/40 p-4">
      <h5 className="mb-3 text-sm font-semibold text-gray-900">Histórico de revisão acadêmica</h5>

      {loading ? (
        <p className="text-sm text-gray-500">Carregando histórico…</p>
      ) : error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-600">
          Nenhuma alteração registrada. O histórico só inclui mudanças em status, horas homologadas ou
          parecer após a criação do certificado.
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <HistoryEntryItem key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  );
}
