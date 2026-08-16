// ============================================================
// 首頁（收藏路線）— Dashboard 風格，分組顯示
// 支援 KMB (九巴) + CTB (城巴/NWFB)
// 長按群組可 rename / delete
// 群組可拖曳排序（長按 ≡ 圖示）
// ============================================================
import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Pressable,
  Animated,
  Platform,
  FlatList,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
// Swipeable removed — using custom PanResponder-based swipe to avoid conflict with DraggableFlatList
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useAppTheme } from '../../src/utils/theme';
import { useFavoritesStore } from '../../src/store/favorites';
import { useAuthStore } from '../../src/store/auth';
import { checkVersion, getStoredVersion, setStoredVersion, clearApiBase } from '../../src/api/auth';
import { useStopETA, useRouteStops as useKMBRouteStops, busKeys } from '../../src/hooks/useETA';
import { useCTBRouteStops, useCTBStopETA, ctbKeys } from '../../src/hooks/useCTBETA';
import { getBoundLabelShort } from '../../src/utils/bound';
import { RouteBadge } from '../../src/components/RouteBadge';
import { CompactETARow } from '../../src/components/CompactETARow';
import { DEFAULT_GROUP } from '../../src/types';
import type { FavoriteRoute, KMBETA, RouteStopDetail } from '../../src/types';
// ============================================================
// Types
// ============================================================
interface SectionData {
  key: string;
  group: string;
  count: number;
  items: FavoriteRoute[];
}
// ============================================================
// Dashboard 卡片 — 分 KMB / CTB 版本
// ============================================================
function DashboardCard({ fav, canMoveUp, canMoveDown, onMoveUp, onMoveDown }: {
  fav: FavoriteRoute;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const theme = useAppTheme();
  const removeFavorite = useFavoritesStore((s) => s.remove);
  const moveToGroup = useFavoritesStore((s) => s.moveToGroup);
  // 用 fav.id 前綴判斷公司（id 係 `${company}-${route}-${bound}-${stopId}`）
  // 就算 migration 漏咗都唔會錯
  const isKMB = !fav.company || fav.company === 'KMB' || fav.id.startsWith('KMB-');
  const isCTB = fav.company === 'CTB' || fav.id.startsWith('CTB-') || fav.id.startsWith('NWFB-');
  // 長按 menu：移動群組 or 刪除
  const handleLongPress = () => {
    const groups = useFavoritesStore.getState().getGroups().filter((g) => g !== fav.group);
    const options = [
      ...groups.map((g) => ({ text: `移至「${g}」`, onPress: () => moveToGroup(fav.id, g) })),
      { text: '移除收藏', style: 'destructive' as const, onPress: () => removeFavorite(fav.id) },
      { text: '取消', style: 'cancel' as const },
    ];
    Alert.alert(fav.route, `${fav.stopNameTc}`, options);
  };
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      {/* Header row: nav area (flex:1) + star button (separate, never nested) */}
      <View style={styles.cardHeader}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() =>
            router.push({
              pathname: '/route/[route]',
              params: {
                route: fav.route,
                bound: fav.bound,
                origTc: fav.routeOrigTc || '',
                destTc: fav.routeDestTc || '',
                company: fav.company ?? 'KMB',
                st: fav.service_type,
              },
            })
          }
          onLongPress={handleLongPress}
          style={styles.cardHeaderContent}>
          <RouteBadge route={fav.route} company={fav.company ?? 'KMB'} />
          <Text style={[styles.stopName, { color: theme.colors.text }]} numberOfLines={1}>
            {fav.stopNameTc}
          </Text>
          <Text style={[styles.direction, { color: theme.colors.textSecondary }]}>
            {getBoundLabelShort(fav.bound as 'O' | 'I', fav.company ?? 'KMB')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => removeFavorite(fav.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.starBtn}>
          <Ionicons name="star" size={16} color={theme.colors.warning} />
        </TouchableOpacity>
        {/* 站內排序：上/下移（group 內換位） */}
        <View style={styles.cardMoveBtns}>
          <TouchableOpacity
            onPress={onMoveUp}
            disabled={!onMoveUp || !canMoveUp}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            style={[styles.cardMoveBtn, (!onMoveUp || !canMoveUp) && { opacity: 0.25 }]}>
            <Ionicons name="chevron-up" size={14} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onMoveDown}
            disabled={!onMoveDown || !canMoveDown}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            style={[styles.cardMoveBtn, (!onMoveDown || !canMoveDown) && { opacity: 0.25 }]}>
            <Ionicons name="chevron-down" size={14} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
      {/* ETA body — tap to navigate */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: '/route/[route]',
            params: {
              route: fav.route,
              bound: fav.bound,
              origTc: fav.routeOrigTc || '',
              destTc: fav.routeDestTc || '',
              company: fav.company ?? 'KMB',
              st: fav.service_type,
            },
          })
        }
        onLongPress={handleLongPress}>
        {isKMB ? (
          <KMBBody fav={fav} />
        ) : (
          <CTBBody fav={fav} />
        )}
      </TouchableOpacity>
    </View>
  );
}
/** KMB: 用 stop-based ETA API */
function KMBBody({ fav }: { fav: FavoriteRoute }) {
  const { data: etas } = useStopETA(fav.stopId, fav.route, fav.service_type, true);
  const upcoming = useMemo(() => {
    return (etas ?? [])
      .filter((e: KMBETA) => e.eta && new Date(e.eta).getTime() > Date.now() - 60_000)
      .slice(0, 3);
  }, [etas]);
  if (upcoming.length === 0) {
    return <Text style={[styles.noEta, { color: '#5a7a9a' as any }]}>暫無到站數據</Text>;
  }
  return (
    <View style={styles.etaList}>
      {upcoming.map((eta: KMBETA, idx: number) => (
        <CompactETARow key={`${eta.seq}-${idx}`} eta={eta} />
      ))}
    </View>
  );
}
/** CTB: 用 stop-based ETA API */
function CTBBody({ fav }: { fav: FavoriteRoute }) {
  const { data: etas } = useCTBStopETA(
    fav.stopId, fav.route, fav.bound, null, true,
  );
  const upcoming = useMemo(() => {
    return (etas ?? [])
      .filter((e: KMBETA) => e.eta && new Date(e.eta).getTime() > Date.now() - 60_000)
      .slice(0, 3);
  }, [etas]);
  if (upcoming.length === 0) {
    return <Text style={[styles.noEta, { color: '#5a7a9a' as any }]}>暫無到站數據</Text>;
  }
  return (
    <View style={styles.etaList}>
      {upcoming.map((eta: KMBETA, idx: number) => (
        <CompactETARow key={`${eta.seq}-${idx}`} eta={eta} />
      ))}
    </View>
  );
}
// ============================================================
// Group Header — 可點擊摺疊 + 拖曳手柄 + 長按 rename/delete
// ============================================================
function GroupHeader({
  group,
  count,
  collapsed,
  isActive,
  drag,
  onToggle,
  onRename,
  onDelete,
  onMoveUp,
  onMoveDown,
  canEdit,
}: {
  group: string;
  count: number;
  collapsed: boolean;
  isActive: boolean;
  drag: () => void;
  onToggle: () => void;
  onRename: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canEdit: boolean;
}) {
  const theme = useAppTheme();
  const handleLongPress = () => {
    if (group === DEFAULT_GROUP) {
      return;
    }
    Alert.alert(group, `共 ${count} 個收藏`, [
      { text: '重新命名', onPress: onRename },
      { text: '刪除群組', style: 'destructive', onPress: onDelete },
      { text: '取消', style: 'cancel' },
    ]);
  };
  return (
    <View
      style={[
        styles.groupHeader,
        {
          backgroundColor: isActive ? theme.colors.primaryLight : theme.colors.card,
          borderBottomColor: theme.colors.border,
        },
      ]}>
      {/* 拖曳手柄（Native）*/}
      {Platform.OS !== 'web' && (
        <TouchableOpacity
          onLongPress={drag}
          delayLongPress={150}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.dragHandle}>
          <Ionicons name="reorder-three" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}
      {/* 摺疊 toggle */}
      <TouchableOpacity
        style={styles.groupToggleArea}
        onPress={onToggle}
        onLongPress={handleLongPress}
        activeOpacity={0.6}>
        <Ionicons
          name={collapsed ? 'chevron-forward' : 'chevron-down'}
          size={16}
          color={theme.colors.textSecondary}
        />
        <Text style={[styles.groupTitle, { color: theme.colors.text }]}>{group}</Text>
        <Text style={[styles.groupCount, { color: theme.colors.textSecondary }]}>
          {count} 個站
        </Text>
        {group !== DEFAULT_GROUP && (
          <Ionicons name="ellipsis-horizontal" size={16} color={theme.colors.textSecondary} />
        )}
      </TouchableOpacity>
      {/* 排序（上/下移）+ 改名 — web 版冇 drag，靠呢啲掣 */}
      <TouchableOpacity
        onPress={onMoveUp}
        disabled={!onMoveUp}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        style={[styles.groupActionBtn, !onMoveUp && { opacity: 0.3 }]}>
        <Ionicons name="arrow-up" size={15} color={theme.colors.textSecondary} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onMoveDown}
        disabled={!onMoveDown}
        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        style={[styles.groupActionBtn, !onMoveDown && { opacity: 0.3 }]}>
        <Ionicons name="arrow-down" size={15} color={theme.colors.textSecondary} />
      </TouchableOpacity>
      {canEdit && (
        <TouchableOpacity
          onPress={onRename}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          style={styles.groupActionBtn}>
          <Ionicons name="pencil" size={14} color={theme.colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}
// ============================================================
// 主頁
// ============================================================
export default function HomeScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const favorites = useFavoritesStore((s) => s.favorites);
  const loaded = useFavoritesStore((s) => s.loaded);
  const getGroups = useFavoritesStore((s) => s.getGroups);
  const moveFavorite = useFavoritesStore((s) => s.moveFavorite);
  const renameGroup = useFavoritesStore((s) => s.renameGroup);
  const deleteGroup = useFavoritesStore((s) => s.deleteGroup);
  const moveGroup = useFavoritesStore((s) => s.moveGroup);
  const syncToServer = useFavoritesStore((s) => s.syncToServer);
  const syncFromServer = useFavoritesStore((s) => s.syncFromServer);
  const syncing = useFavoritesStore((s) => s.syncing);
  const { token, user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  // Version check modal state
  const [versionModal, setVersionModal] = useState(false);
  const [versionChecking, setVersionChecking] = useState(false);
  const [versionInfo, setVersionInfo] = useState<{ version: string; date: string } | null>(null);
  const [versionError, setVersionError] = useState('');
  const [hasUpdate, setHasUpdate] = useState(false);
  // 等 store load 完先初始化 — 預設全部摺埋
  useEffect(() => {
    if (loaded && favorites.length > 0) {
      setCollapsedGroups(new Set(getGroups()));
    }
  }, [loaded]);
  // 登入後第一次 sync：將 local 收藏推上 server
  const handleSync = useCallback(async () => {
    if (!token) return;
    try {
      await syncToServer(token);
      Alert.alert('同步完成', '收藏已同步到伺服器');
    } catch (err: any) {
      Alert.alert('同步失敗', err.message || '請稍後再試');
    }
  }, [token, syncToServer]);
  const handlePullFromServer = useCallback(async () => {
    if (!token) return;
    try {
      await syncFromServer(token);
      Alert.alert('同步完成', '已從伺服器載入收藏');
    } catch (err: any) {
      Alert.alert('同步失敗', err.message || '請稍後再試');
    }
  }, [token, syncFromServer]);
  // 登入後自動 sync
  React.useEffect(() => {
    if (token && favorites.length > 0) {
      // 嘗試推上 server
      syncToServer(token).catch(() => {});
    } else if (token && favorites.length === 0) {
      // 首次登入，從 server 拉
      syncFromServer(token).catch(() => {});
    }
  }, [token]);
  // Rename modal state
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameTarget, setRenameTarget] = useState('');
  const [renameInput, setRenameInput] = useState('');
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: busKeys.all });
    await queryClient.invalidateQueries({ queryKey: ['ctb'] });
    setIsRefreshing(false);
  }, [queryClient]);
  const handleCheckVersion = useCallback(async () => {
    setVersionChecking(true);
    setVersionError('');
    setHasUpdate(false);
    try {
      const info = await checkVersion();
      setVersionInfo(info);
      const stored = getStoredVersion();
      setHasUpdate(!stored || stored !== info.version);
    } catch (err: any) {
      setVersionError(err.message || '檢查失敗，請稍後再試');
    } finally {
      setVersionChecking(false);
    }
  }, []);
  const handleReload = useCallback(() => {
    if (versionInfo) setStoredVersion(versionInfo.version);
    if (Platform.OS === 'web') {
      window.location.reload();
    } else {
      Alert.alert('請重新開啟 App', '新版本已下載，重新開啟即可套用');
    }
  }, [versionInfo]);
  const toggleCollapse = (group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };
  // Build sections for DraggableFlatList
  const sections = useMemo<SectionData[]>(() => {
    const groups = getGroups();
    return groups
      .map((group) => {
        const items = favorites.filter((f) => f.group === group);
        return {
          key: `group:${group}`,
          group,
          count: items.length,
          items: collapsedGroups.has(group) ? [] : items,
        };
      })
      .filter((s) => s.count > 0);
  }, [favorites, getGroups, collapsedGroups]);
  // 拖曳完成 — 一次過 set 新次序
  const setGroupOrder = useFavoritesStore((s) => s.setGroupOrder);
  const handleDragEnd = useCallback(
    ({ data }: { data: SectionData[] }) => {
      const newOrder = data.map((s) => s.group);
      setGroupOrder(newOrder);
    },
    [setGroupOrder],
  );
  // 渲染每個 section：header + cards
  const renderSectionItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<SectionData>) => {
      const idx = getIndex() ?? 0;
      const total = sections.length;
      return (
        <ScaleDecorator>
          <GroupHeader
            group={item.group}
            count={item.count}
            collapsed={collapsedGroups.has(item.group)}
            isActive={isActive}
            drag={drag}
            onToggle={() => toggleCollapse(item.group)}
            onRename={() => {
              setRenameTarget(item.group);
              setRenameInput(item.group);
              setRenameModalVisible(true);
            }}
            onDelete={() => {
              Alert.alert(
                '刪除群組',
                `確定刪除「${item.group}」？入面嘅收藏會移去「${DEFAULT_GROUP}」。`,
                [
                  { text: '取消', style: 'cancel' },
                  {
                    text: '刪除',
                    style: 'destructive',
                    onPress: () => deleteGroup(item.group),
                  },
                ],
              );
            }}
            onMoveUp={idx > 0 ? () => moveGroup(idx, idx - 1) : undefined}
            onMoveDown={idx < total - 1 ? () => moveGroup(idx, idx + 1) : undefined}
            canEdit={item.group !== DEFAULT_GROUP}
          />
          {item.items.map((fav, favIdx) => (
            <DashboardCard
              key={fav.id}
              fav={fav}
              canMoveUp={favIdx > 0}
              canMoveDown={favIdx < item.items.length - 1}
              onMoveUp={() => moveFavorite(fav.id, -1)}
              onMoveDown={() => moveFavorite(fav.id, 1)}
            />
          ))}
        </ScaleDecorator>
      );
    },
    [collapsedGroups, deleteGroup, renameGroup, moveGroup, sections.length, moveFavorite],
  );
  // Empty state
  if (favorites.length === 0) {
    return (
      <View
        style={[styles.emptyContainer, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        {/* Header Bar — 就算冇收藏都要 show login button */}
        <View style={[styles.headerBar, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Bus ETA</Text>
          <View style={styles.headerActions}>
            {user ? (
              <>
                <TouchableOpacity
                  style={[styles.headerBtn, { backgroundColor: theme.colors.card }]}
                  onPress={handleSync}
                  disabled={syncing}>
                  <Ionicons
                    name={syncing ? 'sync-outline' : 'cloud-upload-outline'}
                    size={18}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.headerBtn, { backgroundColor: theme.colors.card }]}
                  onPress={() => {
                    Alert.alert('登出', `確定登出 ${user.email}？`, [
                      { text: '取消', style: 'cancel' },
                      { text: '登出', style: 'destructive', onPress: logout },
                    ]);
                  }}>
                  <Ionicons name="log-out-outline" size={18} color={theme.colors.error} />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.loginBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => router.push('/login')}>
                <Ionicons name="person-outline" size={14} color="#FFFFFF" />
                <Text style={styles.loginBtnText}>登入</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.emptyBody}>
          <Ionicons name="star-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>尚未收藏任何路線</Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            去搜尋路線，然後點擊星形圖示加入收藏
          </Text>
          <TouchableOpacity
            style={[styles.goButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push('/(tabs)/search')}>
            <Text style={styles.goButtonText}>去搜尋路線</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top + 4 }]}>
      {/* Header Bar */}
      <View style={[styles.headerBar, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Bus ETA</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: theme.colors.card }]}
            onPress={onRefresh}
            disabled={isRefreshing}>
            <Ionicons
              name={isRefreshing ? 'sync-outline' : 'refresh-outline'}
              size={18}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
          {user ? (
            <>
              <TouchableOpacity
                style={[styles.headerBtn, { backgroundColor: theme.colors.card }]}
                onPress={handleSync}
                disabled={syncing}>
                <Ionicons
                  name={syncing ? 'sync-outline' : 'cloud-upload-outline'}
                  size={18}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerBtn, { backgroundColor: theme.colors.card }]}
                onPress={handlePullFromServer}
                disabled={syncing}>
                <Ionicons
                  name="cloud-download-outline"
                  size={18}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerBtn, { backgroundColor: theme.colors.card }]}
                onPress={() => {
                  Alert.alert('登出', `確定登出 ${user.email}？`, [
                    { text: '取消', style: 'cancel' },
                    { text: '登出', style: 'destructive', onPress: logout },
                  ]);
                }}>
                <Ionicons name="log-out-outline" size={18} color={theme.colors.error} />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.loginBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => router.push('/login')}>
              <Ionicons name="person-outline" size={14} color="#FFFFFF" />
              <Text style={styles.loginBtnText}>登入</Text>
            </TouchableOpacity>
          )}
          {/* Version check */}
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: theme.colors.card }]}
            onPress={() => {
              clearApiBase();
              setVersionModal(true);
              handleCheckVersion();
            }}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
      {Platform.OS === 'web' ? (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
        >
          {sections.map((section, idx) => (
            <View key={section.key}>
              <GroupHeader
                group={section.group}
                count={section.count}
                collapsed={collapsedGroups.has(section.group)}
                isActive={false}
                drag={() => {}}
                onToggle={() => toggleCollapse(section.group)}
                onRename={() => {
                  setRenameTarget(section.group);
                  setRenameInput(section.group);
                  setRenameModalVisible(true);
                }}
                onDelete={() => {
                  Alert.alert('刪除群組', `確定刪除「${section.group}」？入面嘅收藏會移去「${DEFAULT_GROUP}」。`, [
                    { text: '取消', style: 'cancel' },
                    { text: '刪除', style: 'destructive', onPress: () => deleteGroup(section.group) },
                  ]);
                }}
                onMoveUp={idx > 0 ? () => moveGroup(idx, idx - 1) : undefined}
                onMoveDown={idx < sections.length - 1 ? () => moveGroup(idx, idx + 1) : undefined}
                canEdit={section.group !== DEFAULT_GROUP}
              />
              {section.items.map((fav, favIdx) => (
                <DashboardCard
                  key={fav.id}
                  fav={fav}
                  canMoveUp={favIdx > 0}
                  canMoveDown={favIdx < section.items.length - 1}
                  onMoveUp={() => moveFavorite(fav.id, -1)}
                  onMoveDown={() => moveFavorite(fav.id, 1)}
                />
              ))}
            </View>
          ))}
        </ScrollView>
      ) : (
        <DraggableFlatList
          data={sections}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
          renderItem={renderSectionItem}
          onDragEnd={handleDragEnd}
          activationDistance={10}
        />
      )}
      {/* Rename Group Modal */}
      <Modal
        visible={renameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setRenameModalVisible(false)}>
          <Pressable
            style={[styles.renameModal, { backgroundColor: theme.colors.card }]}
            onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.renameTitle, { color: theme.colors.text }]}>重新命名群組</Text>
            <TextInput
              style={[styles.renameInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
              value={renameInput}
              onChangeText={setRenameInput}
              placeholder="輸入新群組名稱"
              placeholderTextColor={theme.colors.textSecondary}
              autoFocus
            />
            <View style={styles.renameButtons}>
              <TouchableOpacity
                style={[styles.renameBtn, { backgroundColor: theme.colors.primaryLight }]}
                onPress={() => setRenameModalVisible(false)}>
                <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.renameBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  if (renameInput.trim() && renameInput.trim() !== renameTarget) {
                    renameGroup(renameTarget, renameInput.trim());
                  }
                  setRenameModalVisible(false);
                }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>確認</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      {/* Version Update Modal */}
      <Modal
        visible={versionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setVersionModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setVersionModal(false)}>
          <Pressable
            style={[styles.renameModal, { backgroundColor: theme.colors.card }]}
            onPress={(e) => e.stopPropagation()}>
            <Ionicons name="information-circle-outline" size={28} color={theme.colors.primary} style={{ marginBottom: 8 }} />
            <Text style={[styles.renameTitle, { color: theme.colors.text }]}>版本更新</Text>
            {versionChecking ? (
              <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 14 }} />
            ) : versionError ? (
              <Text style={{ color: theme.colors.error, fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
                {versionError}
              </Text>
            ) : versionInfo ? (
              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 13, color: theme.colors.textSecondary }}>
                  目前版本：{getStoredVersion() || '未知'}
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: hasUpdate ? theme.colors.primary : '#4caf50',
                    marginTop: 6,
                  }}>
                  {hasUpdate ? '🆕 有新版本！' : '✅ 已是最新版本'}
                </Text>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
                  最新：{versionInfo.version}（{new Date(versionInfo.date).toLocaleString()}）
                </Text>
              </View>
            ) : null}
            <View style={styles.renameButtons}>
              <TouchableOpacity
                style={[styles.renameBtn, { backgroundColor: theme.colors.primaryLight }]}
                onPress={() => setVersionModal(false)}>
                <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>關閉</Text>
              </TouchableOpacity>
              {hasUpdate ? (
                <TouchableOpacity
                  style={[styles.renameBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={handleReload}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>重新載入</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.renameBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={handleCheckVersion}
                  disabled={versionChecking}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>檢查更新</Text>
                </TouchableOpacity>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  goButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 24 },
  goButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  loginBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  emptyBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  list: { padding: 10 },
  swipeContainer: { marginBottom: 8 },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  stopName: { flex: 1, fontSize: 14, fontWeight: '500' },
  direction: { fontSize: 11, marginRight: 4 },
  cardHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  starBtn: { padding: 2 },
  cardMoveBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 2,
  },
  cardMoveBtn: {
    padding: 2,
  },
  starOverlayBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 6,
    borderRadius: 14,
    zIndex: 10,
  },
  etaList: { paddingHorizontal: 10, paddingBottom: 6 },
  noEta: { fontSize: 12, textAlign: 'center', paddingVertical: 6, paddingBottom: 8 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingRight: 10,
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 8,
    gap: 4,
  },
  dragHandle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
groupToggleArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupActionBtn: {
    padding: 4,
    marginLeft: 2,
  },
  groupTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  groupCount: { fontSize: 12, marginRight: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  renameModal: {
    width: 280,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  renameTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  renameInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    marginBottom: 14,
  },
  renameButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  renameBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },

  deleteAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    borderRadius: 12,
    marginLeft: 8,
    gap: 4,
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});





