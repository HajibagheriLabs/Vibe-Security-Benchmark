// hooks/useDebounce.ts
import { useState, useEffect } from 'react';

/**
 * Debounces a value by a configurable delay.
 *
 * @param value - The value to debounce.
 * @param delay - The debounce delay in milliseconds.
 * @returns The debounced value.
 *
 * Security Notes:
 * - No secrets or credentials involved.
 * - No DOM manipulation or XSS sinks.
 * - Uses standard React hooks with proper cleanup.
 */
export function useDebounce<T>(value: T, delay: number): T {
  // State to hold the debounced value
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set a timer to update the debounced value after the delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: clear the timer if the component unmounts or if the value/delay changes
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}