import { useEffect, useState } from 'react';
import type { AcademicValidationStatus, CertificateAcademicValidation } from '../types';
import { api } from '../services/api';

type Props = {
  certificateId: string;
  initialValidation?: CertificateAcademicValidation;
  onSaved?: () => void | Promise<void>;
  onFeedback?: (msg: { text: string; variant: 'success' | 'warning' }) => void;
};

export function AcademicReviewForm({
  certificateId,
  initialValidation,
  onSaved,
  onFeedback,
}: Props) {
  const [status, setStatus] = useState<AcademicValidationStatus>('pending');
  const [hoursInput, setHoursInput] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const v = initialValidation;
    const st: AcademicValidationStatus = v?.status ?? 'pending';
    setStatus(st);
    if (st === 'approved') {
      setHoursInput(v?.approvedHours != null && v.approvedHours > 0 ? String(v.approvedHours) : '');
    } else if (st === 'rejected') {
      setHoursInput('0');
    } else {
      setHoursInput('');
    }
    setReviewNotes(v?.reviewNotes ?? '');
    setSubmitError(null);
  }, [certificateId, initialValidation?.status, initialValidation?.approvedHours, initialValidation?.reviewNotes]);

  const hoursDisabled = status !== 'approved';
  const hoursDisplayValue = status === 'rejected' ? '0' : hoursInput;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (status === 'approved') {
      const n = Number(hoursInput.replace(',', '.'));
      if (!Number.isFinite(n) || n <= 0) {
        setSubmitError('Informe as horas homologadas (maior que zero) quando o status for aprovado.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload: {
        status: AcademicValidationStatus;
        approvedHours?: number | null;
        reviewNotes?: string | null;
      } = {
        status,
        reviewNotes: reviewNotes.trim() === '' ? null : reviewNotes.trim(),
      };
      if (status === 'approved') {
        payload.approvedHours = Number(hoursInput.replace(',', '.'));
      } else if (status === 'pending') {
        payload.approvedHours = null;
      } else {
        payload.approvedHours = 0;
      }

      await api.reviewCertificateAcademically(certificateId, payload);
      await onSaved?.();
      onFeedback?.({ text: 'Revisão acadêmica salva.', variant: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar revisão acadêmica.';
      setSubmitError(msg);
    } finally {
      setSaving(false);
    }
  };

  const statusSelectId = `academic-status-${certificateId}`;
  const hoursInputId = `academic-hours-${certificateId}`;
  const notesId = `academic-notes-${certificateId}`;

  return (
    <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50/20 p-4">
      <h5 className="mb-3 text-sm font-semibold text-gray-900">Revisão acadêmica</h5>

      {submitError ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {submitError}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor={statusSelectId} className="mb-1 block text-xs font-medium text-gray-600">
            Status acadêmico
          </label>
          <select
            id={statusSelectId}
            value={status}
            onChange={(ev) => {
              const next = ev.target.value as AcademicValidationStatus;
              setStatus(next);
              setSubmitError(null);
              if (next === 'pending') {
                setHoursInput('');
              } else if (next === 'rejected') {
                setHoursInput('0');
              } else {
                setHoursInput('');
              }
            }}
            disabled={saving}
            className="w-full max-w-xs rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          >
            <option value="pending">Pendente</option>
            <option value="approved">Aprovado</option>
            <option value="rejected">Rejeitado</option>
          </select>
        </div>

        <div>
          <label htmlFor={hoursInputId} className="mb-1 block text-xs font-medium text-gray-600">
            Horas homologadas
          </label>
          <input
            id={hoursInputId}
            type="number"
            min={status === 'approved' ? 0.01 : undefined}
            step="0.5"
            value={hoursDisplayValue}
            onChange={(ev) => {
              if (!hoursDisabled) {
                setHoursInput(ev.target.value);
              }
            }}
            readOnly={hoursDisabled}
            disabled={saving || hoursDisabled}
            className="w-full max-w-xs rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-600"
          />
        </div>

        <div>
          <label htmlFor={notesId} className="mb-1 block text-xs font-medium text-gray-600">
            Parecer
          </label>
          <textarea
            id={notesId}
            value={reviewNotes}
            onChange={(ev) => setReviewNotes(ev.target.value)}
            disabled={saving}
            rows={3}
            className="w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Salvando…' : 'Salvar revisão acadêmica'}
        </button>
      </form>
    </div>
  );
}
