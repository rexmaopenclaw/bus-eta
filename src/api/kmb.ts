// ============================================================
// 九巴 KMB Data API Client
// ============================================================
// 靜態數據（路線/車站）：用 winstonma GitHub Pages 每日同步版
//   Base: https://winstonma.github.io/MMM-HK-Transport-ETA-Data/kmb
// 即時 ETA：用官方 KMB OpenData
//   Base: https://data.etabus.gov.hk/v1/transport/kmb
// ============================================================

import type {
  KMBRoute,
  KMBStop,
  KMBRouteStop,
  KMBETA,
  ApiResponse,
} from '../types';

// ---- 靜態數據來源（winstonma GitHub Pages） ----
const STATIC_BASE = '/api/proxy/kmb';

// ---- 即時數據來源（官方 KMB OpenData） ----
const ETA_BASE = 'https://data.etabus.gov.hk/v1/transport/kmb';
const TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;

// ---------- 自訂 Error ----------
export class KMBAPIError extends Error {
  constructor(
    public status: number,
    message: string,
    public endpoint: string,
  ) {
    super(message);
    this.name = 'KMBAPIError';
  }
}

// ---------- 通用 fetch ----------
async function fetchJson<T>(url: string, timeoutMs = TIMEOUT_MS): Promise<T> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      if (!res.ok) {
        throw new KMBAPIError(res.status, `HTTP ${res.status}`, url);
      }
      return (await res.json()) as T;
    } catch (err: unknown) {
      clearTimeout(id);
      if (err instanceof KMBAPIError) throw err;
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new KMBAPIError(0, '請求超時，請檢查網絡連線', url);
      }
      if (attempt === MAX_RETRIES) {
        throw new KMBAPIError(
          0,
          err instanceof Error ? err.message : '未知錯誤',
          url,
        );
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new KMBAPIError(0, 'Unexpected error', url);
}

// ============================================================
// 靜態數據 API（winstonma GitHub Pages）
// ============================================================

// 路線車站資料格式（來自 GitHub Pages）
interface RouteData {
  route: string;
  stops: (KMBRouteStop & {
    name_tc: string;
    name_en: string;
    name_sc: string;
    lat: string;
    long: string;
  })[];
}

interface AllRoutesData {
  routes: Record<
    string,
    Record<
      'O' | 'I',
      Record<
        string,
        {
          stops: string[];
          orig_tc: string;
          orig_en: string;
          orig_sc: string;
          dest_tc: string;
          dest_en: string;
          dest_sc: string;
        }
      >
    >
  >;
}

// allstops.json 嘅真實格式：flat dict，key 係 stop ID
// 唔係 { stops: {...} } wrapper
interface AllStopsData {
  stops: Record<string, KMBStop & { routes: string[] }>;
}

/** 取得單一路線嘅所有車站（含車站名 + 坐標） */
export async function getRouteStopsStatic(
  route: string,
): Promise<RouteData['stops']> {
  const data = await fetchJson<RouteData>(`${STATIC_BASE}/routes/${route}.json`);
  return data.stops;
}

/** 取得所有路線嘅基本資料 */
export async function getAllRoutesStatic(): Promise<AllRoutesData> {
  return fetchJson<AllRoutesData>(`${STATIC_BASE}/routes/allroutes.json`);
}

/** 取得所有車站（含 routes 字段）
 * 注意：API 回傳係 flat dict，唔係 { stops: ... } */
export async function getAllStopsStatic(): Promise<Record<string, KMBStop & { routes: string[] }>> {
  return fetchJson<Record<string, KMBStop & { routes: string[] }>>(`${STATIC_BASE}/stops/allstops.json`);
}

/** 取得單一車站（含 routes 字段） */
export async function getStopStatic(
  stopId: string,
): Promise<(KMBStop & { routes: string[] }) | null> {
  const all = await getAllStopsStatic();
  return all[stopId] ?? null;
}

// ============================================================
// 即時 ETA API（官方 KMB OpenData）
// ============================================================

/** 取得車站 ETA（新版 API）
 * URL: eta/{stopId}/{route}/{serviceType}
 */
export async function getStopETA(
  stopId: string,
  route: string,
  serviceType: string = '1',
): Promise<KMBETA[]> {
  const url = `${ETA_BASE}/eta/${stopId}/${route}/${serviceType}`;
  const json = await fetchJson<ApiResponse<KMBETA[]>>(url);
  return json.data;
}

/** 取得路線所有車站 ETA（經 route-eta 端點） */
export async function getRouteETA(
  route: string,
  bound: 'O' | 'I',
  serviceType: string = '1',
): Promise<KMBETA[]> {
  const url = `${ETA_BASE}/route-eta/${route}/${bound}`;
  const json = await fetchJson<ApiResponse<KMBETA[]>>(url);
  return json.data;
}

/** 取得所有路線（可選 route number 過濾，client-side filter）
 * 注意：/route/{number} endpoint 唔 work，所以一律 fetch 晒全部再 filter */
export async function getRoutes(routeNumber?: string): Promise<KMBRoute[]> {
  const url = `${ETA_BASE}/route`;
  const json = await fetchJson<ApiResponse<KMBRoute[]>>(url);
  const allRoutes = json.data;
  if (routeNumber) {
    return allRoutes.filter((r) => r.route === routeNumber.toUpperCase());
  }
  return allRoutes;
}

/** 取得單一車站資料（官方） */
export async function getStop(stopId: string): Promise<KMBStop> {
  const url = `${ETA_BASE}/stop/${stopId}`;
  const json = await fetchJson<ApiResponse<KMBStop>>(url);
  return json.data;
}

/** 取得所有車站（官方，大量數據） */
export async function getAllStops(): Promise<KMBStop[]> {
  const url = `${ETA_BASE}/stop`;
  const json = await fetchJson<ApiResponse<KMBStop[]>>(url, 30000);
  return json.data;
}

/** 取得路線全費（經後端代理） */
export async function getRouteFare(company: string, route: string): Promise<number | null> {
  try {
    const res = await fetch(`/api/route-fare/${company}/${route}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.fare ?? null;
  } catch {
    return null;
  }
}