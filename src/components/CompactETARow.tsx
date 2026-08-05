// ============================================================
// Dashboard 專用 — 精簡 ETA 顯示列
// 用喺首頁多路線一覽，每條路線只佔一列
// ============================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../utils/theme';
import { parseETA, formatTime } from '../utils/time';
import type { KMBETA } from '../types';

interface Props {
  eta: KMBETA;
}

export function CompactETARow({ eta }: Props) {
  const theme = useAppTheme();
  const { label, minutes, isDeparted } = parseETA(
    eta.eta,
    eta.data_timestamp,
  );

  const etaColor =
    isDeparted
      ? theme.colors.textSecondary
      : minutes !== null && minutes <= 3
        ? theme.colors.error
        : minutes !== null && minutes <= 10
          ? theme.colors.warning
          : theme.colors.success;

  return (
    <View style={styles.row}>
      <Text style={[styles.dest, { color: theme.colors.textSecondary }]} numberOfLines={1}>
        {eta.dest_tc}
      </Text>
      <Text style={[styles.minutes, { color: etaColor }]}>
        {label === '已開出' ? '已開' : label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  dest: {
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  minutes: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    minWidth: 52,
    textAlign: 'right',
  },
});