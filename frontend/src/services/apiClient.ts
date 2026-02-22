export class ApiError extends Error {
  status: number;
  body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

const trimSlash = (s: string) => s.replace(/\/+$/, '');

export const API_BASE_URL: string = (() => {
  const env = import.meta.env.VITE_API_BASE_URL as string | undefined;
  return env ? trimSlash(env) : 'http://localhost:8000/api';
})();

const getErrorMessage = (payload: unknown, status: number) => {
  if (payload && typeof payload === 'object') {
    const maybeDetail = (payload as { detail?: unknown }).detail;
    if (typeof maybeDetail === 'string' && maybeDetail.trim()) return maybeDetail;
  }
  return `Request failed (${status})`;
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
};

const buildUrl = (path: string) => {
  if (!path.startsWith('/')) path = `/${path}`;
  return `${API_BASE_URL}${path}`;
};

export async function apiJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {})
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal
  });

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await res.json().catch(() => undefined) : await res.text().catch(() => undefined);

  if (!res.ok) {
    const message = getErrorMessage(payload, res.status);
    throw new ApiError(message, res.status, payload);
  }

  return payload as T;
}

export async function apiForm<T>(path: string, formData: FormData, options: Omit<RequestOptions, 'body'> = {}): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: options.method ?? 'POST',
    headers: {
      ...(options.headers ?? {})
    },
    body: formData,
    signal: options.signal
  });

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await res.json().catch(() => undefined) : await res.text().catch(() => undefined);

  if (!res.ok) {
    const message = getErrorMessage(payload, res.status);
    throw new ApiError(message, res.status, payload);
  }

  return payload as T;
}

export async function apiDelete<T>(path: string, options: Omit<RequestOptions, 'body'> = {}): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {})
    },
    signal: options.signal
  });

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await res.json().catch(() => undefined) : await res.text().catch(() => undefined);

  if (!res.ok) {
    const message = getErrorMessage(payload, res.status);
    throw new ApiError(message, res.status, payload);
  }

  return payload as T;
}
