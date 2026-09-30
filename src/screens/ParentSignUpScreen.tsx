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
  Alert,
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
  HeartPulse,
  Sparkles,
  MapPin,
  ArrowRight,
} from 'lucide-react-native';
import { authService } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { useLanguage } from '../context/LanguageContext';

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

  // Wizard Step: 1 = Student, 2 = Parent Info, 3 = Password & Finalize
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

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

  // Extra student info for school db
  const [selectedBloodType, setSelectedBloodType] = useState<string>('O+');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');

  // Step 3: Password
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Translations dictionary for this screen
  const txt = {
    fr: {
      screenTitle: 'Inscription Espace Parents',
      screenSubtitle: 'Rattachez vos enfants et activez votre suivi scolaire',
      step1: '1. Élève',
      step2: '2. Parent',
      step3: '3. Sécurité',
      // Step 1
      studentSearchTitle: 'Identification de votre enfant',
      studentSearchSubtitle:
        'Entrez le المعرف التربوي / Matricule de votre enfant fourni par l’école ou le ministère.',
      nationalIdPlaceholder: 'Ex: 269274689104 ou Matricule',
      btnVerify: 'Vérifier l’élève',
      verifiedBadge: 'Élève reconnu',
      school: 'Établissement',
      class: 'Classe',
      btnAddSibling: '+ Ajouter un autre enfant (fratrie)',
      btnContinueToParent: 'Continuer vers mes coordonnées →',
      alreadyLinkedWarn:
        'Cet élève semble déjà lié à un compte. Si c’est le vôtre, vous pouvez continuer.',
      // Step 2
      parentTitle: 'Vos informations de contact',
      parentSubtitle:
        'Ces coordonnées vous serviront pour vous connecter et être contacté par la direction.',
      firstName: 'Prénom du parent *',
      lastName: 'Nom de famille du parent *',
      phone: 'Numéro de téléphone portable *',
      phoneHint: 'Votre identifiant permanent pour l’application mobile',
      relationLabel: 'Lien de parenté',
      father: 'Père',
      mother: 'Mère',
      guardian: 'Tuteur légal',
      addressLabel: 'Adresse de résidence',
      addressPlaceholder: 'ex: Tunis, Ariana...',
      // Extra info
      extraSectionTitle: 'Fiche santé & urgence de l’enfant',
      extraSectionSubtitle: 'Informations transmises à l’infirmerie et l’administration',
      bloodTypeLabel: 'Groupe sanguin',
      emergencyPhoneLabel: 'Deuxième contact d’urgence',
      emergencyPhonePlaceholder: 'ex: Téléphone de la maman ou grand-parent',
      medicalLabel: 'Allergies ou remarques médicales (optionnel)',
      medicalPlaceholder: 'ex: Allergie arachides, asthme, lunettes...',
      btnContinueToPassword: 'Continuer vers le mot de passe →',
      // Step 3
      passwordTitle: 'Créez votre mot de passe',
      passwordSubtitle:
        'Ce mot de passe sécurisera l’accès aux notes, absences et caisse de vos enfants.',
      pwdLabel: 'Mot de passe *',
      pwdPlaceholder: 'Au moins 6 caractères',
      confirmPwdLabel: 'Confirmez le mot de passe *',
      recapTitle: 'Récapitulatif de votre compte',
      loginId: 'Identifiant de connexion :',
      linkedChildren: 'Enfant(s) rattaché(s) :',
      btnFinish: 'Créer mon compte & Accéder à l’école 🚀',
      alreadyHaveAccount: 'Déjà un compte ?',
      signInLink: 'Se connecter',
    },
    ar: {
      screenTitle: 'تسجيل حساب ولي أمر',
      screenSubtitle: 'قم بربط أبنائك وتفعيل المتابعة المدرسية الفورية',
      step1: '1. التلميذ',
      step2: '2. الولي',
      step3: '3. كلمة المرور',
      // Step 1
      studentSearchTitle: 'التحقق من هوية التلميذ',
      studentSearchSubtitle:
        'الرجاء إدخال المعرف الوحيد / التربوي للتلميذ المسلّم من المؤسسة التربوية.',
      nationalIdPlaceholder: 'مثال: 269274689104 أو المعرف',
      btnVerify: 'التحقق من التلميذ',
      verifiedBadge: 'تم التحقق من التلميذ بنجاح',
      school: 'المؤسسة',
      class: 'القسم',
      btnAddSibling: '+ إضافة ابن آخر (إخوة)',
      btnContinueToParent: 'متابعة إلى معلومات الولي ←',
      alreadyLinkedWarn:
        'هذا التلميذ مرتبط بحساب مسبقاً. إذا كان هذا حسابك، يمكنك المتابعة.',
      // Step 2
      parentTitle: 'معلومات الاتصال بالولي',
      parentSubtitle:
        'هذه البيانات ستُستخدم لتسجيل دخولك وتواصل إدارة المدرسة معك.',
      firstName: 'اسم الولي *',
      lastName: 'لقب الولي *',
      phone: 'رقم الهاتف الجوال *',
      phoneHint: 'رقم هاتفك سيكون اسم المستخدم الخاص بك دائماً',
      relationLabel: 'صلة القرابة',
      father: 'أب',
      mother: 'أم',
      guardian: 'ولي أمر',
      addressLabel: 'عنوان الإقامة',
      addressPlaceholder: 'مثال: تونس، أريانة...',
      // Extra info
      extraSectionTitle: 'بيانات صحية ورقم طوارئ',
      extraSectionSubtitle: 'معلومات هامة لإدارة المدرسة والإشراف الصحي',
      bloodTypeLabel: 'الفصيلة الدموية',
      emergencyPhoneLabel: 'رقم طوارئ ثانوي',
      emergencyPhonePlaceholder: 'مثال: هاتف الأم أو أحد الأقارب',
      medicalLabel: 'ملاحظات صحية أو حساسية (اختياري)',
      medicalPlaceholder: 'مثال: حساسية الفول السوداني، ربو...',
      btnContinueToPassword: 'متابعة إلى كلمة المرور ←',
      // Step 3
      passwordTitle: 'تعيين كلمة المرور',
      passwordSubtitle:
        'ستستخدم كلمة المرور هذه للدخول إلى الأعداد والغيابات والتقارير.',
      pwdLabel: 'كلمة المرور *',
      pwdPlaceholder: '6 أحرف أو أرقام على الأقل',
      confirmPwdLabel: 'تأكيد كلمة المرور *',
      recapTitle: 'ملخص الحساب الجديد',
      loginId: 'رقم الدخول :',
      linkedChildren: 'التلميذ (الأبناء) المربوطون :',
      btnFinish: 'إنشاء الحساب والدخول إلى التطبيق 🚀',
      alreadyHaveAccount: 'لديك حساب بالفعل ؟',
      signInLink: 'تسجيل الدخول',
    },
    en: {
      screenTitle: 'Parent Sign Up',
      screenSubtitle: 'Link your children and start tracking academic progress',
      step1: '1. Student',
      step2: '2. Parent',
      step3: '3. Security',
      // Step 1
      studentSearchTitle: 'Student Identification',
      studentSearchSubtitle:
        'Enter the student ID / National educational ID provided by the school.',
      nationalIdPlaceholder: 'Ex: 269274689104 or Student ID',
      btnVerify: 'Verify Student',
      verifiedBadge: 'Student Verified',
      school: 'School',
      class: 'Class',
      btnAddSibling: '+ Add another child (sibling)',
      btnContinueToParent: 'Continue to Parent Details →',
      alreadyLinkedWarn:
        'This student is already linked. If this is your account, you may proceed.',
      // Step 2
      parentTitle: 'Your Contact Details',
      parentSubtitle:
        'These details will be used to log in and allow the administration to reach you.',
      firstName: 'First Name *',
      lastName: 'Last Name *',
      phone: 'Mobile Phone Number *',
      phoneHint: 'Your permanent login identifier for the mobile app',
      relationLabel: 'Relationship',
      father: 'Father',
      mother: 'Mother',
      guardian: 'Legal Guardian',
      addressLabel: 'Residential Address',
      addressPlaceholder: 'e.g. Tunis, Ariana...',
      // Extra info
      extraSectionTitle: 'Health & Emergency Details',
      extraSectionSubtitle: 'Useful details stored for the school nurse and administration',
      bloodTypeLabel: 'Blood Type',
      emergencyPhoneLabel: 'Secondary Emergency Contact',
      emergencyPhonePlaceholder: 'e.g. Mother’s or grandparent’s phone',
      medicalLabel: 'Medical notes / allergies (optional)',
      medicalPlaceholder: 'e.g. Peanut allergy, asthma, glasses...',
      btnContinueToPassword: 'Continue to Password →',
      // Step 3
      passwordTitle: 'Create Your Password',
      passwordSubtitle:
        'This password secures access to your children’s grades, attendance, and finances.',
      pwdLabel: 'Password *',
      pwdPlaceholder: 'At least 6 characters',
      confirmPwdLabel: 'Confirm Password *',
      recapTitle: 'Account Summary',
      loginId: 'Login Phone :',
      linkedChildren: 'Linked Child(ren) :',
      btnFinish: 'Create Account & Enter App 🚀',
      alreadyHaveAccount: 'Already have an account?',
      signInLink: 'Sign In',
    },
  };

  const t = txt[language as 'fr' | 'ar' | 'en'] || txt.fr;

  // Handle Verify Student
  const handleVerify = async () => {
    if (!nationalIdInput.trim()) {
      setVerifyError(
        language === 'ar'
          ? 'الرجاء إدخال المعرف الوحيد للتلميذ'
          : 'Veuillez entrer le المعرف التربوي / Matricule.'
      );
      return;
    }

    // Check if already in our verified list
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

  // Step 1 -> Step 2 validation
  const handleGoToStep2 = () => {
    if (verifiedStudents.length === 0) {
      setVerifyError(
        language === 'ar'
          ? 'الرجاء التحقق من تلميذ واحد على الأقل للمتابعة'
          : 'Veuillez vérifier au moins un élève avant de continuer.'
      );
      return;
    }
    // Pre-fill parent surname from first student if empty
    if (!parentSurname && verifiedStudents[0]?.surname) {
      setParentSurname(verifiedStudents[0].surname);
    }
    setCurrentStep(2);
  };

  // Step 2 -> Step 3 validation
  const handleGoToStep3 = () => {
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
  };

  // Step 3: Final submit
  const handleFinalSubmit = async () => {
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
        bloodType: selectedBloodType,
        emergencyPhone: emergencyPhone.trim() || undefined,
        medicalNotes: medicalNotes.trim() || undefined,
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

  const bloodTypes = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* HEADER BAR */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 12,
            backgroundColor: '#ffffff',
            borderBottomWidth: 1,
            borderBottomColor: '#f1f5f9',
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
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#f1f5f9',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronLeft size={22} color="#1e293b" />
          </TouchableOpacity>

          {/* LANGUAGE PILL */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#f1f5f9',
              borderRadius: 20,
              padding: 3,
            }}
          >
            {(['fr', 'ar', 'en'] as const).map((l) => (
              <TouchableOpacity
                key={l}
                onPress={() => setLanguage(l)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 16,
                  backgroundColor: language === l ? '#ffffff' : 'transparent',
                  shadowColor: language === l ? '#000' : 'transparent',
                  shadowOpacity: language === l ? 0.08 : 0,
                  shadowRadius: 3,
                  elevation: language === l ? 1 : 0,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: language === l ? '700' : '500',
                    color: language === l ? '#0055d4' : '#64748b',
                  }}
                >
                  {l === 'fr' ? 'Français' : l === 'ar' ? 'العربية' : 'English'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* STEPPER PROGRESS */}
        <View
          style={{
            backgroundColor: '#ffffff',
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#e2e8f0',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {[
              { num: 1, label: t.step1 },
              { num: 2, label: t.step2 },
              { num: 3, label: t.step3 },
            ].map((st, idx) => {
              const isPassed = currentStep > st.num;
              const isCurrent = currentStep === st.num;
              return (
                <React.Fragment key={st.num}>
                  <View style={{ alignItems: 'center' }}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: isPassed
                          ? '#10b981'
                          : isCurrent
                          ? '#0055d4'
                          : '#e2e8f0',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 4,
                      }}
                    >
                      {isPassed ? (
                        <CheckCircle2 size={18} color="#ffffff" />
                      ) : (
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '800',
                            color: isCurrent ? '#ffffff' : '#94a3b8',
                          }}
                        >
                          {st.num}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={{
                        fontSize: 11.5,
                        fontWeight: isCurrent ? '700' : '500',
                        color: isCurrent ? '#0055d4' : isPassed ? '#10b981' : '#94a3b8',
                      }}
                    >
                      {st.label}
                    </Text>
                  </View>

                  {idx < 2 && (
                    <View
                      style={{
                        flex: 1,
                        height: 2,
                        backgroundColor: currentStep > idx + 1 ? '#10b981' : '#e2e8f0',
                        marginHorizontal: 12,
                        marginBottom: 16,
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* MAIN SCROLLABLE CONTENT */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ================= STEP 1: STUDENT VERIFICATION ================= */}
          {currentStep === 1 && (
            <View>
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '800',
                    color: '#0f172a',
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                >
                  {t.studentSearchTitle}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: '#64748b',
                    marginTop: 6,
                    lineHeight: 20,
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                >
                  {t.studentSearchSubtitle}
                </Text>
              </View>

              {/* LIST OF ALREADY VERIFIED STUDENTS */}
              {verifiedStudents.map((st) => (
                <View
                  key={st.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 16,
                    borderWidth: 1.5,
                    borderColor: '#10b981',
                    shadowColor: '#10b981',
                    shadowOpacity: 0.08,
                    shadowRadius: 10,
                    elevation: 2,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#ecfdf5',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 8,
                      }}
                    >
                      <CheckCircle2 size={14} color="#059669" />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: '#059669',
                          marginLeft: 4,
                        }}
                      >
                        {t.verifiedBadge}
                      </Text>
                    </View>

                    {verifiedStudents.length > 1 && (
                      <TouchableOpacity
                        onPress={() => handleRemoveStudent(st.id)}
                        style={{ padding: 4 }}
                      >
                        <Trash2 size={16} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: st.sex === 'FEMALE' ? '#fdf2f8' : '#eff6ff',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 14,
                      }}
                    >
                      <Text style={{ fontSize: 24 }}>{st.sex === 'FEMALE' ? '👧' : '👦'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 17,
                          fontWeight: '800',
                          color: '#0f172a',
                          textAlign: isRTL ? 'right' : 'left',
                        }}
                      >
                        {st.name} {st.surname}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          color: '#0055d4',
                          fontWeight: '600',
                          marginTop: 2,
                          textAlign: isRTL ? 'right' : 'left',
                        }}
                      >
                        📚 {st.levelName} • {st.className}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11.5,
                          color: '#94a3b8',
                          marginTop: 2,
                          fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                          textAlign: isRTL ? 'right' : 'left',
                        }}
                      >
                        🆔 {st.nationalId}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}

              {/* INPUT BOX (Only shown if 0 students verified OR user clicked "+ Add sibling") */}
              {(verifiedStudents.length === 0 || showAddSibling) && (
                <View
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 16,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    shadowColor: '#000',
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                    elevation: 1,
                    marginBottom: 20,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: '#334155',
                      marginBottom: 8,
                      textAlign: isRTL ? 'right' : 'left',
                    }}
                  >
                    {language === 'ar'
                      ? 'المعرف التربوي / الوحيد للتلميذ'
                      : 'Matricule / المعرف التربوي de l’élève'}
                  </Text>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#f8fafc',
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: '#cbd5e1',
                      paddingHorizontal: 14,
                      height: 52,
                      marginBottom: 12,
                    }}
                  >
                    <GraduationCap size={20} color="#64748b" />
                    <TextInput
                      value={nationalIdInput}
                      onChangeText={(val) => {
                        setNationalIdInput(val);
                        setVerifyError('');
                      }}
                      placeholder={t.nationalIdPlaceholder}
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      style={{
                        flex: 1,
                        fontSize: 16,
                        color: '#0f172a',
                        marginLeft: 10,
                        fontWeight: '600',
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
                        padding: 10,
                        borderRadius: 8,
                        marginBottom: 14,
                      }}
                    >
                      <AlertCircle size={16} color="#ef4444" style={{ marginRight: 6 }} />
                      <Text
                        style={{
                          fontSize: 13,
                          color: '#dc2626',
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
                      borderRadius: 12,
                      height: 48,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      shadowColor: '#0055d4',
                      shadowOpacity: 0.25,
                      shadowRadius: 6,
                      elevation: 3,
                    }}
                  >
                    {isVerifying ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Sparkles size={18} color="#ffffff" style={{ marginRight: 8 }} />
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#ffffff' }}>
                          {t.btnVerify}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* ADD SIBLING BUTTON */}
              {verifiedStudents.length > 0 && !showAddSibling && (
                <TouchableOpacity
                  onPress={() => setShowAddSibling(true)}
                  style={{
                    backgroundColor: '#eff6ff',
                    borderWidth: 1.5,
                    borderStyle: 'dashed',
                    borderColor: '#3b82f6',
                    borderRadius: 14,
                    padding: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    marginBottom: 24,
                  }}
                >
                  <Plus size={18} color="#2563eb" style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#2563eb' }}>
                    {t.btnAddSibling}
                  </Text>
                </TouchableOpacity>
              )}

              {/* NEXT BUTTON */}
              {verifiedStudents.length > 0 && (
                <TouchableOpacity
                  onPress={handleGoToStep2}
                  style={{
                    backgroundColor: '#0f172a',
                    borderRadius: 14,
                    height: 52,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 10,
                    shadowColor: '#000',
                    shadowOpacity: 0.15,
                    shadowRadius: 10,
                    elevation: 3,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#ffffff' }}>
                    {t.btnContinueToParent}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ================= STEP 2: PARENT & EXTRA INFO ================= */}
          {currentStep === 2 && (
            <View>
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '800',
                    color: '#0f172a',
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                >
                  {t.parentTitle}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: '#64748b',
                    marginTop: 4,
                    lineHeight: 20,
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                >
                  {t.parentSubtitle}
                </Text>
              </View>

              {/* PARENT DETAILS FORM */}
              <View
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  marginBottom: 20,
                }}
              >
                {/* First Name */}
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#334155',
                    marginBottom: 6,
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                >
                  {t.firstName}
                </Text>
                <TextInput
                  value={parentName}
                  onChangeText={setParentName}
                  placeholder={language === 'ar' ? 'اسم الولي' : 'ex: Mohamed'}
                  placeholderTextColor="#94a3b8"
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                    paddingHorizontal: 14,
                    height: 48,
                    fontSize: 15,
                    color: '#0f172a',
                    marginBottom: 14,
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                />

                {/* Last Name */}
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#334155',
                    marginBottom: 6,
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                >
                  {t.lastName}
                </Text>
                <TextInput
                  value={parentSurname}
                  onChangeText={setParentSurname}
                  placeholder={language === 'ar' ? 'لقب الولي' : 'ex: Ben Ali'}
                  placeholderTextColor="#94a3b8"
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                    paddingHorizontal: 14,
                    height: 48,
                    fontSize: 15,
                    color: '#0f172a',
                    marginBottom: 14,
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                />

                {/* Phone Number */}
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#334155',
                    marginBottom: 6,
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                >
                  {t.phone}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#f8fafc',
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                    paddingHorizontal: 12,
                    height: 48,
                    marginBottom: 4,
                  }}
                >
                  <Phone size={18} color="#64748b" />
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="ex: 22 345 678"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    style={{
                      flex: 1,
                      fontSize: 15,
                      color: '#0f172a',
                      marginLeft: 10,
                      fontWeight: '600',
                      textAlign: isRTL ? 'right' : 'left',
                    }}
                  />
                </View>
                <Text
                  style={{
                    fontSize: 11.5,
                    color: '#64748b',
                    marginBottom: 16,
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                >
                  {t.phoneHint}
                </Text>

                {/* Relationship Selector */}
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#334155',
                    marginBottom: 8,
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                >
                  {t.relationLabel}
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
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
                          height: 40,
                          borderRadius: 10,
                          backgroundColor: isSel ? '#0055d4' : '#f1f5f9',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: isSel ? '700' : '600',
                            color: isSel ? '#ffffff' : '#475569',
                          }}
                        >
                          {rel.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Address */}
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#334155',
                    marginBottom: 6,
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
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                    paddingHorizontal: 12,
                    height: 48,
                  }}
                >
                  <MapPin size={18} color="#64748b" />
                  <TextInput
                    value={address}
                    onChangeText={setAddress}
                    placeholder={t.addressPlaceholder}
                    placeholderTextColor="#94a3b8"
                    style={{
                      flex: 1,
                      fontSize: 15,
                      color: '#0f172a',
                      marginLeft: 10,
                      textAlign: isRTL ? 'right' : 'left',
                    }}
                  />
                </View>
              </View>

              {/* EXTRA STUDENT / HEALTH INFO */}
              <View
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  marginBottom: 20,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <HeartPulse size={20} color="#e11d48" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>
                    {t.extraSectionTitle}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 12.5,
                    color: '#64748b',
                    marginBottom: 16,
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                >
                  {t.extraSectionSubtitle}
                </Text>

                {/* Blood Type Pills */}
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#334155',
                    marginBottom: 8,
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                >
                  {t.bloodTypeLabel}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {bloodTypes.map((bt) => {
                    const isSel = selectedBloodType === bt;
                    return (
                      <TouchableOpacity
                        key={bt}
                        onPress={() => setSelectedBloodType(bt)}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 7,
                          borderRadius: 8,
                          backgroundColor: isSel ? '#e11d48' : '#f1f5f9',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: isSel ? '800' : '600',
                            color: isSel ? '#ffffff' : '#334155',
                          }}
                        >
                          {bt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Secondary Emergency Phone */}
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#334155',
                    marginBottom: 6,
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                >
                  {t.emergencyPhoneLabel}
                </Text>
                <TextInput
                  value={emergencyPhone}
                  onChangeText={setEmergencyPhone}
                  placeholder={t.emergencyPhonePlaceholder}
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                    paddingHorizontal: 14,
                    height: 48,
                    fontSize: 14,
                    color: '#0f172a',
                    marginBottom: 14,
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                />

                {/* Medical Remarks */}
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#334155',
                    marginBottom: 6,
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                >
                  {t.medicalLabel}
                </Text>
                <TextInput
                  value={medicalNotes}
                  onChangeText={setMedicalNotes}
                  placeholder={t.medicalPlaceholder}
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={2}
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                    paddingHorizontal: 14,
                    paddingTop: 10,
                    minHeight: 64,
                    fontSize: 14,
                    color: '#0f172a',
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                />
              </View>

              {/* NEXT BUTTON */}
              <TouchableOpacity
                onPress={handleGoToStep3}
                style={{
                  backgroundColor: '#0f172a',
                  borderRadius: 14,
                  height: 52,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOpacity: 0.15,
                  shadowRadius: 10,
                  elevation: 3,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#ffffff' }}>
                  {t.btnContinueToPassword}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ================= STEP 3: PASSWORD & FINALIZE ================= */}
          {currentStep === 3 && (
            <View>
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '800',
                    color: '#0f172a',
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                >
                  {t.passwordTitle}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: '#64748b',
                    marginTop: 4,
                    lineHeight: 20,
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                >
                  {t.passwordSubtitle}
                </Text>
              </View>

              {/* PASSWORD FORM */}
              <View
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  marginBottom: 20,
                }}
              >
                {/* Password Input */}
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#334155',
                    marginBottom: 6,
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                >
                  {t.pwdLabel}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#f8fafc',
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                    paddingHorizontal: 12,
                    height: 50,
                    marginBottom: 16,
                  }}
                >
                  <Lock size={18} color="#64748b" />
                  <TextInput
                    value={password}
                    onChangeText={(val) => {
                      setPassword(val);
                      setSubmitError('');
                    }}
                    placeholder={t.pwdPlaceholder}
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    style={{
                      flex: 1,
                      fontSize: 16,
                      color: '#0f172a',
                      marginLeft: 10,
                      fontWeight: '600',
                      textAlign: isRTL ? 'right' : 'left',
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={{ padding: 4 }}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color="#64748b" />
                    ) : (
                      <Eye size={18} color="#64748b" />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Confirm Password Input */}
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#334155',
                    marginBottom: 6,
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                >
                  {t.confirmPwdLabel}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#f8fafc',
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                    paddingHorizontal: 12,
                    height: 50,
                    marginBottom: 10,
                  }}
                >
                  <Lock size={18} color="#64748b" />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(val) => {
                      setConfirmPassword(val);
                      setSubmitError('');
                    }}
                    placeholder="••••••••"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    style={{
                      flex: 1,
                      fontSize: 16,
                      color: '#0f172a',
                      marginLeft: 10,
                      fontWeight: '600',
                      textAlign: isRTL ? 'right' : 'left',
                    }}
                  />
                </View>
              </View>

              {/* RECAP CARD */}
              <View
                style={{
                  backgroundColor: '#eff6ff',
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#bfdbfe',
                  marginBottom: 20,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#1e40af', marginBottom: 8 }}>
                  📋 {t.recapTitle}
                </Text>
                <Text style={{ fontSize: 13, color: '#1e3a8a', marginBottom: 4 }}>
                  <Text style={{ fontWeight: '700' }}>{t.loginId} </Text>
                  {phone}
                </Text>
                <Text style={{ fontSize: 13, color: '#1e3a8a', marginBottom: 4 }}>
                  <Text style={{ fontWeight: '700' }}>{t.linkedChildren} </Text>
                  {verifiedStudents.map((s) => `${s.name} ${s.surname} (${s.levelName})`).join(', ')}
                </Text>
              </View>

              {submitError ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#fef2f2',
                    padding: 12,
                    borderRadius: 10,
                    marginBottom: 16,
                  }}
                >
                  <AlertCircle size={18} color="#ef4444" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 13, color: '#dc2626', fontWeight: '600', flex: 1 }}>
                    {submitError}
                  </Text>
                </View>
              ) : null}

              {/* FINISH BUTTON */}
              <TouchableOpacity
                onPress={handleFinalSubmit}
                disabled={isSubmitting}
                style={{
                  backgroundColor: '#0055d4',
                  borderRadius: 14,
                  height: 54,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  shadowColor: '#0055d4',
                  shadowOpacity: 0.3,
                  shadowRadius: 10,
                  elevation: 4,
                  marginBottom: 16,
                }}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#ffffff' }}>
                    {t.btnFinish}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* BOTTOM LINK BACK TO SIGN IN */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 10,
            }}
          >
            <Text style={{ fontSize: 14, color: '#64748b' }}>{t.alreadyHaveAccount} </Text>
            <TouchableOpacity onPress={onBack}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#0055d4' }}>
                {t.signInLink}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
