// ============================================================
// 位置取得工具 — 支援 Browser + Native
// Browser 用 HTML5 Geolocation API
// Native 用 expo-location
// ============================================================

import { Platform } from 'react-native';

interface Position {
  lat: number;
  lng: number;
}

/**
 * 取得用戶位置，跨平台（browser + native）
 * 回傳 { lat, lng }，失敗就 throw error
 */
/**
 * 嘗試取得位置，先試 high accuracy，失敗就 fallback 到 low accuracy
 */
function tryBrowserGeolocation(timeoutMs: number): Promise<Position> {
  return new Promise<Position>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('你的瀏覽器不支援定位功能'));
      return;
    }

    // 先試 High Accuracy
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (_err) => {
        // High accuracy 失敗 → 試 Low Accuracy
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
          },
          (err2) => {
            switch (err2.code) {
              case err2.PERMISSION_DENIED:
                reject(new Error('請允許位置權限'));
                break;
              case err2.POSITION_UNAVAILABLE:
                reject(new Error('無法取得位置，請檢查 GPS 設定'));
                break;
              case err2.TIMEOUT:
                reject(new Error('定位超時，請稍後再試'));
                break;
              default:
                reject(new Error('定位失敗：' + err2.message));
            }
          },
          {
            enableHighAccuracy: false,
            timeout: timeoutMs,
            maximumAge: 120000,
          },
        );
      },
      {
        enableHighAccuracy: true,
        timeout: Math.min(timeoutMs / 2, 15000),
        maximumAge: 60000,
      },
    );
  });
}

export async function getCurrentPosition(
  timeoutMs: number = 30000,
): Promise<Position> {
  // Browser：用 HTML5 Geolocation API
  if (Platform.OS === 'web') {
    return tryBrowserGeolocation(timeoutMs);
  }

  // Native：用 expo-location
  const Location = require('expo-location');
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('需要位置權限才能顯示附近車站');
  }
  const loc = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
  };
}