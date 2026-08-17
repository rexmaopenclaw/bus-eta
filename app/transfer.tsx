// ============================================================
// 轉乘查詢頁 — 揀兩條路線，自動搵共同轉車站，對照兩線 ETA
// 支援 KMB + CTB（跨公司用站名匹配）
// V1：並排顯示兩線喺轉車站嘅即時 ETA
// ============================================================

import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../src/utils/theme';
import { getBoundLabelShort } from '../src/utils/bound';
import { useAllRoutes } from '../src/hooks/useETA';
import { useCTBAllRoutes } from '../src/hooks/useCTBETA';
import { useRouteStops as useKMBRouteStops } from '../src/hooks/useETA';
import { useCTBRouteStops } from '../src/hooks/useCTBETA';
import { useStopETA } from '../src/hooks/useETA';
import { useCTBStopETA } from '../src/hooks/useCTBETA';
import { RouteBadge } from '../src/components/RouteBadge';
import { parseETA, formatTime } from '../src/utils/time';
import type { KMBRoute, RouteStopDetail, BusCompany, TransferRouteSel } from '../src/types';
import { useTransferFavsStore, comboId } from '../src/store/transferFavs';

interface RouteSel extends TransferRouteSel {}

interface CommonStop {
  stopIdA: string;
  stopIdB: string;
  boundA: 'O' | 'I';
  boundB: 'O' | 'I';
  nameTc: string;
  nameEn: string;
  seqA: number;
  seqB: number;
}

