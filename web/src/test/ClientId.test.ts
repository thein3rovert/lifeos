import { afterEach, describe, expect, it, vi } from 'vitest';
import { createClientId } from '@/lib/clientId';

describe('createClientId', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses crypto.randomUUID when the secure-context API is available', () => {
    const randomUUID = vi.fn(() => 'native-uuid');
    vi.stubGlobal('crypto', { randomUUID });

    expect(createClientId()).toBe('native-uuid');
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it('creates distinct UUID-shaped IDs when randomUUID is unavailable', () => {
    let seed = 0;
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(seed++);
        return bytes;
      },
    });

    const first = createClientId();
    const second = createClientId();

    expect(first).not.toBe(second);
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(second).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('still creates distinct IDs when the Web Crypto API is absent', () => {
    vi.stubGlobal('crypto', undefined);

    expect(createClientId()).not.toBe(createClientId());
  });
});
