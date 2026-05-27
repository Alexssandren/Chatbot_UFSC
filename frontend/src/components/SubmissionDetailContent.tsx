import { useEffect, useState } from 'react';
import type { Submission } from '../types';
import { academicStatusToBadgeStatus, formatSubmissionHoursSummary } from '../types';
import { StatusBadge } from './StatusBadge';
import { AcademicReviewForm } from './AcademicReviewForm';
import { DocumentFileActions } from './DocumentFileActions';
import { PdfViewerModal, type PdfPreviewKind } from './PdfViewerModal';
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  BookOpen,
  FileText,
  ClipboardList,
  Award,
  Undo2,
} from 'lucide-react';
import { api } from '../services/api';

type Props = {
  submission: Submission;
  /** Quando true, exibe o card "Dados do Aluno" na coluna esquerda (pagina de uma submissao). */
  showStudentCard?: boolean;
  /** Titulo opcional acima do bloco (ex.: pagina do aluno com varias submissoes). */
  sectionTitle?: string;
  onSubmissionUpdated?: (submission: Submission) => void;
  onAcademicReviewSaved?: () => void | Promise<void>;
};

export function SubmissionDetailContent({
  submission,
  showStudentCard = true,
  sectionTitle,
  onSubmissionUpdated,
  onAcademicReviewSaved,
}: Props) {
  const [localSubmission, setLocalSubmission] = useState(submission);
  const [actionLoading, setActionLoading] = useState(false);
  const [busyCertId, setBusyCertId] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<{
    text: string;
    variant: 'success' | 'warning' | 'error';
  } | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{
    url: string;
    title: string;
    kind: PdfPreviewKind;
  } | null>(null);

  useEffect(() => {
    setLocalSubmission(submission);
  }, [submission]);

  useEffect(() => {
    if (!statusFeedback) return;
    const timer = window.setTimeout(() => setStatusFeedback(null), 5000);
    return () => window.clearTimeout(timer);
  }, [statusFeedback]);

  const handleUpdateStatus = async (newStatus: 'APROVADO' | 'REJEITADO') => {
    if (!confirm(`Deseja realmente marcar esta submissão como ${newStatus}?`)) {
      return;
    }
    setActionLoading(true);
    try {
      await api.updateStatus(localSubmission.id, newStatus);
      const next = { ...localSubmission, status: newStatus };
      setLocalSubmission(next);
      onSubmissionUpdated?.(next);
      setStatusFeedback(
        newStatus === 'APROVADO'
          ? { text: 'Submissão aprovada com sucesso.', variant: 'success' }
          : { text: 'Submissão rejeitada.', variant: 'warning' }
      );
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status. Tente novamente.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCertificateApproval = async (
    certificateId: string,
    next: 'APROVADO' | 'REJEITADO' | 'PENDENTE'
  ) => {
    const labels = {
      APROVADO: 'aprovar este certificado',
      REJEITADO: 'rejeitar este certificado',
      PENDENTE: 'marcar este certificado como pendente de análise novamente',
    };
    if (!confirm(`Deseja ${labels[next]}?`)) {
      return;
    }
    setBusyCertId(certificateId);
    try {
      const mapped = await api.patchCertificateApproval(localSubmission.id, certificateId, next);
      setLocalSubmission(mapped);
      onSubmissionUpdated?.(mapped);
      setStatusFeedback(
        next === 'PENDENTE'
          ? { text: 'Certificado voltou para análise pendente.', variant: 'warning' }
          : next === 'APROVADO'
            ? { text: 'Certificado aprovado.', variant: 'success' }
            : { text: 'Certificado rejeitado.', variant: 'warning' }
      );
    } catch (error) {
      console.error('Erro ao atualizar certificado:', error);
      alert('Erro ao atualizar certificado. Tente novamente.');
    } finally {
      setBusyCertId(null);
    }
  };

  const certsApprovedCount = localSubmission.certificates.filter((c) => c.approvalStatus === 'APROVADO').length;
  const hasCertificates = localSubmission.certificates.length > 0;

  const feedbackClass =
    statusFeedback?.variant === 'success'
      ? 'border-green-200 bg-green-50 text-green-900'
      : statusFeedback?.variant === 'error'
        ? 'border-red-200 bg-red-50 text-red-900'
        : 'border-amber-200 bg-amber-50 text-amber-900';

  const reqUrl = localSubmission.requerimentoDownloadUrl;
  const reqDisabled = !reqUrl || reqUrl === '#';

  const openPdf = (url: string, title: string, kind: PdfPreviewKind) => {
    if (!url || url === '#') return;
    setPdfPreview({ url, title, kind });
  };

  return (
    <div className="space-y-4">
      {statusFeedback && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${feedbackClass}`}>{statusFeedback.text}</div>
      )}

      {sectionTitle && (
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 pb-3">
          <h3 className="text-lg font-semibold text-gray-900">{sectionTitle}</h3>
          <StatusBadge status={localSubmission.status} />
          <span className="text-sm text-gray-500">
            Enviada em {new Date(localSubmission.date).toLocaleDateString('pt-BR')}
          </span>
        </div>
      )}

      {pdfPreview && (
        <PdfViewerModal
          url={pdfPreview.url}
          title={pdfPreview.title}
          kind={pdfPreview.kind}
          onClose={() => setPdfPreview(null)}
        />
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-1">
          {showStudentCard && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-medium text-gray-900">
                <User className="h-5 w-5 text-gray-400" /> Dados do Aluno
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Nome</p>
                  <p className="font-medium text-gray-900">{localSubmission.studentName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Matrícula</p>
                  <p className="font-medium text-gray-900">{localSubmission.studentId}</p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-medium text-gray-900">
              <BookOpen className="h-5 w-5 text-gray-400" /> Resumo
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Total de Certificados</span>
                <span className="font-medium text-gray-900">{localSubmission.totalCertificates}</span>
              </div>
              {hasCertificates && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Certificados aprovados</span>
                  <span className="font-medium text-gray-900">
                    {certsApprovedCount} / {localSubmission.certificates.length}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Horas (homologadas)</span>
                <span className="font-medium text-gray-900">{formatSubmissionHoursSummary(localSubmission)}</span>
              </div>
            </div>
          </div>

          {!hasCertificates && localSubmission.status === 'PENDENTE' && (
            <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-medium text-gray-900">Ações</h3>
              <button
                type="button"
                onClick={() => handleUpdateStatus('APROVADO')}
                disabled={actionLoading}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle className="h-5 w-5" />
                Aprovar Submissão
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus('REJEITADO')}
                disabled={actionLoading}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                <XCircle className="h-5 w-5" />
                Rejeitar Submissão
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6 md:col-span-2">
          <div className="overflow-hidden rounded-xl border border-amber-100 bg-white shadow-sm">
            <div className="border-b border-amber-100 bg-amber-50/40 p-6">
              <div className="flex flex-wrap items-center gap-2 gap-y-2">
                <h3 className="flex items-center gap-2 text-lg font-medium text-gray-900">
                  <ClipboardList className="h-5 w-5 text-amber-700" aria-hidden />
                  Requerimento principal
                </h3>
                <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                  Requerimento
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-500">Arquivo</p>
                <p className="font-medium text-gray-900">{localSubmission.requerimentoFilename}</p>
              </div>
              <DocumentFileActions
                url={reqUrl}
                downloadName={localSubmission.requerimentoFilename}
                disabled={reqDisabled}
                onView={() => openPdf(reqUrl, localSubmission.requerimentoFilename, 'requerimento')}
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-indigo-100 bg-indigo-50/30 p-6">
              <h3 className="flex flex-wrap items-center gap-2 text-lg font-medium text-gray-900">
                <Award className="h-5 w-5 text-indigo-600" aria-hidden />
                Certificados enviados
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Cada item abaixo é um certificado de atividade complementar anexado pelo aluno.
              </p>
            </div>
            {localSubmission.certificates.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-500">
                Nenhum certificado registrado nesta submissão.
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {localSubmission.certificates.map((cert) => {
                  const disabled = !cert.url || cert.url === '#';
                  const certBusy = busyCertId === cert.id;
                  const pendente = cert.approvalStatus === 'PENDENTE';
                  return (
                    <li key={cert.id} className="p-6 transition-colors hover:bg-gray-50">
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
                              <div className="flex flex-wrap items-center gap-2 gap-y-1 text-xs">
                                <span className="font-medium uppercase tracking-wide text-gray-500">Operacional</span>
                                <StatusBadge status={cert.approvalStatus} />
                                <span className="ml-1 font-medium uppercase tracking-wide text-gray-500">
                                  Acadêmico
                                </span>
                                <StatusBadge
                                  status={academicStatusToBadgeStatus(cert.academicValidation?.status ?? 'pending')}
                                />
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
                          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
                            <DocumentFileActions
                              url={cert.url}
                              downloadName={cert.filename}
                              disabled={disabled}
                              onView={() => openPdf(cert.url, cert.filename, 'certificado')}
                            />
                            <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-2 sm:border-t-0 sm:pt-0 lg:border-l lg:border-gray-100 lg:pl-2">
                              {pendente ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={certBusy}
                                    onClick={() => handleCertificateApproval(cert.id, 'APROVADO')}
                                    className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                  >
                                    <CheckCircle className="h-4 w-4" /> Aprovar arquivo
                                  </button>
                                  <button
                                    type="button"
                                    disabled={certBusy}
                                    onClick={() => handleCertificateApproval(cert.id, 'REJEITADO')}
                                    className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                                  >
                                    <XCircle className="h-4 w-4" /> Rejeitar arquivo
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  disabled={certBusy}
                                  onClick={() => handleCertificateApproval(cert.id, 'PENDENTE')}
                                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                  <Undo2 className="h-4 w-4" /> Reabrir análise
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        <AcademicReviewForm
                          certificateId={cert.id}
                          initialValidation={cert.academicValidation}
                          onSaved={async () => {
                            const updated = await api.getSubmissionById(localSubmission.id);
                            if (updated) {
                              setLocalSubmission(updated);
                              onSubmissionUpdated?.(updated);
                            }
                            await onAcademicReviewSaved?.();
                          }}
                          onFeedback={(msg) => setStatusFeedback(msg)}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
