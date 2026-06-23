import { useEffect, useMemo, useState } from 'react';
import type { AcademicCatalogGroup, CertificateAcademicValidation } from '../types';
import { api } from '../services/api';

type Props = {
  certificateId: string;
  initialValidation?: CertificateAcademicValidation;
  catalog: AcademicCatalogGroup[];
  onSaved?: () => void | Promise<void>;
  onFeedback?: (msg: { text: string; variant: 'success' | 'warning' | 'error' }) => void;
};

export function CertificateReassignForm({
  certificateId,
  initialValidation,
  catalog,
  onSaved,
  onFeedback,
}: Props) {
  const [groupId, setGroupId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const sortedCatalog = useMemo(
    () => [...catalog].sort((a, b) => a.code.localeCompare(b.code, 'pt-BR')),
    [catalog]
  );

  const selectedGroup = sortedCatalog.find((g) => g.id === groupId);
  const categories = selectedGroup?.categories ?? [];

  useEffect(() => {
    const groupMatch =
      sortedCatalog.find((g) => g.id === initialValidation?.groupId) ??
      sortedCatalog.find((g) => g.code === initialValidation?.groupCode);
    const nextGroupId = groupMatch?.id ?? sortedCatalog[0]?.id ?? '';
    setGroupId(nextGroupId);

    const groupCategories = groupMatch?.categories ?? sortedCatalog[0]?.categories ?? [];
    const categoryMatch =
      groupCategories.find((c) => c.id === initialValidation?.categoryId) ??
      groupCategories.find((c) => c.name === initialValidation?.categoryName);
    setCategoryId(categoryMatch?.id ?? groupCategories[0]?.id ?? '');
    setSubmitError(null);
  }, [
    certificateId,
    initialValidation?.groupId,
    initialValidation?.groupCode,
    initialValidation?.categoryId,
    initialValidation?.categoryName,
    sortedCatalog,
  ]);

  useEffect(() => {
    if (!selectedGroup) {
      return;
    }
    const stillValid = categories.some((c) => c.id === categoryId);
    if (!stillValid) {
      setCategoryId(categories[0]?.id ?? '');
    }
  }, [groupId, selectedGroup, categories, categoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!groupId || !categoryId) {
      setSubmitError('Selecione o grupo e a categoria de destino.');
      return;
    }

    const unchanged =
      initialValidation?.groupId === groupId && initialValidation?.categoryId === categoryId;
    if (unchanged) {
      setSubmitError('O certificado ja esta classificado neste grupo e categoria.');
      return;
    }

    setSaving(true);
    try {
      await api.reassignCertificateClassification(certificateId, {
        activityGroupId: groupId,
        activityCategoryId: categoryId,
      });
      await onSaved?.();
      onFeedback?.({ text: 'Certificado remanejado para o novo grupo.', variant: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao remanejar certificado.';
      setSubmitError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (sortedCatalog.length === 0) {
    return null;
  }

  const groupSelectId = `reassign-group-${certificateId}`;
  const categorySelectId = `reassign-category-${certificateId}`;

  return (
    <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50/30 p-4">
      <h5 className="mb-1 text-sm font-semibold text-gray-900">Remanejar grupo</h5>
      <p className="mb-3 text-xs text-gray-600">
        Use quando o aluno tiver enviado o certificado no grupo ou categoria incorretos.
      </p>

      {submitError ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {submitError}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor={groupSelectId} className="mb-1 block text-xs font-medium text-gray-600">
            Grupo academico
          </label>
          <select
            id={groupSelectId}
            value={groupId}
            onChange={(ev) => setGroupId(ev.target.value)}
            disabled={saving}
            className="w-full max-w-md rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          >
            {sortedCatalog.map((group) => (
              <option key={group.id} value={group.id}>
                {group.code} — {group.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={categorySelectId} className="mb-1 block text-xs font-medium text-gray-600">
            Categoria
          </label>
          <select
            id={categorySelectId}
            value={categoryId}
            onChange={(ev) => setCategoryId(ev.target.value)}
            disabled={saving || categories.length === 0}
            className="w-full max-w-md rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={saving || !groupId || !categoryId}
          className="inline-flex items-center justify-center rounded-md border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-200 disabled:opacity-50"
        >
          {saving ? 'Salvando…' : 'Remanejar certificado'}
        </button>
      </form>
    </div>
  );
}
