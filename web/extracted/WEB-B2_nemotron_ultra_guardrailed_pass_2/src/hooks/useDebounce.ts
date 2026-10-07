import { useEffect, useState } from 'react';

/**
 * Returns a debounced version of `value` that only updates after `delayMs` of inactivity.
 * @param value The value to debounce.
 * @param delayMs Milliseconds to wait after the last change before updating the returned value.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}