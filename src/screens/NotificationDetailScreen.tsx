import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, AlertTriangle, Calendar, Bell, Info, MessageCircle } from 'lucide-react-native';

const ICON_CONFIG: Record<string, { icon: any, color: string, bgColor: string }> = {
  URGENT: { icon: AlertTriangle, color: '#ef4444', bgColor: '#fee2e2' },
  ANNOUNCEMENT: { icon: Info, color: '#0055d4', bgColor: '#eff6ff' },
  ATTENDANCE: { icon: AlertTriangle, color: '#ef4444', bgColor: '#fee2e2' },
  PAYMENT: { icon: Calendar, color: '#f59e0b', bgColor: '#fef3c7' },
  DEFAULT: { icon: Bell, color: '#64748b', bgColor: '#f1f5f9' },
};

export const NotificationDetailScreen = ({ route, navigation }: any) => {
  const { notification } = route.params;
  const config = ICON_CONFIG[notification.type] || ICON_CONFIG.DEFAULT;
  const Icon = config.icon;

  const isAttendance = notification.type === 'ATTENDANCE' || notification.message.includes('missed');

  // Attendance Logic
  const message = notification.message || "";
  const absenceCount = message.match(/(\d+) absences/)?.[1] || message.match(/reached (\d+) absences/)?.[1] || "3";
  
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={20} color="#0f172a" strokeWidth={3} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Icon Section */}
        <View style={styles.topSection}>
          <View style={[styles.mainIconWrapper, { backgroundColor: config.bgColor }]}>
            <Icon size={32} color={config.color} strokeWidth={2.5} />
          </View>
          <Text style={styles.typeLabel}>{notification.type} ALERT</Text>
          <Text style={styles.studentName}>{notification.studentName}</Text>
          <Text style={styles.timeLabel}>{notification.time || '1d ago'}</Text>
        </View>

        <View style={styles.divider} />

        {isAttendance ? (
          <>
            {/* Stats Cards */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { width: '47%' }]}>
                <Text style={[styles.statValue, { color: '#ef4444' }]}>{absenceCount}</Text>
                <Text style={styles.statLabel}>Absences this month</Text>
              </View>
              <View style={[styles.statCard, { width: '47%' }]}>
                <Text style={[styles.statValue, { color: '#94a3b8' }]}>Class 1A</Text>
                <Text style={styles.statLabel}>Grade</Text>
              </View>
            </View>

            {/* Sessions Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>SESSIONS HISTORY</Text>
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
                <Text style={styles.emptyText}>Detailed session data will appear here.</Text>
              </View>
            )}

            {/* Contact Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>SCHOOL CONTACT</Text>
            </View>

            <View style={styles.contactCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>AD</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>ADMINISTRATION</Text>
                <Text style={styles.contactName}>SnapSchool Admin</Text>
                <TouchableOpacity onPress={() => Linking.openURL('tel:+21671000000')}>
                  <Text style={styles.contactPhone}>+216 71 000 000</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer Button */}
            <TouchableOpacity onPress={() => Linking.openURL('tel:+21671000000')} style={styles.callButton}>
              <Text style={styles.callButtonText}>Call School</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.announcementContainer}>
            <View style={styles.messageBubble}>
              <View style={styles.bubbleHeader}>
                <MessageCircle size={20} color="#0055d4" />
                <Text style={styles.bubbleTitle}>{notification.title || 'Official Message'}</Text>
              </View>
              <Text style={styles.announcementMessage}>{notification.message}</Text>
            </View>
            
            <View style={styles.infoCard}>
              <Info size={18} color="#64748b" />
              <Text style={styles.infoText}>This is a school announcement. For any questions, please contact your child's teacher via the Courses tab.</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  backButton: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  scrollContent: { paddingBottom: 40 },
  topSection: { alignItems: 'center', paddingTop: 30, paddingHorizontal: 24 },
  mainIconWrapper: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  typeLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  studentName: { fontSize: 26, fontWeight: '900', color: '#1e293b', textAlign: 'center', lineHeight: 32 },
  timeLabel: { fontSize: 14, color: '#94a3b8', fontWeight: '600', marginTop: 6 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 24, marginTop: 24, marginBottom: 24 },
  
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

  announcementContainer: { paddingHorizontal: 24 },
  messageBubble: { backgroundColor: '#f8fafc', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#f1f5f9' },
  bubbleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  bubbleTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginLeft: 10 },
  announcementMessage: { fontSize: 16, color: '#475569', lineHeight: 26, fontWeight: '600' },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 20, backgroundColor: '#f1f5f9', padding: 16, borderRadius: 16 },
  infoText: { flex: 1, fontSize: 12, color: '#64748b', fontWeight: '700', marginLeft: 12, lineHeight: 18 },
  emptyContainer: { paddingHorizontal: 24, paddingVertical: 20, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14, fontStyle: 'italic' }
});
