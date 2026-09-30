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
  Alert,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  GraduationCap,
  Phone,
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ShieldCheck,
  Building2,
  MapPin,
  ArrowRight,
  Check,
  X,
  Sparkles,
} from 'lucide-react-native';
import { authService } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { useLanguage, Language } from '../context/LanguageContext';

interface VerifiedStudent {
  id: string;
  name: string;
  surname: string;
  sex: 'MALE' | 'FEMALE';
  nationalId: string;
  levelName: string;
  className: string;
  schoolName: string;
  bloodType: string;
  address: string;
}

export const ParentSignUpScreen = ({
  initialPhone = '',
  onBack,
  onSignUpSuccess,
}: {
  initialPhone?: string;
  onBack: () => void;
  onSignUpSuccess: () => void;
}) => {
  const { language, setLanguage, isRTL } = useLanguage();
  const { setUserName, setUserAvatarUrl, setChildren, setSelectedChildId, setUserId, setUserRole } =
    useAppStore();

  const scrollViewRef = useRef<ScrollView>(null);

  // Wizard Step: 1 = Student, 2 = Parent Info, 3 = Password & Finalize
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Keyboard offset tracking for rock-solid Android & iOS scrolling
  const [keyboardOffset, setKeyboardOffset] = useState<number>(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardOffset(e.endCoordinates.height);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardOffset(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollToInput = (yOffset = 220) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: yOffset, animated: true });
    }, 150);
  };

  // Step 1: Student detection
  const [nationalIdInput, setNationalIdInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifiedStudents, setVerifiedStudents] = useState<VerifiedStudent[]>([]);
  const [showAddSibling, setShowAddSibling] = useState(false);

  // Step 2: Parent info
  const [parentName, setParentName] = useState('');
  const [parentSurname, setParentSurname] = useState('');
  const [phone, setPhone] = useState(initialPhone);
  const [relation, setRelation] = useState<'Père' | 'Mère' | 'Tuteur'>('Père');
  const [address, setAddress] = useState('');

  // Step 3: Password
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: '#e2e8f0' };
    if (pwd.length < 6)
      return { score: 1, label: language === 'ar' ? 'ضعيفة جداً' : 'Trop court', color: '#ef4444' };
    const hasLetters = /[a-zA-Z]/.test(pwd);
    const hasNumbers = /[0-9]/.test(pwd);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);

    if (pwd.length >= 8 && hasLetters && hasNumbers && hasSpecial) {
      return { score: 4, label: language === 'ar' ? 'ممتازة' : 'Excellent', color: '#10b981' };
    }
    if (pwd.length >= 8 && ((hasLetters && hasNumbers) || hasSpecial)) {
      return { score: 3, label: language === 'ar' ? 'قوية' : 'Sécurisé', color: '#0055d4' };
    }
    return { score: 2, label: language === 'ar' ? 'متوسطة' : 'Moyen', color: '#f59e0b' };
  };

  const pwdStrength = getPasswordStrength(password);

  // Translations
  const txt = {
    fr: {
      screenTitle: 'Inscription Parents',
      step1Label: 'Élève',
      step2Label: 'Coordonnées',
      step3Label: 'Sécurité',
      // Step 1
      studentSearchTitle: 'Identification de votre enfant',
      studentSearchSubtitle:
        'Entrez le matricule ou المعرف التربوي fourni par l’école pour retrouver instantanément votre enfant.',
      nationalIdLabel: 'Matricule / المعرف التربوي de l’élève',
      nationalIdPlaceholder: 'Ex: 118728385289',
      btnVerify: 'Vérifier l’élève',
      verifiedBadge: 'Élève reconnu',
      school: 'Établissement',
      class: 'Classe',
      btnAddSibling: '+ Ajouter un autre enfant (fratrie)',
      cancelSibling: 'Annuler',
      btnContinueToParent: 'Continuer vers mes coordonnées',
      alreadyLinkedWarn:
        'Cet élève semble déjà lié à un compte. Si c’est le vôtre, vous pouvez continuer.',
      // Step 2
      parentTitle: 'Vos informations de contact',
      parentSubtitle:
        'Ces coordonnées serviront d’identifiant unique et permettront à la direction de vous contacter.',
      firstName: 'Prénom du parent',
      firstNamePlaceholder: 'Ex: Mohamed',
      lastName: 'Nom de famille',
      lastNamePlaceholder: 'Ex: Trabelsi',
      phone: 'Numéro de téléphone portable',
      phonePlaceholder: 'Ex: 22 345 678',
      phoneHint: 'Ce numéro sera votre identifiant permanent pour vous connecter.',
      relationLabel: 'Lien de parenté',
      father: 'Père',
      mother: 'Mère',
      guardian: 'Tuteur légal',
      addressLabel: 'Ville ou adresse de résidence (optionnel)',
      addressPlaceholder: 'Ex: Tunis, Ariana...',
      btnContinueToPassword: 'Continuer vers le mot de passe',
      // Step 3
      passwordTitle: 'Sécurisez votre compte',
      passwordSubtitle:
        'Définissez un mot de passe pour accéder en toute sécurité aux notes et informations scolaires.',
      pwdLabel: 'Mot de passe',
      pwdPlaceholder: 'Au moins 6 caractères',
      confirmPwdLabel: 'Confirmez le mot de passe',
      confirmPwdPlaceholder: 'Répétez votre mot de passe',
      pwdMismatch: 'Les mots de passe ne correspondent pas',
      pwdMatch: 'Mots de passe identiques',
      recapTitle: 'Récapitulatif de votre accès',
      loginId: 'Identifiant mobile :',
      parentHolder: 'Parent titulaire :',
      linkedChildren: 'Enfant(s) rattaché(s) :',
      btnFinish: 'Activer mon compte & Accéder',
      securityBanner: 'Accès sécurisé et chiffré par l’établissement scolaire',
      alreadyHaveAccount: 'Déjà un compte ?',
      signInLink: 'Se connecter',
    },
    ar: {
      screenTitle: 'تسجيل حساب ولي أمر',
      step1Label: 'التلميذ',
      step2Label: 'بيانات الولي',
      step3Label: 'الأمان',
      // Step 1
      studentSearchTitle: 'التحقق من هوية التلميذ',
      studentSearchSubtitle:
        'أدخل المعرف الوحيد أو التربوي للتلميذ للتعرف على ملفه الدراسي وربطه بحسابك.',
      nationalIdLabel: 'المعرف التربوي / الوحيد للتلميذ',
      nationalIdPlaceholder: 'مثال: 118728385289',
      btnVerify: 'التحقق من التلميذ',
      verifiedBadge: 'تم التعرف على التلميذ',
      school: 'المؤسسة',
      class: 'القسم',
      btnAddSibling: '+ إضافة ابن آخر (إخوة)',
      cancelSibling: 'إلغاء',
      btnContinueToParent: 'متابعة إلى بيانات الولي',
      alreadyLinkedWarn:
        'هذا التلميذ مرتبط بحساب مسبقاً. إذا كان هذا حسابك، يمكنك المتابعة.',
      // Step 2
      parentTitle: 'معلومات الاتصال بالولي',
      parentSubtitle:
        'هذه البيانات ستكون معرفك الدائم لتسجيل الدخول والتواصل مع إدارة المؤسسة.',
      firstName: 'اسم الولي',
      firstNamePlaceholder: 'مثال: محمد',
      lastName: 'لقب العائلة',
      lastNamePlaceholder: 'مثال: الطرابلسي',
      phone: 'رقم الهاتف الجوال',
      phonePlaceholder: 'مثال: 22 345 678',
      phoneHint: 'رقم هاتفك سيكون اسم المستخدم الخاص بك لتسجيل الدخول دائماً.',
      relationLabel: 'صلة القرابة بالتلميذ',
      father: 'أب',
      mother: 'أم',
      guardian: 'ولي أمر',
      addressLabel: 'المدينة أو عنوان الإقامة (اختياري)',
      addressPlaceholder: 'مثال: تونس، أريانة...',
      btnContinueToPassword: 'متابعة إلى تعيين كلمة المرور',
      // Step 3
      passwordTitle: 'تأمين حسابك الشخصي',
      passwordSubtitle:
        'عيّن كلمة مرور خاصة بك لمتابعة الأعداد والغيابات وتقارير أبنائك في سرية تامة.',
      pwdLabel: 'كلمة المرور',
      pwdPlaceholder: '6 أحرف أو أرقام على الأقل',
      confirmPwdLabel: 'تأكيد كلمة المرور',
      confirmPwdPlaceholder: 'أعد إدخال كلمة المرور',
      pwdMismatch: 'كلمتا المرور غير متطابقتين',
      pwdMatch: 'كلمتا المرور متطابقتان',
      recapTitle: 'ملخص الحساب الجديد',
      loginId: 'رقم تسجيل الدخول :',
      parentHolder: 'الولي المسجل :',
      linkedChildren: 'الأبناء المربوطون :',
      btnFinish: 'تفعيل الحساب والدخول إلى التطبيق',
      securityBanner: 'منصة مدرسية رسمية محمية ومشفّرة بالكامل',
      alreadyHaveAccount: 'لديك حساب بالفعل ؟',
      signInLink: 'تسجيل الدخول',
    },
    en: {
      screenTitle: 'Parent Sign Up',
      step1Label: 'Student',
      step2Label: 'Contact',
      step3Label: 'Security',
      // Step 1
      studentSearchTitle: 'Student Identification',
      studentSearchSubtitle:
        'Enter the student ID or National educational ID provided by the school.',
      nationalIdLabel: 'Student ID / Matricule',
      nationalIdPlaceholder: 'Ex: 118728385289',
      btnVerify: 'Verify Student',
      verifiedBadge: 'Student Verified',
      school: 'School',
      class: 'Class',
      btnAddSibling: '+ Add another child (sibling)',
      cancelSibling: 'Cancel',
      btnContinueToParent: 'Continue to Contact Details',
      alreadyLinkedWarn:
        'This student is already linked. If this is your account, you may proceed.',
      // Step 2
      parentTitle: 'Your Contact Details',
      parentSubtitle:
        'These details will serve as your permanent login credentials and emergency contact.',
      firstName: 'Parent First Name',
      firstNamePlaceholder: 'e.g. Mohamed',
      lastName: 'Last Name',
      lastNamePlaceholder: 'e.g. Trabelsi',
      phone: 'Mobile Phone Number',
      phonePlaceholder: 'e.g. 22 345 678',
      phoneHint: 'This phone number will be your permanent login ID.',
      relationLabel: 'Relationship to Student',
      father: 'Father',
      mother: 'Mother',
      guardian: 'Legal Guardian',
      addressLabel: 'City or Address (optional)',
      addressPlaceholder: 'e.g. Tunis, Ariana...',
      btnContinueToPassword: 'Continue to Password',
      // Step 3
      passwordTitle: 'Secure Your Account',
      passwordSubtitle:
        'Set a secure password to access your children’s grades, attendance, and school reports.',
      pwdLabel: 'Password',
      pwdPlaceholder: 'At least 6 characters',
      confirmPwdLabel: 'Confirm Password',
      confirmPwdPlaceholder: 'Re-enter your password',
      pwdMismatch: 'Passwords do not match',
      pwdMatch: 'Passwords match',
      recapTitle: 'Account Overview',
      loginId: 'Login Phone :',
      parentHolder: 'Primary Parent :',
      linkedChildren: 'Linked Child(ren) :',
      btnFinish: 'Activate Account & Enter App',
      securityBanner: 'Secure institutional access encrypted by SnapSchool',
      alreadyHaveAccount: 'Already have an account?',
      signInLink: 'Sign In',
    },
  };

  const t = txt[language as 'fr' | 'ar' | 'en'] || txt.fr;

  // Verify Student Action
  const handleVerify = async () => {
    Keyboard.dismiss();
    if (!nationalIdInput.trim()) {
      setVerifyError(
        language === 'ar'
          ? 'الرجاء إدخال المعرف الوحيد للتلميذ'
          : 'Veuillez entrer le المعرف التربوي / Matricule.'
      );
      return;
    }

    if (verifiedStudents.some((s) => s.nationalId === nationalIdInput.trim())) {
      setVerifyError(
        language === 'ar'
          ? 'هذا التلميذ مضاف بالفعل إلى القائمة'
          : 'Cet élève est déjà ajouté à votre liste.'
      );
      return;
    }

    setIsVerifying(true);
    setVerifyError('');

    try {
      const res = await authService.verifyStudent(nationalIdInput.trim());
      if (res.success && res.student) {
        setVerifiedStudents((prev) => [...prev, res.student as VerifiedStudent]);
        setNationalIdInput('');
        setShowAddSibling(false);
      } else {
        setVerifyError(
          res.error ||
            (language === 'ar'
              ? 'لم يتم العثور على التلميذ. تأكد من الرقم المسجل.'
              : 'Élève non trouvé avec cet identifiant.')
        );
      }
    } catch (err: any) {
      setVerifyError(
        language === 'ar' ? 'خطأ في الاتصال بالشبكة' : 'Erreur de connexion. Veuillez réessayer.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemoveStudent = (id: string) => {
    setVerifiedStudents((prev) => prev.filter((s) => s.id !== id));
  };

  const handleGoToStep2 = () => {
    Keyboard.dismiss();
    if (verifiedStudents.length === 0) {
      setVerifyError(
        language === 'ar'
          ? 'الرجاء التحقق من تلميذ واحد على الأقل للمتابعة'
          : 'Veuillez vérifier au moins un élève avant de continuer.'
      );
      return;
    }
    if (!parentSurname && verifiedStudents[0]?.surname) {
      setParentSurname(verifiedStudents[0].surname);
    }
    setCurrentStep(2);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleGoToStep3 = () => {
    Keyboard.dismiss();
    if (!parentName.trim() || !parentSurname.trim() || !phone.trim()) {
      Alert.alert(
        language === 'ar' ? 'بيانات ناقصة' : 'Champs incomplets',
        language === 'ar'
          ? 'الرجاء ملء الاسم واللقب ورقم الهاتف للمتابعة.'
          : 'Veuillez renseigner votre prénom, nom et numéro de téléphone.'
      );
      return;
    }
    setCurrentStep(3);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleFinalSubmit = async () => {
    Keyboard.dismiss();
    if (!password.trim() || password.length < 6) {
      setSubmitError(
        language === 'ar'
          ? 'كلمة المرور يجب أن تتكون من 6 أحرف على الأقل.'
          : 'Le mot de passe doit comporter au moins 6 caractères.'
      );
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError(
        language === 'ar'
          ? 'كلمتا المرور غير متطابقتين.'
          : 'Les deux mots de passe ne correspondent pas.'
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const res = await authService.signUpParent({
        studentIds: verifiedStudents.map((s) => s.id),
        parentName: parentName.trim(),
        parentSurname: parentSurname.trim(),
        phone: phone.trim(),
        password: password.trim(),
        relation,
        address: address.trim() || undefined,
      });

      if (res.success) {
        if (res.name) setUserName(res.name);
        if (res.img) setUserAvatarUrl(res.img);
        if (res.userId) setUserId(res.userId);
        if (res.userType) setUserRole(res.userType as any);
        if (res.students && Array.isArray(res.students) && res.students.length > 0) {
          setChildren(res.students);
          setSelectedChildId(res.students[0].id);
        }
        onSignUpSuccess();
      } else {
        setSubmitError(res.error || 'Erreur lors de la création du compte.');
      }
    } catch (err: any) {
      setSubmitError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
              onPress={() => {
                if (currentStep > 1) {
                  setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
                } else {
                  onBack();
                }
              }}
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

            {/* Language Selector */}
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

          {/* HERO PROGRESS & STEP INDICATOR */}
          <View style={{ paddingHorizontal: 24, paddingTop: 6, paddingBottom: 18 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '900',
                  color: '#0f172a',
                  letterSpacing: -0.5,
                }}
              >
                {t.screenTitle}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '800',
                  color: '#0055d4',
                }}
              >
                {currentStep}/3
              </Text>
            </View>

            {/* SLEEK PROGRESS BARS */}
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[
                { step: 1, label: t.step1Label },
                { step: 2, label: t.step2Label },
                { step: 3, label: t.step3Label },
              ].map((s) => {
                const isActive = currentStep === s.step;
                const isDone = currentStep > s.step;
                return (
                  <View key={s.step} style={{ flex: 1 }}>
                    <View
                      style={{
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: isDone ? '#10b981' : isActive ? '#0055d4' : '#dbeafe',
                        marginBottom: 4,
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: isActive ? '800' : '600',
                        color: isActive ? '#0055d4' : isDone ? '#10b981' : '#94a3b8',
                        textAlign: isRTL ? 'right' : 'left',
                      }}
                    >
                      {s.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* CURVED WHITE BOTTOM SHEET (DRIBBLE STYLE) */}
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
                paddingTop: 26,
                paddingBottom: keyboardOffset > 0 ? keyboardOffset + 40 : 40,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              automaticallyAdjustKeyboardInsets={true}
            >
              {/* ================= STEP 1: STUDENT IDENTIFICATION ================= */}
              {currentStep === 1 && (
                <View>
                  <View style={{ marginBottom: 22 }}>
                    <Text
                      style={{
                        fontSize: 24,
                        fontWeight: '900',
                        color: '#0f172a',
                        letterSpacing: -0.5,
                        textAlign: isRTL ? 'right' : 'left',
                        marginBottom: 6,
                      }}
                    >
                      {t.studentSearchTitle}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13.5,
                        color: '#64748b',
                        lineHeight: 20,
                        textAlign: isRTL ? 'right' : 'left',
                      }}
                    >
                      {t.studentSearchSubtitle}
                    </Text>
                  </View>

                  {/* VERIFIED STUDENTS CARD STACK */}
                  {verifiedStudents.map((st) => (
                    <View
                      key={st.id}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 20,
                        padding: 16,
                        marginBottom: 16,
                        borderWidth: 1.5,
                        borderColor: '#10b981',
                        shadowColor: '#10b981',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 10,
                        elevation: 3,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 12,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#ecfdf5',
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 20,
                          }}
                        >
                          <CheckCircle2 size={13} color="#059669" />
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '800',
                              color: '#059669',
                              marginLeft: 5,
                            }}
                          >
                            {t.verifiedBadge}
                          </Text>
                        </View>

                        {verifiedStudents.length > 1 && (
                          <TouchableOpacity
                            onPress={() => handleRemoveStudent(st.id)}
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 15,
                              backgroundColor: '#fef2f2',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Trash2 size={14} color="#ef4444" />
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View
                          style={{
                            width: 50,
                            height: 50,
                            borderRadius: 18,
                            backgroundColor: '#eff6ff',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 14,
                            borderWidth: 1,
                            borderColor: '#dbeafe',
                          }}
                        >
                          <GraduationCap size={26} color="#0055d4" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 18,
                              fontWeight: '900',
                              color: '#0f172a',
                              textAlign: isRTL ? 'right' : 'left',
                            }}
                          >
                            {st.name} {st.surname}
                          </Text>

                          <View
                            style={{
                              flexDirection: 'row',
                              flexWrap: 'wrap',
                              gap: 6,
                              marginTop: 6,
                            }}
                          >
                            <View
                              style={{
                                backgroundColor: '#eff6ff',
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 8,
                              }}
                            >
                              <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#1e40af' }}>
                                {st.levelName}
                              </Text>
                            </View>
                            <View
                              style={{
                                backgroundColor: '#f1f5f9',
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 8,
                              }}
                            >
                              <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#475569' }}>
                                Classe {st.className}
                              </Text>
                            </View>
                          </View>

                          <Text
                            style={{
                              fontSize: 11.5,
                              color: '#64748b',
                              marginTop: 6,
                              fontWeight: '600',
                              fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                              textAlign: isRTL ? 'right' : 'left',
                            }}
                          >
                            N° National : {st.nationalId}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}

                  {/* INPUT BOX (DRIBBLE SQUIRCLE FORM) */}
                  {(verifiedStudents.length === 0 || showAddSibling) && (
                    <View style={{ marginBottom: 18 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12.5,
                            fontWeight: '800',
                            color: '#475569',
                            textAlign: isRTL ? 'right' : 'left',
                          }}
                        >
                          {t.nationalIdLabel}
                        </Text>
                        {verifiedStudents.length > 0 && showAddSibling && (
                          <TouchableOpacity onPress={() => setShowAddSibling(false)}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#ef4444' }}>
                              {t.cancelSibling}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

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
                          marginBottom: 12,
                        }}
                      >
                        <GraduationCap size={20} color="#94a3b8" />
                        <View
                          style={{
                            width: 1,
                            height: 20,
                            backgroundColor: '#e2e8f0',
                            marginHorizontal: 12,
                          }}
                        />
                        <TextInput
                          value={nationalIdInput}
                          onChangeText={(val) => {
                            setNationalIdInput(val);
                            setVerifyError('');
                          }}
                          onFocus={() => scrollToInput(100)}
                          placeholder={t.nationalIdPlaceholder}
                          placeholderTextColor="#94a3b8"
                          keyboardType="numeric"
                          returnKeyType="done"
                          onSubmitEditing={handleVerify}
                          style={{
                            flex: 1,
                            fontSize: 16,
                            color: '#0f172a',
                            fontWeight: '700',
                            textAlign: isRTL ? 'right' : 'left',
                          }}
                        />
                      </View>

                      {verifyError ? (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#fef2f2',
                            padding: 12,
                            borderRadius: 14,
                            marginBottom: 12,
                            borderWidth: 1,
                            borderColor: '#fecaca',
                          }}
                        >
                          <AlertCircle size={16} color="#ef4444" style={{ marginRight: 8 }} />
                          <Text
                            style={{
                              fontSize: 13,
                              color: '#b91c1c',
                              fontWeight: '600',
                              flex: 1,
                            }}
                          >
                            {verifyError}
                          </Text>
                        </View>
                      ) : null}

                      <TouchableOpacity
                        onPress={handleVerify}
                        disabled={isVerifying}
                        style={{
                          backgroundColor: '#0055d4',
                          borderRadius: 16,
                          height: 50,
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'row',
                          shadowColor: '#0055d4',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.22,
                          shadowRadius: 8,
                          elevation: 3,
                        }}
                      >
                        {isVerifying ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Text style={{ fontSize: 15, fontWeight: '800', color: '#ffffff' }}>
                            {t.btnVerify}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* ADD SIBLING BUTTON */}
                  {verifiedStudents.length > 0 && !showAddSibling && (
                    <TouchableOpacity
                      onPress={() => {
                        setShowAddSibling(true);
                        scrollToInput(180);
                      }}
                      style={{
                        backgroundColor: '#f8fafc',
                        borderWidth: 1.5,
                        borderStyle: 'dashed',
                        borderColor: '#cbd5e1',
                        borderRadius: 16,
                        padding: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        marginBottom: 20,
                      }}
                    >
                      <Plus size={18} color="#0055d4" style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#0055d4' }}>
                        {t.btnAddSibling}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* MAIN CONTINUE BUTTON */}
                  {verifiedStudents.length > 0 && (
                    <TouchableOpacity
                      onPress={handleGoToStep2}
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
                        marginTop: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '800',
                          color: '#ffffff',
                          marginRight: 6,
                        }}
                      >
                        {t.btnContinueToParent}
                      </Text>
                      <ArrowRight size={18} color="#ffffff" strokeWidth={2.5} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* ================= STEP 2: PARENT DETAILS ================= */}
              {currentStep === 2 && (
                <View>
                  <View style={{ marginBottom: 22 }}>
                    <Text
                      style={{
                        fontSize: 24,
                        fontWeight: '900',
                        color: '#0f172a',
                        letterSpacing: -0.5,
                        textAlign: isRTL ? 'right' : 'left',
                        marginBottom: 6,
                      }}
                    >
                      {t.parentTitle}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13.5,
                        color: '#64748b',
                        lineHeight: 20,
                        textAlign: isRTL ? 'right' : 'left',
                      }}
                    >
                      {t.parentSubtitle}
                    </Text>
                  </View>

                  {/* First Name */}
                  <View style={{ marginBottom: 16 }}>
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: '800',
                        color: '#475569',
                        marginBottom: 7,
                        textAlign: isRTL ? 'right' : 'left',
                      }}
                    >
                      {t.firstName} *
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
                      <User size={20} color="#94a3b8" />
                      <View
                        style={{
                          width: 1,
                          height: 20,
                          backgroundColor: '#e2e8f0',
                          marginHorizontal: 12,
                        }}
                      />
                      <TextInput
                        value={parentName}
                        onChangeText={setParentName}
                        onFocus={() => scrollToInput(60)}
                        placeholder={t.firstNamePlaceholder}
                        placeholderTextColor="#94a3b8"
                        style={{
                          flex: 1,
                          fontSize: 15,
                          color: '#0f172a',
                          fontWeight: '700',
                          textAlign: isRTL ? 'right' : 'left',
                        }}
                      />
                    </View>
                  </View>

                  {/* Last Name */}
                  <View style={{ marginBottom: 16 }}>
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: '800',
                        color: '#475569',
                        marginBottom: 7,
                        textAlign: isRTL ? 'right' : 'left',
                      }}
                    >
                      {t.lastName} *
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
                      <User size={20} color="#94a3b8" />
                      <View
                        style={{
                          width: 1,
                          height: 20,
                          backgroundColor: '#e2e8f0',
                          marginHorizontal: 12,
                        }}
                      />
                      <TextInput
                        value={parentSurname}
                        onChangeText={setParentSurname}
                        onFocus={() => scrollToInput(120)}
                        placeholder={t.lastNamePlaceholder}
                        placeholderTextColor="#94a3b8"
                        style={{
                          flex: 1,
                          fontSize: 15,
                          color: '#0f172a',
                          fontWeight: '700',
                          textAlign: isRTL ? 'right' : 'left',
                        }}
                      />
                    </View>
                  </View>

                  {/* Phone */}
                  <View style={{ marginBottom: 16 }}>
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: '800',
                        color: '#475569',
                        marginBottom: 7,
                        textAlign: isRTL ? 'right' : 'left',
                      }}
                    >
                      {t.phone} *
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
                        marginBottom: 6,
                      }}
                    >
                      <Phone size={20} color="#94a3b8" />
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
                        onChangeText={setPhone}
                        onFocus={() => scrollToInput(180)}
                        placeholder={t.phonePlaceholder}
                        placeholderTextColor="#94a3b8"
                        keyboardType="phone-pad"
                        style={{
                          flex: 1,
                          fontSize: 15,
                          color: '#0f172a',
                          fontWeight: '700',
                          textAlign: isRTL ? 'right' : 'left',
                        }}
                      />
                    </View>
                    <Text
                      style={{
                        fontSize: 11.5,
                        color: '#64748b',
                        textAlign: isRTL ? 'right' : 'left',
                      }}
                    >
                      {t.phoneHint}
                    </Text>
                  </View>

                  {/* Relationship Segmented Pills */}
                  <View style={{ marginBottom: 16 }}>
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: '800',
                        color: '#475569',
                        marginBottom: 8,
                        textAlign: isRTL ? 'right' : 'left',
                      }}
                    >
                      {t.relationLabel}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {[
                        { key: 'Père', label: t.father },
                        { key: 'Mère', label: t.mother },
                        { key: 'Tuteur', label: t.guardian },
                      ].map((rel) => {
                        const isSel = relation === rel.key;
                        return (
                          <TouchableOpacity
                            key={rel.key}
                            onPress={() => setRelation(rel.key as any)}
                            style={{
                              flex: 1,
                              height: 44,
                              borderRadius: 14,
                              backgroundColor: isSel ? '#0055d4' : '#f8fafc',
                              borderWidth: 1.5,
                              borderColor: isSel ? '#0055d4' : '#e2e8f0',
                              alignItems: 'center',
                              justifyContent: 'center',
                              shadowColor: isSel ? '#0055d4' : 'transparent',
                              shadowOpacity: isSel ? 0.2 : 0,
                              shadowRadius: 4,
                              elevation: isSel ? 2 : 0,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: isSel ? '800' : '600',
                                color: isSel ? '#ffffff' : '#475569',
                              }}
                            >
                              {rel.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Address */}
                  <View style={{ marginBottom: 22 }}>
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: '800',
                        color: '#475569',
                        marginBottom: 7,
                        textAlign: isRTL ? 'right' : 'left',
                      }}
                    >
                      {t.addressLabel}
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
                      <MapPin size={20} color="#94a3b8" />
                      <View
                        style={{
                          width: 1,
                          height: 20,
                          backgroundColor: '#e2e8f0',
                          marginHorizontal: 12,
                        }}
                      />
                      <TextInput
                        value={address}
                        onChangeText={setAddress}
                        onFocus={() => scrollToInput(240)}
                        placeholder={t.addressPlaceholder}
                        placeholderTextColor="#94a3b8"
                        style={{
                          flex: 1,
                          fontSize: 14,
                          color: '#0f172a',
                          textAlign: isRTL ? 'right' : 'left',
                        }}
                      />
                    </View>
                  </View>

                  {/* NEXT BUTTON */}
                  <TouchableOpacity
                    onPress={handleGoToStep3}
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
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '800',
                        color: '#ffffff',
                        marginRight: 6,
                      }}
                    >
                      {t.btnContinueToPassword}
                    </Text>
                    <ArrowRight size={18} color="#ffffff" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              )}

              {/* ================= STEP 3: SECURITY & RECAP PASS ================= */}
              {currentStep === 3 && (
                <View>
                  <View style={{ marginBottom: 22 }}>
                    <Text
                      style={{
                        fontSize: 24,
                        fontWeight: '900',
                        color: '#0f172a',
                        letterSpacing: -0.5,
                        textAlign: isRTL ? 'right' : 'left',
                        marginBottom: 6,
                      }}
                    >
                      {t.passwordTitle}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13.5,
                        color: '#64748b',
                        lineHeight: 20,
                        textAlign: isRTL ? 'right' : 'left',
                      }}
                    >
                      {t.passwordSubtitle}
                    </Text>
                  </View>

                  {/* Password Input */}
                  <View style={{ marginBottom: 16 }}>
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: '800',
                        color: '#475569',
                        marginBottom: 7,
                        textAlign: isRTL ? 'right' : 'left',
                      }}
                    >
                      {t.pwdLabel} *
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
                        marginBottom: 8,
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
                        onChangeText={(val) => {
                          setPassword(val);
                          setSubmitError('');
                        }}
                        onFocus={() => scrollToInput(60)}
                        placeholder={t.pwdPlaceholder}
                        placeholderTextColor="#94a3b8"
                        secureTextEntry={!showPassword}
                        style={{
                          flex: 1,
                          fontSize: 16,
                          color: '#0f172a',
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

                    {/* Strength bars */}
                    {password.length > 0 && (
                      <View style={{ marginBottom: 6 }}>
                        <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
                          {[1, 2, 3, 4].map((seg) => (
                            <View
                              key={seg}
                              style={{
                                flex: 1,
                                height: 4,
                                borderRadius: 2,
                                backgroundColor:
                                  pwdStrength.score >= seg ? pwdStrength.color : '#e2e8f0',
                              }}
                            />
                          ))}
                        </View>
                        <Text
                          style={{
                            fontSize: 11.5,
                            fontWeight: '700',
                            color: pwdStrength.color,
                            textAlign: isRTL ? 'right' : 'left',
                          }}
                        >
                          {pwdStrength.label}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Confirm Password Input */}
                  <View style={{ marginBottom: 20 }}>
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: '800',
                        color: '#475569',
                        marginBottom: 7,
                        textAlign: isRTL ? 'right' : 'left',
                      }}
                    >
                      {t.confirmPwdLabel} *
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#f8fafc',
                        borderRadius: 16,
                        borderWidth: 1.5,
                        borderColor:
                          confirmPassword.length > 0
                            ? confirmPassword === password
                              ? '#10b981'
                              : '#ef4444'
                            : '#e2e8f0',
                        paddingHorizontal: 16,
                        height: 54,
                        marginBottom: 6,
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
                        value={confirmPassword}
                        onChangeText={(val) => {
                          setConfirmPassword(val);
                          setSubmitError('');
                        }}
                        onFocus={() => scrollToInput(120)}
                        placeholder={t.confirmPwdPlaceholder}
                        placeholderTextColor="#94a3b8"
                        secureTextEntry={!showPassword}
                        style={{
                          flex: 1,
                          fontSize: 16,
                          color: '#0f172a',
                          fontWeight: '700',
                          textAlign: isRTL ? 'right' : 'left',
                        }}
                      />
                      {confirmPassword.length > 0 &&
                        (confirmPassword === password ? (
                          <Check size={18} color="#10b981" />
                        ) : (
                          <X size={18} color="#ef4444" />
                        ))}
                    </View>

                    {confirmPassword.length > 0 && (
                      <Text
                        style={{
                          fontSize: 11.5,
                          fontWeight: '600',
                          color: confirmPassword === password ? '#10b981' : '#ef4444',
                          textAlign: isRTL ? 'right' : 'left',
                        }}
                      >
                        {confirmPassword === password ? t.pwdMatch : t.pwdMismatch}
                      </Text>
                    )}
                  </View>

                  {/* RECAP CARD (PREMIUM INSTITUTIONAL PASS) */}
                  <View
                    style={{
                      backgroundColor: '#f8fafc',
                      borderRadius: 20,
                      padding: 16,
                      borderWidth: 1.5,
                      borderColor: '#e2e8f0',
                      marginBottom: 20,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 12,
                        paddingBottom: 10,
                        borderBottomWidth: 1,
                        borderBottomColor: '#e2e8f0',
                      }}
                    >
                      <ShieldCheck size={18} color="#0055d4" style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0f172a' }}>
                        {t.recapTitle}
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ fontSize: 12.5, color: '#64748b', fontWeight: '600' }}>
                        {t.loginId}
                      </Text>
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0055d4' }}>
                        {phone}
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 10,
                      }}
                    >
                      <Text style={{ fontSize: 12.5, color: '#64748b', fontWeight: '600' }}>
                        {t.parentHolder}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>
                        {parentName} {parentSurname} ({relation})
                      </Text>
                    </View>

                    <View style={{ marginTop: 4 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          color: '#64748b',
                          fontWeight: '700',
                          marginBottom: 6,
                          textAlign: isRTL ? 'right' : 'left',
                        }}
                      >
                        {t.linkedChildren}
                      </Text>
                      {verifiedStudents.map((child) => (
                        <View
                          key={child.id}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#ffffff',
                            borderRadius: 12,
                            padding: 10,
                            marginBottom: 6,
                            borderWidth: 1,
                            borderColor: '#e2e8f0',
                          }}
                        >
                          <GraduationCap size={16} color="#0055d4" style={{ marginRight: 8 }} />
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: '700',
                              color: '#0f172a',
                              flex: 1,
                              textAlign: isRTL ? 'right' : 'left',
                            }}
                          >
                            {child.name} {child.surname}
                          </Text>
                          <View
                            style={{
                              backgroundColor: '#eff6ff',
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#0055d4' }}>
                              {child.levelName} • {child.className}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>

                  {submitError ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#fef2f2',
                        padding: 12,
                        borderRadius: 14,
                        marginBottom: 16,
                        borderWidth: 1,
                        borderColor: '#fecaca',
                      }}
                    >
                      <AlertCircle size={18} color="#ef4444" style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 13, color: '#b91c1c', fontWeight: '600', flex: 1 }}>
                        {submitError}
                      </Text>
                    </View>
                  ) : null}

                  {/* FINAL ACTIVATION BUTTON */}
                  <TouchableOpacity
                    onPress={handleFinalSubmit}
                    disabled={isSubmitting}
                    style={{
                      backgroundColor: '#0055d4',
                      borderRadius: 18,
                      height: 54,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      shadowColor: '#0055d4',
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.3,
                      shadowRadius: 10,
                      elevation: 4,
                      marginBottom: 14,
                    }}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: '800',
                            color: '#ffffff',
                            marginRight: 6,
                          }}
                        >
                          {t.btnFinish}
                        </Text>
                        <ArrowRight size={18} color="#ffffff" strokeWidth={2.5} />
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Security Reassurance */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <ShieldCheck size={14} color="#94a3b8" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: '600' }}>
                      {t.securityBanner}
                    </Text>
                  </View>
                </View>
              )}

              {/* BOTTOM LINK TO SIGN IN */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: 14,
                  paddingBottom: 10,
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 13.5, color: '#64748b' }}>{t.alreadyHaveAccount} </Text>
                <TouchableOpacity onPress={onBack}>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0055d4' }}>
                    {t.signInLink}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};
