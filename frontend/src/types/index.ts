export type SubmissionStatus = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'PARCIAL';

/** Status de validacao academica (backend: CertificateValidation.status). */
export type AcademicValidationStatus = 'pending' | 'approved' | 'rejected';

/** Mapeia status academico para o mesmo componente visual do operacional (sem misturar dados). */
export function academicStatusToBadgeStatus(status: AcademicValidationStatus): SubmissionStatus {
  switch (status) {
    case 'approved':
      return 'APROVADO';
    case 'rejected':
      return 'REJEITADO';
    default:
      return 'PENDENTE';
  }
}

export type CertificateAcademicValidation = {
  status: AcademicValidationStatus;
  requestedHours: number;
  approvedHours: number | null;
  reviewNotes: string | null;
  categoryName: string;
  groupCode: string;
};

export interface Certificate {
  id: string;
  filename: string;
  url: string;
  hours: number;
  group: string;
  approvalStatus: SubmissionStatus;
  academicValidation?: CertificateAcademicValidation;
}

export interface Submission {
  id: string;
  studentName: string;
  /** Matricula (identificador humano exibido na UI). */
  studentId: string;
  /**
   * UUID do aluno no banco (Prisma). Nao confundir com studentId (matricula).
   * Usado para GET /api/students/:id/academic-summary.
   */
  studentDbId: string;
  totalCertificates: number;
  /**
   * Horas homologadas na validacao academica (soma por submissao; mesma regra do resumo do aluno).
   * Pode ser menor que totalDeclaredHours se houver certificado ainda pendente ou sem homologacao valida.
   */
  totalHours: number;
  /** Soma das horas declaradas no envio (Certificate.horas). */
  totalDeclaredHours: number;
  status: SubmissionStatus;
  date: string;
  certificates: Certificate[];
  requerimentoFilename: string;
  requerimentoDownloadUrl: string;
}

/** Texto para listagens: homologadas alinhadas ao resumo academico; envio quando diferir. */
export function formatSubmissionHoursSummary(sub: Pick<Submission, 'totalHours' | 'totalDeclaredHours'>): string {
  if (sub.totalDeclaredHours === sub.totalHours) {
    return `${sub.totalHours}h`;
  }
  return `${sub.totalHours}h hom. (${sub.totalDeclaredHours}h envio)`;
}

export type AcademicSummary = {
  studentId: string;
  eligible: boolean;
  totalApprovedHours: number;
  totalEligibleHours: number;
  remainingEligibleHours: number;
  validGroupsCount: number;
  requirements: {
    minimumTotalHours: number;
    minimumDistinctGroups: number;
    minimumHoursPerGroup: number;
    meetsTotalHoursRequirement: boolean;
    meetsDistinctGroupsRequirement: boolean;
  };
  groups: {
    groupId: string;
    code: string;
    name: string;
    approvedHours: number;
    eligibleHours: number;
    minimumRequiredHours: number;
    meetsMinimumHours: boolean;
  }[];
  categories: {
    categoryId: string;
    groupId: string;
    name: string;
    approvedHours: number;
    eligibleHours: number;
    maxEligibleHours: number | null;
    cappedHours: number;
  }[];
};

export type AcademicReviewResult = {
  certificateId: string;
  validation: {
    status: string;
    approvedHours: number | null;
    reviewNotes: string | null;
    reviewedAt: string | null;
    requestedHours: number;
    activityGroup: { code: string; name: string };
    activityCategory: { name: string };
  };
};

export type AcademicReviewHistorySource = 'academic_review_patch' | 'repair_script';

export type AcademicReviewHistorySnapshot = {
  status: string;
  approvedHours: number | null;
  reviewNotes: string | null;
};

export type AcademicReviewHistoryEntry = {
  id: string;
  changedAt: string;
  source: AcademicReviewHistorySource;
  changeReason: string | null;
  before: AcademicReviewHistorySnapshot;
  after: AcademicReviewHistorySnapshot;
};

export type AcademicReviewHistoryResponse = {
  certificateId: string;
  validationId: string;
  entries: AcademicReviewHistoryEntry[];
};

export interface DashboardStats {
  total: number;
  pending: number;
  partial: number;
  approved: number;
  rejected: number;
}

export interface StudentListItem {
  id: string;
  matricula: string;
  nome: string;
  email: string;
  submissionCount: number;
}

export interface StudentDetail extends StudentListItem {
  submissions: Submission[];
}
