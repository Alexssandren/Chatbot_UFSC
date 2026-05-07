import type { Submission, DashboardStats, SubmissionStatus } from '../types';

function apiBase(): string {
  const v = import.meta.env.VITE_API_URL;
  if (typeof v === 'string' && v.trim() !== '') {
    return v.replace(/\/$/, '');
  }
  return '';
}

function apiUrl(path: string): string {
  const base = apiBase();
  const p = path.startsWith('/') ? path : `/${path}`;
  if (base === '') {
    return p;
  }
  return `${base}${p}`;
}

interface ApiStudent {
  matricula: string;
  nome: string;
  email: string;
}

interface ApiCertificate {
  id: string;
  grupo: string;
  horas: number;
  fileRelativePath: string;
  originalFilename: string;
}

interface ApiSubmissionRow {
  id: string;
  studentId: string;
  status: string;
  createdAt: string;
  student: ApiStudent;
  certificates?: ApiCertificate[];
}

function mapBackendStatus(s: string): SubmissionStatus {
  switch (s) {
    case 'approved':
      return 'APROVADO';
    case 'rejected':
      return 'REJEITADO';
    case 'pending':
    default:
      return 'PENDENTE';
  }
}

function mapRow(row: ApiSubmissionRow): Submission {
  const certs = row.certificates ?? [];
  const totalHours = certs.reduce((acc, c) => acc + Number(c.horas), 0);
  return {
    id: row.id,
    studentName: row.student.nome,
    studentId: row.student.matricula,
    totalCertificates: certs.length,
    totalHours,
    status: mapBackendStatus(row.status),
    date: typeof row.createdAt === 'string' ? row.createdAt.slice(0, 10) : '',
    certificates: certs.map((c) => ({
      id: c.id,
      filename: c.originalFilename,
      url: '#',
      hours: Number(c.horas),
      group: c.grupo,
    })),
  };
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    throw new Error('Resposta vazia da API');
  }
  return JSON.parse(text) as T;
}

export const api = {
  getSubmissions: async (): Promise<Submission[]> => {
    const url = `${apiUrl('/api/submissions')}?take=100&skip=0`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Erro ao listar submissoes: ${res.status}`);
    }
    const rows = await parseJson<ApiSubmissionRow[]>(res);
    return rows.map(mapRow);
  },

  getSubmissionById: async (id: string): Promise<Submission | undefined> => {
    const url = apiUrl(`/api/submissions/${encodeURIComponent(id)}`);
    const res = await fetch(url);
    if (res.status === 404) {
      return undefined;
    }
    if (!res.ok) {
      throw new Error(`Erro ao carregar submissao: ${res.status}`);
    }
    const row = await parseJson<ApiSubmissionRow>(res);
    return mapRow(row);
  },

  getStats: async (): Promise<DashboardStats> => {
    const subs = await api.getSubmissions();
    return {
      total: subs.length,
      pending: subs.filter((s) => s.status === 'PENDENTE').length,
      approved: subs.filter((s) => s.status === 'APROVADO').length,
      rejected: subs.filter((s) => s.status === 'REJEITADO').length,
    };
  },

  updateStatus: async (id: string, status: 'APROVADO' | 'REJEITADO'): Promise<void> => {
    const backend = status === 'APROVADO' ? 'approved' : 'rejected';
    const url = apiUrl(`/api/submissions/${encodeURIComponent(id)}/status`);
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: backend }),
    });
    const payload = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    if (!res.ok) {
      throw new Error(payload.message ?? payload.error ?? `Erro ${res.status}`);
    }
  },
};
