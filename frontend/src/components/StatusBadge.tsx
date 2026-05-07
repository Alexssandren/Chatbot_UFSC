import type { SubmissionStatus } from '../types';
import { twMerge } from 'tailwind-merge';

interface StatusBadgeProps {
  status: SubmissionStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles = {
    PENDENTE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    APROVADO: 'bg-green-100 text-green-800 border-green-200',
    REJEITADO: 'bg-red-100 text-red-800 border-red-200',
    PARCIAL: 'bg-violet-100 text-violet-800 border-violet-200',
  };

  const labels = {
    PENDENTE: 'Pendente',
    APROVADO: 'Aprovado',
    REJEITADO: 'Rejeitado',
    PARCIAL: 'Parcial',
  };

  return (
    <span
      className={twMerge(
        'px-2.5 py-1 text-xs font-medium border rounded-full',
        styles[status],
        className
      )}
    >
      {labels[status]}
    </span>
  );
}
