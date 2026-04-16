import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GraduationCap, Phone, ArrowRight, BookOpen, Lock, ChevronLeft } from 'lucide-react-native';
import { authService } from '../services/api';
import { useAppStore } from '../store/useAppStore';

// ─── Main Sign-In Screen ────────────────────────────────────────────────────
export const SignInScreen = ({ onSignIn }: { onSignIn: () => void }) => {
  const { setParentName, setParentAvatarUrl } = useAppStore();
  
  // State Machine
  const [step, setStep] = useState<'PHONE' | 'NEEDS_PASSWORD' | 'NEEDS_SETUP'>('PHONE');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [tempParent, setTempParent] = useState<{ name: string; img: string | null } | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');

  // Step 1: Check Phone Status
  const handleCheckStatus = async () => {
    if (!phone.trim()) {
      setError('Please enter your phone number.');
      return;
    }
    setIsLoading(true);
    setError('');
    
    try {
      const result = await authService.checkPhoneStatus(phone.trim());
      if (result.success && result.status) {
        setTempParent({ name: result.name || 'Parent', img: result.img || null });
        setStep(result.status);
      } else {
        setError(result.error || 'Account not found. Please contact support.');
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Finalize Auth (Setup or Signin)
  const handleFinalAuth = async () => {
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const action = step === 'NEEDS_SETUP' ? 'setup' : 'signin';
      const result = await authService.authenticate(phone.trim(), password, action);

      if (result.success) {
        if (step === 'NEEDS_SETUP') {
          // As requested: After setup, move to SIGN IN step rather than auto-login
          setHint('Password set successfully! Now please sign in.');
          setPassword('');
          setStep('NEEDS_PASSWORD');
          setIsLoading(false);
          return;
        }

        setParentName(tempParent?.name || 'Parent');
        setParentAvatarUrl(tempParent?.img || null);
        setHint('Glad to see you again!');
        setTimeout(() => onSignIn(), 800);
      } else {
        const errorMessage = result.error || 'Authentication failed.';
        
        // SMART AUTO-HEAL: If admin reset the password while the app was in 'PASSWORD' mode,
        // we immediately transition them to the SETUP screen so they don't have to re-enter their phone.
        if (errorMessage.toLowerCase().includes('password not set')) {
          setHint('Account reset by admin. Please choose a new password.');
          setPassword('');
          setStep('NEEDS_SETUP');
          setIsLoading(false);
          return;
        }
        setError(errorMessage);
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
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0a1628' }}>
      <StatusBar barStyle="light-content" />

      {/* Decorative blobs */}
      <View style={{ position: 'absolute', top: -100, right: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: '#0055d4', opacity: 0.3 }} />
      <View style={{ position: 'absolute', bottom: 0, left: -100, width: 250, height: 250, borderRadius: 125, backgroundColor: '#6366f1', opacity: 0.2 }} />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo */}
            <View style={{ alignItems: 'center', marginBottom: 40 }}>
              <View style={{
                width: 70, height: 70, borderRadius: 24,
                backgroundColor: 'rgba(255,255,255,0.12)',
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
              }}>
                <GraduationCap size={35} color="#ffffff" />
              </View>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 }}>
                SnapSchool
              </Text>
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', fontWeight: '500' }}>
                Official Parent Portal
              </Text>
            </View>

            {/* Main Card */}
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.07)',
              borderRadius: 32,
              padding: 24,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
            }}>
              
              {/* Header based on step */}
              {step !== 'PHONE' && (
                <TouchableOpacity onPress={handleBack} style={{ marginBottom: 16, alignSelf: 'flex-start' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', opacity: 0.6 }}>
                    <ChevronLeft size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 13 }}>Change number</Text>
                  </View>
                </TouchableOpacity>
              )}

              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 22, marginBottom: 8 }}>
                {step === 'PHONE' ? 'Welcome' : step === 'NEEDS_SETUP' ? 'Account Setup' : `Welcome back`}
              </Text>
              
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 24, lineHeight: 22 }}>
                {step === 'PHONE' 
                  ? 'Enter your registered phone number to access your account.' 
                  : step === 'NEEDS_SETUP' 
                    ? `Hello ${tempParent?.name?.split(' ')[0]}, please create a password for your first login.`
                    : `Please enter the password for ${tempParent?.name?.split(' ')[0]} (${phone}).`}
              </Text>

              {/* Step 1: Phone */}
              {step === 'PHONE' && (
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderRadius: 20, borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.15)',
                  paddingHorizontal: 20, paddingVertical: 16,
                  marginBottom: 16,
                }}>
                  <Phone size={20} color="rgba(255,255,255,0.5)" style={{ marginRight: 12 }} />
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="e.g. 55 666 777"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="phone-pad"
                    autoFocus={true}
                    style={{ flex: 1, color: '#ffffff', fontSize: 17, fontWeight: '500' }}
                  />
                </View>
              )}

              {/* Step 2: Password (Setup or Login) */}
              {step !== 'PHONE' && (
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderRadius: 20, borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.15)',
                  paddingHorizontal: 20, paddingVertical: 16,
                  marginBottom: 16,
                }}>
                  <Lock size={20} color="rgba(255,255,255,0.5)" style={{ marginRight: 12 }} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder={step === 'NEEDS_SETUP' ? "Create a strong password" : "Your password"}
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    secureTextEntry
                    autoFocus={true}
                    style={{ flex: 1, color: '#ffffff', fontSize: 17, fontWeight: '500' }}
                  />
                </View>
              )}

              {/* Error/Hint display */}
              {error ? (
                <View style={{
                  backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 14,
                  padding: 14, marginBottom: 16,
                  borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
                }}>
                  <Text style={{ color: '#fca5a5', fontSize: 13, textAlign: 'center' }}>{error}</Text>
                </View>
              ) : null}

              {hint ? (
                <View style={{
                  backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 14,
                  padding: 14, marginBottom: 16,
                  borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
                }}>
                  <Text style={{ color: '#86efac', fontSize: 14, textAlign: 'center', fontWeight: '600' }}>✓ {hint}</Text>
                </View>
              ) : null}

              {/* Submit button */}
              <TouchableOpacity
                onPress={step === 'PHONE' ? handleCheckStatus : handleFinalAuth}
                disabled={isLoading}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 20, paddingVertical: 20,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2, shadowRadius: 8, elevation: 5
                }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#0055d4" />
                ) : (
                  <>
                    <Text style={{ color: '#0055d4', fontWeight: 'bold', fontSize: 17, marginRight: 8 }}>
                      {step === 'PHONE' ? 'Continue' : step === 'NEEDS_SETUP' ? 'Set Password & Start' : 'Sign In'}
                    </Text>
                    <ArrowRight size={20} color="#0055d4" />
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Footer Information */}
            <View style={{ alignItems: 'center', marginTop: 32 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', opacity: 0.3 }}>
                <BookOpen size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text style={{ color: '#fff', fontSize: 12 }}>
                  Secure Institutional Access
                </Text>
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11, marginTop: 8, textAlign: 'center' }}>
                Account management handled by SnapSchool Admin.{'\n'}
                Contact your school if you need to update your phone number.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};
