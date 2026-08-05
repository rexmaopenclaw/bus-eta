// ============================================================
// React Query Hooks — 城巴 CTB 數據查詢
// 靜態數據（路線/車站）：用 winstonma GitHub Pages
// 即時 ETA：用官方 CTB OpenData（rt.data.gov.hk）
// ============================================================

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as ctb from '../api/ctb';
import type { KMBRoute, KMBStop, KMBETA, RouteStopDetail } from '../types';

// ----- Query Key Factory -----
export const ctbKeys = {
  all: ['ctb'] as const,
  routes: () => ['ctb', 'routes'] as const,
  routeStops: (route: string) => ['ctb', 'routeStops', route] as const,
  stop: (stopId: string) => ['ctb', 'stop', stopId] as const,
  routeEta: (route: string, bound: string) =>
    ['ctb', 'routeEta', route, bound] as const,
  stopEta: (stopId: string, route: string, bound: string) =>
    ['ctb', 'stopEta', stopId, route, bound] as const,
  allStops: () => ['ctb', 'allStops'] as const,
} as const;

// ----- Hooks -----

/** 取得所有 CTB 路線（快取 5 分鐘，用靜態數據） */
export function useCTBAllRoutes() {
  return useQuery<KMBRoute[]>({
    queryKey: ctbKeys.routes(),
    queryFn: () => ctb.getRoutes(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/** 搜尋 CTB 路線（client-side filter） */
export function useCTBRoutes(routeNumber?: string) {
  const { data: allRoutes, ...rest } = useCTBAllRoutes();

  const filteredData = useMemo(() => {
    if (!allRoutes || !routeNumber) return allRoutes;
    return allRoutes.filter((r: KMBRoute) => r.route.startsWith(routeNumber.toUpperCase()));
  }, [allRoutes, routeNumber]);

  return { data: filteredData, ...rest };
}

/** 取得 CTB 路線車站（用靜態數據） */
export function useCTBRouteStops(route: string) {
  return useQuery<RouteStopDetail[]>({
    queryKey: ctbKeys.routeStops(route),
    queryFn: async () => {
      const stops = await ctb.getRouteStopsStatic(route);
      return stops.map((s: any) => ({
        route: s.route,
        bound: s.dir
          ? (s.dir === 'O' ? 'I' as const : 'O' as const)
          : (s.bound || 'O') as 'O' | 'I',
        service_type: s.service_type || '1',
        seq: Number(s.seq),
        stop: s.stop,
        name_tc: s.name_tc,
        name_en: s.name_en,
        name_sc: s.name_sc,
        lat: s.lat,
        long: s.long,
      }));
    },
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    enabled: !!route,
  });
}

/** 取得 CTB 路線 ETA（每 30 秒自動 polling） */
export function useCTBRouteETA(
  route: string,
  bound: 'O' | 'I',
  enabled: boolean = true,
) {
  return useQuery<KMBETA[]>({
    queryKey: ctbKeys.routeEta(route, bound),
    queryFn: () => ctb.getRouteETA(route, bound),
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    refetchInterval: enabled ? 30 * 1000 : false,
    enabled,
  });
}

/**
 * 取得 CTB 車站 ETA（stop-based endpoint）
 * 直接用 ctb.getStopETA()，唔使 fetch 全路線再 filter
 * URL: eta/CTB/{stop_id}/{route}
 */
export function useCTBStopETA(
  stopId: string,
  route: string,
  bound: 'O' | 'I',
  seq: number | null | undefined,
  enabled: boolean = true,
) {
  return useQuery<KMBETA[]>({
    queryKey: ctbKeys.stopEta(stopId, route, bound),
    queryFn: () => ctb.getStopETA(stopId, route),
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    refetchInterval: enabled ? 30 * 1000 : false,
    enabled,
  });
}

/** 取得所有 CTB 車站（用靜態數據） */
export function useCTBAllStops() {
  return useQuery<Record<string, KMBStop & { routes: string[] }>>({
    queryKey: ctbKeys.allStops(),
    queryFn: async () => {
      return ctb.getAllStopsStatic();
    },
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}