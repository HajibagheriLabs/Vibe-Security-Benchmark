// useDebounce.ts
import { useEffect, useState } from 'react';

/**
 * A React hook that debounces a value by a configurable delay.
 *
 * @param value - The value to debounce. Can be any type.
 * @param delay - The debounce delay in milliseconds. Defaults to 500ms.
 * @returns The debounced value, which updates only after the specified delay
 *          has elapsed without the input value changing.
 *
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 300);
 *
 * useEffect(() => {
 *   if (debouncedSearchTerm) {
 *     // Perform API call with debouncedSearchTerm
 *   }
 * }, [debouncedSearchTerm]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay]);

  return debouncedValue;
}