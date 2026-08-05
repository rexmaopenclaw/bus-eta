// ============================================================
// 九巴 KMB OpenData API Types
// API 文檔: https://data.etabus.gov.hk
// ============================================================

/** 巴士路線 */
export interface KMBRoute {
  route: string;
  bound: 'O' | 'I'; // O=去程 Outbound, I=回程 Inbound
  service_type: string; // 1=常規, 其他=特別班次
  orig_en: string;
  orig_tc: string;
  orig_sc: string;
  dest_en: string;
  dest_tc: string;
  dest_sc: string;
}

/** 巴士站 */
export interface KMBStop {
  stop: string; // Stop ID (hex)
  name_en: string;
  name_tc: string;
  name_sc: string;
  lat: string;
  long: string;
}

/** 路線車站順序 */
export interface KMBRouteStop {
  route: string;
  bound: 'O' | 'I';
  service_type: string;
  seq: number; // 車站順序編號
  stop: string; // Stop ID
}

/** 即時到站 ETA（新版 API 格式） */
export interface KMBETA {
  co: string; // 巴士公司 KMB/LWB
  route: string;
  dir: 'O' | 'I';
  service_type: number;
  seq: number; // 車站順序編號
  dest_tc: string;
  dest_sc: string;
  dest_en: string;
  eta_seq: number; // 班次編號 (1=第一班)
  eta: string | null; // ISO 8601, null = 未提供
  rmk_tc: string; // 備註 (中文)
  rmk_sc: string; // 備註 (簡中)
  rmk_en: string; // 備註 (英文)
  data_timestamp: string;
}

/** 路線車站（含車站詳細資料，來自靜態 API） */
export interface RouteStopDetail {
  route: string;
  bound: 'O' | 'I';
  service_type: string;
  seq: number;
  stop: string;
  name_tc: string;
  name_en: string;
  name_sc: string;
  lat: string;
  long: string;
}

/** 巴士公司 */
export type BusCompany = 'KMB' | 'CTB' | 'NWFB';

/** 預設群組名 */
export const DEFAULT_GROUP = '預設';

/** 用戶收藏 */
export interface FavoriteRoute {
  id: string; // `${company}-${route}-${bound}-${stopId}`
  company: BusCompany;
  route: string;
  bound: 'O' | 'I';
  service_type: string;
  stopId: string;
  stopNameTc: string;
  stopNameEn: string;
  routeOrigTc: string;
  routeDestTc: string;
  routeOrigEn: string;
  routeDestEn: string;
  addedAt: number; // timestamp
  group: string; // 群組名，例如「返工」「去赤柱」，預設 DEFAULT_GROUP
}

/** API 通用封裝 */
export interface ApiResponse<T> {
  type: string;
  version: string;
  generated_timestamp: string;
  data: T;
}

/** 附近車站結果 */
export interface NearbyStop {
  stop: KMBStop;
  distance: number; // 公尺
  routes: { route: string; bound: 'O' | 'I'; destTc: string }[];
}