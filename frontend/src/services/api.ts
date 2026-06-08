import type {
  Submission,
  DashboardStats,
  SubmissionStatus,
  StudentListItem,
  StudentListItemWithOverview,
  StudentDetail,
  Certificate,
  AcademicSummary,
  AcademicCompletion,
  AcademicReviewResult,
  AcademicReviewHistoryResponse,
  AcademicValidationStatus,
  CertificateAcademicValidation,
  AcademicCatalogGroup,
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

export type PublicUser = {
  id: string;
  username: string;
  displayName: string;
  role: string;
};

type ApiFetchOptions = RequestInit & {
  /** Nao dispara handler global em 401 (ex.: bootstrap /auth/me). */
  skipUnauthorizedHandler?: boolean;
};

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export async function apiFetch(
  path: string,
  options: ApiFetchOptions = {}
): Promise<Response> {
  const { skipUnauthorizedHandler, ...init } = options;
  const res = await fetch(apiUrl(path), {
    ...init,
    credentials: 'include',
  });
  if (
    res.status === 401 &&
    !skipUnauthorizedHandler &&
    !path.includes('/api/auth/login') &&
    !path.includes('/api/auth/me')
  ) {
    unauthorizedHandler?.();
  }
  return res;
}

/** Caminho relativo ao UPLOAD_DIR -> GET autenticado /api/files/* (cookie de sessao). */
export function authenticatedFileUrl(relativePath: string): string {
  const encoded = relativePath
    .split('/')
    .filter((s) => s.length > 0)
    .map(encodeURIComponent)
    .join('/');
  return apiUrl(`/api/files/${encoded}`);
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
  totalDeclaredHours?: number;
  totalAcademicApprovedHours?: number;
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
    url: authenticatedFileUrl(c.fileRelativePath),
    hours: Number(c.horas),
    group: c.grupo,
    approvalStatus: mapBackendStatus(c.approvalStatus ?? 'pending'),
    academicValidation: mapAcademicValidation(c.validation ?? undefined),
  };
}

