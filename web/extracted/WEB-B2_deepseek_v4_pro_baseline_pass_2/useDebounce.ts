import { useEffect, useState } from 'react';

/**
 * A hook that returns a debounced version of the provided value.
 * The returned value only updates after the specified delay has elapsed
 * without the input value changing.
 *
 * @param value - The value to debounce
 * @param delay - The debounce delay in milliseconds (default: 500)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}