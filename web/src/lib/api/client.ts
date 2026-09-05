import { apiUrl } from '@/lib/apiUrl';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | undefined,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function fetcher<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(endpoint), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    let code: string | undefined;
    let message = body || `Request failed with status ${response.status}`;

    try {
      const parsed = JSON.parse(body) as { error?: string; message?: string };
      code = parsed.error;
      message = parsed.message ?? parsed.error ?? message;
    } catch {
      // Keep the plain-text response as the error message.
    }

    throw new ApiError(response.status, code, message);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}
