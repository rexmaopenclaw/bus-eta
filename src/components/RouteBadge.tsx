// ============================================================
// 通用 UI 元件 — 巴士路線徽章（支援 KMB/CTB/NWFB）
// ============================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../utils/theme';
import type { BusCompany } from '../types';

interface Props {
  route: string;
  company?: BusCompany;
  destTc?: string;
  destEn?: string;
  compact?: boolean;
}

const COMPANY_COLORS: Record<BusCompany, { bg: string; text: string }> = {
  KMB: { bg: '#1A7AF5', text: '#FFFFFF' },
  CTB: { bg: '#E63E2E', text: '#FFFFFF' },
  NWFB: { bg: '#00A651', text: '#FFFFFF' },
};

export function RouteBadge({ route, company, destTc, destEn, compact }: Props) {
  const theme = useAppTheme();
  const colors = company ? COMPANY_COLORS[company] : COMPANY_COLORS.KMB;

  return (
    <View style={styles.row}>
      <View style={[styles.badge, { backgroundColor: colors.bg }]}>
        {company && (
          <Text style={[styles.companyText, { color: colors.text }]}>
            {company === 'CTB' ? '城' : company === 'NWFB' ? '新' : ''}
          </Text>
        )}
        <Text style={[styles.badgeText, { color: colors.text }]}>{route}</Text>
      </View>
      {!compact && destTc && (
        <Text
          style={[styles.dest, { color: theme.colors.text }]}
          numberOfLines={1}>
          → {destTc}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    minWidth: 48,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  companyText: {
    fontSize: 9,
    fontWeight: '600',
    opacity: 0.9,
  },
  badgeText: {
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  dest: {
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
});