// ============================================================
// 路線揀選 Modal（搜尋 + 方向）
// ============================================================
function RoutePickerModal({
  visible,
  title,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSelect: (sel: RouteSel) => void;
}) {
  const theme = useAppTheme();
  const [query, setQuery] = useState('');

  const { data: kmbRoutes } = useAllRoutes();
  const { data: ctbRoutes } = useCTBAllRoutes();

  const allRoutes = useMemo(() => {
    const result: (KMBRoute & { company: BusCompany })[] = [];
    if (kmbRoutes) result.push(...kmbRoutes.map((r: any) => ({ ...r, company: 'KMB' as BusCompany })));
    if (ctbRoutes) result.push(...ctbRoutes.map((r: any) => ({ ...r, company: 'CTB' as BusCompany })));
    return result;
  }, [kmbRoutes, ctbRoutes]);

  const routeGroups = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toUpperCase();
    const map = new Map<string, (KMBRoute & { company: BusCompany })[]>();
    for (const r of allRoutes) {
      if (!r.route.startsWith(q)) continue;
      const key = `${r.route}_${r.company}`;
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([key, bounds]) => ({
      route: bounds[0].route,
      bounds,
      company: bounds[0].company,
    }));
  }, [allRoutes, query]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.pickerModal, { backgroundColor: theme.colors.card }]}
          onPress={(e) => e.stopPropagation()}>
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, { color: theme.colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
            ]}>
            <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="輸入路線號碼，例如 299X"
              placeholderTextColor={theme.colors.textSecondary}
              value={query}
              onChangeText={(t) => {
                setQuery(t);
              }}
              autoFocus
              autoCapitalize="characters"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={routeGroups}
            keyExtractor={(item) => `${item.route}_${item.company}`}
            keyboardShouldPersistTaps="handled"
            style={styles.pickerList}
            ListEmptyComponent={
              <View style={styles.pickerEmpty}>
                <Text style={{ color: theme.colors.textSecondary }}>
                  {query.trim() ? '沒有找到相關路線' : '輸入路線號碼開始搜尋'}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              // 預設揀第一個常規班次方向
              const bound = item.bounds.find((b) => b.service_type === '1') ?? item.bounds[0];
              return (
                <TouchableOpacity
                  style={[
                    styles.pickerRouteCard,
                    { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                  ]}
                  onPress={() => {
                    onSelect({
                      route: bound.route,
                      bound: bound.bound as 'O' | 'I',
                      company: item.company,
                      serviceType: bound.service_type,
                      origTc: bound.orig_tc,
                      destTc: bound.dest_tc,
                    });
                    setQuery('');
                    onClose();
                  }}>
                  <RouteBadge
                    route={item.route}
                    company={item.company}
                    destTc={`${item.bounds[0]?.orig_tc ?? ''} → ${item.bounds[0]?.dest_tc ?? ''}`}
                  />
                  <Text style={[styles.pickerHint, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    去程/回程都會自動偵測轉車站
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ============================================================
// 地理輔助：Haversine 距離（米）+ 站名正規化
// ============================================================
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function normStopName(n: string): string {
  return n.replace(/\s*\(.*?\)\s*/g, '').trim();
}

// 一站多柱：同名站相距少於 150 米 → 當同一轉車站
const SAME_STOP_MAX_DIST_M = 150;

// ============================================================
// 單一 ETA 卡（路線 header + 班次）
// ============================================================
function TransferEtaCard({ sel, bound, etas }: { sel: RouteSel; bound: 'O' | 'I'; etas: any[] }) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.etaCard,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
      ]}>
      <View style={styles.etaCardHeader}>
        <RouteBadge route={sel.route} company={sel.company} />
        <Text style={[styles.etaCardBound, { color: theme.colors.textSecondary }]}>
          {getBoundLabelShort(bound, sel.company)}
        </Text>
        <Text style={[styles.etaCardDest, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          {sel.origTc} → {sel.destTc}
        </Text>
      </View>
      {etas.length === 0 ? (
        <Text style={[styles.noEta, { color: '#5a7a9a' as any }]}>暫無到站數據</Text>
      ) : (
        etas.map((eta, idx) => {
          const { label, minutes, isDeparted } = parseETA(eta.eta, eta.data_timestamp);
          const etaColor = isDeparted
            ? theme.colors.textSecondary
            : minutes !== null && minutes <= 3
              ? theme.colors.error
              : minutes !== null && minutes <= 10
                ? theme.colors.warning
                : theme.colors.success;
          return (
            <View key={`${eta.eta_seq}-${idx}`} style={styles.etaRow}>
              <Text style={[styles.etaDest, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {eta.dest_tc || eta.destTc || sel.destTc}
              </Text>
              <Text style={[styles.etaMinutes, { color: etaColor }]}>
                {isDeparted ? '已開出' : label}
              </Text>
              <Text style={[styles.etaClock, { color: theme.colors.textSecondary }]}>
                {formatTime(eta.eta)}
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
}

// ============================================================
// 主頁
// ============================================================
export default function TransferScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [routeA, setRouteA] = useState<RouteSel | null>(null);
  const [routeB, setRouteB] = useState<RouteSel | null>(null);
  const [pickerFor, setPickerFor] = useState<'A' | 'B' | null>(null);
  const [selectedStop, setSelectedStop] = useState<CommonStop | null>(null);

  // ---- 已儲存轉車組合 ----
  const { combos, loaded, load, add, remove, isSaved } = useTransferFavsStore();
  useEffect(() => {
    load();
  }, [load]);
  const currentSaved = routeA && routeB ? isSaved(routeA, routeB) : false;

  const handleSaveToggle = async () => {
    if (!routeA || !routeB) return;
    if (currentSaved) {
      remove(comboId(routeA, routeB));
    } else {
      await add(routeA, routeB);
    }
  };

  const loadCombo = (c: { routeA: RouteSel; routeB: RouteSel }) => {
    setRouteA(c.routeA);
    setRouteB(c.routeB);
    setSelectedStop(null);
  };

  // ---- 車站數據（top-level hooks，按公司 enabled）----
  const { data: kmbStopsA } = useKMBRouteStops(routeA && routeA.company === 'KMB' ? routeA.route : '');
  const { data: ctbStopsA } = useCTBRouteStops(routeA && routeA.company === 'CTB' ? routeA.route : '');
  const { data: kmbStopsB } = useKMBRouteStops(routeB && routeB.company === 'KMB' ? routeB.route : '');
  const { data: ctbStopsB } = useCTBRouteStops(routeB && routeB.company === 'CTB' ? routeB.route : '');

  const stopsA: RouteStopDetail[] = ((routeA?.company === 'KMB' ? kmbStopsA : ctbStopsA) ?? []) as RouteStopDetail[];
  const stopsB: RouteStopDetail[] = ((routeB?.company === 'KMB' ? kmbStopsB : ctbStopsB) ?? []) as RouteStopDetail[];

  // 按 service_type 過濾（唔理方向 — 合併晒 O/I，等用戶唔使估方向）
  const filteredA = useMemo(() => {
    if (!routeA) return [];
    return stopsA.filter((s) => String(s.service_type) === routeA.serviceType);
  }, [stopsA, routeA]);

  const filteredB = useMemo(() => {
    if (!routeB) return [];
    return stopsB.filter((s) => String(s.service_type) === routeB.serviceType);
  }, [stopsB, routeB]);

  // 搵共同轉車站（唔理方向，合併晒所有 bound）
  const commonStops = useMemo<CommonStop[]>(() => {
    if (!routeA || !routeB || filteredA.length === 0 || filteredB.length === 0) return [];

    const dist = (a: RouteStopDetail, b: RouteStopDetail) =>
      haversineMeters(parseFloat(a.lat), parseFloat(a.long), parseFloat(b.lat), parseFloat(b.long));

    // 同名（去括號）站名 → B 線所有柱
    const bByName = new Map<string, RouteStopDetail[]>();
    for (const s of filteredB) {
      const key = normStopName(s.name_tc);
      const list = bByName.get(key) ?? [];
      list.push(s);
      bByName.set(key, list);
    }

    // 對 A 線每個站，搵 B 線最啱嘅柱：
    // 1. 同一 stop ID（真正同一柱）優先
    // 2. 同名站 + 相距 < 150 米（一站多柱）
    // 3. 每個 A 站最多 match 一次；B 柱可俾唔同 A 站用（唔同位置）
    const result: CommonStop[] = [];
    for (const a of filteredA) {
      const candidates = (bByName.get(normStopName(a.name_tc)) ?? []).filter(
        (b) => b.stop === a.stop || dist(a, b) < SAME_STOP_MAX_DIST_M,
      );
      if (candidates.length === 0) continue;
      // 揀最近嗰條柱（同一 ID 距離 0，一定排最前）
      candidates.sort((x, y) => dist(a, x) - dist(a, y));
      const b = candidates[0];
      // 防重複：同一 A 柱 + 同一 B 柱唔好出兩次
      if (result.some((r) => r.stopIdA === a.stop && r.stopIdB === b.stop)) continue;
      result.push({
        stopIdA: a.stop,
        stopIdB: b.stop,
        boundA: a.bound,
        boundB: b.bound,
        nameTc: a.name_tc,
        nameEn: a.name_en,
        seqA: a.seq,
        seqB: b.seq,
      });
    }
    return result;
  }, [routeA, routeB, filteredA, filteredB]);

  // 揀咗兩線 → 自動揀第一個共同站
  useEffect(() => {
    if (commonStops.length > 0) {
      setSelectedStop((prev) => {
        if (prev && commonStops.some((s) => s.stopIdA === prev.stopIdA)) return prev;
        return commonStops[0];
      });
    } else {
      setSelectedStop(null);
    }
  }, [commonStops]);

  // ---- ETA（top-level hooks）----
  const { data: etaKmbA } = useStopETA(
    selectedStop && routeA?.company === 'KMB' ? selectedStop.stopIdA : '',
    routeA?.route ?? '',
    routeA?.serviceType ?? '1',
    !!selectedStop && !!routeA && routeA.company === 'KMB',
  );
  const { data: etaCtbA } = useCTBStopETA(
    selectedStop && routeA?.company === 'CTB' ? selectedStop.stopIdA : '',
    routeA?.route ?? '',
    selectedStop?.boundA ?? 'O',
    selectedStop?.seqA ?? null,
    !!selectedStop && !!routeA && routeA.company === 'CTB',
  );
  const { data: etaKmbB } = useStopETA(
    selectedStop && routeB?.company === 'KMB' ? selectedStop.stopIdB : '',
    routeB?.route ?? '',
    routeB?.serviceType ?? '1',
    !!selectedStop && !!routeB && routeB.company === 'KMB',
  );
  const { data: etaCtbB } = useCTBStopETA(
    selectedStop && routeB?.company === 'CTB' ? selectedStop.stopIdB : '',
    routeB?.route ?? '',
    selectedStop?.boundB ?? 'O',
    selectedStop?.seqB ?? null,
    !!selectedStop && !!routeB && routeB.company === 'CTB',
  );

  // ETA filter：只保留揀咗方向嘅班次
  const etaA = useMemo(() => {
    const raw = routeA?.company === 'KMB' ? (etaKmbA ?? []) : (etaCtbA ?? []);
    if (!selectedStop) return raw;
    return raw.filter((e: any) => e.dir === selectedStop.boundA || e.dir === undefined);
  }, [etaKmbA, etaCtbA, routeA, selectedStop]);

  const etaB = useMemo(() => {
    const raw = routeB?.company === 'KMB' ? (etaKmbB ?? []) : (etaCtbB ?? []);
    if (!selectedStop) return raw;
    return raw.filter((e: any) => e.dir === selectedStop.boundB || e.dir === undefined);
  }, [etaKmbB, etaCtbB, routeB, selectedStop]);

  const upcomingA = useMemo(
    () => etaA.filter((e: any) => e.eta && new Date(e.eta).getTime() > Date.now() - 60_000).slice(0, 3),
    [etaA],
  );
  const upcomingB = useMemo(
    () => etaB.filter((e: any) => e.eta && new Date(e.eta).getTime() > Date.now() - 60_000).slice(0, 3),
    [etaB],
  );

  const swapRoutes = () => {
    setRouteA(routeB);
    setRouteB(routeA);
    setSelectedStop(null);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top + 4 },
      ]}>
      {/* Header */}
      <View style={[styles.headerBar, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>⇄ 轉乘查詢</Text>
        {routeA && routeB && (
          <View style={styles.headerBtns}>
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: theme.colors.card }]}
              onPress={handleSaveToggle}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons
                name={currentSaved ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={currentSaved ? theme.colors.success : theme.colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: theme.colors.card }]}
              onPress={swapRoutes}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="swap-vertical" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={[{ key: 'body' }]}
        keyExtractor={(item) => item.key}
        renderItem={() => (
          <View>
            {/* 已儲存轉車組合 */}
            {loaded && combos.length > 0 && (
              <View style={styles.savedSection}>
                <Text style={[styles.savedTitle, { color: theme.colors.textSecondary }]}>
                  已儲存組合
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.savedRow}>
                  {combos.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.savedChip,
                        {
                          backgroundColor: theme.colors.card,
                          borderColor: theme.colors.border,
                        },
                      ]}
                      onPress={() => loadCombo(c)}
                      activeOpacity={0.7}>
                      <Text style={[styles.savedChipText, { color: theme.colors.text }]}>
                        {c.routeA.route} ⇄ {c.routeB.route}
                      </Text>
                      <TouchableOpacity
                        onPress={() => remove(c.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close-circle" size={15} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* 路線 A + B 選擇 */}
            <View style={styles.routeSelectRow}>
              <TouchableOpacity
                style={[
                  styles.routeSelect,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                ]}
                onPress={() => setPickerFor('A')}
                activeOpacity={0.7}>
                {routeA ? (
                  <>
                    <RouteBadge route={routeA.route} company={routeA.company} />
                    <Text style={[styles.routeSelectText, { color: theme.colors.text }]} numberOfLines={1}>
                      {getBoundLabelShort(routeA.bound, routeA.company)} · {routeA.origTc} → {routeA.destTc}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                  </>
                ) : (
                  <>
                    <Ionicons name="bus-outline" size={18} color={theme.colors.primary} />
                    <Text style={[styles.routeSelectText, { color: theme.colors.textSecondary }]}>
                      第一程路線
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.routeSelect,
                  { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                ]}
                onPress={() => setPickerFor('B')}
                activeOpacity={0.7}>
                {routeB ? (
                  <>
                    <RouteBadge route={routeB.route} company={routeB.company} />
                    <Text style={[styles.routeSelectText, { color: theme.colors.text }]} numberOfLines={1}>
                      {getBoundLabelShort(routeB.bound, routeB.company)} · {routeB.origTc} → {routeB.destTc}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
                  </>
                ) : (
                  <>
                    <Ionicons name="git-branch-outline" size={18} color={theme.colors.success} />
                    <Text style={[styles.routeSelectText, { color: theme.colors.textSecondary }]}>
                      轉乘路線
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* 共同轉車站 */}
            {routeA && routeB && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  共同轉車站（{commonStops.length}）
                </Text>
                {commonStops.length === 0 ? (
                  <View style={[styles.noCommonBox, { backgroundColor: theme.colors.card }]}>
                    <Ionicons name="alert-circle-outline" size={40} color={theme.colors.textSecondary} />
                    <Text style={[styles.noCommonText, { color: theme.colors.textSecondary }]}>
                      兩條路線冇共同車站
                    </Text>
                    <Text style={[styles.noCommonHint, { color: theme.colors.textSecondary }]}>
                      試吓揀另一個方向，或者換路線
                    </Text>
                  </View>
                ) : (
                  <View style={styles.stopChips}>
                    {commonStops.map((s) => {
                      const isSel = selectedStop?.stopIdA === s.stopIdA;
                      return (
                        <TouchableOpacity
                          key={s.stopIdA}
                          style={[
                            styles.stopChip,
                            {
                              backgroundColor: isSel ? theme.colors.primary : theme.colors.card,
                              borderColor: isSel ? theme.colors.primary : theme.colors.border,
                            },
                          ]}
                          onPress={() => setSelectedStop(s)}
                          activeOpacity={0.7}>
                          <Text
                            style={[
                              styles.stopChipText,
                              { color: isSel ? '#FFFFFF' : theme.colors.text },
                            ]}
                            numberOfLines={1}>
                            {s.nameTc}
                          </Text>
                          {!isSel && (
                            <Text style={styles.stopChipDir} numberOfLines={1}>
                              {getBoundLabelShort(s.boundA, routeA.company)} →{' '}
                              {getBoundLabelShort(s.boundB, routeB.company)}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* ETA 對照 */}
            {selectedStop && routeA && routeB && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  📍 {selectedStop.nameTc}
                </Text>
                <Text style={[styles.sectionSub, { color: theme.colors.textSecondary }]}>
                  {selectedStop.nameEn}
                </Text>
                <View style={styles.etaCards}>
                  <TransferEtaCard sel={routeA} bound={selectedStop.boundA} etas={upcomingA} />
                  <TransferEtaCard sel={routeB} bound={selectedStop.boundB} etas={upcomingB} />
                </View>
                <Text style={[styles.autoRefreshHint, { color: theme.colors.textSecondary }]}>
                  每 30 秒自動更新
                </Text>
              </View>
            )}
          </View>
        )}
      />

      {/* 路線揀選 Modal */}
      <RoutePickerModal
        visible={pickerFor !== null}
        title={pickerFor === 'A' ? '第一程路線' : '轉乘路線'}
        onClose={() => setPickerFor(null)}
        onSelect={(sel) => {
          if (pickerFor === 'A') setRouteA(sel);
          else setRouteB(sel);
          setSelectedStop(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerBtns: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedSection: { paddingHorizontal: 14, paddingTop: 10 },
  savedTitle: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  savedRow: { gap: 8, paddingRight: 14 },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  savedChipText: { fontSize: 13, fontWeight: '600' },
  routeSelectRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  routeSelect: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  routeSelectText: { flex: 1, fontSize: 13, fontWeight: '500' },
  section: { paddingHorizontal: 14, paddingBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  sectionSub: { fontSize: 12, marginBottom: 8, opacity: 0.7 },
  noCommonBox: {
    alignItems: 'center',
    paddingVertical: 32,
    borderRadius: 12,
    marginTop: 8,
  },
  noCommonText: { fontSize: 15, fontWeight: '600', marginTop: 10 },
  noCommonHint: { fontSize: 12, marginTop: 4 },
  stopChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  stopChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: '100%',
  },
  stopChipText: { fontSize: 13, fontWeight: '600' },
  stopChipDir: { fontSize: 10, opacity: 0.7, marginTop: 1 },
  pickerHint: { flex: 1, fontSize: 12, marginLeft: 8, opacity: 0.8 },
  etaCards: { gap: 10, marginTop: 4 },
  etaCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  etaCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  etaCardBound: { fontSize: 11, fontWeight: '600' },
  etaCardDest: { flex: 1, fontSize: 11, opacity: 0.8 },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2a3a50',
  },
  etaDest: { flex: 1, fontSize: 13, marginRight: 8 },
  etaMinutes: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'], minWidth: 44, textAlign: 'right' },
  etaClock: { fontSize: 12, minWidth: 44, textAlign: 'right' },
  noEta: { fontSize: 12, textAlign: 'center', paddingVertical: 10 },
  autoRefreshHint: { fontSize: 11, textAlign: 'center', marginTop: 8, opacity: 0.7 },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingTop: 12,
    paddingBottom: 24,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  pickerTitle: { fontSize: 18, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 16 },
  pickerList: { paddingHorizontal: 16, marginTop: 10 },
  pickerEmpty: { alignItems: 'center', paddingVertical: 32 },
  pickerRouteCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  pickerRouteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  pickerBounds: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  pickerBound: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  pickerBoundLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#60b0f4',
    marginBottom: 2,
  },
  pickerBoundDest: { fontSize: 13, fontWeight: '500' },
  pickerBoundRemark: { fontSize: 11, color: '#e0a060', marginTop: 2 },
});
