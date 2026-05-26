import { useEffect, useId, useRef, useState, type MouseEvent } from 'react';
import { Download, ExternalLink, Loader2, RotateCcw, X } from 'lucide-react';

export type PdfPreviewKind = 'requerimento' | 'certificado';

const LOAD_TIMEOUT_MS = 15_000;

type Props = {
  url: string;
  title: string;
  kind: PdfPreviewKind;
  onClose: () => void;
};

type ViewerPhase = 'loading' | 'ready' | 'failed';

export function PdfViewerModal({ url, title, kind, onClose }: Props) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const stillLoadingRef = useRef(true);
  const isFirstUrlEffect = useRef(true);
  const [phase, setPhase] = useState<ViewerPhase>('loading');
  const [iframeKey, setIframeKey] = useState(0);

  const kindLabel = kind === 'requerimento' ? 'Requerimento' : 'Certificado';
  const kindBadgeClass =
    kind === 'requerimento'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-indigo-200 bg-indigo-50 text-indigo-800';

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    setPhase('loading');
    stillLoadingRef.current = true;
    if (isFirstUrlEffect.current) {
      isFirstUrlEffect.current = false;
    } else {
      setIframeKey((k) => k + 1);
    }
  }, [url]);

  useEffect(() => {
    if (phase !== 'loading') {
      return undefined;
    }
    stillLoadingRef.current = true;
    const timer = window.setTimeout(() => {
      if (stillLoadingRef.current) {
        stillLoadingRef.current = false;
        setPhase('failed');
      }
    }, LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [phase, url, iframeKey]);

  const handleIframeLoad = () => {
    stillLoadingRef.current = false;
    setPhase((current) => (current === 'loading' ? 'ready' : current));
  };

  const handleRetry = () => {
    setPhase('loading');
    stillLoadingRef.current = true;
    setIframeKey((k) => k + 1);
  };

  const handleOpenNewTab = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleBackdropClick = () => {
    onClose();
  };

  const handlePanelClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-lg"
        onClick={handlePanelClick}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${kindBadgeClass}`}
              >
                {kindLabel}
              </span>
            </div>
            <h2 id={titleId} className="truncate text-base font-semibold text-gray-900 sm:text-lg" title={title}>
              {title}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
            aria-label="Fechar visualização"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative min-h-[50vh] flex-1 bg-gray-100">
          {phase === 'loading' && (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-gray-50 px-6 text-center"
              aria-busy="true"
              aria-live="polite"
            >
              <Loader2 className="h-10 w-10 animate-spin text-indigo-600" aria-hidden />
              <div className="max-w-sm space-y-1">
                <p className="text-sm font-medium text-gray-900">Carregando documento</p>
                <p className="text-xs text-gray-500">Aguarde enquanto o arquivo é preparado para visualização.</p>
              </div>
              <div className="mt-2 h-40 w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-inner">
                <div className="h-3 w-2/3 animate-pulse rounded-tl-lg rounded-br bg-gray-200" />
                <div className="mt-4 space-y-2 px-4">
                  <div className="h-2 w-full animate-pulse rounded bg-gray-200" />
                  <div className="h-2 w-5/6 animate-pulse rounded bg-gray-200" />
                  <div className="h-2 w-4/6 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            </div>
          )}

          {phase === 'failed' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-gray-50 px-6 text-center">
              <p className="max-w-md text-sm font-medium text-gray-900">Não foi possível carregar o documento.</p>
              <p className="max-w-md text-xs text-gray-600">
                O arquivo pode estar indisponível, o servidor pode não ter respondido a tempo ou o navegador pode não
                exibir PDF neste dispositivo.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Tentar novamente
                </button>
                <button
                  type="button"
                  onClick={handleOpenNewTab}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir em nova aba
                </button>
                <a
                  href={url}
                  download={title}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  <Download className="h-4 w-4" />
                  Baixar PDF
                </a>
              </div>
            </div>
          )}

          <iframe
            key={iframeKey}
            title={title}
            src={url}
            onLoad={handleIframeLoad}
            className={`h-[min(70vh,600px)] w-full border-0 bg-white sm:h-[min(70vh,640px)] ${
              phase === 'ready' ? 'block' : 'hidden'
            }`}
          />
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <a
            href={url}
            download={title}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 sm:inline-flex"
          >
            <Download className="h-4 w-4" />
            Baixar PDF
          </a>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {phase === 'ready' && (
              <button
                type="button"
                onClick={handleOpenNewTab}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir em nova aba
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
