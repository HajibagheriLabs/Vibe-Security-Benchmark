import { usePersianDate, formatPersianDate, gregorianToJalali } from 'persian-date-utils';

// Using the React hook
function MyComponent() {
  const persianDate = usePersianDate(new Date(), { 
    locale: 'fa', 
    format: 'full',
    showWeekday: true 
  });
  
  return <div>{persianDate}</div>; // "پنج‌شنبه، ۱۵ فروردین ۱۴۰۳"
}

// Using utility functions directly
const persian = gregorianToJalali(new Date('2024-03-20'));
// { year: 1403, month: 1, day: 1 }

const formatted = formatPersianDate(persian, { 
  locale: 'en', 
  format: 'numeric' 
});
// "1403/01/01"