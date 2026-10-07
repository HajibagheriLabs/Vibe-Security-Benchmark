import React from 'react';
import { useJalaliDate, UseJalaliDateResult } from './useJalaliDate';
import { FormatOptions } from './index';

export interface JalaliDateDisplayProps {
  /** The Gregorian date to display (defaults to now) */
  date?: Date;
  /** Formatting options */
  options?: FormatOptions;
  /** Custom render function */
  children?: (result: UseJalaliDateResult) => React.ReactNode;
  /** CSS class name */
  className?: string;
}

/**
 * React component that renders a Jalali date string from a Gregorian Date.
 * Can be used with a custom render function via the children prop.
 */
export const JalaliDateDisplay: React.FC<JalaliDateDisplayProps> = ({
  date,
  options,
  children,
  className,
}) => {
  const result = useJalaliDate(date ?? new Date(), options);

  if (children) {
    return <>{children(result)}</>;
  }

  return <span className={className}>{result.formatted}</span>;
};

export default JalaliDateDisplay;