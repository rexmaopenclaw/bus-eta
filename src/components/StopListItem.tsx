// ============================================================
// 通用 UI 元件 — 車站列表 Item
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../utils/theme';

interface Props {
  seq: number;
  nameTc: string;
  nameEn: string;
  isLast?: boolean;
  isFirst?: boolean;
  onPress?: () => void;
  fare?: number | null;
  company?: string;
}

export function StopListItem({
  seq,
  nameTc,
  nameEn,
  isLast,
  isFirst,
  onPress,
  fare,
  company,
}: Props) {
  const theme = useAppTheme();

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: theme.colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}>
      {/* 左邊車站編號 + 連線 */}
      <View style={styles.leftCol}>
        {!isFirst && (
          <View
            style={[styles.line, { backgroundColor: theme.colors.textSecondary }]}
          />
        )}
        <View
          style={[
            styles.dot,
            {
              backgroundColor: isLast
                ? theme.colors.error
                : theme.colors.primary,
            },
          ]}>
          <Text style={styles.seqText}>{seq}</Text>
        </View>
        {!isLast && (
          <View
            style={[styles.line, { backgroundColor: theme.colors.textSecondary }]}
          />
        )}
      </View>

      {/* 右邊車站名 */}
      <View style={styles.rightCol}>
        <Text style={[styles.nameTc, { color: theme.colors.text }]}>
          {nameTc}
        </Text>
        <Text
          style={[styles.nameEn, { color: theme.colors.textSecondary }]}
          numberOfLines={1}>
          {nameEn}
        </Text>
      </View>

      {/* 車費 badge */}
      {fare != null && (
        <View style={[styles.fareBadge, { backgroundColor: isFirst ? theme.colors.success : theme.colors.primary }]}>
          <Text style={styles.fareText}>${fare}</Text>
        </View>
      )}

      <Ionicons
        name="chevron-forward"
        size={18}
        color={theme.colors.textSecondary}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leftCol: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seqText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 8,
    maxHeight: 20,
  },
  rightCol: {
    flex: 1,
  },
  nameTc: {
    fontSize: 15,
    fontWeight: '500',
  },
  nameEn: {
    fontSize: 12,
    marginTop: 2,
  },
  fareBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
  },
  fareText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  chevron: {
    marginLeft: 4,
  },
});