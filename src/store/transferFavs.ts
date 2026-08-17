// ============================================================
// Zustand Store — 轉乘組合收藏（42C ⇄ 92 呢類常用組合）
// 用 AsyncStorage 做持久化，下次開 App 仍保留
// ============================================================

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TransferRouteSel } from '../types';

const STORAGE_KEY = 'busapp_transfer_combos';

export interface SavedTransferCombo {
  id: string;
  routeA: TransferRouteSel;
  routeB: TransferRouteSel;
  addedAt: number;
}

interface TransferFavsState {
  combos: SavedTransferCombo[];
  loaded: boolean;
  /** 從 AsyncStorage 載入 */
  load: () => Promise<void>;
  /** 加入組合；已存在就唔加，回傳 false */
  add: (routeA: TransferRouteSel, routeB: TransferRouteSel) => Promise<boolean>;
  /** 移除組合 */
  remove: (id: string) => Promise<void>;
  /** 檢查組合（唔理方向次序）是否已儲存 */
  isSaved: (routeA: TransferRouteSel, routeB: TransferRouteSel) => boolean;
}

export function comboId(routeA: TransferRouteSel, routeB: TransferRouteSel): string {
  const key = (r: TransferRouteSel) =>
    `${r.company}-${r.route}-${r.bound}-${r.serviceType}`;
  return `${key(routeA)}__${key(routeB)}`;
}

export const useTransferFavsStore = create<TransferFavsState>((set, get) => ({
  combos: [],
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedTransferCombo[];
        set({ combos: parsed, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  add: async (routeA, routeB) => {
    const { combos } = get();
    const id = comboId(routeA, routeB);
    if (combos.some((c) => c.id === id)) return false;
    const item: SavedTransferCombo = { id, routeA, routeB, addedAt: Date.now() };
    const updated = [...combos, item];
    set({ combos: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  },

  remove: async (id) => {
    const { combos } = get();
    const updated = combos.filter((c) => c.id !== id);
    set({ combos: updated });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  isSaved: (routeA, routeB) => {
    const { combos } = get();
    const id = comboId(routeA, routeB);
    return combos.some((c) => c.id === id);
  },
}));
