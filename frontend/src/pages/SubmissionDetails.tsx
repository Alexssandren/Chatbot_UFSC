import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Submission } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { SubmissionDetailContent } from '../components/SubmissionDetailContent';
import { ArrowLeft } from 'lucide-react';

export function SubmissionDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const data = await api.getSubmissionById(id);
        if (data) setSubmission(data);
      } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-pulse rounded-full bg-indigo-200" />
        <p className="text-sm text-gray-600">Carregando detalhes...</p>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-2xl font-semibold text-gray-900">Submissão não encontrada</h2>
        <button
          onClick={() => navigate('/')}
          className="mx-auto mt-4 flex items-center justify-center gap-2 text-indigo-600 hover:text-indigo-800"
          type="button"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para o Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
          title="Voltar"
          type="button"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="flex flex-wrap items-center gap-3 text-2xl font-bold text-gray-900">
            Detalhes da Submissão
            <StatusBadge status={submission.status} />
          </h2>
          <p className="text-sm text-gray-500">
            Enviada em {new Date(submission.date).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>

      <SubmissionDetailContent
        submission={submission}
        showStudentCard
        onSubmissionUpdated={setSubmission}
      />
    </div>
  );
}
