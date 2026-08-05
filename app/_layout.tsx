// ============================================================
// App Root Layout — Providers + Tab Navigation
// ============================================================

import React, { useEffect } from 'react';
import { useAuthStore } from '../src/store/auth';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFavoritesStore } from '../src/store/favorites';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const loadFavorites = useFavoritesStore((s) => s.load);
  const loadAuth = useAuthStore((s) => s.load);

  useEffect(() => {
    loadFavorites();
    loadAuth();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <QueryClientProvider client={queryClient}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="route/[route]"
          options={{
            headerShown: true,
            title: '路線詳情',
            headerBackTitle: '返回',
          }}
        />
        <Stack.Screen
          name="stop/[stopId]"
          options={{
            headerShown: true,
            title: '到站時間',
            headerBackTitle: '返回',
          }}
        />
        <Stack.Screen
          name="login"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
      </Stack>
    </QueryClientProvider>
    </GestureHandlerRootView>
  );
}