function mapRow(row: ApiSubmissionRow): Submission {
  const certs = row.certificates ?? [];
  const legacyDeclared = certs.reduce((acc, c) => acc + Number(c.horas), 0);
  const totalDeclaredHours =
    row.totalDeclaredHours !== undefined &&
    row.totalDeclaredHours !== null &&
    Number.isFinite(row.totalDeclaredHours)
      ? row.totalDeclaredHours
      : legacyDeclared;
  const totalAcademicApprovedHours =
    row.totalAcademicApprovedHours !== undefined &&
    row.totalAcademicApprovedHours !== null &&
    Number.isFinite(row.totalAcademicApprovedHours)
      ? row.totalAcademicApprovedHours
      : legacyDeclared;
  const reqPath = row.requerimentoRelativePath ?? '';
  return {
    id: row.id,
    studentName: row.student.nome,
    studentId: row.student.matricula,
    studentDbId: row.student.id,
    totalCertificates: certs.length,
    totalHours: totalAcademicApprovedHours,
    totalDeclaredHours,
    status: mapBackendStatus(row.status),
    date: typeof row.createdAt === 'string' ? row.createdAt.slice(0, 10) : '',
    requerimentoFilename: row.requerimentoOriginalName ?? 'requerimento.pdf',
    requerimentoDownloadUrl: reqPath ? authenticatedFileUrl(reqPath) : '#',
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
  login: async (username: string, password: string): Promise<PublicUser> => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      skipUnauthorizedHandler: true,
    });
    if (!res.ok) {
      throw new Error('Credenciais invalidas');
    }
    const body = await parseJson<{ user: PublicUser }>(res);
    return body.user;
  },

  logout: async (): Promise<void> => {
    await apiFetch('/api/auth/logout', { method: 'POST', skipUnauthorizedHandler: true });
  },

  getCurrentUser: async (): Promise<PublicUser | null> => {
    const res = await apiFetch('/api/auth/me', { skipUnauthorizedHandler: true });
    if (res.status === 401) {
      return null;
    }
    if (!res.ok) {
      throw new Error(`Erro ao validar sessao: ${res.status}`);
    }
    const body = await parseJson<{ user: PublicUser }>(res);
    return body.user;
  },

  getSubmissions: async (): Promise<Submission[]> => {
    const res = await apiFetch('/api/submissions?take=100&skip=0');
    if (!res.ok) {
      throw new Error(`Erro ao listar submissoes: ${res.status}`);
    }
    const rows = await parseJson<ApiSubmissionRow[]>(res);
    return rows.map(mapRow);
  },

  getSubmissionById: async (id: string): Promise<Submission | undefined> => {
    const res = await apiFetch(`/api/submissions/${encodeURIComponent(id)}`);
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
    const res = await apiFetch('/api/students');
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

  getStudentsOverview: async (): Promise<StudentListItemWithOverview[]> => {
    const res = await apiFetch('/api/students?overview=1');
    if (!res.ok) {
      throw new Error(`Erro ao listar alunos com resumo: ${res.status}`);
    }
    const rows = await parseJson<
      {
        id: string;
        matricula: string;
        nome: string;
        email: string;
        submissionCount: number;
        overview: {
          totalEligibleHours: number;
          validGroupsCount: number;
          academicEligibilityStatus: 'apto' | 'nao_apto';
        };
      }[]
    >(res);
    return rows.map((r) => ({
      id: r.id,
      matricula: r.matricula,
      nome: r.nome,
      email: r.email,
      submissionCount: r.submissionCount,
      overview: r.overview,
    }));
  },

  getAcademicCatalog: async (): Promise<AcademicCatalogGroup[]> => {
    const res = await apiFetch('/api/academic-catalog');
    if (!res.ok) {
      throw new Error(`Erro ao carregar catalogo academico: ${res.status}`);
    }
    return parseJson<AcademicCatalogGroup[]>(res);
  },

  getStudentDetail: async (studentId: string): Promise<StudentDetail | undefined> => {
    const res = await apiFetch(`/api/students/${encodeURIComponent(studentId)}`);
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

  downloadStudentConsolidatedReport: async (studentDbId: string): Promise<Blob> => {
    const res = await apiFetch(
      `/api/students/${encodeURIComponent(studentDbId)}/consolidated-report.pdf`
    );
    if (!res.ok) {
      const text = await res.text();
      let msg = `Erro ao gerar relatorio: ${res.status}`;
      try {
        const body = text ? (JSON.parse(text) as { error?: string }) : {};
        if (typeof body.error === 'string') {
          msg = body.error;
        }
      } catch {
        /* resposta nao-JSON */
      }
      throw new Error(msg);
    }
    return res.blob();
  },

  getStudentAcademicCompletion: async (studentDbId: string): Promise<AcademicCompletion> => {
    const res = await apiFetch(
      `/api/students/${encodeURIComponent(studentDbId)}/academic-completion`
    );
    const text = await res.text();
    let payload: AcademicCompletion | { error?: string };
    try {
      payload = text ? (JSON.parse(text) as AcademicCompletion | { error?: string }) : {};
    } catch {
      throw new Error(`Erro ao carregar conclusao academica: ${res.status}`);
    }
    if (!res.ok) {
      const msg =
        'error' in payload && typeof payload.error === 'string'
          ? payload.error
          : `Erro ao carregar conclusao academica: ${res.status}`;
      throw new Error(msg);
    }
    return payload as AcademicCompletion;
  },

  concludeStudent: async (
    studentDbId: string,
    payload?: { notes?: string }
  ): Promise<AcademicCompletion> => {
    const res = await apiFetch(
      `/api/students/${encodeURIComponent(studentDbId)}/academic-completion`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload ?? {}),
      }
    );
    const text = await res.text();
    let body: AcademicCompletion | { error?: string };
    try {
      body = text ? (JSON.parse(text) as AcademicCompletion | { error?: string }) : {};
    } catch {
      throw new Error(`Erro ao registrar conclusao: ${res.status}`);
    }
    if (!res.ok) {
      throw new Error(
        'error' in body && typeof body.error === 'string'
          ? body.error
          : `Erro ao registrar conclusao: ${res.status}`
      );
    }
    return body as AcademicCompletion;
  },

  revokeStudentCompletion: async (
    studentDbId: string,
    payload?: { notes?: string }
  ): Promise<AcademicCompletion> => {
    const res = await apiFetch(
      `/api/students/${encodeURIComponent(studentDbId)}/academic-completion/revoke`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload ?? {}),
      }
    );
    const text = await res.text();
    let body: AcademicCompletion | { error?: string };
    try {
      body = text ? (JSON.parse(text) as AcademicCompletion | { error?: string }) : {};
    } catch {
      throw new Error(`Erro ao revogar conclusao: ${res.status}`);
    }
    if (!res.ok) {
      throw new Error(
        'error' in body && typeof body.error === 'string'
          ? body.error
          : `Erro ao revogar conclusao: ${res.status}`
      );
    }
    return body as AcademicCompletion;
  },

  getStudentAcademicSummary: async (studentDbId: string): Promise<AcademicSummary> => {
    const res = await apiFetch(
      `/api/students/${encodeURIComponent(studentDbId)}/academic-summary`
    );
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
    const res = await apiFetch(
      `/api/certificates/${encodeURIComponent(certificateId)}/academic-review`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
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

  getCertificateAcademicReviewHistory: async (
    certificateId: string
  ): Promise<AcademicReviewHistoryResponse> => {
    const res = await apiFetch(
      `/api/certificates/${encodeURIComponent(certificateId)}/academic-review/history`
    );
    const text = await res.text();
    let body: AcademicReviewHistoryResponse | { error?: string };
    try {
      body = text
        ? (JSON.parse(text) as AcademicReviewHistoryResponse | { error?: string })
        : ({} as { error?: string });
    } catch {
      throw new Error(`Erro ao carregar historico de revisao: ${res.status}`);
    }
    if (!res.ok) {
      throw new Error(
        'error' in body && typeof body.error === 'string'
          ? body.error
          : `Erro ao carregar historico de revisao: ${res.status}`
      );
    }
    return body as AcademicReviewHistoryResponse;
  },

  patchCertificateApproval: async (
    submissionId: string,
    certificateId: string,
    status: 'APROVADO' | 'REJEITADO' | 'PENDENTE'
  ): Promise<Submission> => {
    const backend = status === 'APROVADO' ? 'approved' : status === 'REJEITADO' ? 'rejected' : 'pending';
    const res = await apiFetch(
      `/api/submissions/${encodeURIComponent(submissionId)}/certificates/${encodeURIComponent(certificateId)}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: backend }),
      }
    );
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
    const res = await apiFetch(`/api/submissions/${encodeURIComponent(id)}/status`, {
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
