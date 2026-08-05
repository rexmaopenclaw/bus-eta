// ============================================================
// Tab Navigator — 底部導航欄
// ============================================================

import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme } from '../../src/utils/theme';

export default function TabLayout() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? darkTheme : lightTheme;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        },
        headerStyle: {
          backgroundColor: theme.colors.card,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '首頁',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: '搜尋路線',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="nearby"
        options={{
          title: '附近車站',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="location-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="route/[route]"
        options={{
          title: '路線詳情',
          tabBarStyle: { display: 'flex' },
          headerShown: true,
        }}
      />
      <Tabs.Screen
        name="stop/[stopId]"
        options={{
          title: '到站時間',
          tabBarStyle: { display: 'flex' },
          headerShown: true,
        }}
      />
    </Tabs>
  );
}