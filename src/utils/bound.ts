// ============================================================
// Bound 方向標籤 helper
// KMB: bound=O → 去程, bound=I → 回程
// CTB: bound=I → 去程, bound=O → 回程 (opposite convention)
// ============================================================

import type { BusCompany } from '../types';

/**
 * 根據公司同 bound 返回方向標籤
 * CTB 用相反 convention: bound=I=去程, bound=O=回程
 * KMB: bound=O=去程, bound=I=回程
 */
export function getBoundLabel(bound: 'O' | 'I', company?: BusCompany): string {
  if (company === 'CTB') {
    return bound === 'I' ? '👉 去程' : '👈 回程';
  }
  return bound === 'O' ? '👉 去程' : '👈 回程';
}

/** 短版 (冇箭嘴) */
export function getBoundLabelShort(bound: 'O' | 'I', company?: BusCompany): string {
  if (company === 'CTB') {
    return bound === 'I' ? '去程' : '回程';
  }
  return bound === 'O' ? '去程' : '回程';
}