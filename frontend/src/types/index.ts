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
  categoryId: string;
  groupCode: string;
  groupId: string;
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

export type AcademicEligibilityStatus = 'apto' | 'nao_apto';

export type AcademicEligibility = {
  status: AcademicEligibilityStatus;
  remainingHours: number;
  remainingDistinctGroups: number;
  pendingGroups: {
    groupId: string;
    code: string;
    name: string;
    eligibleHours: number;
    hoursShortfall: number;
  }[];
};

export type AcademicCompletion = {
  concluded: boolean;
  concludedAt: string | null;
  concludedBy: { displayName: string } | null;
  revokedAt: string | null;
  snapshot: {
    totalEligibleHours: number;
    validGroupsCount: number;
  } | null;
  notes: string | null;
};

export type AcademicSummary = {
  studentId: string;
  /** @deprecated Use academicEligibility.status === 'apto' */
  eligible: boolean;
  totalApprovedHours: number;
  totalEligibleHours: number;
  /** @deprecated Use academicEligibility.remainingHours */
  remainingEligibleHours: number;
  validGroupsCount: number;
  requirements: {
    minimumTotalHours: number;
    minimumDistinctGroups: number;
    minimumHoursPerGroup: number;
    meetsTotalHoursRequirement: boolean;
    meetsDistinctGroupsRequirement: boolean;
  };
  academicEligibility: AcademicEligibility;
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

export type AcademicReassignResult = {
  certificateId: string;
  grupo: string;
  validation: {
    status: string;
    requestedHours: number;
    approvedHours: number | null;
    reviewNotes: string | null;
    activityGroup: { id: string; code: string; name: string };
    activityCategory: { id: string; name: string };
  };
};

export type AcademicReviewNotification = {
  attempted: boolean;
  smtpAccepted: boolean;
  skipped?: 'mail_disabled' | 'invalid_or_missing_email' | 'not_rejection_transition';
  error?: string;
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
  notification?: AcademicReviewNotification;
};

export type AcademicReviewHistorySource = 'academic_review_patch' | 'repair_script';

export type AcademicReviewHistorySnapshot = {
  status: string;
  approvedHours: number | null;
  reviewNotes: string | null;
};

export type AcademicReviewHistoryChangedBy = {
  id: string;
  displayName: string;
};

export type AcademicReviewHistoryEntry = {
  id: string;
  changedAt: string;
  source: AcademicReviewHistorySource;
  changeReason: string | null;
  changedBy?: AcademicReviewHistoryChangedBy;
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

export type StudentOverviewSnapshot = {
  totalEligibleHours: number;
  validGroupsCount: number;
  academicEligibilityStatus: AcademicEligibilityStatus;
};

export type StudentListItemWithOverview = StudentListItem & {
  overview: StudentOverviewSnapshot;
};

export type AcademicCatalogCategory = {
  id: string;
  name: string;
  description: string | null;
  ruleNotes: string | null;
  maxEligibleHours: number | null;
};

export type AcademicCatalogGroup = {
  id: string;
  code: string;
  name: string;
  minHours: number;
  categories: AcademicCatalogCategory[];
};

export interface StudentDetail extends StudentListItem {
  submissions: Submission[];
}
