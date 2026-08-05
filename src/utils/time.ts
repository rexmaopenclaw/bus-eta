// ============================================================
// 時間處理工具
// ============================================================

/**
 * 計算 ETA 剩餘分鐘數，回傳人類可讀文字
 * @param etaTimestamp - ISO 8601 timestamp from API
 * @param dataTimestamp - data_timestamp from API (for staleness check)
 * @returns { label, minutes, isLate, isDeparted }
 */
export function parseETA(
  etaTimestamp: string | null,
  dataTimestamp: string,
): {
  label: string;
  minutes: number | null;
  isLate: boolean;
  isDeparted: boolean;
} {
  if (!etaTimestamp) {
    return { label: '未能提供', minutes: null, isLate: false, isDeparted: false };
  }

  const now = new Date();
  const eta = new Date(etaTimestamp);
  const diffMs = eta.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 0) {
    // 已開出或已過站
    return { label: '已開出', minutes: diffMinutes, isLate: false, isDeparted: true };
  }

  if (diffMinutes === 0) {
    return { label: '即將到站', minutes: 0, isLate: false, isDeparted: false };
  }

  if (diffMinutes < 60) {
    return { label: `${diffMinutes} 分鐘`, minutes: diffMinutes, isLate: false, isDeparted: false };
  }

  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  return { label: `${hours}小時${mins}分鐘`, minutes: diffMinutes, isLate: false, isDeparted: false };
}

/**
 * 格式化時間為 HH:MM
 */
export function formatTime(isoString: string | null): string {
  if (!isoString) return '--:--';
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * 檢查 ETA 數據是否已經過時（超過 60 秒）
 */
export function isStale(dataTimestamp: string): boolean {
  const now = new Date().getTime();
  const dataTime = new Date(dataTimestamp).getTime();
  return now - dataTime > 60_000;
}

/**
 * 為頭班車/尾班車/特別班次加上 remark 圖標
 */
export function getBusRemarkIcon(remarkTc?: string): string | null {
  if (!remarkTc) return null;
  if (remarkTc.includes('尾班車') || remarkTc.includes('尾班')) return '🕐';
  if (remarkTc.includes('頭班車') || remarkTc.includes('頭班')) return '🌅';
  if (remarkTc.includes('特別車') || remarkTc.includes('加班')) return '⚠️';
  return null;
}