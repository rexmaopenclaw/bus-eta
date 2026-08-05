// ============================================================
// GPS / 地理位置工具
// ============================================================

import type { KMBStop, NearbyStop } from '../types';

/**
 * Haversine 公式計算兩點距離（公尺）
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000; // 地球半徑（公尺）
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * 找出最近 N 個巴士站
 * @param stops - 全港車站列表
 * @param lat - 用戶緯度
 * @param lng - 用戶經度
 * @param limit - 返回數量（預設 5）
 */
export function findNearestStops(
  stops: KMBStop[],
  lat: number,
  lng: number,
  limit: number = 5,
): { stop: KMBStop; distance: number }[] {
  const withDistance = stops.map((stop) => ({
    stop,
    distance: haversineDistance(lat, lng, Number(stop.lat), Number(stop.long)),
  }));

  withDistance.sort((a, b) => a.distance - b.distance);
  return withDistance.slice(0, limit);
}

/**
 * 格式化距離顯示
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} 公尺`;
  }
  return `${(meters / 1000).toFixed(1)} 公里`;
}