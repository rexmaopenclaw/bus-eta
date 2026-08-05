// ============================================================
// 通用 UI 元件 — ETA 倒數卡片
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../utils/theme';
import { parseETA, formatTime, getBusRemarkIcon } from '../utils/time';
import type { KMBETA } from '../types';

interface Props {
  eta: KMBETA;
  onPress?: () => void;
}

export function ETACard({ eta, onPress }: Props) {
  const theme = useAppTheme();
  const { label, minutes, isDeparted } = parseETA(
    eta.eta,
    eta.data_timestamp,
  );
  const remarkIcon = getBusRemarkIcon(eta.rmk_tc);

  // 決定顏色 — 即將到站用橙色/紅色
  const etaColor =
    isDeparted
      ? theme.colors.textSecondary
      : minutes !== null && minutes <= 3
        ? theme.colors.error
        : minutes !== null && minutes <= 10
          ? theme.colors.warning
          : theme.colors.success;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={styles.left}>
        {remarkIcon && <Text style={styles.remarkIcon}>{remarkIcon}</Text>}
        <Text style={[styles.dest, { color: theme.colors.text }]} numberOfLines={1}>
          {eta.dest_tc}
        </Text>
        {eta.rmk_tc && (
          <Text style={[styles.remark, { color: theme.colors.textSecondary }]}>
            {eta.rmk_tc}
          </Text>
        )}
      </View>
      <View style={styles.right}>
        <Text style={[styles.etaTime, { color: etaColor }]}>{label}</Text>
        <Text style={[styles.etaTimestamp, { color: theme.colors.textSecondary }]}>
          {formatTime(eta.eta)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  remarkIcon: {
    fontSize: 16,
  },
  dest: {
    fontSize: 14,
    fontWeight: '500',
  },
  remark: {
    fontSize: 12,
  },
  right: {
    alignItems: 'flex-end',
  },
  etaTime: {
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  etaTimestamp: {
    fontSize: 12,
    marginTop: 2,
  },
});