// ============================================================
// 車站 ETA 頁 — 顯示該站未來班車到站時間
// 支援 KMB (九巴) + CTB (城巴/NWFB)
// 可點擊車站名切換同一路線嘅其他車站
// 加入收藏時可揀群組
// ============================================================

import React, { useCallback, useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../src/utils/theme';
import { getBoundLabel } from '../../src/utils/bound';
import { useStopETA, useRouteStops as useKMBRouteStops, useAllStops } from '../../src/hooks/useETA';
import { useCTBRouteStops, useCTBStopETA } from '../../src/hooks/useCTBETA';
import { useFavoritesStore } from '../../src/store/favorites';
import { ETACard } from '../../src/components/ETACard';
import { RouteBadge } from '../../src/components/RouteBadge';
import { DEFAULT_GROUP } from '../../src/types';
import type { KMBETA, RouteStopDetail, BusCompany } from '../../src/types';

export default function StopETAScreen() {
  const { stopId, route, bound, st, company: compParam } = useLocalSearchParams<{
    stopId: string;
    route?: string;
    bound?: string;
    st?: string;
    company?: string;
  }>();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const b = (bound as 'O' | 'I') ?? 'O';
  const serviceType = st ?? '1';
  const company = (compParam as BusCompany) ?? 'KMB';
  const hasRouteContext = !!route; // 有冇 route/bound/company 參數

  // If no route context, show route picker for the stop
  if (!hasRouteContext) {
    return <StopRoutePicker stopId={stopId!} />;
  }

  // === 路線車站資料 ===
  const { data: kmbRouteStops } = useKMBRouteStops(company === 'KMB' ? route! : '');
  const { data: ctbRouteStops } = useCTBRouteStops(company === 'CTB' ? route! : '');
  const routeStops = company === 'KMB' ? kmbRouteStops : ctbRouteStops;

  // 按 bound + service_type 過濾 + 排序
  const routeStopList = useMemo(() => {
    if (!routeStops) return [];
    return routeStops
      .filter((s: RouteStopDetail) => s.bound === b && String(s.service_type) === serviceType)
      .sort((a: RouteStopDetail, b: RouteStopDetail) => a.seq - b.seq);
  }, [routeStops, b, serviceType]);

  // 搵出當前車站嘅 seq 同詳細資料
  const currentStopInfo = useMemo(() => {
    return routeStopList.find((s: RouteStopDetail) => s.stop === stopId) ?? null;
  }, [routeStopList, stopId]);

  // === ETA ===
  const {
    data: kmbEtas,
    isLoading: kmbLoading,
    error: kmbError,
    refetch: kmbRefetch,
    isRefetching: kmbRefetching,
  } = useStopETA(company === 'KMB' ? stopId! : '', route!, serviceType, company === 'KMB');

  const {
    data: ctbEtas,
    isLoading: ctbLoading,
    error: ctbError,
    refetch: ctbRefetch,
    isRefetching: ctbRefetching,
  } = useCTBStopETA(company === 'CTB' ? stopId! : '', route!, b, null, company === 'CTB');

  const etas = company === 'KMB' ? kmbEtas : ctbEtas;
  const isLoading = company === 'KMB' ? kmbLoading : ctbLoading;
  const error = company === 'KMB' ? kmbError : ctbError;
  const refetch = company === 'KMB' ? kmbRefetch : ctbRefetch;
  const isRefetching = company === 'KMB' ? kmbRefetching : ctbRefetching;

  // 收藏相關
  const favorites = useFavoritesStore();

  // 從附近車站入嚟（冇 route context）時嘅 route picker 已經喺上面 return 咗
  // 以下係正常有 route context 嘅顯示
  const favId = `${company}-${route}-${b}-${stopId}`;
  const isFav = favorites.isFavorite(favId);

  // Group picker modal
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [newGroupInput, setNewGroupInput] = useState('');

  const doAddFavorite = useCallback((group: string) => {
    if (!currentStopInfo) return;
    favorites.add({
      id: favId,
      group,
      company,
      route: route!,
      bound: b,
      service_type: serviceType,
      stopId: stopId!,
      stopNameTc: currentStopInfo.name_tc,
      stopNameEn: currentStopInfo.name_en,
      routeOrigTc: '',
      routeDestTc: '',
      routeOrigEn: '',
      routeDestEn: '',
      addedAt: Date.now(),
    });
    setShowGroupPicker(false);
  }, [currentStopInfo, favId, company, route, b, serviceType, stopId, favorites]);

  const toggleFavorite = useCallback(() => {
    if (!currentStopInfo) return;
    if (isFav) {
      favorites.remove(favId);
    } else {
      setShowGroupPicker(true);
    }
  }, [currentStopInfo, isFav, favId, favorites]);

  // Modal 控制
  const [showStopPicker, setShowStopPicker] = useState(false);

  // 篩選出未來班次，最多 3 班
  const stopETAs: KMBETA[] = useMemo(() => {
    if (!etas) return [];
    return etas.slice(0, 3);
  }, [etas]);

  // 如果冇 route context 就顯示 route picker
  // （上面已經 return 咗，呢度係正常 ETA 頁）
  if (!hasRouteContext) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 車站資訊 header */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border },
        ]}>
        <View style={styles.headerRow}>
          <RouteBadge route={route!} company={company} />
          <TouchableOpacity onPress={toggleFavorite} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons
              name={isFav ? 'star' : 'star-outline'}
              size={24}
              color={isFav ? theme.colors.warning : theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* 可點擊切換車站 */}
        <TouchableOpacity
          style={styles.stopNameRow}
          onPress={() => setShowStopPicker(true)}
          activeOpacity={0.6}>
          <View style={styles.stopNameContent}>
            <Text style={[styles.stopName, { color: theme.colors.text }]} numberOfLines={1}>
              {currentStopInfo?.name_tc ?? '載入中...'}
            </Text>
            <Text style={[styles.stopNameEn, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {currentStopInfo?.name_en ?? ''}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} style={styles.chevron} />
        </TouchableOpacity>

        <Text style={[styles.boundLabel, { color: theme.colors.primary }]}>
          {getBoundLabel(b, company)}
          {' · '}{company === 'CTB' ? '城巴' : '九巴'}
        </Text>
      </View>

      {/* ETA 內容 */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.error }}>載入到站時間失敗</Text>
        </View>
      ) : (
        <FlatList
          data={stopETAs}
          keyExtractor={(item, idx) => `${item.seq}-${idx}`}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={theme.colors.primary}
            />
          }
          ListHeaderComponent={
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>未來班次</Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="time-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                此站暫無到站時間
              </Text>
              <Text style={[styles.emptyHint, { color: theme.colors.textSecondary }]}>
                可能已過服務時間，或該路線不經此站
              </Text>
            </View>
          }
          renderItem={({ item }) => <ETACard eta={item} />}
        />
      )}

      {/* 群組選擇 Modal（加入收藏時顯示） */}
      <Modal
        visible={showGroupPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGroupPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowGroupPicker(false)}>
          <Pressable
            style={[styles.groupModal, { backgroundColor: theme.colors.card }]}
            onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.groupModalTitle, { color: theme.colors.text }]}>
              加入收藏到群組
            </Text>
            <Text style={[styles.groupModalSub, { color: theme.colors.textSecondary }]}>
              {route} · {currentStopInfo?.name_tc}
            </Text>

            {/* 現有群組 */}
            {favorites.getGroups().map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.groupOption, { borderColor: theme.colors.border }]}
                onPress={() => doAddFavorite(g)}>
                <Ionicons name="folder-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.groupOptionText, { color: theme.colors.text }]}>{g}</Text>
              </TouchableOpacity>
            ))}

            {/* 新增群組 */}
            <View style={[styles.newGroupRow, { borderColor: theme.colors.border }]}>
              <TextInput
                style={[styles.newGroupInput, { color: theme.colors.text }]}
                placeholder="新增群組名稱"
                placeholderTextColor={theme.colors.textSecondary}
                value={newGroupInput}
                onChangeText={setNewGroupInput}
              />
              <TouchableOpacity
                style={[styles.newGroupBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  const name = newGroupInput.trim();
                  if (name) {
                    doAddFavorite(name);
                    setNewGroupInput('');
                  }
                }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>新增</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 車站選擇 Modal */}
      <Modal
        visible={showStopPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStopPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowStopPicker(false)}>
          <Pressable
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.card, paddingBottom: insets.bottom },
            ]}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              {route} · 選擇車站
            </Text>
            <FlatList
              data={routeStopList}
              keyExtractor={(item) => `${item.seq}-${item.stop}`}
              style={styles.modalList}
              renderItem={({ item }) => {
                const isCurrent = item.stop === stopId;
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      isCurrent && { backgroundColor: theme.colors.primaryLight },
                    ]}
                    onPress={() => {
                      setShowStopPicker(false);
                      router.replace({
                        pathname: '/stop/[stopId]',
                        params: {
                          stopId: item.stop,
                          route: route,
                          bound: b,
                          st: serviceType,
                          company,
                        },
                      });
                    }}
                    activeOpacity={0.6}>
                    <View style={[styles.modalItemDot, {
                      backgroundColor: isCurrent ? theme.colors.primary : theme.colors.textSecondary,
                    }]}>
                      <Text style={styles.modalItemDotText}>{item.seq}</Text>
                    </View>
                    <View style={styles.modalItemText}>
                      <Text style={[styles.modalItemName, {
                        color: theme.colors.text,
                        fontWeight: isCurrent ? '700' : '400',
                      }]}>
                        {item.name_tc}
                      </Text>
                      <Text style={[styles.modalItemNameEn, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {item.name_en}
                      </Text>
                    </View>
                    {isCurrent && (
                      <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ============================================================
// StopRoutePicker — 從附近車站入嚟時揀路線
// ============================================================
function StopRoutePicker({ stopId }: { stopId: string }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { data: stopsRecord } = useAllStops();

  const stopInfo = stopsRecord?.[stopId];
  const routes = useMemo(() => {
    if (!stopInfo || !('routes' in stopInfo)) return [];
    return (stopInfo.routes ?? []).slice(0, 20);
  }, [stopInfo]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <View style={styles.stopNameContent}>
          <Text style={[styles.stopName, { color: theme.colors.text }]}>
            {stopInfo?.name_tc ?? '載入中...'}
          </Text>
          <Text style={[styles.stopNameEn, { color: theme.colors.textSecondary }]}>
            {stopInfo?.name_en ?? ''}
          </Text>
        </View>
        <Text style={[styles.pickerHint, { color: theme.colors.textSecondary }]}>
          {stopId}
        </Text>
      </View>

      <FlatList
        data={routes}
        keyExtractor={(r) => r}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            此站途經路線
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="bus-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              載入路線資料中...
            </Text>
          </View>
        }
        renderItem={({ item: routeNum }) => (
          <TouchableOpacity
            style={[styles.routeCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={() =>
              router.push({
                pathname: '/stop/[stopId]',
                params: { stopId, route: routeNum, bound: 'O', st: '1', company: 'KMB' },
              })
            }
            activeOpacity={0.7}>
            <View style={[styles.routeBadgeInList, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.routeBadgeInListText}>{routeNum}</Text>
            </View>
            <Text style={[styles.routeCardText, { color: theme.colors.text }]}>
              九巴 {routeNum}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stopNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  stopNameContent: { flex: 1 },
  stopName: { fontSize: 20, fontWeight: '700' },
  stopNameEn: { fontSize: 13, marginTop: 2 },
  chevron: { marginLeft: 6 },
  boundLabel: { fontSize: 13, fontWeight: '600', marginTop: 6 },
  list: { padding: 14, paddingBottom: 40 },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 16, fontWeight: '500', marginTop: 12 },
  emptyHint: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingTop: 8,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', paddingHorizontal: 20, marginBottom: 8 },
  modalList: { paddingHorizontal: 16 },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  modalItemDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalItemDotText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  modalItemText: { flex: 1 },
  modalItemName: { fontSize: 15, fontWeight: '500' },
  modalItemNameEn: { fontSize: 12, marginTop: 1 },
  // Group picker modal styles
  groupModal: {
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 20,
    marginBottom: 80,
  },
  groupModalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  groupModalSub: { fontSize: 13, marginBottom: 14, opacity: 0.7 },
  groupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 6,
    gap: 8,
  },
  groupOptionText: { fontSize: 15, fontWeight: '500' },
  newGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 4,
    marginTop: 4,
    gap: 4,
  },
  newGroupInput: {
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  newGroupBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pickerHint: { fontSize: 12, marginTop: 4 },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  routeBadgeInList: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  routeBadgeInListText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  routeCardText: { flex: 1, fontSize: 15, fontWeight: '500' },
});