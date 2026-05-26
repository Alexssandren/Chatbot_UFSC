import type {
  Submission,
  DashboardStats,
  SubmissionStatus,
  StudentListItem,
  StudentDetail,
  Certificate,
  AcademicSummary,
  AcademicReviewResult,
  AcademicValidationStatus,
  CertificateAcademicValidation,
} from '../types';

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

/** Caminho relativo ao UPLOAD_DIR (ex.: requerimentos/id/arquivo.pdf) -> URL publica servida pelo Fastify. */
export function uploadPublicUrl(relativePath: string): string {
  const encoded = relativePath
    .split('/')
    .filter((s) => s.length > 0)
    .map(encodeURIComponent)
    .join('/');
  return apiUrl(`/uploads/${encoded}`);
}

interface ApiStudent {
  id: string;
  matricula: string;
  nome: string;
  email: string;
}

interface ApiValidation {
  status: string;
  approvedHours: number | null;
  reviewNotes: string | null;
  requestedHours: number;
  activityGroup: { code: string; name: string };
  activityCategory: { name: string };
}

interface ApiCertificate {
  id: string;
  grupo: string;
  horas: number;
  fileRelativePath: string;
  originalFilename: string;
  approvalStatus?: string;
  validation?: ApiValidation | null;
}

interface ApiSubmissionRow {
  id: string;
  studentId: string;
  status: string;
  createdAt: string;
  requerimentoRelativePath: string;
  requerimentoOriginalName: string;
  student: ApiStudent;
  certificates?: ApiCertificate[];
}

/** Submissao como retornada em GET /students/:id (sem objeto student aninhado). */
interface ApiSubmissionNested {
  id: string;
  studentId: string;
  status: string;
  createdAt: string;
  requerimentoRelativePath: string;
  requerimentoOriginalName: string;
  certificates?: ApiCertificate[];
}

interface ApiStudentListRow {
  id: string;
  matricula: string;
  nome: string;
  email: string;
  createdAt: string;
  _count: { submissions: number };
}

interface ApiStudentDetail {
  id: string;
  matricula: string;
  nome: string;
  email: string;
  createdAt: string;
  submissions: ApiSubmissionNested[];
}

function mapBackendStatus(s: string): SubmissionStatus {
  switch (s) {
    case 'approved':
      return 'APROVADO';
    case 'rejected':
      return 'REJEITADO';
    case 'partial':
      return 'PARCIAL';
    case 'pending':
    default:
      return 'PENDENTE';
  }
}

function parseAcademicValidationStatus(raw: string): AcademicValidationStatus {
  if (raw === 'approved' || raw === 'rejected' || raw === 'pending') {
    return raw;
  }
  return 'pending';
}

function mapAcademicValidation(v: ApiValidation | null | undefined): CertificateAcademicValidation | undefined {
  if (!v) {
    return undefined;
  }
  return {
    status: parseAcademicValidationStatus(v.status),
    requestedHours: Number(v.requestedHours),
    approvedHours: v.approvedHours == null ? null : Number(v.approvedHours),
    reviewNotes: v.reviewNotes ?? null,
    categoryName: v.activityCategory?.name ?? '',
    groupCode: v.activityGroup?.code ?? '',
  };
}

function mapCertificate(c: ApiCertificate): Certificate {
  return {
    id: c.id,
    filename: c.originalFilename,
    url: uploadPublicUrl(c.fileRelativePath),
    hours: Number(c.horas),
    group: c.grupo,
    approvalStatus: mapBackendStatus(c.approvalStatus ?? 'pending'),
    academicValidation: mapAcademicValidation(c.validation ?? undefined),
  };
}

