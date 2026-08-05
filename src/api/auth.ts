// ============================================================
// Auth API — 登入 / 註冊 / Token 驗證
// ============================================================

// 可從 localStorage 讀取 API URL，方便 tunnel URL 變咗時改
const DEFAULT_API = 'https://humor-scripts-pas-contribution.trycloudflare.com';

function getApiBase(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('api_base') || DEFAULT_API;
  }
  return DEFAULT_API;
}

export function setApiBase(url: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('api_base', url.replace(/\/+$/, ''));
  }
}

export function getCurrentApiBase(): string {
  return getApiBase();
}

export async function loginApi(email: string, password: string) {
  const res = await fetch(`${getApiBase()}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '登入失敗');
  return data as { token: string; user: { id: number; email: string } };
}

export async function registerApi(email: string, password: string) {
  const res = await fetch(`${getApiBase()}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '註冊失敗');
  return data as { token: string; user: { id: number; email: string } };
}

export async function meApi(token: string) {
  const res = await fetch(`${getApiBase()}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Token 已過期');
  return data as { user: { id: number; email: string } };
}

export async function fetchFavoritesApi(token: string) {
  const res = await fetch(`${getApiBase()}/api/favorites`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error('無法獲取收藏');
  return data as { favorites: any[] };
}

export async function syncFavoritesApi(token: string, favorites: any[]) {
  const res = await fetch(`${getApiBase()}/api/favorites/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ favorites }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('同步失敗');
  return data as { success: boolean; count: number };
}