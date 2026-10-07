export interface JalaliDate {
  year: number;
  month: number;
  day: number;
}

export interface JalaliFormatOptions {
  locale?: 'fa' | 'en';
  showWeekday?: boolean;
  format?: 'full' | 'short' | 'numeric' | 'custom';
  customPattern?: string;
  separator?: string;
}

export interface JalaliLocale {
  months: string[];
  weekdays: string[];
  digits: string[];
}