function mapRow(row: ApiSubmissionRow): Submission {
  const certs = row.certificates ?? [];
  const totalHours = certs.reduce((acc, c) => acc + Number(c.horas), 0);
  const reqPath = row.requerimentoRelativePath ?? '';
  return {
    id: row.id,
    studentName: row.student.nome,
    studentId: row.student.matricula,
    studentDbId: row.student.id,
    totalCertificates: certs.length,
    totalHours,
    status: mapBackendStatus(row.status),
    date: typeof row.createdAt === 'string' ? row.createdAt.slice(0, 10) : '',
    requerimentoFilename: row.requerimentoOriginalName ?? 'requerimento.pdf',
    requerimentoDownloadUrl: reqPath ? uploadPublicUrl(reqPath) : '#',
    certificates: certs.map(mapCertificate),
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
      partial: subs.filter((s) => s.status === 'PARCIAL').length,
      approved: subs.filter((s) => s.status === 'APROVADO').length,
      rejected: subs.filter((s) => s.status === 'REJEITADO').length,
    };
  },

  getStudents: async (): Promise<StudentListItem[]> => {
    const url = apiUrl('/api/students');
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Erro ao listar alunos: ${res.status}`);
    }
    const rows = await parseJson<ApiStudentListRow[]>(res);
    return rows.map((r) => ({
      id: r.id,
      matricula: r.matricula,
      nome: r.nome,
      email: r.email,
      submissionCount: r._count.submissions,
    }));
  },

  getStudentDetail: async (studentId: string): Promise<StudentDetail | undefined> => {
    const url = apiUrl(`/api/students/${encodeURIComponent(studentId)}`);
    const res = await fetch(url);
    if (res.status === 404) {
      return undefined;
    }
    if (!res.ok) {
      throw new Error(`Erro ao carregar aluno: ${res.status}`);
    }
    const raw = await parseJson<ApiStudentDetail>(res);
    const studentMini: ApiStudent = {
      id: raw.id,
      matricula: raw.matricula,
      nome: raw.nome,
      email: raw.email,
    };
    const submissions = raw.submissions.map((sub) =>
      mapRow({
        ...sub,
        student: studentMini,
      })
    );
    return {
      id: raw.id,
      matricula: raw.matricula,
      nome: raw.nome,
      email: raw.email,
      submissionCount: submissions.length,
      submissions,
    };
  },

  getStudentAcademicSummary: async (studentDbId: string): Promise<AcademicSummary> => {
    const url = apiUrl(`/api/students/${encodeURIComponent(studentDbId)}/academic-summary`);
    const res = await fetch(url);
    const text = await res.text();
    let payload: AcademicSummary | { error?: string };
    try {
      payload = text ? (JSON.parse(text) as AcademicSummary | { error?: string }) : {};
    } catch {
      throw new Error(`Erro ao carregar resumo academico: ${res.status}`);
    }
    if (!res.ok) {
      const msg =
        'error' in payload && typeof payload.error === 'string'
          ? payload.error
          : `Erro ao carregar resumo academico: ${res.status}`;
      throw new Error(msg);
    }
    return payload as AcademicSummary;
  },

  reviewCertificateAcademically: async (
    certificateId: string,
    payload: {
      status: AcademicValidationStatus;
      approvedHours?: number | null;
      reviewNotes?: string | null;
    }
  ): Promise<AcademicReviewResult> => {
    const url = apiUrl(`/api/certificates/${encodeURIComponent(certificateId)}/academic-review`);
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let body: AcademicReviewResult | { error?: string };
    try {
      body = text ? (JSON.parse(text) as AcademicReviewResult | { error?: string }) : ({} as { error?: string });
    } catch {
      throw new Error(`Erro na revisao academica: ${res.status}`);
    }
    if (!res.ok) {
      throw new Error(
        'error' in body && typeof body.error === 'string' ? body.error : `Erro na revisao academica: ${res.status}`
      );
    }
    return body as AcademicReviewResult;
  },

  patchCertificateApproval: async (
    submissionId: string,
    certificateId: string,
    status: 'APROVADO' | 'REJEITADO' | 'PENDENTE'
  ): Promise<Submission> => {
    const backend = status === 'APROVADO' ? 'approved' : status === 'REJEITADO' ? 'rejected' : 'pending';
    const url = apiUrl(
      `/api/submissions/${encodeURIComponent(submissionId)}/certificates/${encodeURIComponent(certificateId)}/status`
    );
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: backend }),
    });
    const payload = (await res.json().catch(() => ({}))) as ApiSubmissionRow | { error?: string };
    if (!res.ok) {
      throw new Error(
        'error' in payload && typeof payload.error === 'string'
          ? payload.error
          : `Erro ao atualizar certificado: ${res.status}`
      );
    }
    return mapRow(payload as ApiSubmissionRow);
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
