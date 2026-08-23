import React, { useState, useEffect, useRef } from 'react';
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
import { GraduationCap, Phone, Lock, ChevronLeft, ArrowRight, Globe, Check } from 'lucide-react-native';
import { authService } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { useLanguage, Language } from '../context/LanguageContext';
import * as Haptics from 'expo-haptics';

export const SignInScreen = ({ role, onSignIn, onBack }: { role: 'parent' | 'teacher', onSignIn: () => void, onBack: () => void }) => {
  const { setUserName, setUserAvatarUrl } = useAppStore();
  const { language, setLanguage, t, isRTL } = useLanguage();

  const [step, setStep] = useState<'PHONE' | 'NEEDS_PASSWORD' | 'NEEDS_SETUP'>('PHONE');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [tempParent, setTempParent] = useState<{ name: string; img: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');

  // Animated dots for loading overlay
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isLoading) return;
    const animateDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -8, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      ).start();
    animateDot(dot1, 0);
    animateDot(dot2, 150);
    animateDot(dot3, 300);
    return () => { dot1.stopAnimation(); dot2.stopAnimation(); dot3.stopAnimation(); };
  }, [isLoading]);

  const handleCheckStatus = async () => {
    if (!phone.trim()) { 
      setError((t?.pleaseEnterYourPhoneNumber || 'Please enter your phone number.')); 
      return; 
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoadingMessage(language === 'ar' ? 'جاري التحقق...' : language === 'fr' ? 'Vérification...' : 'Checking your account...');
    setIsLoading(true);
    setError('');
    try {
      const result = await authService.checkPhoneStatus(phone.trim(), role);
      if (result.success && result.status) {
        setTempParent({ name: result.name || 'User', img: result.img || null });
        setStep(result.status);
      } else {
        setError(result.error || ((t?.accountNotFoundPleaseContact || 'Account not found. Please contact support.')));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (e) {
      setError((t?.networkErrorPleaseTryAgain || 'Network error. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalAuth = async () => {
    if (!password.trim()) { 
      setError((t?.pleaseEnterYourPassword || 'Please enter your password.')); 
      return; 
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoadingMessage(
      step === 'NEEDS_SETUP'
        ? (language === 'ar' ? 'جاري إنشاء كلمة المرور...' : language === 'fr' ? 'Création du mot de passe...' : 'Setting up your password...')
        : (language === 'ar' ? 'جاري تسجيل الدخول...' : language === 'fr' ? 'Connexion en cours...' : 'Signing you in...')
    );
    setIsLoading(true);
    setError('');
    try {
      const action = step === 'NEEDS_SETUP' ? 'setup' : 'signin';
      const result = await authService.authenticate(phone.trim(), password, action, role);
      if (result.success) {
        if (step === 'NEEDS_SETUP') {
          setHint((t?.passwordSetPleaseSignIn || 'Password set! Please sign in.'));
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
          setHint((t?.accountResetByAdminPlease || 'Account reset by admin. Please choose a new password.'));
          setPassword('');
          setStep('NEEDS_SETUP');
          setIsLoading(false);
          return;
        }
        setError(errorMessage);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (e) {
      setError((t?.authenticationFailedPleaseCheckYour || 'Authentication failed. Please check your connection.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'PHONE') {
      onBack();
    } else {
      setStep('PHONE');
      setPassword('');
      setError('');
      setHint('');
    }
  };

  const stepTitle = step === 'PHONE'
    ? ((t?.welcomeBack || 'Welcome back!'))
    : step === 'NEEDS_SETUP'
    ? ((t?.createYourPassword || 'Create your password'))
    : (language === 'ar' ? `مرحباً، ${tempParent?.name?.split(' ')[0]} 👋` : `Hi, ${tempParent?.name?.split(' ')[0]} 👋`);

  const stepSub = step === 'PHONE'
    ? ((t?.enterYourRegisteredPhoneNumber || 'Enter your registered phone number'))
    : step === 'NEEDS_SETUP'
    ? ((t?.chooseAStrongPasswordFor || 'Choose a strong password for your first login'))
    : (language === 'ar' ? 'أدخل كلمة السر للمتابعة' : language === 'fr' ? 'Entrez votre mot de passe pour continuer' : `Enter your password to continue`);

  const btnLabel = step === 'PHONE' 
    ? ((t?.continue || 'Continue')) 
    : step === 'NEEDS_SETUP' 
    ? ((t?.setPassword || 'Set Password')) 
    : ((t?.signIn || 'Sign In'));

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Full-screen loading overlay */}
      {isLoading && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(255,255,255,0.97)',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 999,
        }}>
          <View style={{
            width: 80, height: 80, borderRadius: 24,
            backgroundColor: '#0055d4',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 24,
            shadowColor: '#0055d4',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 10,
          }}>
            <GraduationCap size={40} color="white" />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
            {[dot1, dot2, dot3].map((dot, i) => (
              <Animated.View key={i} style={{
                width: 10, height: 10, borderRadius: 5,
                backgroundColor: '#0055d4',
                transform: [{ translateY: dot }],
              }} />
            ))}
          </View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#2b3437', textAlign: 'center' }}>
            {loadingMessage}
          </Text>
          <Text style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>
            {language === 'ar' ? 'الرجاء الانتظار' : language === 'fr' ? 'Veuillez patienter' : 'Please wait...'}
          </Text>
        </View>
      )}

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Top Bar: Back Button & Language Selector */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <TouchableOpacity
                onPress={handleBack}
                style={{
                  width: 40, height: 40, borderRadius: 14,
                  backgroundColor: '#f1f4f6',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <ChevronLeft size={20} color="#2b3437" strokeWidth={3} style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }} />
              </TouchableOpacity>

              {/* Language Selection Segmented Control */}
              <View style={{
                flexDirection: 'row',
                backgroundColor: '#f8fafc',
                borderRadius: 16,
                padding: 3,
                borderWidth: 1,
                borderColor: '#e2e8f0',
              }}>
                {[
                  { id: 'ar', label: 'العربية 🇹🇳' },
                  { id: 'fr', label: 'Français 🇫🇷' },
                  { id: 'en', label: 'English 🇬🇧' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setLanguage(item.id as Language)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 12,
                      backgroundColor: language === item.id ? '#0055d4' : 'transparent',
                    }}
                  >
                    <Text style={{
                      fontSize: 11,
                      fontWeight: '800',
                      color: language === item.id ? 'white' : '#64748b',
                    }}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Logo + Brand */}
            <View style={{ alignItems: 'center', marginBottom: 32 }}>
              <View style={{
                width: 76, height: 76, borderRadius: 24,
                backgroundColor: '#0055d4',
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
                shadowColor: '#0055d4',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.2,
                shadowRadius: 15,
                elevation: 8,
              }}>
                <GraduationCap size={38} color="white" />
              </View>
              <Text style={{ fontSize: 34, fontWeight: '900', color: '#2b3437', letterSpacing: -1 }}>
                Snap<Text style={{ color: '#0055d4' }}>School</Text>
              </Text>
              <Text style={{ fontSize: 13, color: '#737c7f', fontWeight: 'bold', marginTop: 4, letterSpacing: 1 }}>
                {role === 'parent' ? ((t?.parentPortal || 'PARENT PORTAL')) : ((t?.teacherPortal || 'TEACHER PORTAL'))}
              </Text>
            </View>

            {/* Step Heading */}
            <View style={{ marginBottom: 28, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={{ fontSize: 26, fontWeight: '900', color: '#2b3437', letterSpacing: -0.5, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }}>
                {stepTitle}
              </Text>
              <Text style={{ fontSize: 14, color: '#737c7f', fontWeight: '600', lineHeight: 20, textAlign: isRTL ? 'right' : 'left' }}>
                {stepSub}
              </Text>
            </View>

            {/* Phone Input */}
            {step === 'PHONE' && (
              <View style={{
                flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center',
                backgroundColor: '#f8fbff',
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                paddingHorizontal: 18,
                paddingVertical: 16,
                marginBottom: 16,
                gap: 12,
              }}>
                <Phone size={22} color="#737c7f" />
                <TextInput
                  value={phone}
                  onChangeText={t => { setPhone(t); setError(''); }}
                  placeholder={(t?.eg55666777 || 'e.g. 55 666 777')}
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  autoFocus
                  style={{ flex: 1, color: '#2b3437', fontSize: 18, fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left' }}
                />
              </View>
            )}

            {/* Password Input */}
            {step !== 'PHONE' && (
              <View style={{
                flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center',
                backgroundColor: '#f8fbff',
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                paddingHorizontal: 18,
                paddingVertical: 16,
                marginBottom: 16,
                gap: 12,
              }}>
                <Lock size={22} color="#737c7f" />
                <TextInput
                  value={password}
                  onChangeText={t => { setPassword(t); setError(''); }}
                  placeholder={step === 'NEEDS_SETUP' ? ((t?.createAStrongPassword || 'Create a strong password')) : ((t?.yourPassword || 'Your password'))}
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  autoFocus
                  style={{ flex: 1, color: '#2b3437', fontSize: 18, fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left' }}
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

            {/* Standard Flat Button */}
            <TouchableOpacity
              onPress={step === 'PHONE' ? handleCheckStatus : handleFinalAuth}
              disabled={isLoading}
              style={{
                backgroundColor: isLoading ? '#93c5fd' : '#0055d4',
                borderRadius: 20,
                paddingVertical: 18,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: isRTL ? 'row-reverse' : 'row',
                gap: 10,
                marginTop: 8,
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>
                    {btnLabel}
                  </Text>
                  <ArrowRight size={20} color="white" strokeWidth={2.5} style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }} />
                </>
              )}
            </TouchableOpacity>

            {/* Footer */}
            <View style={{ alignItems: 'center', marginTop: 32 }}>
              <Text style={{ fontSize: 11, color: '#bdc3c7', fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' }}>
                Secure Institutional Access
              </Text>
              <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 6, textAlign: 'center', lineHeight: 16 }}>
                {(t?.accountManagementHandledBySnapschool || 'Account management handled by SnapSchool Admin.')}
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};
