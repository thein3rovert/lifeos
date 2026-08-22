import { useEffect, useRef, useState } from 'react';

/**
 * Like useState, but the value is mirrored to sessionStorage so it
 * survives route-component unmount/remount and same-tab hard refresh.
 *
 * Mirrors the convention in lib/cache.ts (sessionStorage, namespaced
 * keys, SSR-safe typeof window guards).
 *
 * SSR note: initial state is always the default; a useEffect hydrates
 * from storage after mount so server and client render the same initial
 * markup (no hydration mismatch). Expect a one-frame flash from the
 * default to the stored value on remount.
 */
function readStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

function writeStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or serialization issue — ignore, this is a best-effort mirror.
  }
}

export function usePersistentState<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(defaultValue);
  const [hydrated, setHydrated] = useState(false);

  // Capture defaultValue by ref so the hydrate effect doesn't re-fire
  // when the caller passes a fresh reference each render (e.g. a new
  // Date object or object literal). The default is only used once, when
  // there's nothing in storage.
  const defaultRef = useRef(defaultValue);

  // Hydrate from storage on mount (client only). Re-runs only if the
  // key changes.
  useEffect(() => {
    const stored = readStorage<T>(key, defaultRef.current);
    setState(stored);
    setHydrated(true);
  }, [key]);

  // Mirror to storage on every change (after hydration so we don't
  // overwrite the stored value with the default before reading it).
  useEffect(() => {
    if (!hydrated) return;
    writeStorage(key, state);
  }, [hydrated, key, state]);

  return [state, setState];
}