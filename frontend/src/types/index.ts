export type SubmissionStatus = 'PENDENTE' | 'APROVADO' | 'REJEITADO';

export interface Certificate {
  id: string;
  filename: string;
  url: string;
  hours: number;
  group: string;
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
}

export interface DashboardStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}
