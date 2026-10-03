import React, { useState } from "react";
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
import { View, Text, TouchableOpacity, Keyboard } from "react-native";
import { Phone, Lock, Mail, Eye, EyeOff } from "lucide-react-native";
import { authService } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import { useLanguage } from "../context/LanguageContext";

export const SignInScreen = ({
  role,
  onSignIn,
  onBack,
  onNavigateToSignUp,
}: {
  role: "parent" | "teacher" | "admin";
  onSignIn: () => void;
  onBack: () => void;
  onNavigateToSignUp?: (phone?: string) => void;
}) => {
  const {
    setUserName,
    setUserAvatarUrl,
    setChildren,
    setSelectedChildId,
    setUserId,
    setUserRole,
  } = useAppStore();
  const { language, isRTL } = useLanguage();

  const [step, setStep] = useState<"PHONE" | "NEEDS_PASSWORD" | "NEEDS_SETUP">(
    "PHONE",
  );
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [tempParent, setTempParent] = useState<{
    name: string;
    img: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);

  const handleCheckStatus = async () => {
    Keyboard.dismiss();
    if (!phone.trim()) {
      setError(
        language === "ar"
          ? "الرجاء إدخال رقم الهاتف للمتابعة"
          : "Veuillez entrer votre numéro de téléphone.",
      );
      return;
    }
    setIsLoading(true);
    setError("");
    setShowSignUpPrompt(false);
    try {
      const result = await authService.checkPhoneStatus(phone.trim(), role);
      if (result.success && result.status) {
        setTempParent({ name: result.name || "User", img: result.img || null });
        setStep(result.status);
      } else {
        if (role === "parent" && result.notFound) {
          setShowSignUpPrompt(true);
        } else {
          setError(
            result.error ||
              (language === "ar"
                ? "الحساب غير موجود. تواصل مع إدارة المدرسة."
                : "Compte introuvable. Veuillez contacter l’administration."),
          );
        }
      }
    } catch (e) {
      setError(
        language === "ar"
          ? "خطأ في الشبكة. يرجى المحاولة لاحقاً."
          : "Erreur réseau. Veuillez réessayer.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalAuth = async () => {
    Keyboard.dismiss();
    if (role === "admin" && !phone.trim()) {
      setError(
        language === "ar"
          ? "الرجاء إدخال البريد الإلكتروني"
          : "Veuillez entrer votre email",
      );
      return;
    }
    if (!password.trim()) {
      setError(
        language === "ar"
          ? "الرجاء إدخال كلمة المرور"
          : "Veuillez entrer votre mot de passe.",
      );
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const action = step === "NEEDS_SETUP" ? "setup" : "signin";
      const result = await authService.authenticate(
        phone.trim(),
        password,
        action,
        role,
      );
      if (result.success) {
        if (step === "NEEDS_SETUP") {
          setHint(
            language === "ar"
              ? "تم تعيين كلمة المرور بنجاح ! يمكنك الآن الدخول."
              : "Mot de passe configuré ! Veuillez vous connecter.",
          );
          setPassword("");
          setStep("NEEDS_PASSWORD");
          setIsLoading(false);
          return;
        }
        if (result.name) setUserName(result.name);
        else if (tempParent?.name) setUserName(tempParent.name);
        if (result.img) setUserAvatarUrl(result.img);
        else if (tempParent?.img) setUserAvatarUrl(tempParent.img);
        if (result.userId) setUserId(result.userId);
        if (result.userType) setUserRole(result.userType as any);
        if (
          result.students &&
          Array.isArray(result.students) &&
          result.students.length > 0
        ) {
          setChildren(result.students);
          setSelectedChildId(result.students[0].id);
        }
        onSignIn();
      } else {
        const errorMessage = result.error || "Échec de la connexion.";
        if (errorMessage.toLowerCase().includes("password not set")) {
          setHint(
            language === "ar"
              ? "تمت إعادة ضبط الحساب. يرجى تعيين كلمة مرور جديدة."
              : "Mot de passe réinitialisé. Veuillez en choisir un nouveau.",
          );
          setPassword("");
          setStep("NEEDS_SETUP");
          setIsLoading(false);
          return;
        }
        setError(errorMessage);
        setIsLoading(false);
      }
    } catch (e) {
      setError(
        language === "ar"
          ? "فشل التحقق من البيانات"
          : "Erreur d’authentification. Vérifiez votre connexion.",
      );
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "PHONE") {
      onBack();
    } else {
      setStep("PHONE");
      setPassword("");
      setError("");
      setHint("");
    }
  };

  const copy = {
    fr: {
      parent: "Espace parents",
      teacher: "Espace enseignants",
      admin: "Espace direction",
      welcome: "Heureux de vous retrouver.",
      adminTitle: "Votre école vous attend.",
      phoneSub: "Utilisez le numéro de téléphone communiqué à votre école.",
      adminSub: "Connectez-vous avec votre compte administrateur.",
      passwordTitle: "Entrez votre mot de passe.",
      setupTitle: "Créez votre mot de passe.",
      passwordSub: "Encore une étape pour retrouver votre espace.",
      setupSub: "Choisissez un mot de passe pour votre premier accès.",
      phone: "Numéro de téléphone",
      email: "Adresse e-mail",
      password: "Mot de passe",
      next: "Continuer",
      login: "Se connecter",
      setup: "Définir le mot de passe",
      passwordHint: "Au moins 6 caractères",
      show: "Afficher le mot de passe",
      hide: "Masquer le mot de passe",
      change: "Modifier",
      new: "Première visite ?",
      signup: "Créer un compte",
      staff: "Votre compte est fourni par votre établissement.",
      missing: "Ce numéro n’est pas encore associé à un compte parent.",
      help: "Un problème d’accès ? Contactez votre école.",
    },
    en: {
      parent: "Parent space",
      teacher: "Teacher space",
      admin: "School team",
      welcome: "Good to see you again.",
      adminTitle: "Your school is waiting.",
      phoneSub: "Use the phone number shared with your school.",
      adminSub: "Sign in with your administrator account.",
      passwordTitle: "Enter your password.",
      setupTitle: "Create your password.",
      passwordSub: "One more step to access your space.",
      setupSub: "Choose a password for your first sign-in.",
      phone: "Phone number",
      email: "Email address",
      password: "Password",
      next: "Continue",
      login: "Sign in",
      setup: "Set password",
      passwordHint: "At least 6 characters",
      show: "Show password",
      hide: "Hide password",
      change: "Change",
      new: "First time here?",
      signup: "Create an account",
      staff: "Your account is provided by your school.",
      missing: "This number is not linked to a parent account yet.",
      help: "Trouble signing in? Contact your school.",
    },
    ar: {
      parent: "فضاء الأولياء",
      teacher: "فضاء المدرّسين",
      admin: "فضاء الإدارة",
      welcome: "سعداء بعودتك.",
      adminTitle: "مدرستك في انتظارك.",
      phoneSub: "استعمل رقم الهاتف الذي قدّمته لمدرستك.",
      adminSub: "ادخل باستعمال حسابك الإداري.",
      passwordTitle: "أدخل كلمة المرور.",
      setupTitle: "أنشئ كلمة المرور.",
      passwordSub: "خطوة أخيرة للدخول إلى فضائك.",
      setupSub: "اختر كلمة مرور لدخولك الأوّل.",
      phone: "رقم الهاتف",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      next: "متابعة",
      login: "تسجيل الدخول",
      setup: "حفظ كلمة المرور",
      passwordHint: "6 أحرف على الأقل",
      show: "إظهار كلمة المرور",
      hide: "إخفاء كلمة المرور",
      change: "تعديل",
      new: "أول زيارة؟",
      signup: "إنشاء حساب",
      staff: "توفّر لك المدرسة حساب الدخول.",
      missing: "هذا الرقم غير مرتبط بحساب وليّ بعد.",
      help: "صعوبة في الدخول؟ تواصل مع مدرستك.",
    },
  }[language];
  const passwordStep = role === "admin" || step !== "PHONE";
  const title =
    role === "admin"
      ? copy.adminTitle
      : step === "PHONE"
        ? copy.welcome
        : step === "NEEDS_SETUP"
          ? copy.setupTitle
          : copy.passwordTitle;
  const subtitle =
    role === "admin"
      ? copy.adminSub
      : step === "PHONE"
        ? copy.phoneSub
        : step === "NEEDS_SETUP"
          ? copy.setupSub
          : copy.passwordSub;
  return (
    <AuthShell onBack={handleBack}>
      <AuthTitle eyebrow={copy[role]} title={title} subtitle={subtitle} />
      {role !== "admin" && step !== "PHONE" && (
        <View
          style={[
            authStyles.card,
            authStyles.row,
            {
              flexDirection: isRTL ? "row-reverse" : "row",
              justifyContent: "space-between",
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={[
                authStyles.small,
                { textAlign: isRTL ? "right" : "left" },
              ]}
            >
              {tempParent?.name}
            </Text>
            <Text style={[authStyles.name, { writingDirection: "ltr" }]}>
              {phone}
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={handleBack}
            style={{ padding: 10 }}
          >
            <Text style={authStyles.link}>{copy.change}</Text>
          </TouchableOpacity>
        </View>
      )}
      {(role === "admin" || step === "PHONE") && (
        <AuthField
          label={role === "admin" ? copy.email : copy.phone}
          value={phone}
          onChangeText={(value) => {
            setPhone(value);
            setError("");
            setShowSignUpPrompt(false);
          }}
          placeholder={role === "admin" ? "direction@ecole.tn" : "22 345 678"}
          icon={
            role === "admin" ? (
              <Mail size={19} color={colors.muted} />
            ) : (
              <Phone size={19} color={colors.muted} />
            )
          }
          numeric
          keyboardType={role === "admin" ? "email-address" : "phone-pad"}
          autoCapitalize="none"
          autoComplete={role === "admin" ? "email" : "tel"}
          editable={!isLoading}
          invalid={!!error}
          returnKeyType="next"
          onSubmitEditing={() => {
            if (!passwordStep && !isLoading) handleCheckStatus();
          }}
        />
      )}
      {passwordStep && (
        <AuthField
          label={copy.password}
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setError("");
          }}
          placeholder={step === "NEEDS_SETUP" ? copy.passwordHint : "••••••••"}
          icon={<Lock size={19} color={colors.muted} />}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete={
            step === "NEEDS_SETUP" ? "new-password" : "current-password"
          }
          editable={!isLoading}
          invalid={!!error}
          returnKeyType="done"
          onSubmitEditing={() => {
            if (!isLoading) handleFinalAuth();
          }}
          trailing={
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={showPassword ? copy.hide : copy.show}
              onPress={() => setShowPassword(!showPassword)}
              style={{
                minWidth: 44,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
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
      )}
      <AuthNotice>{error}</AuthNotice>
      <AuthNotice success>{hint}</AuthNotice>
      {showSignUpPrompt && role === "parent" && (
        <View style={authStyles.card}>
          <Text
            style={[
              authStyles.body,
              { textAlign: isRTL ? "right" : "left", marginBottom: 14 },
            ]}
          >
            {copy.missing}
          </Text>
          <AuthButton
            label={copy.signup}
            onPress={() => onNavigateToSignUp?.(phone.trim())}
            secondary
          />
        </View>
      )}
      <AuthButton
        label={
          !passwordStep
            ? copy.next
            : step === "NEEDS_SETUP"
              ? copy.setup
              : copy.login
        }
        onPress={passwordStep ? handleFinalAuth : handleCheckStatus}
        loading={isLoading}
      />
      {role === "parent" ? (
        <AuthFooter
          prompt={copy.new}
          label={copy.signup}
          onPress={() => onNavigateToSignUp?.(phone.trim())}
        />
      ) : (
        <Text
          style={[authStyles.small, { textAlign: "center", marginTop: 18 }]}
        >
          {copy.staff}
        </Text>
      )}
      <View style={authStyles.divider} />
      <Text style={[authStyles.small, { textAlign: "center" }]}>
        {copy.help}
      </Text>
    </AuthShell>
  );
};
