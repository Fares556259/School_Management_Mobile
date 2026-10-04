import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Linking } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { privacyService } from '../services/api';

export function PrivacyControls({ admin = false, signedIn = true }: { admin?: boolean; signedIn?: boolean }) {
  const { language } = useLanguage();
  const [busy, setBusy] = useState(false);
  const ar = language === 'ar', fr = language === 'fr';
  const title = ar ? 'الخصوصية وحسابك' : fr ? 'Confidentialité et compte' : 'Privacy and account';
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
  const button = (label: string, action: () => void, disabled = false) => <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={action} style={{ paddingVertical: 14, opacity: disabled ? 0.5 : 1 }}><Text style={{ color: '#005bd4', textAlign: ar ? 'right' : 'left', fontSize: 14 }}>{label}</Text></TouchableOpacity>;
  return <View style={{ padding: 16, marginVertical: 16, borderRadius: 20, backgroundColor: '#fff' }}>
    <Text style={{ fontWeight: '700', color: '#17243b', textAlign: ar ? 'right' : 'left' }}>{title}</Text>
    {button(ar ? 'سياسة الخصوصية' : fr ? 'Politique de confidentialité' : 'Privacy policy', () => { void open('privacy'); })}
    {signedIn && button(busy ? '…' : deletion, request, busy)}
    {!signedIn && button(deletion, () => { void open('account-deletion'); })}
    {admin && button(ar ? 'طلبات الخصوصية والإبلاغ' : fr ? 'Demandes et signalements à traiter' : 'Review privacy requests and reports', () => { void open('admin/privacy-requests'); })}
  </View>;
}

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
