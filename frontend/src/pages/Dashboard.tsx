import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatsCard } from '../components/StatsCard';
import { StatusBadge } from '../components/StatusBadge';
import { AcademicCatalogPanel } from '../components/AcademicCatalogPanel';
import { api } from '../services/api';
import type {
  Submission,
  DashboardStats,
  StudentListItemWithOverview,
  AcademicCatalogGroup,
} from '../types';
import { formatSubmissionHoursSummary } from '../types';
import { uniqueGroupCodesFromCertificates } from '../utils/groupCertificates';
import { Users, FileText, CheckCircle, XCircle, Search, Eye, PieChart } from 'lucide-react';

function eligibilityLabel(status: 'apto' | 'nao_apto'): string {
  return status === 'apto' ? 'Apto' : 'Nao apto';
}

export function Dashboard() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<StudentListItemWithOverview[]>([]);
  const [catalog, setCatalog] = useState<AcademicCatalogGroup[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoadError(null);
        const [subsData, studentsData, catalogData] = await Promise.all([
          api.getSubmissions(),
          api.getStudentsOverview(),
          api.getAcademicCatalog(),
        ]);
        setSubmissions(subsData);
        setStudents(studentsData);
        setCatalog(catalogData);
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
          'Nao foi possivel carregar o dashboard. Verifique se o backend esta rodando e tente atualizar a pagina.'
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredSubmissions = submissions.filter(
    (sub) =>
      sub.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.studentId.includes(searchTerm)
  );

  const filteredStudents = students.filter(
    (s) =>
      s.nome.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.matricula.includes(studentSearch) ||
      s.email.toLowerCase().includes(studentSearch.toLowerCase())
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
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {loadError}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500">
            Submissoes, alunos e regras das atividades complementares
          </p>
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

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-medium text-gray-900">Alunos</h3>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="search"
              placeholder="Buscar aluno..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full rounded-md border border-gray-300 py-2 pr-4 pl-10 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:w-64"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Aluno
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Matricula
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Horas elegiveis
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Grupos validos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Elegibilidade
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
                      {s.nome}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">{s.matricula}</td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                      {s.overview.totalEligibleHours}h
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                      {s.overview.validGroupsCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={
                          s.overview.academicEligibilityStatus === 'apto'
                            ? 'inline-flex rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-800'
                            : 'inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800'
                        }
                      >
                        {eligibilityLabel(s.overview.academicEligibilityStatus)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => navigate(`/students/${s.id}`)}
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-900"
                      >
                        <Eye className="h-4 w-4" /> Ver perfil
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                    Nenhum aluno encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-medium text-gray-900">Submissoes recentes</h3>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar aluno ou matricula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-gray-300 py-2 pr-4 pl-10 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500 focus:outline-none sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Aluno
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Matricula
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Certificados / Horas (homolog.)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Grupos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Data
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
                      {sub.studentName}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                      {sub.studentId}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                      {sub.totalCertificates} certs / {formatSubmissionHoursSummary(sub)}
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                      <div className="flex flex-wrap gap-1">
                        {uniqueGroupCodesFromCertificates(sub.certificates).map((code) => (
                          <span
                            key={code}
                            className="inline-flex rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-700"
                          >
                            {code}
                          </span>
                        ))}
                        {sub.certificates.length === 0 ? '—' : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                      {new Date(sub.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => navigate(`/submission/${sub.id}`)}
                        className="flex w-full items-center justify-end gap-1 text-indigo-600 hover:text-indigo-900"
                      >
                        <Eye className="h-4 w-4" /> Detalhes
                      </button>
                    </td>
                  </tr>
                ))
              ) : emptyDatabase ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">
                    Nenhuma submissao cadastrada. Use o seed de demonstracao ou envie dados pelo chatbot.
                  </td>
                </tr>
              ) : emptyFilter ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">
                    Nenhuma submissao corresponde a busca.
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">
                    Nenhuma submissao encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-4">
          <h3 className="text-lg font-medium text-gray-900">Regras dos grupos (GI–GV)</h3>
          <p className="mt-1 text-sm text-gray-500">
            Descricao e regras de cada grupo e categoria conforme o regulamento cadastrado.
          </p>
        </div>
        <AcademicCatalogPanel catalog={catalog} />
      </div>
    </div>
  );
}
