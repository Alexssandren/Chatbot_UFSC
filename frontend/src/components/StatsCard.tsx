import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  className?: string;
  type?: 'default' | 'warning' | 'success' | 'danger' | 'partial';
}

export function StatsCard({ title, value, icon, className, type = 'default' }: StatsCardProps) {
  const bgColors = {
    default: 'bg-white',
    warning: 'bg-yellow-50',
    success: 'bg-green-50',
    danger: 'bg-red-50',
    partial: 'bg-violet-50',
  };

  const textColors = {
    default: 'text-gray-900',
    warning: 'text-yellow-700',
    success: 'text-green-700',
    danger: 'text-red-700',
    partial: 'text-violet-700',
  };

  const iconColors = {
    default: 'text-indigo-600 bg-indigo-100',
    warning: 'text-yellow-600 bg-yellow-100',
    success: 'text-green-600 bg-green-100',
    danger: 'text-red-600 bg-red-100',
    partial: 'text-violet-600 bg-violet-100',
  };

  return (
    <div className={twMerge('rounded-xl border border-gray-200 p-6 shadow-sm', bgColors[type], className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className={twMerge('mt-2 text-3xl font-bold', textColors[type])}>{value}</p>
        </div>
        <div className={twMerge('flex h-12 w-12 items-center justify-center rounded-lg', iconColors[type])}>
          {icon}
        </div>
      </div>
    </div>
  );
}
