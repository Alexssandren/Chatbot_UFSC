import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Submission } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { ArrowLeft, Download, CheckCircle, XCircle, Clock, User, BookOpen, FileText } from 'lucide-react';

export function SubmissionDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleUpdateStatus = async (newStatus: 'APROVADO' | 'REJEITADO') => {
    if (!id || !submission) return;
    
    if (confirm(`Deseja realmente marcar esta submissão como ${newStatus}?`)) {
      setActionLoading(true);
      try {
        await api.updateStatus(id, newStatus);
        setSubmission({ ...submission, status: newStatus });
      } catch (error) {
        console.error('Erro ao atualizar status:', error);
        alert('Erro ao atualizar status. Tente novamente.');
      } finally {
        setActionLoading(false);
      }
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center">Carregando detalhes...</div>;
  }

  if (!submission) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900">Submissão não encontrada</h2>
        <button 
          onClick={() => navigate('/')}
          className="mt-4 text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para o Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate('/')}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          title="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            Detalhes da Submissão
            <StatusBadge status={submission.status} />
          </h2>
          <p className="text-sm text-gray-500">
            Enviada em {new Date(submission.date).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-gray-400" /> Dados do Aluno
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Nome</p>
                <p className="font-medium text-gray-900">{submission.studentName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Matrícula</p>
                <p className="font-medium text-gray-900">{submission.studentId}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-gray-400" /> Resumo
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total de Certificados</span>
                <span className="font-medium text-gray-900">{submission.totalCertificates}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Horas Totais</span>
                <span className="font-medium text-gray-900">{submission.totalHours}h</span>
              </div>
            </div>
          </div>

          {submission.status === 'PENDENTE' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Ações</h3>
              <button
                onClick={() => handleUpdateStatus('APROVADO')}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition-colors font-medium disabled:opacity-50"
              >
                <CheckCircle className="h-5 w-5" />
                Aprovar Submissão
              </button>
              <button
                onClick={() => handleUpdateStatus('REJEITADO')}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors font-medium disabled:opacity-50"
              >
                <XCircle className="h-5 w-5" />
                Rejeitar Submissão
              </button>
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Certificados Enviados</h3>
            </div>
            <ul className="divide-y divide-gray-200">
              {submission.certificates.map((cert) => (
                <li key={cert.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="bg-indigo-50 p-3 rounded-lg">
                        <FileText className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div>
                        <h4 className="text-md font-medium text-gray-900">{cert.filename}</h4>
                        <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" /> {cert.hours} horas
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4" /> {cert.group}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => alert(`Simulando download de ${cert.filename}`)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Baixar</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
