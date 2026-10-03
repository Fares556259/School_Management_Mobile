import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import {
  Wallet,
  CreditCard,
  TrendingUp,
  Users,
  Camera,
  Calendar,
  Sparkles,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react-native';
import { useLanguage } from '../../../context/LanguageContext';

const HNIA_AVATAR = require('../../../../assets/hnia/hnia_mascot_icon.png');

export interface SuggestionAction {
  id: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  prompt?: string;
  onPress?: () => void;
}

interface HniaEmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
  onOpenAttachmentSheet: () => void;
  schoolName?: string;
}

export default function HniaEmptyState({
  onSelectPrompt,
  onOpenAttachmentSheet,
  schoolName = 'SnapSchool',
}: HniaEmptyStateProps) {
  const { language, isRTL } = useLanguage();

  const suggestions: SuggestionAction[] = [
    {
      id: 'revenus',
      icon: TrendingUp,
      iconColor: '#0284c7',
      iconBg: '#e0f2fe',
      title: language === 'ar' ? 'مداخيل الشهر' : language === 'en' ? 'Monthly Revenue' : 'Recettes du mois',
      description: language === 'ar' ? 'كشف الخزينة والمداخيل والرصيد الصافي' : language === 'en' ? 'Cash status, inflows and net balance' : 'Point de caisse, rentrées et solde physique net',
      prompt: language === 'ar' ? 'أعطني مداخيل وحصيلة هذا الشهر المالية' : language === 'en' ? 'Show me the revenue and financial summary for this month' : 'Donne-moi les revenus et le bilan financier de ce mois',
    },
    {
      id: 'impayes',
      icon: CreditCard,
      iconColor: '#dc2626',
      iconBg: '#fef2f2',
      title: language === 'ar' ? 'المستحقات المتأخرة' : language === 'en' ? 'Overdue Payments' : 'Paiements en retard',
      description: language === 'ar' ? 'التلاميذ غير الخالصين وإمكانية التذكير' : language === 'en' ? 'Students with unpaid fees and reminders' : 'Élèves avec impayés et options de relance',
      prompt: language === 'ar' ? 'من هم التلاميذ المتأخرون في الدفع هذا الشهر ؟' : language === 'en' ? 'Which students have unpaid fees this month?' : "Quels sont les élèves qui ont des impayés ce mois-ci ?",
    },
    {
      id: 'depense',
      icon: Wallet,
      iconColor: '#059669',
      iconBg: '#ecfdf5',
      title: language === 'ar' ? 'تسجيل مدخول / مصروف' : language === 'en' ? 'Record Expense / Income' : 'Ajouter une dépense / recette',
      description: language === 'ar' ? 'تسجيل خروج أو دخول أموال في الخزينة' : language === 'en' ? 'Record cash outflow or inflow' : 'Enregistrer une sortie ou une rentrée de fonds',
      prompt: language === 'ar' ? 'أريد تسجيل مصروف جديد' : language === 'en' ? 'I want to record a new expense' : 'Je souhaite enregistrer une nouvelle dépense',
    },
    {
      id: 'doc',
      icon: Camera,
      iconColor: '#0055d4',
      iconBg: '#eff6ff',
      title: language === 'ar' ? 'تحليل وصل / وثيقة' : language === 'en' ? 'Analyze Receipt / Doc' : 'Analyser un reçu / document',
      description: language === 'ar' ? 'تصوير وصل لاستخراج البيانات تلقائياً' : language === 'en' ? 'Receipt photo with auto extraction' : 'Photo de facture ou reçu avec extraction automatique',
      onPress: onOpenAttachmentSheet,
    },
    {
      id: 'absences',
      icon: Users,
      iconColor: '#d97706',
      iconBg: '#fffbeb',
      title: language === 'ar' ? 'غيابات اليوم' : language === 'en' ? "Today's Absences" : 'Élèves absents du jour',
      description: language === 'ar' ? 'متابعة الحضور وتنبيهات الأولياء' : language === 'en' ? 'Attendance tracking and alerts' : 'Suivi des présences et alertes parents',
      prompt: language === 'ar' ? 'ما هي الغيابات المسجلة اليوم ؟' : language === 'en' ? 'What absences are recorded today?' : "Quelles sont les absences constatées aujourd'hui ?",
    },
    {
      id: 'timetable',
      icon: Calendar,
      iconColor: '#7c3aed',
      iconBg: '#f5f3ff',
      title: language === 'ar' ? 'جدول الأوقات' : language === 'en' ? 'Timetable Schedule' : 'Emploi du temps',
      description: language === 'ar' ? 'الحصص المبرمجة وشغور الأساتذة' : language === 'en' ? 'Scheduled lessons and teachers' : 'Séances prévues et disponibilité des enseignants',
      prompt: language === 'ar' ? 'أرني جدول الحصص المبرمجة اليوم.' : language === 'en' ? "Show me today's class schedule." : "Montre-moi l'emploi du temps des cours prévus aujourd'hui.",
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Welcome Banner */}
      <View style={styles.heroSection}>
        <View style={styles.avatarGlowRing}>
          <Image source={HNIA_AVATAR} style={styles.avatarImage} />
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
          </View>
        </View>

        <Text style={styles.heroTitle}>
          {language === 'ar' ? (
            <>
              مرحباً 👋 أنا <Text style={styles.brandName}>هنيّة</Text>
            </>
          ) : language === 'en' ? (
            <>
              Hello 👋 I'm <Text style={styles.brandName}>Hnia</Text>
            </>
          ) : (
            <>
              Bonjour 👋 Je suis <Text style={styles.brandName}>Hnia</Text>
            </>
          )}
        </Text>
        <Text style={styles.heroSubtitle}>
          {language === 'ar' ? (
            <>
              المساعد الإداري الذكي لمدرسة <Text style={styles.schoolName}>{schoolName}</Text>.
              {'\n'}اطرح سؤالاً أو اختر أحد الإجراءات السريعة :
            </>
          ) : language === 'en' ? (
            <>
              Executive assistant connected to <Text style={styles.schoolName}>{schoolName}</Text>.
              {'\n'}Ask a question or select a quick action:
            </>
          ) : (
            <>
              Assistante de direction connectée à <Text style={styles.schoolName}>{schoolName}</Text>.
              {'\n'}Posez-moi une question ou choisissez une action :
            </>
          )}
        </Text>
      </View>

      {/* Suggested Actions Grid */}
      <View style={styles.gridSection}>
        <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Sparkles size={14} color="#0055d4" />
          <Text style={styles.sectionTitle}>
            {language === 'ar' ? 'اقتراحات سريعة' : language === 'en' ? 'Quick Suggestions' : 'Suggestions rapides'}
          </Text>
        </View>

        <View style={[styles.grid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {suggestions.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => {
                if (item.onPress) {
                  item.onPress();
                } else if (item.prompt) {
                  onSelectPrompt(item.prompt);
                }
              }}
            >
              <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.iconBox, { backgroundColor: item.iconBg }]}>
                  <item.icon size={20} color={item.iconColor} />
                </View>
                {isRTL ? <ChevronLeft size={15} color="#cbd5e1" /> : <ChevronRight size={15} color="#cbd5e1" />}
              </View>

              <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.cardDescription, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
                {item.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Help Hint */}
      <View style={styles.hintBox}>
        <Text style={styles.hintText}>
          {language === 'ar' ? (
            <>
              💡 <Text style={styles.hintBold}>ملاحظة :</Text> يمكنك أيضاً إملاء طلب صوتي أو تصوير وصل لدراسته تلقائياً.
            </>
          ) : language === 'en' ? (
            <>
              💡 <Text style={styles.hintBold}>Tip:</Text> You can also send a voice message or take a photo of a receipt.
            </>
          ) : (
            <>
              💡 <Text style={styles.hintBold}>Astuce :</Text> Vous pouvez aussi me dicter un message vocal ou photographier un reçu.
            </>
          )}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
    width: '100%',
  },
  avatarGlowRing: {
    position: 'relative',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#dbeafe',
    marginBottom: 16,
    shadowColor: '#0055d4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  avatarImage: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
  },
  heroTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  brandName: {
    color: '#0055d4',
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  schoolName: {
    color: '#1e293b',
    fontWeight: '700',
  },
  gridSection: {
    width: '100%',
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    width: '100%',
  },
  card: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 11.5,
    color: '#64748b',
    lineHeight: 16,
  },
  hintBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: '100%',
  },
  hintText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    textAlign: 'center',
  },
  hintBold: {
    fontWeight: '700',
    color: '#1e293b',
  },
});
