// ============================================================
// Zustand Store — 收藏路線管理
// 用 AsyncStorage 做持久化，下次開 App 仍保留
// ============================================================

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FavoriteRoute } from '../types';
import { DEFAULT_GROUP } from '../types';
import { fetchFavoritesApi, syncFavoritesApi } from '../api/auth';

const STORAGE_KEY = 'busapp_favorites';

interface FavoritesState {
  favorites: FavoriteRoute[];
  loaded: boolean;
  /** Sync 狀態 */
  syncing: boolean;
  lastSyncAt: number | null;
  /** 群組次序（預設群組固定放最前） */
  groupOrder: string[];
  /** 從 AsyncStorage 載入 */
  load: () => Promise<void>;
  /** 加入收藏 */
  add: (fav: FavoriteRoute) => Promise<void>;
  /** 移除收藏 */
  remove: (id: string) => Promise<void>;
  /** 檢查是否已收藏 */
  isFavorite: (id: string) => boolean;
  /** 取得所有群組名（去重 + 排序） */
  getGroups: () => string[];
  /** 將收藏移到某個群組 */
  moveToGroup: (favId: string, group: string) => Promise<void>;
  /** 重新命名群組（批量改所有同名 item） */
  renameGroup: (oldName: string, newName: string) => Promise<void>;
  /** 刪除群組（入面啲 item 移去 DEFAULT_GROUP） */
  deleteGroup: (name: string) => Promise<void>;
  /** 移動群組次序 */
  moveGroup: (fromIndex: number, toIndex: number) => Promise<void>;
  /** 設定整個群組次序（用於拖曳完成後一次過更新） */
  setGroupOrder: (order: string[]) => Promise<void>;
  /** 同步收藏到 server */
  syncToServer: (token: string) => Promise<void>;
  /** 從 server 載入收藏（取代 local） */
  syncFromServer: (token: string) => Promise<void>;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  loaded: false,
  syncing: false,
  lastSyncAt: null,
  groupOrder: [],

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FavoriteRoute[];
        // 向後兼容：根據 fav.id 前綴判斷公司，即使舊版 migration 錯配過都 fix
        const companyFromId = (id: string): 'KMB' | 'CTB' => {
          if (id.startsWith('CTB-') || id.startsWith('NWFB-')) return 'CTB';
          return 'KMB';
        };
        const migrated: FavoriteRoute[] = parsed.map((f) => {
          const r: FavoriteRoute = { ...f };
          // 用 id 前綴判斷公司 — 優先於舊數值，fix 以前錯配嘅 KMB default
          (r as any).company = companyFromId(r.id);
          if (!('group' in r)) {
            (r as any).group = DEFAULT_GROUP;
          }
          return r;
        });
        // 載入 groupOrder（如果舊版冇，就自動生成）
        const orderRaw = await AsyncStorage.getItem(STORAGE_KEY + '_groupOrder');
        let groupOrder: string[] = [];
        if (orderRaw) {
          groupOrder = JSON.parse(orderRaw);
        } else {
          // 首次：預設 group 排最前，其他 alphabetically
          const groups = [...new Set(migrated.map((f) => f.group))];
          const sorted = groups.filter((g) => g !== DEFAULT_GROUP).sort();
          groupOrder = groups.includes(DEFAULT_GROUP) ? [DEFAULT_GROUP, ...sorted] : sorted;
        }
        set({ favorites: migrated, groupOrder, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  add: async (fav: FavoriteRoute) => {
    const { favorites, groupOrder } = get();
    if (favorites.some((f) => f.id === fav.id)) return;
    const item = { ...fav, group: fav.group || DEFAULT_GROUP };
    const updated = [...favorites, item];
    // 新 group 自動加入 groupOrder 尾
    let newOrder = groupOrder;
    if (!groupOrder.includes(item.group)) {
      newOrder = [...groupOrder, item.group];
    }
    set({ favorites: updated, groupOrder: newOrder });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    await AsyncStorage.setItem(STORAGE_KEY + '_groupOrder', JSON.stringify(newOrder));
  },

  remove: async (id: string) => {
    const { favorites, groupOrder } = get();
    const updated = favorites.filter((f) => f.id !== id);
    set({ favorites: updated });
    // 如果 group 冇晒 item，唔會自動刪 groupOrder entry，等用戶 deleteGroup
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  isFavorite: (id: string) => {
    return get().favorites.some((f) => f.id === id);
  },

  getGroups: () => {
    const { favorites, groupOrder } = get();
    const groups = [...new Set(favorites.map((f) => f.group))];
    // 按 groupOrder 排序，順便清理唔存在嘅 group
    const validOrder = groupOrder.filter((g) => groups.includes(g));
    // 新 group（未喺 order 入面）放最後
    const newGroups = groups.filter((g) => !validOrder.includes(g));
    return [...validOrder, ...newGroups];
  },

  moveToGroup: async (favId: string, group: string) => {
    const { favorites, groupOrder } = get();
    const updated = favorites.map((f) =>
      f.id === favId ? { ...f, group } : f,
    );
    // 如果目標 group 未出現過，加入 order 尾
    let newOrder = groupOrder;
    if (!groupOrder.includes(group)) {
      newOrder = [...groupOrder, group];
    }
    set({ favorites: updated, groupOrder: newOrder });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (newOrder !== groupOrder) {
      await AsyncStorage.setItem(STORAGE_KEY + '_groupOrder', JSON.stringify(newOrder));
    }
  },

  renameGroup: async (oldName: string, newName: string) => {
    const { favorites, groupOrder } = get();
    const updated = favorites.map((f) =>
      f.group === oldName ? { ...f, group: newName } : f,
    );
    const newOrder = groupOrder.map((g) => (g === oldName ? newName : g));
    set({ favorites: updated, groupOrder: newOrder });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    await AsyncStorage.setItem(STORAGE_KEY + '_groupOrder', JSON.stringify(newOrder));
  },

  deleteGroup: async (name: string) => {
    const { favorites, groupOrder } = get();
    const updated = favorites.map((f) =>
      f.group === name ? { ...f, group: DEFAULT_GROUP } : f,
    );
    const newOrder = groupOrder.filter((g) => g !== name);
    set({ favorites: updated, groupOrder: newOrder });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    await AsyncStorage.setItem(STORAGE_KEY + '_groupOrder', JSON.stringify(newOrder));
  },

  moveGroup: async (fromIndex: number, toIndex: number) => {
    const { groupOrder } = get();
    const newOrder = [...groupOrder];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    set({ groupOrder: newOrder });
    await AsyncStorage.setItem(STORAGE_KEY + '_groupOrder', JSON.stringify(newOrder));
  },

  setGroupOrder: async (order: string[]) => {
    set({ groupOrder: order });
    await AsyncStorage.setItem(STORAGE_KEY + '_groupOrder', JSON.stringify(order));
  },

  syncToServer: async (token: string) => {
    const { favorites } = get();
    set({ syncing: true });
    try {
      // 將 local favorites 推上 server
      const payload = favorites.map((f) => ({
        id: f.id,
        route: f.route,
        bound: f.bound,
        service_type: f.service_type || '1',
        stopId: f.stopId,
        stopNameTc: f.stopNameTc || '',
        stopNameEn: f.stopNameEn || '',
        routeOrigTc: f.routeOrigTc || '',
        routeDestTc: f.routeDestTc || '',
        routeOrigEn: f.routeOrigEn || '',
        routeDestEn: f.routeDestEn || '',
        group: f.group || DEFAULT_GROUP,
        addedAt: f.addedAt || Date.now(),
        company: f.company || 'KMB',
      }));
      await syncFavoritesApi(token, payload);
      set({ lastSyncAt: Date.now(), syncing: false });
    } catch (err) {
      set({ syncing: false });
      throw err;
    }
  },

  syncFromServer: async (token: string) => {
    set({ syncing: true });
    try {
      // 從 server 拉 favorites
      const data = await fetchFavoritesApi(token);
      const serverFavs: FavoriteRoute[] = data.favorites.map((f: any) => ({
        id: f.id,
        route: f.route,
        bound: f.bound,
        service_type: f.service_type || '1',
        stopId: f.stopId,
        stopNameTc: f.stopNameTc || '',
        stopNameEn: f.stopNameEn || '',
        routeOrigTc: f.routeOrigTc || '',
        routeDestTc: f.routeDestTc || '',
        routeOrigEn: f.routeOrigEn || '',
        routeDestEn: f.routeDestEn || '',
        group: f.group || DEFAULT_GROUP,
        addedAt: f.addedAt || Date.now(),
        company: f.company || 'KMB',
      }));

      // 取代 local
      const groups = [...new Set(serverFavs.map((f) => f.group))];
      const sorted = groups.filter((g) => g !== DEFAULT_GROUP).sort();
      const groupOrder = groups.includes(DEFAULT_GROUP) ? [DEFAULT_GROUP, ...sorted] : sorted;
      set({ favorites: serverFavs, groupOrder, lastSyncAt: Date.now(), syncing: false });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(serverFavs));
      await AsyncStorage.setItem(STORAGE_KEY + '_groupOrder', JSON.stringify(groupOrder));
    } catch (err) {
      set({ syncing: false });
      throw err;
    }
  },
}));