// ============================================================
// Login Screen — 登入 / 註冊
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../src/utils/theme';
import { useAuthStore } from '../src/store/auth';

export default function LoginScreen() {
  const theme = useAppTheme();
  const { login, register, loading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('提示', '請輸入 email 和密碼');
      return;
    }
    try {
      if (isRegister) {
        await register(email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      // 成功後返首頁
      router.back();
    } catch {
      // error 已由 store 處理
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {isRegister ? '註冊帳號' : '登入'}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.form}>
        {/* Email */}
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          Email
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.card,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            },
          ]}
          placeholder="your@email.com"
          placeholderTextColor={theme.colors.textSecondary}
          value={email}
          onChangeText={(v) => { setEmail(v); clearError(); }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Password */}
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          密碼
        </Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[
              styles.input,
              styles.passwordInput,
              {
                backgroundColor: theme.colors.card,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              },
            ]}
            placeholder="最少 4 個字"
            placeholderTextColor={theme.colors.textSecondary}
            value={password}
            onChangeText={(v) => { setPassword(v); clearError(); }}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeBtn}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error ? (
          <Text style={[styles.error, { color: theme.colors.error }]}>
            {error}
          </Text>
        ) : null}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: theme.colors.primary }]}
          onPress={handleSubmit}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>
              {isRegister ? '註冊' : '登入'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Toggle */}
        <TouchableOpacity
          onPress={() => { setIsRegister(!isRegister); clearError(); }}
          style={styles.toggleBtn}>
          <Text style={[styles.toggleText, { color: theme.colors.primary }]}>
            {isRegister ? '已有帳號？登入' : '未有帳號？註冊'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
  },
  backBtn: { width: 40, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  form: { paddingHorizontal: 24, paddingTop: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 44 },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  error: { fontSize: 13, marginTop: 8, textAlign: 'center' },
  submitBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  toggleBtn: { alignItems: 'center', marginTop: 16 },
  toggleText: { fontSize: 14, fontWeight: '500' },
});