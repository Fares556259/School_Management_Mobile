import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Heart,
  ShieldCheck,
} from "lucide-react-native";
import { useLanguage } from "../context/LanguageContext";
import {
  AuthShell,
  AuthTitle,
  authStyles,
  colors,
} from "../components/auth/AuthUI";

const copy = {
  fr: {
    eyebrow: "VOTRE ÉCOLE, À PORTÉE DE MAIN",
    title: "Une école.\nTous connectés.",
    subtitle:
      "Choisissez votre espace pour retrouver votre quotidien scolaire.",
    parent: "Parent",
    parentSub: "Le quotidien de vos enfants, en un regard.",
    teacher: "Enseignant",
    teacherSub: "Vos classes, vos notes et vos élèves.",
    admin: "Direction",
    adminSub: "Votre école, vos finances et Hnia.",
    footer: "Votre lien avec l’école, simplement.",
  },
  en: {
    eyebrow: "YOUR SCHOOL, CLOSE AT HAND",
    title: "One school.\nAll connected.",
    subtitle: "Choose your space to access your school day.",
    parent: "Parent",
    parentSub: "Your children’s school life at a glance.",
    teacher: "Teacher",
    teacherSub: "Your classes, grades and students.",
    admin: "School team",
    adminSub: "Your school, finances and Hnia.",
    footer: "A simpler connection to your school.",
  },
  ar: {
    eyebrow: "مدرستك بين يديك",
    title: "مدرسة واحدة.\nالكل متواصل.",
    subtitle: "اختر فضاءك لمتابعة يومك الدراسي بكل سهولة.",
    parent: "ولي الأمر",
    parentSub: "كل أخبار أبنائك الدراسية في مكان واحد.",
    teacher: "المدرّس",
    teacherSub: "أقسامك وأعدادك وتلاميذك.",
    admin: "الإدارة",
    adminSub: "مدرستك وماليتها والمساعدة هنيّة.",
    footer: "صلتك بالمدرسة، بكل بساطة.",
  },
};
export const LandingScreen = ({
  onSelectRole,
}: {
  onSelectRole: (role: "parent" | "teacher" | "admin") => void;
  onViewOnboarding?: () => void;
}) => {
  const { language, isRTL } = useLanguage();
  const t = copy[language];
  const roles = [
    {
      id: "parent" as const,
      title: t.parent,
      description: t.parentSub,
      Icon: Heart,
      color: "#2563EB",
      background: "#EDF4FF",
    },
    {
      id: "teacher" as const,
      title: t.teacher,
      description: t.teacherSub,
      Icon: BookOpen,
      color: "#26816B",
      background: "#ECF7F2",
    },
    {
      id: "admin" as const,
      title: t.admin,
      description: t.adminSub,
      Icon: Building2,
      color: "#8961BB",
      background: "#F4EFFA",
    },
  ];
  return (
    <AuthShell>
      <AuthTitle eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />
      <View style={styles.roles}>
        {roles.map(({ id, title, description, Icon, color, background }) => (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={title}
            accessibilityHint={description}
            onPress={() => onSelectRole(id)}
            style={({ pressed }) => [
              styles.role,
              { flexDirection: isRTL ? "row-reverse" : "row" },
              pressed && {
                backgroundColor: colors.soft,
                borderColor: "#BBCDE8",
              },
            ]}
          >
            <View style={[styles.icon, { backgroundColor: background }]}>
              <Icon size={24} color={color} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.roleTitle,
                  { textAlign: isRTL ? "right" : "left" },
                ]}
              >
                {title}
              </Text>
              <Text
                style={[
                  styles.roleDescription,
                  { textAlign: isRTL ? "right" : "left" },
                ]}
              >
                {description}
              </Text>
            </View>
            <ArrowRight
              size={18}
              color="#8694A8"
              style={{ transform: [{ rotate: isRTL ? "180deg" : "0deg" }] }}
            />
          </Pressable>
        ))}
      </View>
      <View
        style={[
          styles.footer,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        <ShieldCheck size={16} color="#8594AB" />
        <Text style={authStyles.small}>{t.footer}</Text>
      </View>
    </AuthShell>
  );
};
const styles = StyleSheet.create({
  roles: { gap: 14, marginTop: 8 },
  role: {
    alignItems: "center",
    gap: 16,
    padding: 18,
    minHeight: 110,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
  },
  icon: {
    width: 48,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  roleTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.ink,
    marginBottom: 5,
  },
  roleDescription: { fontSize: 12, lineHeight: 19, color: colors.muted },
  footer: {
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 34,
    paddingBottom: 4,
  },
});
