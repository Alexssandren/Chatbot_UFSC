export type SubmissionStatus = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'PARCIAL';

export interface Certificate {
  id: string;
  filename: string;
  url: string;
  hours: number;
  group: string;
  approvalStatus: SubmissionStatus;
}

export interface Submission {
  id: string;
  studentName: string;
  studentId: string;
  totalCertificates: number;
  totalHours: number;
  status: SubmissionStatus;
  date: string;
  certificates: Certificate[];
  requerimentoFilename: string;
  requerimentoDownloadUrl: string;
}

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
