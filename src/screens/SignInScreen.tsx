import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GraduationCap, Phone, Lock, ChevronLeft, ArrowRight } from 'lucide-react-native';
import { authService } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import * as Haptics from 'expo-haptics';

// ─── Duolingo-style 3D Button ────────────────────────────────────────────────
const DuoButton = ({ onPress, disabled, loading, label }: any) => {
  const pressed = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.spring(pressed, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(pressed, { toValue: 0, useNativeDriver: true, speed: 50 }).start();
  };

  const translateY = pressed.interpolate({ inputRange: [0, 1], outputRange: [0, 3] });

  return (
    <View style={{ marginTop: 8 }}>
      {/* Shadow layer */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '100%',
        borderRadius: 16,
        backgroundColor: '#0055b3',
      }} />
      <Animated.View style={{ transform: [{ translateY }] }}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          activeOpacity={1}
          style={{
            backgroundColor: disabled ? '#93c5fd' : '#0072e6',
            borderRadius: 16,
            paddingVertical: 18,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 10,
            marginBottom: 4,
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 17, letterSpacing: 0.3 }}>
                {label}
              </Text>
              <ArrowRight size={20} color="white" strokeWidth={3} />
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// ─── Main Sign-In Screen ────────────────────────────────────────────────────
export const SignInScreen = ({ onSignIn }: { onSignIn: () => void }) => {
  const { setUserName, setUserAvatarUrl } = useAppStore();

  const [step, setStep] = useState<'PHONE' | 'NEEDS_PASSWORD' | 'NEEDS_SETUP'>('PHONE');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [tempParent, setTempParent] = useState<{ name: string; img: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');

  const handleCheckStatus = async () => {
    if (!phone.trim()) { setError('Please enter your phone number.'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    setError('');
    try {
      const result = await authService.checkPhoneStatus(phone.trim());
      if (result.success && result.status) {
        setTempParent({ name: result.name || 'User', img: result.img || null });
        setStep(result.status);
      } else {
        setError(result.error || 'Account not found. Please contact support.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalAuth = async () => {
    if (!password.trim()) { setError('Please enter your password.'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    setError('');
    try {
      const action = step === 'NEEDS_SETUP' ? 'setup' : 'signin';
      const result = await authService.authenticate(phone.trim(), password, action);
      if (result.success) {
        if (step === 'NEEDS_SETUP') {
          setHint('Password set! Please sign in.');
          setPassword('');
          setStep('NEEDS_PASSWORD');
          setIsLoading(false);
          return;
        }
        setUserName(tempParent?.name || 'User');
        setUserAvatarUrl(tempParent?.img || null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => onSignIn(), 600);
      } else {
        const errorMessage = result.error || 'Authentication failed.';
        if (errorMessage.toLowerCase().includes('password not set')) {
          setHint('Account reset by admin. Please choose a new password.');
          setPassword('');
          setStep('NEEDS_SETUP');
          setIsLoading(false);
          return;
        }
        setError(errorMessage);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (e) {
      setError('Authentication failed. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep('PHONE');
    setPassword('');
    setError('');
    setHint('');
  };

  const stepTitle = step === 'PHONE'
    ? 'Welcome back!'
    : step === 'NEEDS_SETUP'
    ? 'Create your password'
    : `Hi, ${tempParent?.name?.split(' ')[0]} 👋`;

  const stepSub = step === 'PHONE'
    ? 'Enter your registered phone number'
    : step === 'NEEDS_SETUP'
    ? 'Choose a strong password for your first login'
    : `Enter your password to continue`;

  const btnLabel = step === 'PHONE' ? 'Continue' : step === 'NEEDS_SETUP' ? 'Set Password' : 'Sign In';

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back button for password step */}
            {step !== 'PHONE' && (
              <TouchableOpacity
                onPress={handleBack}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, alignSelf: 'flex-start' }}
              >
                <View style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: '#f1f5f9', borderWidth: 2, borderColor: '#e2e8f0',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <ChevronLeft size={20} color="#1e293b" strokeWidth={2.5} />
                </View>
              </TouchableOpacity>
            )}

            {/* Logo + Brand */}
            <View style={{ alignItems: 'center', marginBottom: 40 }}>
              <View style={{
                width: 80, height: 80, borderRadius: 24,
                backgroundColor: '#0072e6',
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
                shadowColor: '#0055b3',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 8,
              }}>
                <GraduationCap size={40} color="white" />
              </View>
              <Text style={{ fontSize: 32, fontWeight: '900', color: '#1e293b', letterSpacing: -0.5 }}>
                Snap<Text style={{ color: '#0072e6' }}>School</Text>
              </Text>
              <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: '700', marginTop: 6, letterSpacing: 0.5 }}>
                PARENT PORTAL
              </Text>
            </View>

            {/* Step Heading */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontSize: 28, fontWeight: '900', color: '#1e293b', letterSpacing: -0.5, marginBottom: 8 }}>
                {stepTitle}
              </Text>
              <Text style={{ fontSize: 15, color: '#64748b', fontWeight: '700', lineHeight: 22 }}>
                {stepSub}
              </Text>
            </View>

            {/* Phone Input */}
            {step === 'PHONE' && (
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: 16,
                borderWidth: 2,
                borderColor: '#e2e8f0',
                paddingHorizontal: 18,
                paddingVertical: 16,
                marginBottom: 16,
                gap: 12,
              }}>
                <Phone size={20} color="#94a3b8" />
                <TextInput
                  value={phone}
                  onChangeText={t => { setPhone(t); setError(''); }}
                  placeholder="e.g. 55 666 777"
                  placeholderTextColor="#cbd5e1"
                  keyboardType="phone-pad"
                  autoFocus
                  style={{ flex: 1, color: '#1e293b', fontSize: 17, fontWeight: '700' }}
                />
              </View>
            )}

            {/* Password Input */}
            {step !== 'PHONE' && (
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: 16,
                borderWidth: 2,
                borderColor: '#e2e8f0',
                paddingHorizontal: 18,
                paddingVertical: 16,
                marginBottom: 16,
                gap: 12,
              }}>
                <Lock size={20} color="#94a3b8" />
                <TextInput
                  value={password}
                  onChangeText={t => { setPassword(t); setError(''); }}
                  placeholder={step === 'NEEDS_SETUP' ? 'Create a strong password' : 'Your password'}
                  placeholderTextColor="#cbd5e1"
                  secureTextEntry
                  autoFocus
                  style={{ flex: 1, color: '#1e293b', fontSize: 17, fontWeight: '700' }}
                />
              </View>
            )}

            {/* Error Banner */}
            {!!error && (
              <View style={{
                backgroundColor: '#fee2e2',
                borderRadius: 14,
                borderWidth: 2,
                borderColor: '#fca5a5',
                padding: 14,
                marginBottom: 16,
              }}>
                <Text style={{ color: '#dc2626', fontSize: 14, fontWeight: '800', textAlign: 'center' }}>
                  {error}
                </Text>
              </View>
            )}

            {/* Hint Banner */}
            {!!hint && (
              <View style={{
                backgroundColor: '#dcfce7',
                borderRadius: 14,
                borderWidth: 2,
                borderColor: '#86efac',
                padding: 14,
                marginBottom: 16,
              }}>
                <Text style={{ color: '#16a34a', fontSize: 14, fontWeight: '800', textAlign: 'center' }}>
                  ✓ {hint}
                </Text>
              </View>
            )}

            {/* 3D CTA Button */}
            <DuoButton
              onPress={step === 'PHONE' ? handleCheckStatus : handleFinalAuth}
              disabled={isLoading}
              loading={isLoading}
              label={btnLabel}
            />

            {/* Footer */}
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ fontSize: 12, color: '#cbd5e1', fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>
                Secure Institutional Access
              </Text>
              <Text style={{ fontSize: 11, color: '#e2e8f0', fontWeight: '700', marginTop: 8, textAlign: 'center', lineHeight: 18 }}>
                Account management handled by SnapSchool Admin.{'\n'}
                Contact your school if you need to update your number.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};
