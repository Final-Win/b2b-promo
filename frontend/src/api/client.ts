import { useAuthStore } from './authApi';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function parseAndThrow(res: Response): Promise<never> {
  const body = await res.json().catch(() => null);
  throw new ApiError(
    res.status,
    body?.error?.code ?? 'UNKNOWN_ERROR',
    body?.error?.message ?? res.statusText,
  );
}

function buildHeaders(hasBody: boolean): Record<string, string> {
  const headers: Record<string, string> = {};
  if (hasBody) headers['Content-Type'] = 'application/json';
  const token = useAuthStore.getState().accessToken;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function refreshAccessToken(): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) return false;
  const data = await res.json();
  useAuthStore.getState().setAccessToken(data.access_token);
  return true;
}

// 이 엔드포인트들의 401은 "세션 만료"가 아니라 그 자체가 정상적인 도메인 응답(로그인 실패 등)이므로
// refresh 재시도 대상에서 제외한다.
const SKIP_REFRESH_RETRY_PATHS = ['/auth/login', '/auth/signup'];

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const doFetch = () =>
    fetch(`${BASE_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: { ...buildHeaders(options.body != null), ...options.headers },
    });

  let res = await doFetch();

  if (res.status === 401 && !SKIP_REFRESH_RETRY_PATHS.includes(path)) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      useAuthStore.getState().setAccessToken(null);
      window.location.href = '/login';
      throw new ApiError(401, 'UNAUTHORIZED', 'Session expired');
    }
    res = await doFetch();
  }

  if (!res.ok) return parseAndThrow(res);

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
