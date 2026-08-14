// ============================================================
// Auth API — 登入 / 註冊 / Token 驗證
// ============================================================

// 2026-08-15: API URL 自訂已移除（app 固定同源部署喺 Cloudflare Workers）
// 清除舊時殘留嘅 tunnel URL，避免整壞 API 請求
const DEFAULT_API = '';

export function clearApiBase() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('api_base');
  }
}

export function getCurrentApiBase(): string {
  return DEFAULT_API;
}

// ============================================================
// Version check — 版本更新檢查
// deploy.ps1 會自動生成 dist/version.json：{ version: gitHash, date: ISO }
// ============================================================

const VERSION_KEY = 'app_version';

export async function checkVersion(): Promise<{ version: string; date: string }> {
  // ?t= 防 SW / HTTP cache，確保攞到最新
  const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('無法取得版本資訊');
  return res.json();
}

export function getStoredVersion(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(VERSION_KEY);
}

export function setStoredVersion(v: string) {
  if (typeof window !== 'undefined') localStorage.setItem(VERSION_KEY, v);
}

export async function loginApi(email: string, password: string) {
  const res = await fetch(`${getCurrentApiBase()}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '登入失敗');
  return data as { token: string; user: { id: number; email: string } };
}

export async function registerApi(email: string, password: string) {
  const res = await fetch(`${getCurrentApiBase()}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '註冊失敗');
  return data as { token: string; user: { id: number; email: string } };
}

export async function meApi(token: string) {
  const res = await fetch(`${getCurrentApiBase()}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Token 已過期');
  return data as { user: { id: number; email: string } };
}

export async function fetchFavoritesApi(token: string) {
  const res = await fetch(`${getCurrentApiBase()}/api/favorites`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error('無法獲取收藏');
  return data as { favorites: any[] };
}

export async function syncFavoritesApi(token: string, favorites: any[]) {
  const res = await fetch(`${getCurrentApiBase()}/api/favorites/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ favorites }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('同步失敗');
  return data as { success: boolean; count: number };
}