// ============================================================
// 附近車站頁 — GPS 定位 → 最近 5 個車站
// Browser：用 HTML5 Geolocation API
// Native：用 expo-location
// ============================================================

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../src/utils/theme';
import { useAllStops } from '../../src/hooks/useETA';
import { haversineDistance, formatDistance } from '../../src/utils/location';
import { getCurrentPosition } from '../../src/utils/geolocation';
import type { KMBStop } from '../../src/types';

export default function NearbyScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locating, setLocating] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showManualSearch, setShowManualSearch] = useState(false);

  // 所有車站（靜態 API，含 routes 資料）
  const { data: stopsRecord, isLoading: stopsLoading } = useAllStops();

  // 轉成 array 方便計算
  const allStops = useMemo<KMBStop[]>(() => {
    if (!stopsRecord) return [];
    const values = Object.values(stopsRecord) as (KMBStop & { routes: string[] })[];
    return values.map((s) => ({
      stop: s.stop,
      name_en: s.name_en,
      name_tc: s.name_tc,
      name_sc: s.name_sc,
      lat: s.lat,
      long: s.long,
    }));
  }, [stopsRecord]);

  // 取得 GPS 位置（跨平台）
  useEffect(() => {
    (async () => {
      try {
        const pos = await getCurrentPosition();
        setLocation({ lat: pos.lat, lng: pos.lng });
      } catch (err: any) {
        setLocationError(err.message || '無法取得位置');
      } finally {
        setLocating(false);
      }
    })();
  }, []);

  // 計算最近車站（Haversine）
  const nearestStops = useMemo(() => {
    if (!location || !allStops.length) return [];

    const withDistance = allStops.map((stop) => ({
      stop,
      distance: haversineDistance(
        location.lat,
        location.lng,
        Number(stop.lat),
        Number(stop.long),
      ),
    }));

    withDistance.sort((a, b) => a.distance - b.distance);
    return withDistance.slice(0, 5);
  }, [location, allStops]);

  // 手動搜尋結果
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !allStops.length) return [];
    const q = searchQuery.trim().toLowerCase();
    return allStops.filter((s) =>
      s.name_tc.includes(q) || s.name_en.toLowerCase().includes(q) || s.name_sc.includes(q),
    ).slice(0, 30);
  }, [searchQuery, allStops]);

  // 顯示 loading
  if (locating || stopsLoading) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: theme.colors.background, paddingTop: insets.top },
        ]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          {locating ? '正在定位...' : '載入車站資料...'}
        </Text>
      </View>
    );
  }

  // 顯示錯誤（GPS 定位失敗）
  if (locationError) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background, paddingTop: insets.top },
        ]}>
        {/* 手動搜尋模式 */}
        {showManualSearch ? (
          <>
            <View
              style={[
                styles.searchHeader,
                { borderBottomColor: theme.colors.border },
              ]}>
              <TouchableOpacity onPress={() => setShowManualSearch(false)}>
                <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              <TextInput
                style={[
                  styles.searchInput,
                  {
                    backgroundColor: theme.colors.card,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                placeholder="輸入車站名稱（中/英）..."
                placeholderTextColor={theme.colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.stop}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: '/stop/[stopId]',
                      params: { stopId: item.stop },
                    })
                  }
                  activeOpacity={0.7}>
                  <View style={styles.cardCenter}>
                    <Text style={[styles.stopName, { color: theme.colors.text }]}>
                      {item.name_tc}
                    </Text>
                    <Text
                      style={[
                        styles.stopNameEn,
                        { color: theme.colors.textSecondary },
                      ]}
                      numberOfLines={1}>
                      {item.name_en}
                    </Text>
                  </View>
                  <View style={styles.cardRight}>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={theme.colors.textSecondary}
                    />
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={{ color: theme.colors.textSecondary }}>
                    {searchQuery.trim()
                      ? '無符合嘅車站，試下其他關鍵字'
                      : '輸入車站名稱搜尋'}
                  </Text>
                </View>
              }
            />
          </>
        ) : (
          /* GPS 定位失敗頁面 */
          <View style={styles.center}>
            <Ionicons name="location" size={48} color={theme.colors.error} />
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {locationError}
            </Text>
            {Platform.OS !== 'web' && (
              <TouchableOpacity
                style={[
                  styles.settingsBtn,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={() => {
                  if (Platform.OS === 'ios') {
                    Linking.openURL('app-settings:');
                  } else {
                    Linking.openSettings();
                  }
                }}>
                <Text style={styles.settingsBtnText}>開啟位置權限</Text>
              </TouchableOpacity>
            )}
            {Platform.OS === 'web' && (
              <TouchableOpacity
                style={[
                  styles.settingsBtn,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={() => {
                  setLocating(true);
                  setLocationError(null);
                  getCurrentPosition()
                    .then((pos) => setLocation({ lat: pos.lat, lng: pos.lng }))
                    .catch((err) => setLocationError(err.message))
                    .finally(() => setLocating(false));
                }}>
                <Text style={styles.settingsBtnText}>再試一次</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.settingsBtn,
                { backgroundColor: theme.colors.card, marginTop: 12, borderWidth: 1, borderColor: theme.colors.primary },
              ]}
              onPress={() => setShowManualSearch(true)}>
              <Text style={[styles.settingsBtnText, { color: theme.colors.primary }]}>
                🔍 手動搜尋車站
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          附近車站 📍
        </Text>
        {location && (
          <Text style={[styles.coordText, { color: theme.colors.textSecondary }]}>
            {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </Text>
        )}
      </View>

      <FlatList
        data={nearestStops}
        keyExtractor={(item) => item.stop.stop}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <NearbyStopCard
            stopId={item.stop.stop}
            nameTc={item.stop.name_tc}
            nameEn={item.stop.name_en}
            distance={item.distance}
            rank={index + 1}
            stopsRecord={stopsRecord ?? {}}
          />
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ color: theme.colors.textSecondary }}>
              附近暫無車站資料
            </Text>
          </View>
        }
      />
    </View>
  );
}

/** 附近車站卡片 */
function NearbyStopCard({
  stopId,
  nameTc,
  nameEn,
  distance,
  rank,
  stopsRecord,
}: {
  stopId: string;
  nameTc: string;
  nameEn: string;
  distance: number;
  rank: number;
  stopsRecord: Record<string, KMBStop & { routes: string[] }>;
}) {
  const theme = useAppTheme();

  const routes = useMemo(() => {
    const s = stopsRecord[stopId];
    if (!s || !('routes' in s)) return [];
    return s.routes ?? [];
  }, [stopsRecord, stopId]);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
      ]}
      onPress={() =>
        router.push({ pathname: '/stop/[stopId]', params: { stopId } })
      }
      activeOpacity={0.7}>
      <View style={styles.cardLeft}>
        <Text style={[styles.rankText, { color: theme.colors.primary }]}>
          #{rank}
        </Text>
      </View>
      <View style={styles.cardCenter}>
        <Text style={[styles.stopName, { color: theme.colors.text }]}>
          {nameTc}
        </Text>
        <Text
          style={[styles.stopNameEn, { color: theme.colors.textSecondary }]}
          numberOfLines={1}>
          {nameEn}
        </Text>
        {/* 路線徽章 */}
        {routes.length > 0 && (
          <View style={styles.routeRow}>
            {routes.slice(0, 5).map((r: string) => (
              <TouchableOpacity
                key={r}
                style={[styles.miniBadge, { backgroundColor: theme.colors.primary }]}
                onPress={() => router.push({ pathname: "/route/[route]", params: { route: r } })}>
                <Text style={styles.miniBadgeText}>{r}</Text>
              </TouchableOpacity>
            ))}
            {routes.length > 5 && (
              <Text style={[styles.moreText, { color: theme.colors.textSecondary }]}>
                +{routes.length - 5}
              </Text>
            )}
          </View>
        )}
      </View>
      <View style={styles.cardRight}>
        <Ionicons name="walk" size={18} color={theme.colors.primary} />
        <Text style={[styles.distText, { color: theme.colors.textSecondary }]}>
          {formatDistance(distance)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontSize: 15 },
  errorText: { marginTop: 12, fontSize: 15, textAlign: 'center' },
  settingsBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 16 },
  settingsBtnText: { color: '#FFFFFF', fontWeight: '600' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  coordText: { fontSize: 12 },
  list: { padding: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  cardLeft: { marginRight: 12 },
  rankText: { fontSize: 16, fontWeight: '700' },
  cardCenter: { flex: 1 },
  stopName: { fontSize: 15, fontWeight: '600' },
  stopNameEn: { fontSize: 12, marginTop: 1 },
  routeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  miniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  moreText: { fontSize: 12, alignSelf: 'center' },
  cardRight: { alignItems: 'center', marginLeft: 8 },
  distText: { fontSize: 12, marginTop: 2 },
});
