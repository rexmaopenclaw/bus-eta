// ============================================================
// 城巴 CTB Data API Client
// 靜態數據：winstonma GitHub Pages 每日同步版
//   Base: https://winstonma.github.io/MMM-HK-Transport-ETA-Data/ctb
// 即時 ETA：城巴官方 API
//   Base: https://rt.data.gov.hk/v1/transport/citybus-nwfb
// ============================================================

import type { KMBRoute, KMBStop, KMBETA, ApiResponse, RouteStopDetail } from '../types';

// ---- 靜態數據來源（winstonma GitHub Pages，經 server proxy 避免 CORS） ----
const STATIC_BASE = '/api/proxy/ctb';

// ---- 即時數據來源（官方 CTB OpenData） ----
const ETA_BASE = 'https://rt.data.gov.hk/v1/transport/citybus-nwfb';
const TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;

// CTB 路線帶 co 字段
interface CTBRouteRaw {
  co: 'CTB' | 'NWFB';
  route: string;
  orig_tc: string;
  orig_en: string;
  orig_sc: string;
  dest_tc: string;
  dest_en: string;
  dest_sc: string;
  data_timestamp: string;
}

// winstonma allroutes 格式
interface AllRoutesData {
  routes: Record<
    string,
    Record<
      'O' | 'I',
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
  >;
}

// winstonma route detail 格式
interface RouteData {
  route: string;
  stops: (RouteStopDetail & {
    co: string;
    name_tc: string;
    name_en: string;
    name_sc: string;
    lat: string;
    long: string;
  })[];
}

// ---- 自訂 Error ----
export class CTBAPIError extends Error {
  constructor(public status: number, message: string, public endpoint: string) {
    super(message);
    this.name = 'CTBAPIError';
  }
}

// ---- 通用 fetch ----
async function fetchJson<T>(url: string, timeoutMs = TIMEOUT_MS): Promise<T> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      if (!res.ok) {
        throw new CTBAPIError(res.status, `HTTP ${res.status}`, url);
      }
      return (await res.json()) as T;
    } catch (err: unknown) {
      clearTimeout(id);
      if (err instanceof CTBAPIError) throw err;
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new CTBAPIError(0, '請求超時，請檢查網絡連線', url);
      }
      if (attempt === MAX_RETRIES) {
        throw new CTBAPIError(0, err instanceof Error ? err.message : '未知錯誤', url);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new CTBAPIError(0, 'Unexpected error', url);
}

// ============================================================
// 靜態數據 API（winstonma GitHub Pages）
// ============================================================

/** 取得所有 CTB 路線（co: CTB/NWFB） */
export async function getRoutes(): Promise<KMBRoute[]> {
  const data = await fetchJson<AllRoutesData>(`${STATIC_BASE}/routes/allroutes.json`);
  const result: KMBRoute[] = [];
  for (const [route, directions] of Object.entries(data.routes)) {
    for (const [bound, info] of Object.entries(directions)) {
      result.push({
        route,
        bound: bound as 'O' | 'I',
        service_type: '1',
        orig_en: info.orig_en,
        orig_tc: info.orig_tc,
        orig_sc: info.orig_sc,
        dest_en: info.dest_en,
        dest_tc: info.dest_tc,
        dest_sc: info.dest_sc,
      });
    }
  }
  return result;
}

/** 取得單一 CTB 路線車站（含車站名 + 坐標） */
export async function getRouteStopsStatic(route: string): Promise<RouteData['stops']> {
  const data = await fetchJson<RouteData>(`${STATIC_BASE}/routes/${route}.json`);
  return data.stops;
}

/** 取得所有 CTB 車站 */
export async function getAllStopsStatic(): Promise<Record<string, KMBStop & { routes: string[] }>> {
  // CTB 靜態數據冇直接 allstops，所以要爬 route 數據合併
  // 改用 winstonma 嘅 CTB stops 目錄
  const data = await fetchJson<{ stops: Record<string, KMBStop & { routes: string[] }> }>(
    `${STATIC_BASE}/stops/allstops.json`,
  );
  return data.stops;
}

// ============================================================
// 即時 ETA API（官方 CTB OpenData）
// ============================================================

/** CTB bound 轉換：O→1, I→2
 * 官方 ETA API 用 1/2 唔係 O/I
 */
export function ctbBoundToApi(bound: 'O' | 'I'): string {
  return bound === 'O' ? '1' : '2';
}

/** 取得 CTB 車站 ETA（stop-based endpoint）
 * URL: eta/CTB/{stop_id}/{route}
 * 例子：https://rt.data.gov.hk/v1/transport/citybus-nwfb/eta/CTB/003340/930X
 * data.data 係 KMBETA[]，可用 dir / seq 區分方向
 */
export async function getStopETA(
  stopId: string,
  route: string,
): Promise<KMBETA[]> {
  const url = `${ETA_BASE}/eta/CTB/${stopId}/${route}`;
  const json = await fetchJson<ApiResponse<KMBETA[]>>(url);
  return json.data;
}

/** 取得 CTB 路線 ETA（route-level）
 * URL: eta/ctb/{route}/{bound}  (bound: 1=O, 2=I)
 */
export async function getRouteETA(
  route: string,
  bound: 'O' | 'I',
): Promise<KMBETA[]> {
  const apiBound = ctbBoundToApi(bound);
  const url = `${ETA_BASE}/eta/ctb/${route}/${apiBound}`;
  const json = await fetchJson<ApiResponse<KMBETA[]>>(url);
  return json.data;
}

/** 取得 CTB 公司資料 */
export async function getCompany(): Promise<{ co: string; name_tc: string; name_en: string }> {
  const url = `${ETA_BASE}/company/ctb`;
  const json = await fetchJson<ApiResponse<{ co: string; name_tc: string; name_en: string }>>(url);
  return json.data;
}

/** 取得單一車站（官方 API） */
export async function getStop(stopId: string): Promise<KMBStop> {
  const url = `${ETA_BASE}/stop/${stopId}`;
  const json = await fetchJson<ApiResponse<KMBStop>>(url);
  return json.data;
}