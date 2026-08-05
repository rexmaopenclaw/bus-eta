// ============================================================
// React Query Hooks — 巴士數據查詢
// 靜態數據（路線/車站）：用 winstonma GitHub Pages
// 即時 ETA：用官方 KMB OpenData
// ============================================================

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as kmb from '../api/kmb';
import type { KMBRoute, KMBStop, KMBETA, KMBRouteStop, RouteStopDetail } from '../types';

// ----- Query Key Factory -----
export const busKeys = {
  all: ['bus'] as const,
  routes: (route?: string) => ['bus', 'routes', route] as const,
  routeStops: (route: string) => ['bus', 'routeStops', route] as const,
  stop: (stopId: string) => ['bus', 'stop', stopId] as const,
  eta: (route: string, bound: string, st: string) =>
    ['bus', 'eta', route, bound, st] as const,
  stopEta: (stopId: string, route: string, st: string) =>
    ['bus', 'stopEta', stopId, route, st] as const,
  allStops: () => ['bus', 'allStops'] as const,
} as const;

// ----- Hooks -----

/** 取得所有路線（快取 5 分鐘，用 client-side filter 搜尋） */
export function useAllRoutes() {
  return useQuery<KMBRoute[]>({
    queryKey: busKeys.routes(),
    queryFn: () => kmb.getRoutes(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/** 搜尋路線（client-side filter，唔使每次重新 fetch） */
export function useRoutes(routeNumber?: string) {
  const { data: allRoutes, ...rest } = useAllRoutes();

  const filteredData = useMemo(() => {
    if (!allRoutes || !routeNumber) return allRoutes;
    return allRoutes.filter((r: KMBRoute) => r.route.startsWith(routeNumber.toUpperCase()));
  }, [allRoutes, routeNumber]);

  return { data: filteredData, ...rest };
}

/** 取得路線車站（含車站名 + 坐標，用靜態數據） */
export function useRouteStops(route: string) {
  return useQuery<RouteStopDetail[]>({
    queryKey: busKeys.routeStops(route),
    queryFn: async () => {
      const stops = await kmb.getRouteStopsStatic(route);
      // 轉做 RouteStopDetail 格式
      return stops.map((s) => ({
        route: s.route,
        bound: s.bound as 'O' | 'I',
        service_type: s.service_type,
        seq: Number(s.seq),
        stop: s.stop,
        name_tc: s.name_tc,
        name_en: s.name_en,
        name_sc: s.name_sc,
        lat: s.lat,
        long: s.long,
      }));
    },
    staleTime: 24 * 60 * 60 * 1000, // 每日更新一次
    gcTime: 24 * 60 * 60 * 1000,
    enabled: !!route,
  });
}

/** 取得單一車站資料 */
export function useStop(stopId: string) {
  return useQuery<KMBStop>({
    queryKey: busKeys.stop(stopId),
    queryFn: () => kmb.getStop(stopId),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    enabled: !!stopId,
  });
}

/** 取得路線 ETA（每 30 秒自動 polling，用 route-eta 端點） */
export function useRouteETA(
  route: string,
  bound: 'O' | 'I',
  serviceType: string = '1',
  enabled: boolean = true,
) {
  return useQuery<KMBETA[]>({
    queryKey: busKeys.eta(route, bound, serviceType),
    queryFn: () => kmb.getRouteETA(route, bound, serviceType),
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    refetchInterval: enabled ? 30 * 1000 : false,
    enabled,
  });
}

/** 取得車站 ETA（每 30 秒自動 polling，用 eta/{stopId}/{route}/{st} 端點） */
export function useStopETA(
  stopId: string,
  route: string,
  serviceType: string = '1',
  enabled: boolean = true,
) {
  return useQuery<KMBETA[]>({
    queryKey: busKeys.stopEta(stopId, route, serviceType),
    queryFn: () => kmb.getStopETA(stopId, route, serviceType),
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    refetchInterval: enabled ? 30 * 1000 : false,
    enabled,
  });
}

/** 取得所有車站（含 routes 字段，用靜態數據） */
export function useAllStops() {
  return useQuery<Record<string, KMBStop & { routes: string[] }>>({
    queryKey: busKeys.allStops(),
    queryFn: async () => {
      const data = await kmb.getAllStopsStatic();
      return data;
    },
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}