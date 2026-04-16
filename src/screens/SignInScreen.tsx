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
import { GraduationCap, Phone, ArrowRight, BookOpen } from 'lucide-react-native';
import { authService } from '../services/api';

// ─── Main Sign-In Screen ────────────────────────────────────────────────────
export const SignInScreen = ({ onSignIn }: { onSignIn: () => void }) => {
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');

  const handleLogin = async () => {
    if (!phone.trim()) {
      setError('Please enter your phone number.');
      return;
    }
    setIsLoading(true);
    setError('');
    setHint('');

    try {
      const result = await authService.login(phone.trim());

      if (result.success) {
        setHint(`Welcome back, ${result.parentName?.split(' ')[0]}!`);
        setTimeout(() => onSignIn(), 800); // brief flash of welcome message
      } else {
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch (e) {
      setError('A network error occurred. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
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
            <View style={{ alignItems: 'center', marginBottom: 48 }}>
              <View style={{
                width: 80, height: 80, borderRadius: 28,
                backgroundColor: 'rgba(255,255,255,0.12)',
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
              }}>
                <GraduationCap size={40} color="#ffffff" />
              </View>
              <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 }}>
                SnapSchool
              </Text>
              <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', fontWeight: '500' }}>
                Parent Companion
              </Text>
            </View>

            {/* Card */}
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.07)',
              borderRadius: 28,
              padding: 24,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
            }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 20, marginBottom: 6 }}>
                Sign In
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 24 }}>
                Enter the phone number linked to your parent account.
              </Text>

              {/* Email input */}
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: 18, borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.15)',
                paddingHorizontal: 18, paddingVertical: 14,
                marginBottom: 16,
              }}>
                <Phone size={20} color="rgba(255,255,255,0.5)" style={{ marginRight: 12 }} />
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="e.g. 55666777"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                  style={{ flex: 1, color: '#ffffff', fontSize: 16, fontWeight: '500' }}
                />
              </View>

              {/* Error */}
              {error ? (
                <View style={{
                  backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 12,
                  padding: 14, marginBottom: 16,
                  borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
                }}>
                  <Text style={{ color: '#fca5a5', fontSize: 13, textAlign: 'center' }}>{error}</Text>
                </View>
              ) : null}

              {/* Success hint */}
              {hint ? (
                <View style={{
                  backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 12,
                  padding: 14, marginBottom: 16,
                  borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
                }}>
                  <Text style={{ color: '#86efac', fontSize: 14, textAlign: 'center', fontWeight: '600' }}>✓ {hint}</Text>
                </View>
              ) : null}

              {/* Submit button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={isLoading || !phone}
                style={{
                  backgroundColor: phone ? '#ffffff' : 'rgba(255,255,255,0.25)',
                  borderRadius: 18, paddingVertical: 18,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#0055d4" />
                ) : (
                  <>
                    <Text style={{ color: '#0055d4', fontWeight: 'bold', fontSize: 16, marginRight: 8 }}>
                      Continue
                    </Text>
                    <ArrowRight size={20} color="#0055d4" />
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={{ alignItems: 'center', marginTop: 32 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <BookOpen size={14} color="rgba(255,255,255,0.25)" style={{ marginRight: 6 }} />
                <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
                  Powered by SnapSchool Admin
                </Text>
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11, marginTop: 6 }}>
                Use the phone number from your admin account
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};
