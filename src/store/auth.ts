// ============================================================
// Zustand Auth Store — Token + User 管理
// ============================================================

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginApi, registerApi, meApi, getCurrentApiBase } from '../api/auth';

const AUTH_STORAGE_KEY = 'busapp_auth';

interface AuthState {
  token: string | null;
  user: { id: number; email: string } | null;
  loaded: boolean;
  loading: boolean;
  error: string | null;
  /** 從 AsyncStorage 載入 token */
  load: () => Promise<void>;
  /** 登入 */
  login: (email: string, password: string) => Promise<void>;
  /** 註冊 */
  register: (email: string, password: string) => Promise<void>;
  /** 登出 */
  logout: () => Promise<void>;
  /** 清除 error */
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  loaded: false,
  loading: false,
  error: null,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const { token, user } = JSON.parse(raw);
        // 驗證 token 是否有效 — 只係 401 先清除，network error 保留 token
        try {
          const res = await fetch(`${getCurrentApiBase()}/api/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            set({ token, user, loaded: true });
          } else if (res.status === 401) {
            // Token 過期，清除
            await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
            set({ loaded: true });
          } else {
            // Server error (5xx)，但 token 可能仲有效 — 保留
            set({ token, user, loaded: true });
          }
        } catch {
          // Network error（server down / 連唔到）— 保留 token
          set({ token, user, loaded: true });
        }
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const data = await loginApi(email, password);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: data.token, user: data.user }));
      set({ token: data.token, user: data.user, loading: false });
    } catch (err: any) {
      set({ error: err.message || '登入失敗', loading: false });
      throw err;
    }
  },

  register: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const data = await registerApi(email, password);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: data.token, user: data.user }));
      set({ token: data.token, user: data.user, loading: false });
    } catch (err: any) {
      set({ error: err.message || '註冊失敗', loading: false });
      throw err;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    set({ token: null, user: null });
  },

  clearError: () => set({ error: null }),
}));