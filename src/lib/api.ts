/**
 * API fetch wrapper: baseURL, auth header, error handling
 */
import { API_CONFIG } from "./api-config";

const STORAGE_KEYS = { access: "access_token", refresh: "refresh_token" };
const DEFAULT_TIMEOUT_MS = 30_000; // 30s - zahtjev se prekida ako API ne odgovori

function getAccessToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.access);
}

function getRefreshToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.refresh);
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem(STORAGE_KEYS.access, access);
  localStorage.setItem(STORAGE_KEYS.refresh, refresh);
}

export function clearTokens() {
  localStorage.removeItem(STORAGE_KEYS.access);
  localStorage.removeItem(STORAGE_KEYS.refresh);
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.auth.refresh}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

export interface ApiError {
  detail: string | Record<string, unknown>;
  status: number;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    let detail: string | Record<string, unknown> = text;
    try {
      detail = JSON.parse(text)?.detail ?? text;
    } catch {
      // keep text
    }
    throw { detail, status: res.status } as ApiError;
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: options.signal ?? controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_CONFIG.baseURL}${path}`;
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetchWithTimeout(url, { ...options, headers });

  if (res.status === 401 && token) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${getAccessToken()}`;
      res = await fetchWithTimeout(url, { ...options, headers });
    }
  }
  return handleResponse<T>(res);
}

export async function apiFormData<T>(
  path: string,
  formData: FormData,
  options: Omit<RequestInit, "body"> = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_CONFIG.baseURL}${path}`;
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetchWithTimeout(url, {
    ...options,
    method: options.method || "POST",
    headers,
    body: formData,
  });
  if (res.status === 401 && token) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${getAccessToken()}`;
      const retry = await fetch(url, { ...options, method: "POST", headers, body: formData });
      return handleResponse<T>(retry);
    }
  }
  return handleResponse<T>(res);
}

export async function login(email: string, password: string) {
  const data = await api<{ access_token: string; refresh_token: string }>(
    API_CONFIG.endpoints.auth.login,
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }
  );
  setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function fetchMe() {
  return api<{ id: number; email: string; name: string; role: string; location_name?: string }>(
    API_CONFIG.endpoints.auth.me
  );
}
