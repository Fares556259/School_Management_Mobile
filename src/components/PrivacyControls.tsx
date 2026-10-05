import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Linking, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight, FileText, Inbox, ShieldCheck, Trash2 } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { privacyService } from '../services/api';

export function PrivacyControls({ admin = false, signedIn = true }: { admin?: boolean; signedIn?: boolean }) {
  const { language, isRTL } = useLanguage();
  const [busy, setBusy] = useState(false);
  const ar = language === 'ar', fr = language === 'fr';
  const title = ar ? 'الخصوصية وحسابك' : fr ? 'Confidentialité et compte' : 'Privacy and account';
  const subtitle = ar
    ? 'تحكم في بياناتك وطلبات حسابك'
    : fr
      ? 'Vos données restent sous votre contrôle'
      : 'Your data stays under your control';
  const deletion = ar ? 'طلب حذف الحساب' : fr ? 'Demander la suppression du compte' : 'Request account deletion';
  const open = async (path: string) => {
    try { await Linking.openURL(`https://www.snapschool.academy/${path}`); }
    catch { Alert.alert(title, ar ? 'تعذر فتح الرابط' : fr ? 'Impossible d’ouvrir le lien.' : 'Unable to open link.'); }
  };
  const request = () => Alert.alert(deletion,
    ar ? 'سيُرسل طلبك إلى إدارة المدرسة للمراجعة. قد يتم الاحتفاظ بالسجلات المدرسية والمحاسبية المطلوبة قانونياً. لن يُحذف حسابك فوراً.' : fr ? 'Votre demande sera transmise à votre établissement. Les dossiers scolaires et comptables nécessaires peuvent être conservés. Votre compte ne sera pas supprimé immédiatement.' : 'Your school will review your request. Required school and accounting records may be retained. Your account will not be deleted immediately.',
    [{ text: ar ? 'إلغاء' : fr ? 'Annuler' : 'Cancel', style: 'cancel' },
    { text: ar ? 'إرسال الطلب' : fr ? 'Envoyer la demande' : 'Send request', onPress: async () => {
      if (busy) return;
      setBusy(true);
      try {
        const result = await privacyService.submit('ACCOUNT_DELETION');
        Alert.alert(title, `${ar ? 'تم إرسال الطلب. المرجع' : fr ? 'Demande transmise. Référence' : 'Request sent. Reference'} : ${result.reference}`);
      } catch { Alert.alert(title, ar ? 'تعذر إرسال الطلب. حاول مجدداً أو تواصل مع مدرستك.' : fr ? 'Envoi impossible. Réessayez ou contactez votre établissement.' : 'Unable to send. Try again or contact your school.'); }
      finally { setBusy(false); }
    } }]);
  const row = (
    label: string,
    action: () => void,
    Icon: typeof FileText,
    tone: 'blue' | 'red' = 'blue',
    disabled = false,
  ) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={action}
      activeOpacity={0.72}
      style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }, disabled && styles.disabled]}
    >
      <View style={[styles.rowIcon, tone === 'red' ? styles.rowIconDanger : styles.rowIconPrimary]}>
        <Icon size={18} color={tone === 'red' ? '#DC2626' : '#0055D4'} strokeWidth={2.2} />
      </View>
      <Text style={[styles.rowLabel, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
        {label}
      </Text>
      {isRTL ? <ChevronLeft size={18} color="#94A3B8" /> : <ChevronRight size={18} color="#94A3B8" />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.section}>
      <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.headerIcon}>
          <ShieldCheck size={20} color="#0055D4" strokeWidth={2.3} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>{title}</Text>
          <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.rows}>
        {row(ar ? 'سياسة الخصوصية' : fr ? 'Politique de confidentialité' : 'Privacy policy', () => { void open('privacy'); }, FileText)}
        <View style={styles.divider} />
        {signedIn
          ? row(busy ? (ar ? 'جاري الإرسال…' : fr ? 'Envoi en cours…' : 'Sending…') : deletion, request, Trash2, 'red', busy)
          : row(deletion, () => { void open('account-deletion'); }, Trash2, 'red')}
        {admin && <View style={styles.divider} />}
        {admin && row(ar ? 'طلبات الخصوصية والإبلاغ' : fr ? 'Demandes et signalements à traiter' : 'Review privacy requests and reports', () => { void open('admin/privacy-requests'); }, Inbox)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 22,
    marginBottom: 6,
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  header: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: '#17243B',
    fontSize: 14,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '500',
    lineHeight: 16,
  },
  rows: {
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  row: {
    minHeight: 54,
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconPrimary: {
    backgroundColor: '#EFF6FF',
  },
  rowIconDanger: {
    backgroundColor: '#FEF2F2',
  },
  rowLabel: {
    flex: 1,
    color: '#26344D',
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
    backgroundColor: '#E2E8F0',
  },
  disabled: {
    opacity: 0.5,
  },
});

export function ReportAIResponse({ content }: { content: string }) {
  const { language } = useLanguage();
  const [busy, setBusy] = useState(false);
  const ar = language === 'ar', fr = language === 'fr';
  const label = ar ? 'إبلاغ' : fr ? 'Signaler' : 'Report';
  const report = () => Alert.alert(label, ar ? 'إرسال هذه الإجابة إلى إدارة المدرسة للمراجعة؟' : fr ? 'Transmettre cette réponse à votre établissement pour examen ?' : 'Send this response to your school for review?', [
    { text: ar ? 'إلغاء' : fr ? 'Annuler' : 'Cancel', style: 'cancel' },
    { text: label, onPress: async () => {
      setBusy(true);
      try { await privacyService.submit('AI_REPORT', content.slice(0, 4000)); Alert.alert(label, ar ? 'تم إرسال البلاغ' : fr ? 'Signalement transmis.' : 'Report sent.'); }
      catch { Alert.alert(label, ar ? 'تعذر الإرسال. حاول مجدداً.' : fr ? 'Envoi impossible. Réessayez.' : 'Unable to send. Try again.'); }
      finally { setBusy(false); }
    } }
  ]);
  return <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={report} style={{ padding: 10 }}><Text style={{ fontSize: 12, color: '#64748b' }}>{busy ? '…' : label}</Text></TouchableOpacity>;
}
