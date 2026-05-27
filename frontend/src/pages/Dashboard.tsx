import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatsCard } from '../components/StatsCard';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../services/api';
import type { Submission, DashboardStats } from '../types';
import { formatSubmissionHoursSummary } from '../types';
import { Users, FileText, CheckCircle, XCircle, Search, Eye, PieChart } from 'lucide-react';

export function Dashboard() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoadError(null);
        const subsData = await api.getSubmissions();
        setSubmissions(subsData);
        setStats({
          total: subsData.length,
          pending: subsData.filter((s) => s.status === 'PENDENTE').length,
          partial: subsData.filter((s) => s.status === 'PARCIAL').length,
          approved: subsData.filter((s) => s.status === 'APROVADO').length,
          rejected: subsData.filter((s) => s.status === 'REJEITADO').length,
        });
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setLoadError(
          'Não foi possível carregar as submissões. Verifique se o backend está rodando (porta 3000) e tente atualizar a página.'
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredSubmissions = submissions.filter(sub => 
    sub.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.studentId.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-pulse rounded-full bg-indigo-200" />
        <p className="text-sm text-gray-600">Carregando dashboard...</p>
      </div>
    );
  }

  const emptyDatabase = submissions.length === 0 && !loadError;
  const emptyFilter = submissions.length > 0 && filteredSubmissions.length === 0;

  return (
    <div className="space-y-6">
      {loadError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{loadError}</div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500">Visão geral das submissões de atividades complementares</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatsCard title="Total" value={stats.total} icon={<Users className="h-6 w-6" />} type="default" />
          <StatsCard title="Pendentes" value={stats.pending} icon={<FileText className="h-6 w-6" />} type="warning" />
          <StatsCard title="Parciais" value={stats.partial} icon={<PieChart className="h-6 w-6" />} type="partial" />
          <StatsCard title="Aprovadas" value={stats.approved} icon={<CheckCircle className="h-6 w-6" />} type="success" />
          <StatsCard title="Rejeitadas" value={stats.rejected} icon={<XCircle className="h-6 w-6" />} type="danger" />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-medium text-gray-900">Submissões Recentes</h3>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar aluno ou matrícula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aluno</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matrícula</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Certificados / Horas (homolog.)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sub.studentName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sub.studentId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sub.totalCertificates} certs / {formatSubmissionHoursSummary(sub)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(sub.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => navigate(`/submission/${sub.id}`)}
                        className="text-indigo-600 hover:text-indigo-900 flex items-center justify-end gap-1 w-full"
                      >
                        <Eye className="h-4 w-4" /> Detalhes
                      </button>
                    </td>
                  </tr>
                ))
              ) : emptyDatabase ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                    Nenhuma submissão cadastrada. Use o seed de demonstração ou envie dados pelo chatbot.
                  </td>
                </tr>
              ) : emptyFilter ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                    Nenhuma submissão corresponde à busca.
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                    Nenhuma submissão encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
