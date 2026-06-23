import type { Certificate, Submission, AcademicCatalogGroup } from '../types';
import { academicStatusToBadgeStatus } from '../types';
import { groupCertificatesForDisplay } from '../utils/groupCertificates';
import { StatusBadge } from './StatusBadge';
import { AcademicReviewForm } from './AcademicReviewForm';
import { CertificateReassignForm } from './CertificateReassignForm';
import { AcademicReviewHistoryPanel } from './AcademicReviewHistoryPanel';
import { DocumentFileActions } from './DocumentFileActions';
import type { PdfPreviewKind } from './PdfViewerModal';
import { BookOpen, Clock, FileText, ClipboardList } from 'lucide-react';
import { api } from '../services/api';

type Props = {
  submissionId: string;
  certificates: Certificate[];
  catalog: AcademicCatalogGroup[];
  openReviewForms: Record<string, boolean>;
  historyRefreshByCert: Record<string, number>;
  onToggleReviewForm: (certId: string) => void;
  onOpenPdf: (url: string, title: string, kind: PdfPreviewKind) => void;
  onSubmissionUpdated?: (submission: Submission) => void;
  onAcademicReviewSaved?: () => void | Promise<void>;
  onCertReviewSaved?: (certId: string) => void;
  onFeedback?: (msg: { text: string; variant: 'success' | 'warning' | 'error' }) => void;
};

function CertificateRow({
  cert,
  submissionId,
  isReviewOpen,
  historyRefreshKey,
  onToggleReview,
  onOpenPdf,
  onSubmissionUpdated,
  onAcademicReviewSaved,
  onCertReviewSaved,
  onFeedback,
  catalog,
}: {
  cert: Certificate;
  submissionId: string;
  catalog: AcademicCatalogGroup[];
  isReviewOpen: boolean;
  historyRefreshKey: number;
  onToggleReview: () => void;
  onOpenPdf: (url: string, title: string, kind: PdfPreviewKind) => void;
  onSubmissionUpdated?: (submission: Submission) => void;
  onAcademicReviewSaved?: () => void | Promise<void>;
  onCertReviewSaved?: (certId: string) => void;
  onFeedback?: (msg: { text: string; variant: 'success' | 'warning' | 'error' }) => void;
}) {
  const disabled = !cert.url || cert.url === '#';

  return (
    <li className="rounded-lg border border-gray-100 bg-white p-4 transition-colors hover:bg-gray-50">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-lg bg-indigo-50 p-3">
              <FileText className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2 gap-y-1">
                <h4 className="text-md font-medium text-gray-900">{cert.filename}</h4>
                <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-900">
                  Certificado
                </span>
              </div>
              <div className="flex flex-wrap gap-2.5 pt-1">
                <div className="flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/40 px-3 py-1">
                  <span className="text-[10px] font-bold tracking-wider text-indigo-600 uppercase">
                    Revisao Academica
                  </span>
                  <StatusBadge
                    status={academicStatusToBadgeStatus(cert.academicValidation?.status ?? 'pending')}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" /> {cert.hours} horas (envio)
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" /> {cert.group}
                </span>
              </div>
              {cert.academicValidation ? (
                <p className="text-xs text-gray-500">
                  {cert.academicValidation.groupCode} — {cert.academicValidation.categoryName} ·{' '}
                  {cert.academicValidation.requestedHours}h solicitadas
                  {cert.academicValidation.status === 'approved' &&
                  cert.academicValidation.approvedHours != null &&
                  cert.academicValidation.approvedHours > 0
                    ? ` · ${cert.academicValidation.approvedHours}h homologadas`
                    : cert.academicValidation.status === 'rejected'
                      ? ' · 0h homologadas'
                      : ''}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <DocumentFileActions
              url={cert.url}
              downloadName={cert.filename}
              disabled={disabled}
              onView={() => onOpenPdf(cert.url, cert.filename, 'certificado')}
            >
              <button
                type="button"
                onClick={onToggleReview}
                className="inline-flex items-center gap-2 rounded-md border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50"
              >
                <ClipboardList className="h-4 w-4" aria-hidden />
                {isReviewOpen ? 'Fechar Revisao' : 'Revisar Certificado'}
              </button>
            </DocumentFileActions>
          </div>
        </div>
        {isReviewOpen ? (
          <>
            <CertificateReassignForm
              certificateId={cert.id}
              initialValidation={cert.academicValidation}
              catalog={catalog}
              onSaved={async () => {
                const updated = await api.getSubmissionById(submissionId);
                if (updated) {
                  onSubmissionUpdated?.(updated);
                }
                await onAcademicReviewSaved?.();
              }}
              onFeedback={onFeedback}
            />
            <AcademicReviewForm
              certificateId={cert.id}
              initialValidation={cert.academicValidation}
              onSaved={async () => {
                const updated = await api.getSubmissionById(submissionId);
                if (updated) {
                  onSubmissionUpdated?.(updated);
                }
                onCertReviewSaved?.(cert.id);
                await onAcademicReviewSaved?.();
              }}
              onFeedback={onFeedback}
            />
            <AcademicReviewHistoryPanel certificateId={cert.id} refreshKey={historyRefreshKey} />
          </>
        ) : null}
      </div>
    </li>
  );
}

export function GroupedCertificatesList({
  submissionId,
  certificates,
  catalog,
  openReviewForms,
  historyRefreshByCert,
  onToggleReviewForm,
  onOpenPdf,
  onSubmissionUpdated,
  onAcademicReviewSaved,
  onCertReviewSaved,
  onFeedback,
}: Props) {
  if (certificates.length === 0) {
    return (
      <div className="px-6 py-10 text-center text-sm text-gray-500">
        Nenhum certificado registrado nesta submissao.
      </div>
    );
  }

  const grouped = groupCertificatesForDisplay(certificates);

  return (
    <div className="space-y-6 p-6">
      {grouped.map((group) => (
        <section key={group.groupCode} className="rounded-lg border border-indigo-100 bg-indigo-50/20">
          <header className="border-b border-indigo-100 px-4 py-3">
            <h4 className="text-sm font-semibold text-indigo-900">
              Grupo {group.groupLabel}
            </h4>
          </header>
          <div className="space-y-4 p-4">
            {group.categories.map((cat) => (
              <div key={cat.categoryKey}>
                <h5 className="mb-2 text-xs font-semibold tracking-wide text-gray-600 uppercase">
                  {cat.categoryName}
                </h5>
                <ul className="space-y-3">
                  {cat.certificates.map((cert) => (
                    <CertificateRow
                      key={cert.id}
                      cert={cert}
                      submissionId={submissionId}
                      catalog={catalog}
                      isReviewOpen={Boolean(openReviewForms[cert.id])}
                      historyRefreshKey={historyRefreshByCert[cert.id] ?? 0}
                      onToggleReview={() => onToggleReviewForm(cert.id)}
                      onOpenPdf={onOpenPdf}
                      onSubmissionUpdated={onSubmissionUpdated}
                      onAcademicReviewSaved={onAcademicReviewSaved}
                      onCertReviewSaved={onCertReviewSaved}
                      onFeedback={onFeedback}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
