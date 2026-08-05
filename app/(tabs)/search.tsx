// ============================================================
// 搜尋路線頁 — 輸入路線號碼 -> 選去程/回程 -> 睇車站
// 支援 KMB (九巴) + CTB (城巴/NWFB)
// ============================================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../src/utils/theme';
import { getBoundLabel } from '../../src/utils/bound';
import { useAllRoutes } from '../../src/hooks/useETA';
import { useCTBAllRoutes } from '../../src/hooks/useCTBETA';
import { RouteBadge } from '../../src/components/RouteBadge';
import type { KMBRoute, BusCompany } from '../../src/types';

/** 帶公司標籤嘅路線 */
interface RouteWithCompany extends KMBRoute {
  company: BusCompany;
}

export default function SearchScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);

  // 清空展開狀態當 query 改變
  const handleQueryChange = (text: string) => {
    setQuery(text);
    setSelectedRoute(null);
  };

  // Fetch KMB + CTB routes
  const { data: kmbRoutes, isLoading: kmbLoading } = useAllRoutes();
  const { data: ctbRoutes, isLoading: ctbLoading } = useCTBAllRoutes();

  const isLoading = kmbLoading || ctbLoading;

  // 合併路線，標記公司
  const allRoutes = useMemo<RouteWithCompany[]>(() => {
    const result: RouteWithCompany[] = [];
    if (kmbRoutes) {
      result.push(...kmbRoutes.map((r: any) => ({ ...r, company: 'KMB' as BusCompany })));
    }
    if (ctbRoutes) {
      result.push(...ctbRoutes.map((r: any) => ({ ...r, company: 'CTB' as BusCompany })));
    }
    return result;
  }, [kmbRoutes, ctbRoutes]);

  // Client-side filter
  const filteredRoutes = useMemo(() => {
    if (!query.trim() || query.trim().length < 1) return [];
    const q = query.trim().toUpperCase();
    return allRoutes.filter((r) => r.route.startsWith(q));
  }, [allRoutes, query]);

  // 按路線號碼 + 公司分組 (避免 KMB 73X 同 CTB 73 撈亂)
  const routeGroups = useMemo(() => {
    const map = new Map<string, RouteWithCompany[]>();
    for (const r of filteredRoutes) {
      const key = `${r.route}_${r.company}`;
      const existing = map.get(key) ?? [];
      existing.push(r);
      map.set(key, existing);
    }
    return Array.from(map.entries()).map(([key, bounds]) => ({
      route: bounds[0].route,
      bounds,
      company: bounds[0].company,
    }));
  }, [filteredRoutes]);

  const handleRouteTap = (routeNum: string) => {
    setSelectedRoute(selectedRoute === routeNum ? null : routeNum);
  };

  const handleBoundTap = (route: RouteWithCompany) => {
    Keyboard.dismiss();
    // 根據公司決定導航目標
    if (route.company === 'KMB') {
      router.push({
        pathname: '/route/[route]',
        params: {
          route: route.route,
          bound: route.bound,
          st: route.service_type,
          company: 'KMB',
          origTc: route.orig_tc,
          destTc: route.dest_tc,
          origEn: route.orig_en,
          destEn: route.dest_en,
        },
      });
    } else {
      router.push({
        pathname: '/route/[route]',
        params: {
          route: route.route,
          bound: route.bound,
          st: route.service_type,
          company: 'CTB',
          origTc: route.orig_tc,
          destTc: route.dest_tc,
          origEn: route.orig_en,
          destEn: route.dest_en,
        },
      });
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}>
      {/* 搜尋欄 */}
      <View
        style={[
          styles.searchBar,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
        ]}>
        <Ionicons
          name="search"
          size={20}
          color={theme.colors.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder="輸入巴士路線號碼，例如 1A"
          placeholderTextColor={theme.colors.textSecondary}
          value={query}
          onChangeText={handleQueryChange}
          keyboardType="numbers-and-punctuation"
          returnKeyType="search"
          autoCapitalize="characters"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons
              name="close-circle"
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Loading */}
      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingHint, { color: theme.colors.textSecondary }]}>
            載入路線資料...
          </Text>
        </View>
      )}

      {/* 搜尋結果 */}
      <FlatList
        data={routeGroups}
        keyExtractor={(item) => `${item.route}_${item.company}`}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <View
            style={[
              styles.routeCard,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}>
            {/* 路線號碼 header */}
            <TouchableOpacity
              style={styles.routeHeader}
              onPress={() => handleRouteTap(item.route)}>
              <RouteBadge
                route={item.route}
                company={item.company}
                destTc={`${item.bounds[0]?.orig_tc ?? ''} ↔ ${item.bounds[0]?.dest_tc ?? ''}`}
              />
              <Ionicons
                name={selectedRoute === item.route ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>

            {/* 去程/回程選項（展開時） */}
            {selectedRoute === item.route && (
              <View style={styles.boundContainer}>
                {item.bounds.map((bound, idx) => (
                  <TouchableOpacity
                    key={`${bound.bound}-${bound.service_type}-${bound.company}`}
                    style={[
                      styles.boundItem,
                      {
                        backgroundColor: theme.colors.primaryLight,
                        borderColor: theme.colors.primary,
                      },
                    ]}
                    onPress={() => handleBoundTap(bound)}>
                    <View style={styles.boundHeader}>
                      <Text style={styles.boundLabel}>
                        {getBoundLabel(bound.bound as 'O' | 'I', bound.company)}
                      </Text>
                      <Text style={[styles.companyLabel, { color: theme.colors.textSecondary }]}>
                        {bound.company === 'CTB' ? '城巴' : '九巴'}
                      </Text>
                    </View>
                    <Text style={[styles.boundDest, { color: theme.colors.text }]}>
                      {bound.orig_tc} → {bound.dest_tc}
                    </Text>
                    {bound.service_type !== '1' && (
                      <Text style={[styles.boundRemark, { color: theme.colors.warning }]}>
                        特別班次
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          !isLoading && query.trim().length >= 1 ? (
            <View style={styles.center}>
              <Text style={{ color: theme.colors.textSecondary }}>
                找不到路線「{query.trim()}」
              </Text>
              <Text style={[styles.emptyHint, { color: theme.colors.textSecondary }]}>
                試下輸入其他號碼，例如 1A、5B、A11
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingHint: { marginTop: 8, fontSize: 14 },
  emptyHint: { marginTop: 6, fontSize: 13, textAlign: 'center' },
  list: { padding: 12 },
  routeCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  boundContainer: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 8,
  },
  boundItem: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  boundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boundLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A7AF5',
    marginBottom: 2,
  },
  companyLabel: {
    fontSize: 11,
  },
  boundDest: {
    fontSize: 14,
    fontWeight: '500',
  },
  boundRemark: {
    fontSize: 12,
    marginTop: 2,
  },
});