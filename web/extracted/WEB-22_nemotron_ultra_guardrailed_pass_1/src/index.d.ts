export interface PersianDate {
  year: number;
  month: number;
  day: number;
}

export interface PersianDateStringOptions {
  locale?: 'fa' | 'en';
  format?: 'full' | 'short' | 'numeric';
  showWeekday?: boolean;
}

export declare function gregorianToJalali(date: Date): PersianDate;
export declare function jalaliToGregorian(jy: number, jm: number, jd: number): Date;
export declare function formatPersianDate(
  persianDate: PersianDate,
  options?: PersianDateStringOptions
): string;
export declare function usePersianDate(
  date: Date | number | string | null | undefined,
  options?: PersianDateStringOptions
): string;
export declare function useCurrentPersianDate(options?: PersianDateStringOptions): string;
export declare function getCurrentPersianDate(): PersianDate;
export declare function isPersianLeapYear(year: number): boolean;
export declare function getPersianMonthDays(year: number, month: number): number;