import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { AcademicCompletion, AcademicSummary, StudentDetail, Submission } from '../types';
import { SubmissionDetailContent } from '../components/SubmissionDetailContent';
import { AcademicSummaryCard } from '../components/AcademicSummaryCard';
import { ArrowLeft, Mail, User, Hash, FileDown } from 'lucide-react';

export function StudentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [academicSummary, setAcademicSummary] = useState<AcademicSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [academicCompletion, setAcademicCompletion] = useState<AcademicCompletion | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [completionBusy, setCompletionBusy] = useState(false);
  const [showConcludeModal, setShowConcludeModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [reportDownloading, setReportDownloading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const refreshAcademicSummary = useCallback(async () => {
    if (!id) return;
    try {
      const summary = await api.getStudentAcademicSummary(id);
      setAcademicSummary(summary);
      setSummaryError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao atualizar resumo acadêmico.';
      setSummaryError(msg);
    }
  }, [id]);

  const refreshAcademicCompletion = useCallback(async () => {
    if (!id) return;
    try {
      const completion = await api.getStudentAcademicCompletion(id);
      setAcademicCompletion(completion);
      setCompletionError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao atualizar conclusao academica.';
      setCompletionError(msg);
    }
  }, [id]);

  const refreshAcademicData = useCallback(async () => {
    await Promise.all([refreshAcademicSummary(), refreshAcademicCompletion()]);
  }, [refreshAcademicSummary, refreshAcademicCompletion]);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const [detailResult, summaryResult, completionResult] = await Promise.allSettled([
          api.getStudentDetail(id),
          api.getStudentAcademicSummary(id),
          api.getStudentAcademicCompletion(id),
        ]);

        if (detailResult.status === 'fulfilled' && detailResult.value) {
          setStudent(detailResult.value);
        }

        if (summaryResult.status === 'fulfilled') {
          setAcademicSummary(summaryResult.value);
          setSummaryError(null);
        } else {
          const reason = summaryResult.reason;
          const msg = reason instanceof Error ? reason.message : 'Erro ao carregar resumo acadêmico.';
          setSummaryError(msg);
          setAcademicSummary(null);
        }

        if (completionResult.status === 'fulfilled') {
          setAcademicCompletion(completionResult.value);
          setCompletionError(null);
        } else {
          const reason = completionResult.reason;
          const msg =
            reason instanceof Error ? reason.message : 'Erro ao carregar conclusao academica.';
          setCompletionError(msg);
          setAcademicCompletion(null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleDownloadReport = async () => {
    if (!id || !student) return;
    setReportDownloading(true);
    setReportError(null);
    try {
      const blob = await api.downloadStudentConsolidatedReport(id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-${student.matricula}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao baixar relatorio.';
      setReportError(msg);
    } finally {
      setReportDownloading(false);
    }
  };

  const handleConclude = async () => {
    if (!id) return;
    setCompletionBusy(true);
    setCompletionError(null);
    try {
      await api.concludeStudent(id, completionNotes.trim() ? { notes: completionNotes.trim() } : undefined);
      setShowConcludeModal(false);
      setCompletionNotes('');
      await refreshAcademicData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao registrar conclusao.';
      setCompletionError(msg);
    } finally {
      setCompletionBusy(false);
    }
  };

  const handleRevoke = async () => {
    if (!id) return;
    setCompletionBusy(true);
    setCompletionError(null);
    try {
      await api.revokeStudentCompletion(
        id,
        completionNotes.trim() ? { notes: completionNotes.trim() } : undefined
      );
      setShowRevokeModal(false);
      setCompletionNotes('');
      await refreshAcademicData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao revogar conclusao.';
      setCompletionError(msg);
    } finally {
      setCompletionBusy(false);
    }
  };

  const isApto = academicSummary?.academicEligibility.status === 'apto';
  const isConcluded = academicCompletion?.concluded === true;
  const showEligibilityMismatch = isConcluded && !isApto;

  const handleSubmissionUpdated = (updated: Submission) => {
    setStudent((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        submissions: prev.submissions.map((s) => (s.id === updated.id ? updated : s)),
      };
    });
  };

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-pulse rounded-full bg-indigo-200" />
        <p className="text-sm text-gray-600">Carregando aluno...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-2xl font-semibold text-gray-900">Aluno não encontrado</h2>
        <button
          type="button"
          onClick={() => navigate('/students')}
          className="mx-auto mt-4 flex items-center justify-center gap-2 text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para Alunos
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/students')}
          className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
          title="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Detalhes do aluno</h2>
          <p className="text-sm text-gray-500">Submissões no mesmo formato da visualização por envio</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-medium text-gray-900">
          <User className="h-5 w-5 text-gray-400" />
          Identificação
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Nome</p>
            <p className="font-medium text-gray-900">{student.nome}</p>
          </div>
          <div className="flex items-start gap-2">
            <Hash className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Matrícula</p>
              <p className="font-medium text-gray-900">{student.matricula}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 sm:col-span-2">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">E-mail</p>
              <p className="font-medium text-gray-900">{student.email}</p>
            </div>
          </div>
        </div>
      </div>

      {summaryError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{summaryError}</div>
      ) : null}
      {academicSummary ? <AcademicSummaryCard summary={academicSummary} /> : null}

      {completionError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {completionError}
        </div>
      ) : null}

      {academicCompletion ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Conclusao oficial</h3>
          {isConcluded ? (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              Concluido oficialmente
              {academicCompletion.concludedAt
                ? ` em ${new Date(academicCompletion.concludedAt).toLocaleString('pt-BR')}`
                : ''}
              {academicCompletion.concludedBy
                ? ` por ${academicCompletion.concludedBy.displayName}`
                : ''}
              .
            </div>
          ) : (
            <p className="mb-4 text-sm text-gray-600">Nenhuma conclusao oficial registrada.</p>
          )}
          {showEligibilityMismatch ? (
            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Elegibilidade atual: nao apto. A conclusao registrada permanece ate revogacao manual.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {!isConcluded ? (
              <button
                type="button"
                onClick={() => {
                  setCompletionNotes('');
                  setShowConcludeModal(true);
                }}
                disabled={!isApto || completionBusy}
                title={!isApto ? 'Aluno precisa estar apto na elegibilidade normativa' : undefined}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Registrar conclusao
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCompletionNotes('');
                  setShowRevokeModal(true);
                }}
                disabled={completionBusy}
                className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
              >
                Revogar conclusao
              </button>
            )}
          </div>
        </div>
      ) : null}

      {showConcludeModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h4 className="text-lg font-semibold text-gray-900">Registrar conclusao oficial</h4>
            <p className="mt-2 text-sm text-gray-600">
              Esta acao registra a conclusao com base na situacao atual. Alteracoes futuras em
              certificados nao revogam automaticamente.
            </p>
            <label className="mt-4 block text-sm text-gray-700">
              Observacao (opcional)
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                rows={3}
              />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConcludeModal(false)}
                className="rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleConclude()}
                disabled={completionBusy}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showRevokeModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h4 className="text-lg font-semibold text-gray-900">Revogar conclusao oficial</h4>
            <p className="mt-2 text-sm text-gray-600">
              A conclusao deixara de constar como ativa. O aluno podera ser concluido novamente se
              estiver apto.
            </p>
            <label className="mt-4 block text-sm text-gray-700">
              Motivo (opcional)
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                rows={3}
              />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRevokeModal(false)}
                className="rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleRevoke()}
                disabled={completionBusy}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                Revogar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => void handleDownloadReport()}
          disabled={reportDownloading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FileDown className="h-4 w-4" />
          {reportDownloading ? 'Gerando relatorio...' : 'Baixar relatorio consolidado'}
        </button>
      </div>
      {reportError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {reportError}
        </div>
      ) : null}

      {student.submissions.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-600">
          Este aluno ainda não possui submissões registradas.
        </div>
      ) : (
        <div className="space-y-10">
          {student.submissions.map((sub) => (
            <section key={sub.id} className="rounded-xl border border-gray-200 bg-gray-50/50 p-6 shadow-sm">
              <SubmissionDetailContent
                submission={sub}
                showStudentCard={false}
                sectionTitle={`Submissão — ${new Date(sub.date).toLocaleDateString('pt-BR')}`}
                onSubmissionUpdated={handleSubmissionUpdated}
                onAcademicReviewSaved={refreshAcademicData}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
