import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Globe2,
  GraduationCap,
  X,
} from "lucide-react-native";
import { useLanguage, Language } from "../../context/LanguageContext";

export const colors = {
  ink: "#17243B",
  muted: "#64748B",
  blue: "#2563EB",
  line: "#E4EAF2",
  soft: "#F5F7FB",
  white: "#FFFFFF",
};
export const authStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
    marginBottom: 9,
  },
  body: { fontSize: 14, lineHeight: 22, color: colors.muted },
  small: { fontSize: 12, lineHeight: 19, color: colors.muted },
  card: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: colors.soft,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 16,
  },
  name: { fontSize: 16, lineHeight: 24, fontWeight: "600", color: colors.ink },
  link: { color: colors.blue, fontSize: 14, fontWeight: "600" },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 24 },
});

export function AuthHeader({ onBack }: { onBack?: () => void }) {
  const { language, setLanguage, isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const labels = { fr: "Français", ar: "العربية", en: "English" };
  const backLabel = { fr: "Retour", ar: "رجوع", en: "Back" }[language];
  return (
    <>
      <View
        style={[
          styles.header,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={backLabel}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <ArrowLeft
              size={21}
              color={colors.ink}
              style={{ transform: [{ rotate: isRTL ? "180deg" : "0deg" }] }}
            />
          </Pressable>
        ) : (
          <View style={authStyles.row}>
            <View style={styles.brandIcon}>
              <GraduationCap size={22} color="white" />
            </View>
            <Text style={styles.brand}>
              SnapSchool<Text style={{ color: colors.blue }}>.</Text>
            </Text>
          </View>
        )}
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={
            language === "ar"
              ? "تغيير اللغة"
              : language === "en"
                ? "Change language"
                : "Changer de langue"
          }
          style={({ pressed }) => [styles.language, pressed && styles.pressed]}
        >
          <Globe2 size={16} color={colors.muted} />
          <Text style={styles.languageText}>{labels[language]}</Text>
          <ChevronDown size={14} color={colors.muted} />
        </Pressable>
      </View>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityLabel={
              language === "ar"
                ? "إغلاق"
                : language === "en"
                  ? "Close"
                  : "Fermer"
            }
            accessibilityRole="button"
            onPress={() => setOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.modal} accessibilityViewIsModal>
            <View style={[authStyles.row, { justifyContent: "space-between" }]}>
              <Text style={authStyles.name}>
                {language === "ar"
                  ? "اختر اللغة"
                  : language === "en"
                    ? "Choose your language"
                    : "Choisir la langue"}
              </Text>
              <Pressable
                onPress={() => setOpen(false)}
                accessibilityLabel={
                  language === "ar"
                    ? "إغلاق"
                    : language === "en"
                      ? "Close"
                      : "Fermer"
                }
                accessibilityRole="button"
                style={styles.back}
              >
                <X size={20} color={colors.ink} />
              </Pressable>
            </View>
            {(["fr", "ar", "en"] as Language[]).map((item) => (
              <Pressable
                key={item}
                onPress={async () => {
                  await setLanguage(item);
                  setOpen(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: language === item }}
                style={[
                  styles.languageOption,
                  language === item && { backgroundColor: "#EFF5FF" },
                ]}
              >
                <Text style={authStyles.name}>{labels[item]}</Text>
                {language === item && <Check size={19} color={colors.blue} />}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

export function AuthShell({
  children,
  onBack,
  scrollRef,
}: {
  children: React.ReactNode;
  onBack?: () => void;
  scrollRef?: React.Ref<ScrollView>;
}) {
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.width}>
          <AuthHeader onBack={onBack} />
        </View>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={false}
        >
          <View style={styles.width}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  const { isRTL } = useLanguage();
  return (
    <View style={styles.heading}>
      {eyebrow ? (
        <Text style={[styles.eyebrow, { textAlign: isRTL ? "right" : "left" }]}>
          {eyebrow}
        </Text>
      ) : null}
      <Text
        accessibilityRole="header"
        style={[
          styles.title,
          {
            textAlign: isRTL ? "right" : "left",
            letterSpacing: isRTL ? 0 : -0.8,
          },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          authStyles.body,
          { marginTop: 12, textAlign: isRTL ? "right" : "left" },
        ]}
      >
        {subtitle}
      </Text>
    </View>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  hint?: string;
  invalid?: boolean;
  numeric?: boolean;
};
export function AuthField({
  label,
  icon,
  trailing,
  hint,
  invalid,
  numeric,
  style,
  onFocus,
  onBlur,
  ...input
}: FieldProps) {
  const { isRTL } = useLanguage();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={[authStyles.label, { textAlign: isRTL ? "right" : "left" }]}>
        {label}
      </Text>
      <View
        style={[
          styles.inputWrap,
          { flexDirection: isRTL ? "row-reverse" : "row" },
          focused && styles.inputFocused,
          invalid && styles.inputInvalid,
        ]}
      >
        {icon}
        <TextInput
          {...input}
          accessibilityLabel={label}
          placeholderTextColor="#93A0B2"
          autoCorrect={false}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            styles.input,
            {
              textAlign: numeric ? "left" : isRTL ? "right" : "left",
              writingDirection: numeric ? "ltr" : isRTL ? "rtl" : "ltr",
            },
            style,
          ]}
        />
        {trailing}
      </View>
      {hint && (
        <Text
          style={[
            authStyles.small,
            { marginTop: 8, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          {hint}
        </Text>
      )}
    </View>
  );
}

export function AuthButton({
  label,
  onPress,
  loading = false,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  secondary?: boolean;
  disabled?: boolean;
}) {
  const { isRTL } = useLanguage();
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: loading || disabled, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        { flexDirection: isRTL ? "row-reverse" : "row" },
        pressed && styles.pressed,
        (disabled || loading) && { opacity: 0.6 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.blue : colors.white} />
      ) : (
        <>
          <Text
            style={[styles.buttonText, secondary && { color: colors.blue }]}
          >
            {label}
          </Text>
          {!secondary && (
            <ArrowRight
              size={18}
              color="white"
              style={{ transform: [{ rotate: isRTL ? "180deg" : "0deg" }] }}
            />
          )}
        </>
      )}
    </Pressable>
  );
}

export function AuthNotice({
  children,
  success = false,
}: {
  children: string;
  success?: boolean;
}) {
  const { isRTL } = useLanguage();
  if (!children) return null;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.notice,
        success && { backgroundColor: "#F0FDF4", borderColor: "#BBE5CB" },
      ]}
    >
      <Text
        style={{
          color: success ? "#247146" : "#B42332",
          fontSize: 13,
          lineHeight: 21,
          textAlign: isRTL ? "right" : "left",
        }}
      >
        {children}
      </Text>
    </View>
  );
}

export function AuthFooter({
  prompt,
  label,
  onPress,
}: {
  prompt: string;
  label: string;
  onPress: () => void;
}) {
  const { isRTL } = useLanguage();
  return (
    <View
      style={[styles.footer, { flexDirection: isRTL ? "row-reverse" : "row" }]}
    >
      <Text style={authStyles.small}>{prompt}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={{ paddingVertical: 13, paddingHorizontal: 4 }}
      >
        <Text style={authStyles.link}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  width: { width: "100%", maxWidth: 480, alignSelf: "center" },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 70,
    paddingHorizontal: 24,
    gap: 12,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 32,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.6,
  },
  back: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.soft,
  },
  language: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 8,
  },
  languageText: { fontSize: 12, fontWeight: "500", color: colors.muted },
  heading: { paddingTop: 20, paddingBottom: 30 },
  eyebrow: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.blue,
    marginBottom: 14,
  },
  title: { fontSize: 32, lineHeight: 40, fontWeight: "700", color: colors.ink },
  field: { marginBottom: 22 },
  inputWrap: {
    minHeight: 56,
    backgroundColor: colors.soft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    alignItems: "center",
    gap: 12,
  },
  inputFocused: { borderColor: colors.blue, backgroundColor: "#F8FAFF" },
  inputInvalid: { borderColor: "#D77B85" },
  input: {
    flex: 1,
    minWidth: 0,
    color: colors.ink,
    fontSize: 16,
    paddingVertical: 16,
    paddingHorizontal: 0,
    minHeight: 54,
  },
  button: {
    minHeight: 54,
    paddingVertical: 15,
    paddingHorizontal: 18,
    backgroundColor: colors.blue,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 12,
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "center",
    lineHeight: 22,
  },
  secondary: {
    backgroundColor: "#EFF5FF",
    borderWidth: 1,
    borderColor: "#DBE7FC",
  },
  pressed: { opacity: 0.7 },
  notice: {
    borderWidth: 1,
    borderColor: "#F4D2D5",
    backgroundColor: "#FFF5F5",
    borderRadius: 12,
    padding: 13,
    marginBottom: 18,
  },
  footer: {
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modal: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 20,
    width: "100%",
    maxWidth: 360,
  },
  languageOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    minHeight: 56,
    marginTop: 8,
    borderRadius: 12,
  },
});
