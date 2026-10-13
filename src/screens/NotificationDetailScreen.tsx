import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { ChevronLeft, ChevronRight, AlertTriangle, Calendar, Bell, Info, MessageCircle } from 'lucide-react-native';

const ICON_CONFIG: Record<string, { icon: any, color: string, bgColor: string }> = {
  URGENT: { icon: AlertTriangle, color: '#ef4444', bgColor: '#fee2e2' },
  ANNOUNCEMENT: { icon: Info, color: '#0055d4', bgColor: '#eff6ff' },
  ATTENDANCE: { icon: AlertTriangle, color: '#ef4444', bgColor: '#fee2e2' },
  PAYMENT: { icon: Calendar, color: '#f59e0b', bgColor: '#fef3c7' },
  MESSAGE: { icon: Bell, color: '#0055d4', bgColor: '#eff6ff' },
  REMARK: { icon: MessageCircle, color: '#8b5cf6', bgColor: '#f5f3ff' },
  DEFAULT: { icon: Bell, color: '#64748b', bgColor: '#f1f5f9' },
};

export const NotificationDetailScreen = ({ route, navigation }: any) => {
  const notification = route?.params?.notification || {
    id: 0,
    type: 'MESSAGE',
    title: 'Notification',
    message: '',
    studentName: 'SnapSchool',
    time: 'À l\'instant',
  };
  const { t, isRTL, language, formatNotification } = useLanguage();
  const isUrgent = /(?:عاجل|URGENT)/i.test(`${notification.title || ''} ${notification.message || ''}`);
  const config = isUrgent ? ICON_CONFIG.URGENT : (ICON_CONFIG[notification.type] || ICON_CONFIG.DEFAULT);
  const Icon = config.icon;

  const isAttendance = notification.type === 'ATTENDANCE' || (notification.message || '').includes('missed');

  // Attendance Logic
  const message = notification.message || "";
  const absenceCount = message.match(/(\d+) absences/)?.[1] || message.match(/reached (\d+) absences/)?.[1] || '—';
  const formattedTitle = formatNotification(notification.title) || t.officialMessage;
  const formattedMessage = formatNotification(notification.message);
  const sourceLabel = notification.studentName?.toUpperCase() === 'SCHOOL'
    ? (language === 'ar' ? 'المدرسة' : language === 'fr' ? 'École' : 'School')
    : notification.studentName;
  const typeLabels: Record<string, Record<'ar' | 'fr' | 'en', string>> = {
    ANNOUNCEMENT: { ar: 'إعلان مدرسي', fr: 'Annonce', en: 'Announcement' },
    ATTENDANCE: { ar: 'الحضور', fr: 'Présence', en: 'Attendance' },
    HOMEWORK: { ar: 'واجب مدرسي', fr: 'Devoir', en: 'Homework' },
    MESSAGE: { ar: 'رسالة من الإدارة', fr: 'Message', en: 'Message' },
    REMARK: { ar: 'ملاحظة تربوية', fr: 'Remarque', en: 'Teacher note' },
    PAYMENT: { ar: 'الدفع', fr: 'Paiement', en: 'Payment' },
  };
  const typeLabel = isUrgent
    ? (language === 'ar' ? 'عاجل' : language === 'fr' ? 'Urgent' : 'Urgent')
    : (typeLabels[notification.type]?.[language] || (language === 'ar' ? 'إشعار' : language === 'fr' ? 'Notification' : 'Notification'));
  const createdAt = new Date(notification.createdAt || notification.rawDate || Date.now());
  const timeLabel = Number.isNaN(createdAt.getTime())
    ? ''
    : createdAt.toLocaleDateString(language === 'ar' ? 'ar-TN' : language === 'fr' ? 'fr-TN' : 'en-GB', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      });

  let realSessions = [];
  if (message.includes('Missed sessions:')) {
    const historyPart = message.split('Missed sessions: ')[1].split('.')[0];
    realSessions = historyPart.split(', ').map((s: string, i: number) => {
      const parts = s.split(' (');
      const date = parts[0];
      const detail = parts[1] ? parts[1].replace(')', '') : '';
      const [subject, time] = detail.split(' — ');
      return { id: i, date, subject: subject.trim(), time: (time || 'Session').trim() };
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, isRTL && { flexDirection: 'row-reverse' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          {isRTL ? <ChevronRight size={20} color="#0f172a" strokeWidth={3} /> : <ChevronLeft size={20} color="#0f172a" strokeWidth={3} />}
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.details}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.summaryHeader, isRTL && { flexDirection: 'row-reverse' }]}>
          <View style={[styles.mainIconWrapper, { backgroundColor: config.bgColor }]}>
            <Icon size={22} color={config.color} strokeWidth={2.4} />
          </View>
          <View style={[styles.summaryText, isRTL && { alignItems: 'flex-end' }]}>
            <Text style={[styles.typeLabel, { color: config.color }]}>{typeLabel}</Text>
            <Text style={[styles.notificationTitle, isRTL && { textAlign: 'right' }]}>{formattedTitle}</Text>
            <Text style={[styles.timeLabel, isRTL && { textAlign: 'right' }]}>
              {[sourceLabel, timeLabel].filter(Boolean).join(' • ')}
            </Text>
          </View>
        </View>

        {isAttendance ? (
          <>
            {/* Stats Cards */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { width: '47%' }]}>
                <Text style={[styles.statValue, { color: '#ef4444' }]}>{absenceCount}</Text>
                <Text style={styles.statLabel}>{t.absencesThisMonth}</Text>
              </View>
              <View style={[styles.statCard, { width: '47%' }]}>
                <Text style={[styles.statValue, { color: '#94a3b8' }]}>{notification.className || 'N/A'}</Text>
                <Text style={styles.statLabel}>{t.grade}</Text>
              </View>
            </View>

            {/* Sessions Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>{t.sessionsHistory}</Text>
            </View>

            {realSessions.length > 0 ? (
              realSessions.map((session: any) => (
                <View key={session.id} style={styles.sessionCard}>
                  <View style={[styles.statusDot, { backgroundColor: '#ef4444' }]} />
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionDate}>{session.date}</Text>
                    <Text style={styles.sessionSub}>{session.subject} — {session.time}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t.detailedSessionData}</Text>
              </View>
            )}

          </>
        ) : (
          <View style={styles.announcementContainer}>
            <View style={styles.messageBubble}>
              <Text style={[styles.announcementMessage, { textAlign: isRTL ? 'right' : 'left', lineHeight: 24 }]}>
                {formattedMessage}
              </Text>
            </View>

            {notification.message?.toLowerCase().includes('task') && (
              <TouchableOpacity
                onPress={() => navigation.navigate('MainTabs', {
                  screen: 'Home',
                  params: { targetDate: notification.rawDate, scrollTo: 'tasks' }
                })}
                style={[styles.callButton, { backgroundColor: '#0055d4', borderWidth: 0, marginTop: 24, marginHorizontal: 0 }]}
              >
                <Text style={[styles.callButtonText, { color: 'white' }]}>{t.viewTask}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  backButton: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  scrollContent: { paddingBottom: 40, paddingTop: 12 },
  summaryHeader: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 20 },
  summaryText: { flex: 1, marginHorizontal: 14 },
  mainIconWrapper: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 5 },
  notificationTitle: { fontSize: 22, fontWeight: '900', color: '#172033', lineHeight: 28, letterSpacing: -0.3 },
  timeLabel: { fontSize: 12, color: '#7B8899', fontWeight: '600', marginTop: 7 },

  statsRow: { flexDirection: 'row', paddingHorizontal: 24, justifyContent: 'space-between', marginBottom: 32 },
  statCard: { backgroundColor: '#f8fafc', borderRadius: 20, padding: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  statValue: { fontSize: 20, fontWeight: '900', marginBottom: 4 },
  statLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '800', textAlign: 'center' },

  sectionHeader: { paddingHorizontal: 24, marginBottom: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '900', color: '#94a3b8', letterSpacing: 1 },
  sessionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', marginHorizontal: 24, padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 16 },
  sessionInfo: { flex: 1 },
  sessionDate: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  sessionSub: { fontSize: 12, color: '#94a3b8', fontWeight: '700', marginTop: 2 },

  contactCard: { flexDirection: 'row', backgroundColor: '#f8fafc', marginHorizontal: 24, padding: 20, borderRadius: 20, marginBottom: 24, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center' },
  avatarCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  avatarText: { color: '#4f46e5', fontWeight: '800', fontSize: 16 },
  contactInfo: { flex: 1 },
  contactLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.5 },
  contactName: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginTop: 2 },
  contactPhone: { fontSize: 14, color: '#0055d4', fontWeight: '700', marginTop: 2 },
  callButton: { marginHorizontal: 24, height: 56, borderRadius: 16, borderWidth: 1.5, borderColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  callButtonText: { fontSize: 16, fontWeight: '800', color: '#0f172a' },

  announcementContainer: { paddingHorizontal: 20 },
  messageBubble: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#E4E9F0' },
  announcementMessage: { fontSize: 15, color: '#435064', lineHeight: 24, fontWeight: '500' },
  emptyContainer: { paddingHorizontal: 24, paddingVertical: 20, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14, fontStyle: 'italic' }
});
