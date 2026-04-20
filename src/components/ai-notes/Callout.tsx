import React from 'react';
import { CalloutVariant } from '@/types/ai-notes';

interface CalloutProps {
  content: string;
  variant: CalloutVariant;
}

const Callout: React.FC<CalloutProps> = ({ content, variant }) => {
  const variantConfig = {
    info: {
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      border: 'border-blue-500',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconText: 'text-blue-700 dark:text-blue-400',
      title: 'text-blue-800 dark:text-blue-300',
      content: 'text-blue-700 dark:text-blue-400/90',
      icon: 'ℹ️',
    },
    warn: {
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      border: 'border-amber-500',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconText: 'text-amber-700 dark:text-amber-400',
      title: 'text-amber-800 dark:text-amber-300',
      content: 'text-amber-700 dark:text-amber-400/90',
      icon: '⚠️',
    },
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      border: 'border-emerald-500',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconText: 'text-emerald-700 dark:text-emerald-400',
      title: 'text-emerald-800 dark:text-emerald-300',
      content: 'text-emerald-700 dark:text-emerald-400/90',
      icon: '✅',
    },
    danger: {
      bg: 'bg-red-50 dark:bg-red-950/20',
      border: 'border-red-500',
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconText: 'text-red-700 dark:text-red-400',
      title: 'text-red-800 dark:text-red-300',
      content: 'text-red-700 dark:text-red-400/90',
      icon: '🚫',
    },
  };

  const config = variantConfig[variant];

  return (
    <div className={`mb-4 p-4 ${config.bg} border-l-4 ${config.border} rounded-r-lg`}>
      <div className="flex items-start gap-3">
        <div className={`shrink-0 w-8 h-8 rounded-full ${config.iconBg} flex items-center justify-center`}>
          <span className={config.iconText}>{config.icon}</span>
        </div>
        <div className="flex-1">
          <h3 className={`font-semibold ${config.title} mb-1 capitalize`}>{variant}</h3>
          <p className={config.content}>{content}</p>
        </div>
      </div>
    </div>
  );
};

export default Callout;