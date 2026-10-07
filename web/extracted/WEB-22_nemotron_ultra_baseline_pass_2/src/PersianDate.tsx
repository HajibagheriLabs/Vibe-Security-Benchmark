import React from 'react';
import { formatPersianDate, PersianDateOptions } from './index';

export interface PersianDateProps {
  date: Date | number | string | null | undefined;
  options?: PersianDateOptions;
  className?: string;
  fallback?: string;
}

export const PersianDate: React.FC<PersianDateProps> = ({
  date,
  options = {},
  className = '',
  fallback = ''
}) => {
  if (!date) {
    return <span className={className}>{fallback}</span>;
  }

  try {
    const formatted = formatPersianDate(date, options);
    return <time className={className} dateTime={new Date(date).toISOString()}>{formatted}</time>;
  } catch {
    return <span className={className}>{fallback}</span>;
  }
};

export default PersianDate;