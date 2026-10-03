import React, { useState, useRef } from "react";
import {
  AuthShell,
  AuthTitle,
  AuthField,
  AuthButton,
  AuthNotice,
  AuthFooter,
  authStyles,
  colors,
} from "../components/auth/AuthUI";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Keyboard,
} from "react-native";
import {
  GraduationCap,
  Phone,
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  MapPin,
  X,
} from "lucide-react-native";
import { authService } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import { useLanguage } from "../context/LanguageContext";

interface VerifiedStudent {
  id: string;
  name: string;
  surname: string;
  sex: "MALE" | "FEMALE";
  nationalId: string;
  levelName: string;
  className: string;
  schoolName: string;
  bloodType: string;
  address: string;
}

export const ParentSignUpScreen = ({
  initialPhone = "",
  onBack,
  onSignUpSuccess,
}: {
  initialPhone?: string;
  onBack: () => void;
  onSignUpSuccess: () => void;
}) => {
  const { language, isRTL } = useLanguage();
  const {
    setUserName,
    setUserAvatarUrl,
    setChildren,
    setSelectedChildId,
    setUserId,
    setUserRole,
  } = useAppStore();

  const scrollViewRef = useRef<ScrollView>(null);

  // Wizard Step: 1 = Student, 2 = Parent Info, 3 = Password & Finalize
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Student detection
  const [nationalIdInput, setNationalIdInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifiedStudents, setVerifiedStudents] = useState<VerifiedStudent[]>(
    [],
  );
  const [showAddSibling, setShowAddSibling] = useState(false);

  // Step 2: Parent info
  const [parentName, setParentName] = useState("");
  const [parentSurname, setParentSurname] = useState("");
  const [phone, setPhone] = useState(initialPhone);
  const [relation, setRelation] = useState<"Père" | "Mère" | "Tuteur">("Père");
  const [address, setAddress] = useState("");

  // Step 3: Password
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: "", color: "#e2e8f0" };
    if (pwd.length < 6)
      return {
        score: 1,
        label: language === "ar" ? "ضعيفة جداً" : "Trop court",
        color: "#ef4444",
      };
    const hasLetters = /[a-zA-Z]/.test(pwd);
    const hasNumbers = /[0-9]/.test(pwd);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);

    if (pwd.length >= 8 && hasLetters && hasNumbers && hasSpecial) {
      return {
        score: 4,
        label: language === "ar" ? "ممتازة" : "Excellent",
        color: "#10b981",
      };
    }
    if (pwd.length >= 8 && ((hasLetters && hasNumbers) || hasSpecial)) {
      return {
        score: 3,
        label: language === "ar" ? "قوية" : "Sécurisé",
        color: "#3B7BEA",
      };
    }
    return {
      score: 2,
      label: language === "ar" ? "متوسطة" : "Moyen",
      color: "#f59e0b",
    };
  };

  const pwdStrength = getPasswordStrength(password);

  // Translations
  const txt = {
    fr: {
      screenTitle: "Inscription Parents",
      step1Label: "Élève",
      step2Label: "Coordonnées",
      step3Label: "Sécurité",
      // Step 1
      studentSearchTitle: "Identification de votre enfant",
      studentSearchSubtitle:
        "Entrez le matricule ou المعرف التربوي fourni par l’école pour retrouver instantanément votre enfant.",
      nationalIdLabel: "Matricule / المعرف التربوي de l’élève",
      nationalIdPlaceholder: "Ex: 118728385289",
      btnVerify: "Vérifier l’élève",
      verifiedBadge: "Élève reconnu",
      school: "Établissement",
      class: "Classe",
      btnAddSibling: "+ Ajouter un autre enfant (fratrie)",
      cancelSibling: "Annuler",
      btnContinueToParent: "Continuer vers mes coordonnées",
      alreadyLinkedWarn:
        "Cet élève semble déjà lié à un compte. Si c’est le vôtre, vous pouvez continuer.",
      // Step 2
      parentTitle: "Vos informations de contact",
      parentSubtitle:
        "Ces coordonnées serviront d’identifiant unique et permettront à la direction de vous contacter.",
      firstName: "Prénom du parent",
      firstNamePlaceholder: "Ex: Mohamed",
      lastName: "Nom de famille",
      lastNamePlaceholder: "Ex: Trabelsi",
      phone: "Numéro de téléphone portable",
      phonePlaceholder: "Ex: 22 345 678",
      phoneHint:
        "Ce numéro sera votre identifiant permanent pour vous connecter.",
      relationLabel: "Lien de parenté",
      father: "Père",
      mother: "Mère",
      guardian: "Tuteur légal",
      addressLabel: "Ville ou adresse de résidence (optionnel)",
      addressPlaceholder: "Ex: Tunis, Ariana...",
      btnContinueToPassword: "Continuer vers le mot de passe",
      // Step 3
      passwordTitle: "Sécurisez votre compte",
      passwordSubtitle:
        "Définissez un mot de passe pour accéder en toute sécurité aux notes et informations scolaires.",
      pwdLabel: "Mot de passe",
      pwdPlaceholder: "Au moins 6 caractères",
      confirmPwdLabel: "Confirmez le mot de passe",
      confirmPwdPlaceholder: "Répétez votre mot de passe",
      pwdMismatch: "Les mots de passe ne correspondent pas",
      pwdMatch: "Mots de passe identiques",
      recapTitle: "Récapitulatif de votre accès",
      loginId: "Identifiant mobile :",
      parentHolder: "Parent titulaire :",
      linkedChildren: "Enfant(s) rattaché(s) :",
      btnFinish: "Activer mon compte & Accéder",
      securityBanner: "Accès sécurisé et chiffré par l’établissement scolaire",
      alreadyHaveAccount: "Déjà un compte ?",
      signInLink: "Se connecter",
    },
    ar: {
      screenTitle: "تسجيل حساب ولي أمر",
      step1Label: "التلميذ",
      step2Label: "بيانات الولي",
      step3Label: "الأمان",
      // Step 1
      studentSearchTitle: "التحقق من هوية التلميذ",
      studentSearchSubtitle:
        "أدخل المعرف الوحيد أو التربوي للتلميذ للتعرف على ملفه الدراسي وربطه بحسابك.",
      nationalIdLabel: "المعرف التربوي / الوحيد للتلميذ",
      nationalIdPlaceholder: "مثال: 118728385289",
      btnVerify: "التحقق من التلميذ",
      verifiedBadge: "تم التعرف على التلميذ",
      school: "المؤسسة",
      class: "القسم",
      btnAddSibling: "+ إضافة ابن آخر (إخوة)",
      cancelSibling: "إلغاء",
      btnContinueToParent: "متابعة إلى بيانات الولي",
      alreadyLinkedWarn:
        "هذا التلميذ مرتبط بحساب مسبقاً. إذا كان هذا حسابك، يمكنك المتابعة.",
      // Step 2
      parentTitle: "معلومات الاتصال بالولي",
      parentSubtitle:
        "هذه البيانات ستكون معرفك الدائم لتسجيل الدخول والتواصل مع إدارة المؤسسة.",
      firstName: "اسم الولي",
      firstNamePlaceholder: "مثال: محمد",
      lastName: "لقب العائلة",
      lastNamePlaceholder: "مثال: الطرابلسي",
      phone: "رقم الهاتف الجوال",
      phonePlaceholder: "مثال: 22 345 678",
      phoneHint: "رقم هاتفك سيكون اسم المستخدم الخاص بك لتسجيل الدخول دائماً.",
      relationLabel: "صلة القرابة بالتلميذ",
      father: "أب",
      mother: "أم",
      guardian: "ولي أمر",
      addressLabel: "المدينة أو عنوان الإقامة (اختياري)",
      addressPlaceholder: "مثال: تونس، أريانة...",
      btnContinueToPassword: "متابعة إلى تعيين كلمة المرور",
      // Step 3
      passwordTitle: "تأمين حسابك الشخصي",
      passwordSubtitle:
        "عيّن كلمة مرور خاصة بك لمتابعة الأعداد والغيابات وتقارير أبنائك في سرية تامة.",
      pwdLabel: "كلمة المرور",
      pwdPlaceholder: "6 أحرف أو أرقام على الأقل",
      confirmPwdLabel: "تأكيد كلمة المرور",
      confirmPwdPlaceholder: "أعد إدخال كلمة المرور",
      pwdMismatch: "كلمتا المرور غير متطابقتين",
      pwdMatch: "كلمتا المرور متطابقتان",
      recapTitle: "ملخص الحساب الجديد",
      loginId: "رقم تسجيل الدخول :",
      parentHolder: "الولي المسجل :",
      linkedChildren: "الأبناء المربوطون :",
      btnFinish: "تفعيل الحساب والدخول إلى التطبيق",
      securityBanner: "منصة مدرسية رسمية محمية ومشفّرة بالكامل",
      alreadyHaveAccount: "لديك حساب بالفعل ؟",
      signInLink: "تسجيل الدخول",
    },
    en: {
      screenTitle: "Parent Sign Up",
      step1Label: "Student",
      step2Label: "Contact",
      step3Label: "Security",
      // Step 1
      studentSearchTitle: "Student Identification",
      studentSearchSubtitle:
        "Enter the student ID or National educational ID provided by the school.",
      nationalIdLabel: "Student ID / Matricule",
      nationalIdPlaceholder: "Ex: 118728385289",
      btnVerify: "Verify Student",
      verifiedBadge: "Student Verified",
      school: "School",
      class: "Class",
      btnAddSibling: "+ Add another child (sibling)",
      cancelSibling: "Cancel",
      btnContinueToParent: "Continue to Contact Details",
      alreadyLinkedWarn:
        "This student is already linked. If this is your account, you may proceed.",
      // Step 2
      parentTitle: "Your Contact Details",
      parentSubtitle:
        "These details will serve as your permanent login credentials and emergency contact.",
      firstName: "Parent First Name",
      firstNamePlaceholder: "e.g. Mohamed",
      lastName: "Last Name",
      lastNamePlaceholder: "e.g. Trabelsi",
      phone: "Mobile Phone Number",
      phonePlaceholder: "e.g. 22 345 678",
      phoneHint: "This phone number will be your permanent login ID.",
      relationLabel: "Relationship to Student",
      father: "Father",
      mother: "Mother",
      guardian: "Legal Guardian",
      addressLabel: "City or Address (optional)",
      addressPlaceholder: "e.g. Tunis, Ariana...",
      btnContinueToPassword: "Continue to Password",
      // Step 3
      passwordTitle: "Secure Your Account",
      passwordSubtitle:
        "Set a secure password to access your children’s grades, attendance, and school reports.",
      pwdLabel: "Password",
      pwdPlaceholder: "At least 6 characters",
      confirmPwdLabel: "Confirm Password",
      confirmPwdPlaceholder: "Re-enter your password",
      pwdMismatch: "Passwords do not match",
      pwdMatch: "Passwords match",
      recapTitle: "Account Overview",
      loginId: "Login Phone :",
      parentHolder: "Primary Parent :",
      linkedChildren: "Linked Child(ren) :",
      btnFinish: "Activate Account & Enter App",
      securityBanner: "Secure institutional access encrypted by SnapSchool",
      alreadyHaveAccount: "Already have an account?",
      signInLink: "Sign In",
    },
  };

  const t = txt[language as "fr" | "ar" | "en"] || txt.fr;

  // Verify Student Action
  const handleVerify = async () => {
    Keyboard.dismiss();
    if (!nationalIdInput.trim()) {
      setVerifyError(
        language === "ar"
          ? "الرجاء إدخال المعرف الوحيد للتلميذ"
          : "Veuillez entrer le المعرف التربوي / Matricule.",
      );
      return;
    }

    if (verifiedStudents.some((s) => s.nationalId === nationalIdInput.trim())) {
      setVerifyError(
        language === "ar"
          ? "هذا التلميذ مضاف بالفعل إلى القائمة"
          : "Cet élève est déjà ajouté à votre liste.",
      );
      return;
    }

    setIsVerifying(true);
    setVerifyError("");

    try {
      const res = await authService.verifyStudent(nationalIdInput.trim());
      if (res.success && res.student) {
        setVerifiedStudents((prev) => [
          ...prev,
          res.student as VerifiedStudent,
        ]);
        setNationalIdInput("");
        setShowAddSibling(false);
      } else {
        setVerifyError(
          res.error ||
            (language === "ar"
              ? "لم يتم العثور على التلميذ. تأكد من الرقم المسجل."
              : "Élève non trouvé avec cet identifiant."),
        );
      }
    } catch (err: any) {
      setVerifyError(
        language === "ar"
          ? "خطأ في الاتصال بالشبكة"
          : "Erreur de connexion. Veuillez réessayer.",
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
        language === "ar"
          ? "الرجاء التحقق من تلميذ واحد على الأقل للمتابعة"
          : "Veuillez vérifier au moins un élève avant de continuer.",
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
        language === "ar" ? "بيانات ناقصة" : "Champs incomplets",
        language === "ar"
          ? "الرجاء ملء الاسم واللقب ورقم الهاتف للمتابعة."
          : "Veuillez renseigner votre prénom, nom et numéro de téléphone.",
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
        language === "ar"
          ? "كلمة المرور يجب أن تتكون من 6 أحرف على الأقل."
          : "Le mot de passe doit comporter au moins 6 caractères.",
      );
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError(
        language === "ar"
          ? "كلمتا المرور غير متطابقتين."
          : "Les deux mots de passe ne correspondent pas.",
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

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
        if (
          res.students &&
          Array.isArray(res.students) &&
          res.students.length > 0
        ) {
          setChildren(res.students);
          setSelectedChildId(res.students[0].id);
        }
        onSignUpSuccess();
      } else {
        setSubmitError(res.error || "Erreur lors de la création du compte.");
      }
    } catch (err: any) {
      setSubmitError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const short = {
    fr: {
      title: "Retrouvez votre enfant.",
      subtitle:
        "Saisissez l’identifiant élève fourni par votre école. Vous pourrez ensuite créer votre compte.",
      id: "Identifiant de l’élève",
      help: "Cet identifiant figure sur les documents de votre école. L’administration peut aussi vous le communiquer.",
      infoTitle: "Faisons connaissance.",
      infoSub: "Les informations nécessaires pour rester en lien avec l’école.",
      passwordTitle: "La dernière étape.",
      passwordSub:
        "Choisissez un mot de passe personnel pour protéger votre espace.",
      next: "Continuer",
      add: "Ajouter un autre enfant",
      finish: "Créer mon compte",
      show: "Afficher le mot de passe",
      hide: "Masquer le mot de passe",
      remove: "Retirer",
      step: "Étape",
      phoneHint: "Vous utiliserez ce numéro pour vous connecter.",
      safety: "Votre espace personnel pour suivre votre enfant.",
    },
    en: {
      title: "Find your child.",
      subtitle:
        "Enter the student ID provided by your school. Then create your parent account.",
      id: "Student ID",
      help: "Find this ID on your school documents, or ask the school office.",
      infoTitle: "Let’s get acquainted.",
      infoSub: "A few details to keep you connected with your school.",
      passwordTitle: "One last step.",
      passwordSub: "Choose a personal password to protect your space.",
      next: "Continue",
      add: "Add another child",
      finish: "Create my account",
      show: "Show password",
      hide: "Hide password",
      remove: "Remove",
      step: "Step",
      phoneHint: "You’ll use this number to sign in.",
      safety: "Your personal space to follow your child’s school life.",
    },
    ar: {
      title: "اربط حسابك بابنك.",
      subtitle: "أدخل المعرف التربوي الذي وفّرته المدرسة، ثم أنشئ حسابك.",
      id: "المعرف التربوي للتلميذ",
      help: "تجد المعرف في وثائق المدرسة. يمكنك أيضا طلبه من الإدارة.",
      infoTitle: "نتعرّف عليك.",
      infoSub: "بعض المعلومات لنبقى على تواصل مع مدرستك.",
      passwordTitle: "الخطوة الأخيرة.",
      passwordSub: "اختر كلمة مرور شخصية لحماية فضائك.",
      next: "متابعة",
      add: "إضافة ابن آخر",
      finish: "إنشاء حسابي",
      show: "إظهار كلمة المرور",
      hide: "إخفاء كلمة المرور",
      remove: "إزالة",
      step: "الخطوة",
      phoneHint: "ستستعمل هذا الرقم لتسجيل الدخول.",
      safety: "فضاؤك الشخصي لمتابعة الحياة الدراسية لابنك.",
    },
  }[language];
  const align = { textAlign: isRTL ? ("right" as const) : ("left" as const) };
  const row = {
    flexDirection: isRTL ? ("row-reverse" as const) : ("row" as const),
  };
  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as 1 | 2);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    } else onBack();
  };
  return (
    <AuthShell onBack={goBack} scrollRef={scrollViewRef}>
      <View style={{ paddingTop: 15 }}>
        <View
          style={[
            authStyles.row,
            row,
            { justifyContent: "space-between", marginBottom: 18 },
          ]}
        >
          <Text style={[authStyles.label, { marginBottom: 0 }]}>
            {t.screenTitle}
          </Text>
          <Text style={authStyles.small}>
            {short.step} {currentStep}/3
          </Text>
        </View>
        <View style={[authStyles.row, row, { gap: 8 }]}>
          {[t.step1Label, t.step2Label, t.step3Label].map((label, index) => (
            <View key={label} style={{ flex: 1 }}>
              <View
                style={{
                  height: 3,
                  borderRadius: 2,
                  backgroundColor:
                    index + 1 <= currentStep ? colors.blue : colors.line,
                  marginBottom: 9,
                }}
              />
              <Text
                style={[
                  {
                    fontSize: 11,
                    color:
                      index + 1 === currentStep ? colors.blue : colors.muted,
                    fontWeight: index + 1 === currentStep ? "600" : "400",
                  },
                  align,
                ]}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <AuthTitle
        eyebrow=""
        title={
          currentStep === 1
            ? short.title
            : currentStep === 2
              ? short.infoTitle
              : short.passwordTitle
        }
        subtitle={
          currentStep === 1
            ? short.subtitle
            : currentStep === 2
              ? short.infoSub
              : short.passwordSub
        }
      />
      {currentStep === 1 && (
        <View>
          {verifiedStudents.map((student) => (
            <View key={student.id} style={authStyles.card}>
              <View
                style={[
                  authStyles.row,
                  row,
                  { justifyContent: "space-between" },
                ]}
              >
                <View style={[authStyles.row, row, { flex: 1 }]}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: "#E4F2EB",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CheckCircle2 size={21} color="#27805B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[authStyles.small, { color: "#27805B" }, align]}
                    >
                      {t.verifiedBadge}
                    </Text>
                    <Text style={[authStyles.name, align]}>
                      {student.name} {student.surname}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`${short.remove} ${student.name}`}
                  onPress={() => handleRemoveStudent(student.id)}
                  style={{
                    minHeight: 44,
                    minWidth: 44,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={19} color={colors.muted} />
                </TouchableOpacity>
              </View>
              <Text style={[authStyles.small, { marginTop: 14 }, align]}>
                {student.schoolName}
              </Text>
              <Text style={[authStyles.small, align]}>
                {student.levelName} · {student.className}
              </Text>
            </View>
          ))}
          {(verifiedStudents.length === 0 || showAddSibling) && (
            <View>
              <AuthField
                label={short.id}
                value={nationalIdInput}
                onChangeText={(value) => {
                  setNationalIdInput(value);
                  setVerifyError("");
                }}
                placeholder="118728385289"
                keyboardType="number-pad"
                numeric
                icon={<GraduationCap size={20} color={colors.muted} />}
                editable={!isVerifying}
                invalid={!!verifyError}
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (!isVerifying) handleVerify();
                }}
              />
              <AuthNotice>{verifyError}</AuthNotice>
              <AuthButton
                label={t.btnVerify}
                onPress={handleVerify}
                loading={isVerifying}
              />
              {showAddSibling ? (
                <AuthButton
                  label={t.cancelSibling}
                  secondary
                  onPress={() => {
                    setShowAddSibling(false);
                    setVerifyError("");
                    setNationalIdInput("");
                  }}
                />
              ) : (
                <View
                  style={[
                    authStyles.row,
                    row,
                    {
                      alignItems: "flex-start",
                      marginTop: 12,
                      paddingHorizontal: 2,
                    },
                  ]}
                >
                  <AlertCircle
                    size={17}
                    color="#8594AB"
                    style={{ marginTop: 2 }}
                  />
                  <Text style={[authStyles.small, { flex: 1 }, align]}>
                    {short.help}
                  </Text>
                </View>
              )}
            </View>
          )}
          {verifiedStudents.length > 0 && !showAddSibling && (
            <AuthButton
              secondary
              label={short.add}
              onPress={() => {
                setShowAddSibling(true);
                setVerifyError("");
              }}
            />
          )}
          {verifiedStudents.length > 0 && (
            <AuthButton
              label={short.next}
              onPress={handleGoToStep2}
              disabled={isVerifying}
            />
          )}
        </View>
      )}
      {currentStep === 2 && (
        <View>
          <AuthField
            label={t.firstName}
            value={parentName}
            onChangeText={setParentName}
            placeholder={t.firstNamePlaceholder}
            autoComplete="given-name"
            autoCapitalize="words"
            icon={<User size={19} color={colors.muted} />}
          />
          <AuthField
            label={t.lastName}
            value={parentSurname}
            onChangeText={setParentSurname}
            placeholder={t.lastNamePlaceholder}
            autoComplete="family-name"
            autoCapitalize="words"
            icon={<User size={19} color={colors.muted} />}
          />
          <AuthField
            label={t.phone}
            value={phone}
            onChangeText={setPhone}
            placeholder="22 345 678"
            keyboardType="phone-pad"
            autoComplete="tel"
            numeric
            icon={<Phone size={19} color={colors.muted} />}
            hint={short.phoneHint}
          />
          <Text style={[authStyles.label, align]}>{t.relationLabel}</Text>
          <View style={[authStyles.row, row, { gap: 8, marginBottom: 23 }]}>
            {[
              { value: "Père" as const, label: t.father },
              { value: "Mère" as const, label: t.mother },
              { value: "Tuteur" as const, label: t.guardian },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: relation === option.value }}
                onPress={() => setRelation(option.value)}
                style={{
                  flex: 1,
                  minHeight: 48,
                  paddingVertical: 12,
                  paddingHorizontal: 5,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor:
                    relation === option.value ? "#9DBBF4" : colors.line,
                  backgroundColor:
                    relation === option.value ? "#EFF5FF" : colors.white,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    textAlign: "center",
                    fontWeight: relation === option.value ? "600" : "400",
                    color:
                      relation === option.value ? colors.blue : colors.muted,
                  }}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <AuthField
            label={t.addressLabel}
            value={address}
            onChangeText={setAddress}
            placeholder={t.addressPlaceholder}
            autoComplete="street-address"
            icon={<MapPin size={19} color={colors.muted} />}
          />
          <AuthButton label={short.next} onPress={handleGoToStep3} />
        </View>
      )}
      {currentStep === 3 && (
        <View>
          <AuthField
            label={t.pwdLabel}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setSubmitError("");
            }}
            placeholder={t.pwdPlaceholder}
            autoComplete="new-password"
            autoCapitalize="none"
            secureTextEntry={!showPassword}
            editable={!isSubmitting}
            icon={<Lock size={19} color={colors.muted} />}
            trailing={
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={showPassword ? short.hide : short.show}
                onPress={() => setShowPassword(!showPassword)}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {showPassword ? (
                  <EyeOff size={19} color={colors.muted} />
                ) : (
                  <Eye size={19} color={colors.muted} />
                )}
              </TouchableOpacity>
            }
          />
          {!!password && (
            <View style={{ marginTop: -10, marginBottom: 22 }}>
              <View style={[authStyles.row, row, { gap: 5, marginBottom: 6 }]}>
                {[1, 2, 3, 4].map((segment) => (
                  <View
                    key={segment}
                    style={{
                      flex: 1,
                      height: 3,
                      borderRadius: 2,
                      backgroundColor:
                        pwdStrength.score >= segment
                          ? pwdStrength.color
                          : colors.line,
                    }}
                  />
                ))}
              </View>
              <Text style={[authStyles.small, align]}>{pwdStrength.label}</Text>
            </View>
          )}
          <AuthField
            label={t.confirmPwdLabel}
            value={confirmPassword}
            onChangeText={(value) => {
              setConfirmPassword(value);
              setSubmitError("");
            }}
            placeholder={t.confirmPwdPlaceholder}
            autoComplete="new-password"
            autoCapitalize="none"
            secureTextEntry={!showPassword}
            editable={!isSubmitting}
            invalid={!!confirmPassword && confirmPassword !== password}
            icon={<Lock size={19} color={colors.muted} />}
          />
          {!!confirmPassword && (
            <Text
              style={[
                authStyles.small,
                align,
                {
                  marginTop: -10,
                  marginBottom: 22,
                  color: confirmPassword === password ? "#27805B" : "#B42332",
                },
              ]}
            >
              {confirmPassword === password ? t.pwdMatch : t.pwdMismatch}
            </Text>
          )}
          <View style={authStyles.card}>
            <Text style={[authStyles.label, align]}>{t.recapTitle}</Text>
            <Text style={[authStyles.name, align]}>
              {parentName} {parentSurname}
            </Text>
            <Text
              style={[
                authStyles.small,
                { writingDirection: "ltr", marginTop: 4 },
                align,
              ]}
            >
              {phone}
            </Text>
            <View
              style={{
                height: 1,
                backgroundColor: colors.line,
                marginVertical: 13,
              }}
            />
            {verifiedStudents.map((child) => (
              <View
                key={child.id}
                style={[authStyles.row, row, { marginVertical: 4 }]}
              >
                <GraduationCap size={17} color={colors.blue} />
                <Text style={[authStyles.small, align, { flex: 1 }]}>
                  {child.name} {child.surname} · {child.className}
                </Text>
              </View>
            ))}
          </View>
          <AuthNotice>{submitError}</AuthNotice>
          <AuthButton
            label={short.finish}
            onPress={handleFinalSubmit}
            loading={isSubmitting}
          />
          <Text
            style={[authStyles.small, { textAlign: "center", marginTop: 4 }]}
          >
            {short.safety}
          </Text>
        </View>
      )}
      <AuthFooter
        prompt={t.alreadyHaveAccount}
        label={t.signInLink}
        onPress={onBack}
      />
    </AuthShell>
  );
};
