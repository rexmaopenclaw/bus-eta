// ============================================================
// 路線詳情頁 — 顯示所有車站列表（順序）
// 支援 KMB (九巴) + CTB (城巴)
// 用靜態 API (winstonma GitHub Pages)，一次過有車站名 + 坐標
// ============================================================

import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Text,
  RefreshControl,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAppTheme } from '../../src/utils/theme';
import { getBoundLabel } from '../../src/utils/bound';
import { getRouteFare } from '../../src/api/kmb';
import { useRouteStops as useKMBRouteStops } from '../../src/hooks/useETA';
import { useCTBRouteStops } from '../../src/hooks/useCTBETA';
import { StopListItem } from '../../src/components/StopListItem';
import { RouteBadge } from '../../src/components/RouteBadge';
import BusMap from '../../src/components/BusMap';
import type { RouteStopDetail, BusCompany } from '../../src/types';

export default function RouteDetailScreen() {
  const { route, bound, origTc, destTc, company, st } = useLocalSearchParams<{
    route: string;
    bound: string;
    origTc: string;
    destTc: string;
    company: string;
    st: string;
  }>();
  const theme = useAppTheme();
  const b = bound as 'O' | 'I';
  const comp = (company as BusCompany) ?? 'KMB';
  const serviceType = st ?? '1';
  const [fare, setFare] = useState<number | null>(null);

  // 車費資訊
  useEffect(() => {
    if (route) {
      getRouteFare(comp, route).then(setFare);
    }
  }, [route, comp]);

  // 按公司選擇 API
  const {
    data: kmbStops,
    isLoading: kmbLoading,
    error: kmbError,
    refetch: kmbRefetch,
    isRefetching: kmbRefetching,
  } = useKMBRouteStops(comp === 'KMB' ? route! : '');

  const {
    data: ctbStops,
    isLoading: ctbLoading,
    error: ctbError,
    refetch: ctbRefetch,
    isRefetching: ctbRefetching,
  } = useCTBRouteStops(comp === 'CTB' ? route! : '');

  const allStops = comp === 'KMB' ? kmbStops : ctbStops;
  const isLoading = comp === 'KMB' ? kmbLoading : ctbLoading;
  const error = comp === 'KMB' ? kmbError : ctbError;
  const refetch = comp === 'KMB' ? kmbRefetch : ctbRefetch;
  const isRefetching = comp === 'KMB' ? kmbRefetching : ctbRefetching;

  // 按 bound + service_type 過濾 + 按 seq 排序
  const items = useMemo(() => {
    if (!allStops) return [];
    const filtered = allStops
      .filter((s: any) => s.bound === b && String(s.service_type) === serviceType)
      .sort((a: any, b: any) => a.seq - b.seq);
    return filtered.map((s: any, idx: number) => ({
      ...s,
      isFirst: idx === 0,
      isLast: idx === filtered.length - 1,
    }));
  }, [allStops, b, serviceType]);

  const handleStopPress = (stopId: string) => {
    router.push({
      pathname: '/stop/[stopId]',
      params: { stopId, route: route, bound: b, st: serviceType, company: comp },
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          載入車站資料...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.error }}>載入車站資料失敗</Text>
        <Text style={[styles.errorHint, { color: theme.colors.textSecondary }]}>
          {error instanceof Error ? error.message : '請稍後再試'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 路線資訊 header */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border },
        ]}>
        <RouteBadge
          route={route!}
          company={comp}
          destTc={
            comp === 'CTB'
              ? `${origTc ?? ''} → ${destTc ?? ''}`
              : b === 'O'
                ? `${origTc ?? ''} → ${destTc ?? ''}`
                : `${destTc ?? ''} → ${origTc ?? ''}`
          }
        />
        <Text style={[styles.boundText, { color: theme.colors.textSecondary }]}>
          {getBoundLabel(b, comp)}
          {' · '}{items.length} 個站
          {' · '}{comp === 'CTB' ? '城巴' : '九巴'}
          {fare !== null ? ` · $${fare}` : ''}
          {serviceType !== '1' ? ` · 特別班次` : ''}
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => `${item.seq}-${item.stop}`}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.mapSection}>
            <Text style={[styles.routeMapLabel, { color: theme.colors.textSecondary }]}>路線圖</Text>
            <BusMap stops={items} height={280} route={route} bound={b} company={comp} />
          </View>
        }
        renderItem={({ item }) => (
          <StopListItem
            seq={item.seq}
            nameTc={item.name_tc}
            nameEn={item.name_en}
            isFirst={item.isFirst}
            isLast={item.isLast}
            fare={fare}
            company={comp}
            onPress={() => handleStopPress(item.stop)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorHint: { marginTop: 6, fontSize: 13, textAlign: 'center' },
  header: {
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  boundText: { fontSize: 13, marginTop: 4 },
  mapSection: {
    padding: 14,
    paddingBottom: 4,
  },
  routeMapLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  list: { paddingBottom: 24 },
});