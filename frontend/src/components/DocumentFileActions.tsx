import { Download, Eye } from 'lucide-react';

type Props = {
  url: string | undefined;
  downloadName: string;
  disabled?: boolean;
  onView: () => void;
  children?: React.ReactNode;
};

export function DocumentFileActions({ url, downloadName, disabled = false, onView, children }: Props) {
  const isDisabled = disabled || !url || url === '#';

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onView}
        disabled={isDisabled}
        className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${
          isDisabled
            ? 'pointer-events-none border-gray-200 bg-gray-50 text-gray-400'
            : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50'
        }`}
      >
        <Eye className="h-4 w-4" aria-hidden />
        Visualizar PDF
      </button>
      <a
        href={isDisabled ? undefined : url}
        download={downloadName}
        className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${
          isDisabled
            ? 'pointer-events-none border-gray-200 bg-gray-50 text-gray-400'
            : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50'
        }`}
        aria-disabled={isDisabled}
      >
        <Download className="h-4 w-4" aria-hidden />
        Baixar PDF
      </a>
      {children}
    </div>
  );
}
