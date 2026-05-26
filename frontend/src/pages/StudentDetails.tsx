import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { AcademicSummary, StudentDetail, Submission } from '../types';
import { SubmissionDetailContent } from '../components/SubmissionDetailContent';
import { AcademicSummaryCard } from '../components/AcademicSummaryCard';
import { ArrowLeft, Mail, User, Hash } from 'lucide-react';

export function StudentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [academicSummary, setAcademicSummary] = useState<AcademicSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const [detailResult, summaryResult] = await Promise.allSettled([
          api.getStudentDetail(id),
          api.getStudentAcademicSummary(id),
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
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

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
                onAcademicReviewSaved={refreshAcademicSummary}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
