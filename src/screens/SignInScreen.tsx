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
import {
  GraduationCap,
  Phone,
  Lock,
  ChevronLeft,
  ArrowRight,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  User,
  Building2,
} from 'lucide-react-native';
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
  const { setUserName, setUserAvatarUrl, setChildren, setSelectedChildId, setUserId, setUserRole } =
    useAppStore();
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
      setError(
        language === 'ar'
          ? 'الرجاء إدخال رقم الهاتف للمتابعة'
          : 'Veuillez entrer votre numéro de téléphone.'
      );
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
          setError(
            result.error ||
              (language === 'ar'
                ? 'الحساب غير موجود. تواصل مع إدارة المدرسة.'
                : 'Compte introuvable. Veuillez contacter l’administration.')
          );
        }
      }
    } catch (e) {
      setError(
        language === 'ar' ? 'خطأ في الشبكة. يرجى المحاولة لاحقاً.' : 'Erreur réseau. Veuillez réessayer.'
      );
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
      setError(language === 'ar' ? 'الرجاء إدخال كلمة المرور' : 'Veuillez entrer votre mot de passe.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const action = step === 'NEEDS_SETUP' ? 'setup' : 'signin';
      const result = await authService.authenticate(phone.trim(), password, action, role);
      if (result.success) {
        if (step === 'NEEDS_SETUP') {
          setHint(
            language === 'ar'
              ? 'تم تعيين كلمة المرور بنجاح ! يمكنك الآن الدخول.'
              : 'Mot de passe configuré ! Veuillez vous connecter.'
          );
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
          setHint(
            language === 'ar'
              ? 'تمت إعادة ضبط الحساب. يرجى تعيين كلمة مرور جديدة.'
              : 'Mot de passe réinitialisé. Veuillez en choisir un nouveau.'
          );
          setPassword('');
          setStep('NEEDS_SETUP');
          setIsLoading(false);
          return;
        }
        setError(errorMessage);
        setIsLoading(false);
      }
    } catch (e) {
      setError(
        language === 'ar' ? 'فشل التحقق من البيانات' : 'Erreur d’authentification. Vérifiez votre connexion.'
      );
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

  const stepTitle =
    role === 'admin'
      ? language === 'ar'
        ? 'تسجيل دخول الإدارة'
        : 'Connexion Direction'
      : step === 'PHONE'
      ? language === 'ar'
        ? 'مرحباً بك مجدداً !'
        : 'Bon retour parmi nous !'
      : step === 'NEEDS_SETUP'
      ? language === 'ar'
        ? 'تعيين كلمة المرور'
        : 'Créez votre mot de passe'
      : language === 'ar'
      ? `مرحباً، ${tempParent?.name?.split(' ')[0]} 👋`
      : `Bonjour, ${tempParent?.name?.split(' ')[0]} 👋`;

  const stepSub =
    role === 'admin'
      ? language === 'ar'
        ? 'أدخل بيانات الدخول المعتمدة من المدرسة'
        : 'Entrez vos identifiants administrateur'
      : step === 'PHONE'
      ? language === 'ar'
        ? 'أدخل رقم هاتفك للوصول ومتابعة الأبناء'
        : 'Entrez votre numéro pour accéder au suivi scolaire'
      : step === 'NEEDS_SETUP'
      ? language === 'ar'
        ? 'اختر كلمة مرور آمنة لحسابك'
        : 'Choisissez un mot de passe pour votre premier accès'
      : language === 'ar'
      ? 'أدخل كلمة المرور للمتابعة'
      : 'Entrez votre mot de passe pour continuer';

  const loadingLabel =
    role === 'admin' || (step !== 'PHONE' && step !== 'NEEDS_SETUP')
      ? language === 'ar'
        ? 'جاري الدخول...'
        : 'Connexion...'
      : step === 'PHONE'
      ? language === 'ar'
        ? 'جاري التحقق...'
        : 'Vérification...'
      : language === 'ar'
      ? 'جاري التفعيل...'
      : 'Activation...';

  const btnLabel =
    role === 'admin'
      ? language === 'ar'
        ? 'تسجيل الدخول'
        : 'Se connecter'
      : step === 'PHONE'
      ? language === 'ar'
        ? 'متابعة'
        : 'Continuer'
      : step === 'NEEDS_SETUP'
      ? language === 'ar'
        ? 'تأكيد كلمة المرور'
        : 'Définir le mot de passe'
      : language === 'ar'
      ? 'تسجيل الدخول'
      : 'Se connecter';

  const roleChip =
    role === 'parent'
      ? {
          title: language === 'ar' ? 'فضاء الأولياء' : 'Espace Parents',
          icon: User,
        }
      : role === 'teacher'
      ? {
          title: language === 'ar' ? 'فضاء الأساتذة' : 'Espace Enseignants',
          icon: GraduationCap,
        }
      : {
          title: language === 'ar' ? 'إدارة المؤسسة' : 'Direction de l’école',
          icon: Building2,
        };

  return (
    <View style={{ flex: 1, backgroundColor: '#EAF1FD' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#8FB4F0" />

      {/* Atmospheric sky background with soft blurred cloud circles */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 320,
          backgroundColor: '#8FB4F0',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: -50,
          right: -40,
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: 'rgba(255, 255, 255, 0.35)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 120,
          left: -70,
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: 'rgba(255, 255, 255, 0.28)',
        }}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* Top Bar: Circular Glass Back Button + Role Chip */}
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: 8,
              paddingBottom: 12,
            }}
          >
            <TouchableOpacity
              onPress={handleBack}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(255, 255, 255, 0.88)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: 'rgba(255, 255, 255, 0.95)',
                shadowColor: '#3B7BEA',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <ChevronLeft
                size={22}
                color="#0F1B3D"
                strokeWidth={2.8}
                style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }}
              />
            </TouchableOpacity>

            {/* Glass Role Chip */}
            <View
              style={{
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.88)',
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: 'rgba(255, 255, 255, 0.95)',
                shadowColor: '#3B7BEA',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 6,
                elevation: 2,
                gap: 6,
              }}
            >
              <roleChip.icon size={15} color="#3B7BEA" strokeWidth={2.5} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F1B3D' }}>
                {roleChip.title}
              </Text>
            </View>

            {/* Language Switcher Pill */}
            <View
              style={{
                flexDirection: isRTL ? 'row-reverse' : 'row',
                backgroundColor: 'rgba(255, 255, 255, 0.88)',
                borderRadius: 999,
                padding: 3,
                borderWidth: 1.5,
                borderColor: 'rgba(255, 255, 255, 0.95)',
              }}
            >
              {(['ar', 'fr', 'en'] as const).map((l) => (
                <TouchableOpacity
                  key={l}
                  onPress={() => setLanguage(l)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 999,
                    backgroundColor: language === l ? '#3B7BEA' : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10.5,
                      fontWeight: '800',
                      color: language === l ? '#ffffff' : '#5B6B8C',
                    }}
                  >
                    {l === 'ar' ? 'ع' : l === 'fr' ? 'FR' : 'EN'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Heading area over the sky gradient */}
          <View style={{ paddingHorizontal: 26, paddingTop: 10, paddingBottom: 22 }}>
            <Text
              style={{
                fontSize: 28,
                fontWeight: '900',
                color: '#0F1B3D',
                letterSpacing: -0.6,
                marginBottom: 4,
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {stepTitle}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: '#33486F',
                fontWeight: '600',
                lineHeight: 20,
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {stepSub}
            </Text>
          </View>

          {/* Frosted Glass Form Card Sheet */}
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.94)',
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              borderWidth: 1.5,
              borderColor: 'rgba(255, 255, 255, 0.95)',
              shadowColor: '#3B7BEA',
              shadowOffset: { width: 0, height: -6 },
              shadowOpacity: 0.1,
              shadowRadius: 16,
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
              {/* Phone / Email Input (Pill Shaped radius 999) */}
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
                      ? language === 'ar'
                        ? 'البريد الإلكتروني'
                        : 'Adresse Email'
                      : language === 'ar'
                      ? 'رقم الهاتف الجوال'
                      : 'Numéro de téléphone'}
                  </Text>
                  <View
                    style={{
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      backgroundColor: 'rgba(248, 250, 252, 0.95)',
                      borderRadius: 999,
                      borderWidth: 1.5,
                      borderColor: '#E2E8F0',
                      paddingHorizontal: 18,
                      height: 54,
                    }}
                  >
                    {role === 'admin' ? (
                      <Mail size={20} color="#8FA3C7" />
                    ) : (
                      <Phone size={20} color="#8FA3C7" />
                    )}
                    <View
                      style={{
                        width: 1,
                        height: 20,
                        backgroundColor: '#E2E8F0',
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
                          : language === 'ar'
                          ? 'مثال: 22 345 678'
                          : 'ex: 22 345 678'
                      }
                      placeholderTextColor="#94A3B8"
                      keyboardType={role === 'admin' ? 'email-address' : 'phone-pad'}
                      autoCapitalize={role === 'admin' ? 'none' : undefined}
                      autoComplete={role === 'admin' ? 'email' : undefined}
                      style={{
                        flex: 1,
                        color: '#0F1B3D',
                        fontSize: 16,
                        fontWeight: '700',
                        textAlign: isRTL ? 'right' : 'left',
                      }}
                    />
                  </View>
                </View>
              )}

              {/* Password Input (Pill Shaped radius 999) */}
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
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      backgroundColor: 'rgba(248, 250, 252, 0.95)',
                      borderRadius: 999,
                      borderWidth: 1.5,
                      borderColor: '#E2E8F0',
                      paddingHorizontal: 18,
                      height: 54,
                    }}
                  >
                    <Lock size={20} color="#8FA3C7" />
                    <View
                      style={{
                        width: 1,
                        height: 20,
                        backgroundColor: '#E2E8F0',
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
                          ? language === 'ar'
                            ? '6 أحرف على الأقل'
                            : 'Au moins 6 caractères'
                          : '••••••••'
                      }
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showPassword}
                      style={{
                        flex: 1,
                        color: '#0F1B3D',
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
                        <EyeOff size={19} color="#8FA3C7" />
                      ) : (
                        <Eye size={19} color="#8FA3C7" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Error Banner */}
              {!!error && (
                <View
                  style={{
                    backgroundColor: '#FEF2F2',
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: '#FECACA',
                    padding: 12,
                    marginBottom: 16,
                  }}
                >
                  <Text
                    style={{
                      color: '#B91C1C',
                      fontSize: 13.5,
                      fontWeight: '700',
                      textAlign: 'center',
                    }}
                  >
                    {error}
                  </Text>
                </View>
              )}

              {/* Hint Banner */}
              {!!hint && (
                <View
                  style={{
                    backgroundColor: '#ECFDF5',
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: '#A7F3D0',
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

              {/* Unregistered Parent Number -> Prompt to Sign Up */}
              {showSignUpPrompt && role === 'parent' && (
                <View
                  style={{
                    backgroundColor: '#EFF6FF',
                    borderRadius: 20,
                    borderWidth: 1.5,
                    borderColor: '#BFDBFE',
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <Text
                    style={{
                      color: '#1E40AF',
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
                      backgroundColor: '#3B7BEA',
                      borderRadius: 999,
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

              {/* Large Solid Royal Blue Login Button (Pill shaped radius 999) */}
              <TouchableOpacity
                onPress={
                  role === 'admin' || step !== 'PHONE' ? handleFinalAuth : handleCheckStatus
                }
                disabled={isLoading}
                activeOpacity={0.88}
                style={{
                  backgroundColor: '#3B7BEA',
                  borderRadius: 999,
                  height: 54,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  shadowColor: '#3B7BEA',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 5,
                  marginTop: 6,
                  opacity: isLoading ? 0.85 : 1,
                  gap: 8,
                }}
              >
                {isLoading ? (
                  <>
                    <ActivityIndicator color="#ffffff" size="small" />
                    <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 16 }}>
                      {loadingLabel}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 16 }}>
                      {btnLabel}
                    </Text>
                    <ArrowRight
                      size={18}
                      color="#ffffff"
                      strokeWidth={2.6}
                      style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }}
                    />
                  </>
                )}
              </TouchableOpacity>

              {/* Bottom Navigation Link: For PARENT ONLY */}
              {role === 'parent' ? (
                <View
                  style={{
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: 22,
                    gap: 6,
                  }}
                >
                  <Text style={{ fontSize: 14, color: '#5B6B8C', fontWeight: '500' }}>
                    {language === 'ar' ? 'جديد على التطبيق ؟' : 'Nouveau sur l’application ?'}
                  </Text>
                  <TouchableOpacity onPress={() => onNavigateToSignUp && onNavigateToSignUp(phone.trim())}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#3B7BEA' }}>
                      {language === 'ar' ? 'تسجيل حساب' : 'S’inscrire'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* For Teacher and Admin: Hide self sign-up and show administrative notice */
                <View style={{ alignItems: 'center', marginTop: 24 }}>
                  <Text style={{ fontSize: 12, color: '#8FA3C7', fontWeight: '600', textAlign: 'center' }}>
                    {language === 'ar'
                      ? '🔒 حساب مخصص للطاقم التربوي والإداري. يتم تفعيله من إدارة المؤسسة.'
                      : '🔒 Accès réservé au personnel. Compte créé par l’administration.'}
                  </Text>
                </View>
              )}

              {/* Institutional Footer */}
              <View style={{ alignItems: 'center', marginTop: 28, paddingBottom: 10 }}>
                <View
                  style={{
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 4,
                    gap: 5,
                  }}
                >
                  <ShieldCheck size={14} color="#8FA3C7" />
                  <Text
                    style={{
                      fontSize: 11,
                      color: '#8FA3C7',
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
                    color: '#8FA3C7',
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
