import React, { useState, useEffect } from 'react';
import { gregorianToJalali, formatJalaliString, JalaliDate } from '../utils/jalali';

export function useJalaliDate(date: Date | null = null) {
  const [jalaliString, setJalaliString] = useState<string>('');

  useEffect(() => {
    if (!date) {
      setJalaliString('');
      return;
    }

    const gYear = date.getUTCFullYear();
    const gMonth = date.getUTCMonth() + 1; // 1-12
    const gDay = date.getUTCDate();

    try {
      const jalaliDate = gregorianToJalali(gYear, gMonth, gDay);
      const formatted = formatJalaliString(jalaliDate);
      setJalaliString(formatted);
    } catch (e) {
      console.error('Jalali conversion error', e);
      setJalaliString('Invalid Date');
    }
  }, [date]);

  return jalaliString;
}