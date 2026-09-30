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
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GraduationCap, Phone, Lock, ChevronLeft, ArrowRight, Mail, Eye, EyeOff, ShieldCheck } from 'lucide-react-native';
import { authService } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { useLanguage, Language } from '../context/LanguageContext';

export const SignInScreen = ({
  role,
  onSignIn,
  onBack,
  onNavigateToSignUp,
}: {
  role: 'parent' | 'teacher' | 'admin';
  onSignIn: () => void;
  onBack: () => void;
  onNavigateToSignUp?: (phone?: string) => void;
}) => {
  const { setUserName, setUserAvatarUrl, setChildren, setSelectedChildId, setUserId, setUserRole } = useAppStore();
  const { language, setLanguage, t, isRTL } = useLanguage();

  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardOffset, setKeyboardOffset] = useState<number>(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardOffset(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardOffset(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const [step, setStep] = useState<'PHONE' | 'NEEDS_PASSWORD' | 'NEEDS_SETUP'>('PHONE');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tempParent, setTempParent] = useState<{ name: string; img: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);

  const handleCheckStatus = async () => {
    Keyboard.dismiss();
    if (!phone.trim()) {
      setError(t?.pleaseEnterYourPhoneNumber || 'Veuillez entrer votre numéro de téléphone.');
      return;
    }
    setIsLoading(true);
    setError('');
    setShowSignUpPrompt(false);
    try {
      const result = await authService.checkPhoneStatus(phone.trim(), role);
      if (result.success && result.status) {
        setTempParent({ name: result.name || 'User', img: result.img || null });
        setStep(result.status);
      } else {
        if (role === 'parent' && result.notFound) {
          setShowSignUpPrompt(true);
        } else {
          setError(result.error || (t?.accountNotFoundPleaseContact || 'Compte introuvable. Veuillez contacter l’administration.'));
        }
      }
    } catch (e) {
      setError(t?.networkErrorPleaseTryAgain || 'Erreur réseau. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalAuth = async () => {
    Keyboard.dismiss();
    if (role === 'admin' && !phone.trim()) {
      setError(language === 'ar' ? 'الرجاء إدخال البريد الإلكتروني' : 'Veuillez entrer votre email');
      return;
    }
    if (!password.trim()) {
      setError(t?.pleaseEnterYourPassword || 'Veuillez entrer votre mot de passe.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const action = step === 'NEEDS_SETUP' ? 'setup' : 'signin';
      const result = await authService.authenticate(phone.trim(), password, action, role);
      if (result.success) {
        if (step === 'NEEDS_SETUP') {
          setHint(t?.passwordSetPleaseSignIn || 'Mot de passe configuré ! Veuillez vous connecter.');
          setPassword('');
          setStep('NEEDS_PASSWORD');
          setIsLoading(false);
          return;
        }
        if (result.name) setUserName(result.name);
        else if (tempParent?.name) setUserName(tempParent.name);
        if (result.img) setUserAvatarUrl(result.img);
        else if (tempParent?.img) setUserAvatarUrl(tempParent.img);
        if (result.userId) setUserId(result.userId);
        if (result.userType) setUserRole(result.userType as any);
        if (result.students && Array.isArray(result.students) && result.students.length > 0) {
          setChildren(result.students);
          setSelectedChildId(result.students[0].id);
        }
        onSignIn();
      } else {
        const errorMessage = result.error || 'Échec de la connexion.';
        if (errorMessage.toLowerCase().includes('password not set')) {
          setHint(t?.accountResetByAdminPlease || 'Mot de passe réinitialisé. Veuillez en choisir un nouveau.');
          setPassword('');
          setStep('NEEDS_SETUP');
          setIsLoading(false);
          return;
        }
        setError(errorMessage);
        setIsLoading(false);
      }
    } catch (e) {
      setError(t?.authenticationFailedPleaseCheckYour || 'Erreur d’authentification. Vérifiez votre connexion.');
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

  const stepTitle = role === 'admin' 
    ? (language === 'ar' ? 'تسجيل دخول الإدارة' : 'Connexion Direction') 
    : step === 'PHONE'
    ? (language === 'ar' ? 'مرحباً بك مجدداً !' : 'Bon retour parmi nous !')
    : step === 'NEEDS_SETUP'
    ? (t?.createYourPassword || 'Créez votre mot de passe')
    : (language === 'ar' ? `مرحباً، ${tempParent?.name?.split(' ')[0]} 👋` : `Bonjour, ${tempParent?.name?.split(' ')[0]} 👋`);

  const stepSub = role === 'admin' 
    ? (language === 'ar' ? 'أدخل بريدك الإلكتروني وكلمة السر' : 'Entrez vos identifiants pour continuer') 
    : step === 'PHONE'
    ? (language === 'ar' ? 'أدخل رقم هاتفك للوصول إلى متابعة أبنائك' : 'Entrez votre numéro pour accéder au suivi scolaire')
    : step === 'NEEDS_SETUP'
    ? (t?.chooseAStrongPasswordFor || 'Choisissez un mot de passe pour votre premier accès')
    : (language === 'ar' ? 'أدخل كلمة السر للمتابعة' : 'Entrez votre mot de passe pour continuer');

  const loadingLabel = (role === 'admin' || step !== 'PHONE' && step !== 'NEEDS_SETUP') 
    ? (language === 'ar' ? 'جاري الدخول...' : 'Connexion...') 
    : step === 'PHONE'
    ? (language === 'ar' ? 'جاري التحقق...' : 'Vérification...')
    : (language === 'ar' ? 'جاري التفعيل...' : 'Activation...');

  const btnLabel = role === 'admin' 
    ? (t?.signIn || 'Se connecter') 
    : step === 'PHONE'
    ? (language === 'ar' ? 'متابعة' : 'Continuer')
    : step === 'NEEDS_SETUP'
    ? (t?.setPassword || 'Définir le mot de passe')
    : (t?.signIn || 'Se connecter');

  const portalLabel = role === 'parent' 
    ? (language === 'ar' ? 'فضاء الأولياء' : 'ESPACE PARENTS') 
    : role === 'teacher' 
    ? (language === 'ar' ? 'فضاء الأساتذة' : 'ESPACE ENSEIGNANTS') 
    : (language === 'ar' ? 'بوابة الإدارة' : 'ESPACE DIRECTION');

  return (
    <View style={{ flex: 1, backgroundColor: '#eef5ff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#eef5ff" />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* TOP BAR: BACK & LANGUAGE SELECTOR */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: 8,
              paddingBottom: 10,
            }}
          >
            <TouchableOpacity
              onPress={handleBack}
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                backgroundColor: '#ffffff',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <ChevronLeft
                size={20}
                color="#1e293b"
                strokeWidth={2.5}
                style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }}
              />
            </TouchableOpacity>

            {/* Language Selector matching Dribbble aesthetic */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: '#ffffff',
                borderRadius: 16,
                padding: 3,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              {[
                { id: 'ar', label: 'العربية 🇹🇳' },
                { id: 'fr', label: 'Français 🇫🇷' },
                { id: 'en', label: 'English 🇬🇧' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setLanguage(item.id as Language)}
                  style={{
                    paddingHorizontal: 11,
                    paddingVertical: 6,
                    borderRadius: 13,
                    backgroundColor: language === item.id ? '#0055d4' : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11.5,
                      fontWeight: '800',
                      color: language === item.id ? '#ffffff' : '#64748b',
                    }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* HERO BRAND ICON & TITLE (AIRY, FLOATING) */}
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 22 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 24,
                backgroundColor: '#0055d4',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
                shadowColor: '#0055d4',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.28,
                shadowRadius: 14,
                elevation: 8,
              }}
            >
              <GraduationCap size={36} color="#ffffff" strokeWidth={2.2} />
            </View>
            <Text
              style={{
                fontSize: 28,
                fontWeight: '900',
                color: '#0f172a',
                letterSpacing: -0.8,
              }}
            >
              Snap<Text style={{ color: '#0055d4' }}>School</Text>
            </Text>
            <View
              style={{
                backgroundColor: 'rgba(0, 85, 212, 0.08)',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 8,
                marginTop: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: '#0055d4',
                  fontWeight: '800',
                  letterSpacing: 0.8,
                }}
              >
                {portalLabel}
              </Text>
            </View>
          </View>

          {/* CURVED WHITE BOTTOM SHEET FORM (DRIBBLE SIGNATURE STYLE) */}
          <View
            style={{
              flex: 1,
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.06,
              shadowRadius: 14,
              elevation: 10,
              overflow: 'hidden',
            }}
          >
            <ScrollView
              ref={scrollViewRef}
              style={{ flex: 1 }}
              contentContainerStyle={{
                flexGrow: 1,
                paddingHorizontal: 24,
                paddingTop: 28,
                paddingBottom: keyboardOffset > 0 ? keyboardOffset + 40 : 40,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              automaticallyAdjustKeyboardInsets={true}
            >
              {/* Heading */}
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: '900',
                    color: '#0f172a',
                    letterSpacing: -0.5,
                    marginBottom: 6,
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                >
                  {stepTitle}
                </Text>
                <Text
                  style={{
                    fontSize: 13.5,
                    color: '#64748b',
                    fontWeight: '500',
                    lineHeight: 20,
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                >
                  {stepSub}
                </Text>
              </View>

              {/* PHONE / EMAIL INPUT (DRIBBLE PILL/SQUIRCLE) */}
              {(role === 'admin' || step === 'PHONE') && (
                <View style={{ marginBottom: 18 }}>
                  <Text
                    style={{
                      fontSize: 12.5,
                      fontWeight: '800',
                      color: '#475569',
                      marginBottom: 7,
                      textAlign: isRTL ? 'right' : 'left',
                    }}
                  >
                    {role === 'admin'
                      ? (language === 'ar' ? 'البريد الإلكتروني' : 'Adresse Email')
                      : (language === 'ar' ? 'رقم الهاتف الجوال' : 'Numéro de téléphone')}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#f8fafc',
                      borderRadius: 16,
                      borderWidth: 1.5,
                      borderColor: '#e2e8f0',
                      paddingHorizontal: 16,
                      height: 54,
                    }}
                  >
                    {role === 'admin' ? (
                      <Mail size={20} color="#94a3b8" />
                    ) : (
                      <Phone size={20} color="#94a3b8" />
                    )}
                    <View
                      style={{
                        width: 1,
                        height: 20,
                        backgroundColor: '#e2e8f0',
                        marginHorizontal: 12,
                      }}
                    />
                    <TextInput
                      value={phone}
                      onChangeText={(v) => {
                        setPhone(v);
                        setError('');
                      }}
                      placeholder={
                        role === 'admin'
                          ? 'directeur@ecole.tn'
                          : (t?.eg55666777 || 'ex: 22 345 678')
                      }
                      placeholderTextColor="#94a3b8"
                      keyboardType={role === 'admin' ? 'email-address' : 'phone-pad'}
                      autoCapitalize={role === 'admin' ? 'none' : undefined}
                      autoComplete={role === 'admin' ? 'email' : undefined}
                      style={{
                        flex: 1,
                        color: '#0f172a',
                        fontSize: 16,
                        fontWeight: '700',
                        textAlign: isRTL ? 'right' : 'left',
                      }}
                    />
                  </View>
                </View>
              )}

              {/* PASSWORD INPUT (DRIBBLE PILL/SQUIRCLE) */}
              {(role === 'admin' || step !== 'PHONE') && (
                <View style={{ marginBottom: 18 }}>
                  <Text
                    style={{
                      fontSize: 12.5,
                      fontWeight: '800',
                      color: '#475569',
                      marginBottom: 7,
                      textAlign: isRTL ? 'right' : 'left',
                    }}
                  >
                    {language === 'ar' ? 'كلمة المرور' : 'Mot de passe'}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#f8fafc',
                      borderRadius: 16,
                      borderWidth: 1.5,
                      borderColor: '#e2e8f0',
                      paddingHorizontal: 16,
                      height: 54,
                    }}
                  >
                    <Lock size={20} color="#94a3b8" />
                    <View
                      style={{
                        width: 1,
                        height: 20,
                        backgroundColor: '#e2e8f0',
                        marginHorizontal: 12,
                      }}
                    />
                    <TextInput
                      value={password}
                      onChangeText={(v) => {
                        setPassword(v);
                        setError('');
                      }}
                      placeholder={
                        step === 'NEEDS_SETUP'
                          ? (t?.createAStrongPassword || 'Au moins 6 caractères')
                          : '••••••••'
                      }
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showPassword}
                      style={{
                        flex: 1,
                        color: '#0f172a',
                        fontSize: 16,
                        fontWeight: '700',
                        textAlign: isRTL ? 'right' : 'left',
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={{ padding: 6 }}
                    >
                      {showPassword ? (
                        <EyeOff size={19} color="#94a3b8" />
                      ) : (
                        <Eye size={19} color="#94a3b8" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ERROR BANNER */}
              {!!error && (
                <View
                  style={{
                    backgroundColor: '#fef2f2',
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: '#fecaca',
                    padding: 12,
                    marginBottom: 16,
                  }}
                >
                  <Text
                    style={{
                      color: '#b91c1c',
                      fontSize: 13.5,
                      fontWeight: '700',
                      textAlign: 'center',
                    }}
                  >
                    {error}
                  </Text>
                </View>
              )}

              {/* HINT BANNER */}
              {!!hint && (
                <View
                  style={{
                    backgroundColor: '#ecfdf5',
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: '#a7f3d0',
                    padding: 12,
                    marginBottom: 16,
                  }}
                >
                  <Text
                    style={{
                      color: '#059669',
                      fontSize: 13.5,
                      fontWeight: '700',
                      textAlign: 'center',
                    }}
                  >
                    ✓ {hint}
                  </Text>
                </View>
              )}

              {/* UNASSOCIATED NUMBER -> SMOOTH SIGN UP CARD */}
              {showSignUpPrompt && role === 'parent' && (
                <View
                  style={{
                    backgroundColor: '#eff6ff',
                    borderRadius: 18,
                    borderWidth: 1.5,
                    borderColor: '#bfdbfe',
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <Text
                    style={{
                      color: '#1e40af',
                      fontSize: 13.5,
                      fontWeight: '700',
                      textAlign: 'center',
                      marginBottom: 10,
                      lineHeight: 19,
                    }}
                  >
                    {language === 'ar'
                      ? 'هذا الرقم غير مسجل بعد في فضاء الأولياء.'
                      : 'Ce numéro n’est pas encore associé à un compte parent.'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => onNavigateToSignUp && onNavigateToSignUp(phone.trim())}
                    style={{
                      backgroundColor: '#0055d4',
                      borderRadius: 14,
                      paddingVertical: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 14 }}>
                      {language === 'ar'
                        ? 'إنشاء حساب وربط التلميذ الآن ←'
                        : 'Créer mon compte et lier mon enfant →'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* MAIN SUBMIT BUTTON */}
              <TouchableOpacity
                onPress={(role === 'admin' || step !== 'PHONE') ? handleFinalAuth : handleCheckStatus}
                disabled={isLoading}
                style={{
                  backgroundColor: '#0055d4',
                  borderRadius: 18,
                  height: 54,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  shadowColor: '#0055d4',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.28,
                  shadowRadius: 10,
                  elevation: 4,
                  marginTop: 6,
                  opacity: isLoading ? 0.85 : 1,
                }}
              >
                {isLoading ? (
                  <>
                    <ActivityIndicator color="#ffffff" size="small" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 16 }}>
                      {loadingLabel}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text
                      style={{
                        color: '#ffffff',
                        fontWeight: '800',
                        fontSize: 16,
                        marginRight: 6,
                      }}
                    >
                      {btnLabel}
                    </Text>
                    <ArrowRight
                      size={18}
                      color="#ffffff"
                      strokeWidth={2.5}
                      style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }}
                    />
                  </>
                )}
              </TouchableOpacity>

              {/* SIGN UP LINK FOR PARENTS */}
              {role === 'parent' && step === 'PHONE' && onNavigateToSignUp && (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: 22,
                    gap: 6,
                  }}
                >
                  <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '500' }}>
                    {language === 'ar' ? 'جديد على التطبيق ؟' : 'Nouveau sur l’application ?'}
                  </Text>
                  <TouchableOpacity onPress={() => onNavigateToSignUp(phone.trim())}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0055d4' }}>
                      {language === 'ar' ? 'تسجيل حساب' : 'S’inscrire'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* INSTITUTIONAL REASSURANCE FOOTER */}
              <View style={{ alignItems: 'center', marginTop: 28, paddingBottom: 10 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 4,
                  }}
                >
                  <ShieldCheck size={14} color="#94a3b8" style={{ marginRight: 5 }} />
                  <Text
                    style={{
                      fontSize: 11,
                      color: '#94a3b8',
                      fontWeight: '800',
                      letterSpacing: 0.8,
                      textTransform: 'uppercase',
                    }}
                  >
                    Accès Sécurisé Établissement
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 11.5,
                    color: '#94a3b8',
                    fontWeight: '500',
                    textAlign: 'center',
                    lineHeight: 16,
                  }}
                >
                  {t?.accountManagementHandledBySnapschool ||
                    'Gestion centralisée par la direction de SnapSchool.'}
                </Text>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};
