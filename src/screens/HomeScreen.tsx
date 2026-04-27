import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, RefreshControl, StatusBar, ActivityIndicator, Linking, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Book, Microscope, Clock, Globe, Palette, Coffee, Calculator, Music, Languages, 
  MessageSquare, FileText, ChevronRight, BookOpen, 
  Calendar as CalendarIcon, Star, Layout, Briefcase, ChevronLeft, CheckCircle2
} from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { studentService } from '../services/api';
import { StudentDayData } from '../types';
import { GlobalHeader } from '../components/GlobalHeader';
import { SkeletonBlock } from '../components/SkeletonView';

const Monitor = (props: any) => <Layout {...props} />;

const ICON_MAP: Record<string, any> = {
  Calculator, Book, Languages, Clock, Globe, Palette, Coffee, Music, Microscope, Briefcase, BookOpen, FileText, 
  ICT: Monitor, Art: Palette, History: Book, English: Languages
};

// ─── Reusable Components ──────────────────────────────────────────────────────

const DateItem = ({ day, date, active, isToday, onPress }: any) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={[styles.dateCard, active && styles.activeDateCard]}
  >
    <Text style={[styles.dateDay, active && styles.activeDateText]}>{day}</Text>
    <Text style={[styles.dateNum, active && styles.activeDateText]}>{date}</Text>
    {isToday && (
      <Text style={[styles.dateToday, active && styles.activeDateText]}>Today</Text>
    )}
  </TouchableOpacity>
);

const StatPill = ({ count, label, color, bgColor }: any) => (
  <View style={[styles.statPill, { backgroundColor: bgColor }]}>
    <Text style={[styles.statValue, { color }]}>{count}</Text>
    <Text style={[styles.statLabel, { color: '#64748b' }]}>{label}</Text>
  </View>
);

const EmptySessionsUI = () => (
  <View style={styles.emptySessionsContainer}>
    <View style={styles.emptySessionsIconCircle}>
      <Coffee size={32} color="#0055d4" />
    </View>
    <Text style={styles.emptySessionsTitle}>No classes scheduled</Text>
    <Text style={styles.emptySessionsSub}>Take some time to relax or catch up on your reading. Enjoy your day!</Text>
  </View>
);

const SessionCard = ({ session }: any) => {
  const Icon = ICON_MAP[session.subject] || Book;
  const isAbsent = session.attendance?.toUpperCase() === 'ABSENT' || session.attendance?.toUpperCase() === 'ABS';
  const isPresent = session.attendance?.toUpperCase() === 'PRESENT' || session.attendance?.toUpperCase() === 'PRES';
  const isUpcoming = !session.attendance;

  const accentColor = isAbsent ? '#ef4444' : isPresent ? '#10b981' : '#e2e8f0';
  const badgeBg = isAbsent ? '#fee2e2' : isPresent ? '#d1fae5' : '#f1f5f9';
  const badgeText = isAbsent ? '#ef4444' : isPresent ? '#059669' : '#64748b';
  const statusLabel = isAbsent ? 'Absent' : isPresent ? 'Present' : 'Upcoming';

  return (
    <View style={styles.sessionItem}>
      <View style={[styles.sessionAccent, { backgroundColor: accentColor }]} />
      <View style={styles.sessionMain}>
        <View style={styles.sessionHeader}>
          <View style={styles.sessionIconWrapper}>
            <Icon size={20} color="#0055d4" />
          </View>
          <View style={styles.sessionTitleGroup}>
            <Text style={styles.sessionTitle}>{session.subject}</Text>
            <Text style={styles.sessionTime}>{session.startTime} — {session.endTime}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.statusBadgeText, { color: badgeText }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.ratingSection}>
          <Text style={styles.ratingLabel}>TEACHER RATING</Text>
          {isUpcoming ? (
            <Text style={styles.ratingNote}>Session not started</Text>
          ) : isAbsent ? (
            <Text style={styles.ratingNote}>No rating — absent</Text>
          ) : (
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} size={16} color={session.score >= s ? '#f59e0b' : '#e2e8f0'} fill={session.score >= s ? '#f59e0b' : 'none'} style={{ marginRight: 4 }} />
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export const HomeScreen = ({ navigation }: any) => {
  const { selectedChildId, children, setStudentStatus } = useAppStore();
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [dayData, setDayData] = React.useState<StudentDayData>({ sessions: [], notes: [], files: [], homeworkDue: [], homeworkGiven: [], exams: [] });
  const [selectedDate, setSelectedDate] = React.useState(new Date());

  const fetchHome = async () => {
    if (!selectedChildId) return;
    try {
      setLoading(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const data = await studentService.fetchDayData(selectedChildId, dateStr);
      setDayData(data);

      const hasAbsent = data.sessions?.some((s: any) => s.attendance?.toUpperCase() === 'ABSENT' || s.attendance?.toUpperCase() === 'ABS');
      setStudentStatus(selectedChildId, hasAbsent ? 'Absent' : 'Present');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => { fetchHome(); }, [selectedChildId, selectedDate]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchHome();
  }, [selectedChildId, selectedDate]);

  const sliderDates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 3 + i);
    return d;
  });

  const presentCount = dayData.sessions?.filter(s => s.attendance?.toUpperCase() === 'PRESENT' || s.attendance?.toUpperCase() === 'PRES').length || 0;
  const absentCount = dayData.sessions?.filter(s => s.attendance?.toUpperCase() === 'ABSENT' || s.attendance?.toUpperCase() === 'ABS').length || 0;
  const lateCount = dayData.sessions?.filter(s => s.attendance?.toUpperCase() === 'LATE').length || 0;
  const upcomingCount = dayData.sessions?.filter(s => !s.attendance).length || 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <GlobalHeader navigation={navigation} />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0055d4" />}
      >
        <View style={styles.content}>
          
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateSlider}>
            {sliderDates.map(d => (
              <DateItem 
                key={d.toISOString()} 
                day={['SUN','MON','TUE','WED','THU','FRI','SAT'][d.getDay()]} 
                date={d.getDate()} 
                active={d.toDateString() === selectedDate.toDateString()} 
                isToday={d.toDateString() === new Date().toDateString()}
                onPress={() => setSelectedDate(d)}
              />
            ))}
          </ScrollView>

          {loading ? (
            <ActivityIndicator color="#0055d4" style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* Today's Sessions Main Card */}
              <View style={styles.mainCard}>
                <View style={styles.mainCardHeader}>
                  <Text style={styles.cardTitle}>Today's Sessions</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Attendance')} style={styles.historyBtn}>
                    <Text style={styles.historyBtnText}>History</Text>
                    <ChevronRight size={16} color="#1e293b" />
                  </TouchableOpacity>
                </View>

                <View style={styles.statsRow}>
                  <StatPill count={presentCount} label="Present" color="#10b981" bgColor="#d1fae5" />
                  <StatPill count={absentCount} label="Absent" color="#ef4444" bgColor="#fee2e2" />
                  <StatPill count={lateCount} label="Late" color="#f59e0b" bgColor="#fef3c7" />
                  <StatPill count={upcomingCount} label="Upcoming" color="#64748b" bgColor="#f1f5f9" />
                </View>

                <View style={styles.sessionList}>
                  {dayData.sessions.length > 0 ? (
                    dayData.sessions.map((s: any) => <SessionCard key={s.id} session={s} />)
                  ) : (
                    <EmptySessionsUI />
                  )}
                </View>
              </View>

              {/* Today at a Glance - Teacher Remarks */}
              <Text style={styles.glanceTitle}>Today at a Glance</Text>
              <View style={styles.glanceCard}>
                <View style={styles.glanceHeader}>
                  <View style={styles.glanceIconWrapper}>
                    <MessageSquare size={18} color="#ec4899" />
                  </View>
                  <View>
                    <Text style={styles.glanceItemTitle}>Teacher Remarks</Text>
                    <Text style={styles.glanceItemSub}>{dayData.notes?.length || 0} remarks today</Text>
                  </View>
                </View>

                {dayData.notes.length > 0 ? (
                  dayData.notes.map((note: any, idx: number) => (
                    <View key={note.id} style={[styles.remarkItem, idx === 0 && { borderTopWidth: 0 }]}>
                      <View style={styles.remarkSubjectTag}>
                        <Text style={styles.remarkSubjectText}>{note.subject || 'ICT'}</Text>
                      </View>
                      <View style={styles.remarkContent}>
                        <Text style={styles.remarkText}>{note.text || 'No content'}</Text>
                        <Text style={styles.remarkMeta}>{note.teacher || 'Mr. Teacher'} • {note.time || '08:00 AM'}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyNoteText}>No remarks for today.</Text>
                )}
              </View>

              {/* Tasks Section */}
              <Text style={styles.glanceTitle}>Tasks</Text>
              <View style={styles.tasksCard}>
                {(dayData.homeworkDue || []).concat(dayData.homeworkGiven || []).length > 0 ? (
                  (dayData.homeworkDue || []).concat(dayData.homeworkGiven || []).map((task: any, idx: number) => (
                    <TouchableOpacity 
                      key={task.id} 
                      onPress={() => navigation.navigate('HomeworkDetail', { homework: task })}
                      style={[styles.taskItem, idx > 0 && { borderTopWidth: 1, borderTopColor: '#f1f5f9' }]}
                    >
                      <View style={styles.taskIconWrapper}>
                        <CheckCircle2 size={20} color="#0055d4" />
                      </View>
                      <View style={styles.taskInfo}>
                        <Text style={styles.taskTitle}>{task.subject} — {task.title}</Text>
                        <Text style={styles.taskMeta}>Assigned by {task.teacher || 'Teacher'}</Text>
                      </View>
                      <View style={[styles.taskBadge, { backgroundColor: '#fee2e2' }]}>
                        <Text style={[styles.taskBadgeText, { color: '#ef4444' }]}>Due today</Text>
                      </View>
                      <ChevronRight size={18} color="#d1d5db" />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={{ padding: 20 }}>
                    <Text style={styles.emptyNoteText}>No tasks assigned for today.</Text>
                  </View>
                )}
              </View>
            </>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  content: { paddingHorizontal: 20, paddingTop: 10 },
  sectionTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 20 },
  dateSlider: { marginBottom: 30 },
  dateCard: { width: 68, height: 86, borderRadius: 16, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  activeDateCard: { backgroundColor: '#0055d4', borderColor: '#0055d4' },
  dateDay: { fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  dateNum: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
  dateToday: { fontSize: 9, fontWeight: '800', color: '#64748b', marginTop: 2 },
  activeDateText: { color: 'white' },
  
  mainCard: { backgroundColor: 'white', borderRadius: 28, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 15, elevation: 2, marginBottom: 30 },
  mainCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  historyBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  historyBtnText: { fontSize: 13, fontWeight: '900', color: '#1e293b', marginRight: 4 },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statPill: { width: '23%', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '800', marginTop: 2 },

  sessionItem: { flexDirection: 'row', borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 12, overflow: 'hidden' },
  sessionAccent: { width: 4 },
  sessionMain: { flex: 1, padding: 16 },
  sessionHeader: { flexDirection: 'row', alignItems: 'center' },
  sessionIconWrapper: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  sessionTitleGroup: { flex: 1, marginLeft: 12 },
  sessionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  sessionTime: { fontSize: 12, color: '#94a3b8', fontWeight: '700', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },
  
  ratingSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratingLabel: { fontSize: 10, fontWeight: '900', color: '#cbd5e1', letterSpacing: 0.5 },
  ratingNote: { fontSize: 12, color: '#94a3b8', fontWeight: '700', fontStyle: 'italic' },
  starsRow: { flexDirection: 'row' },

  glanceTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 20 },
  glanceCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 30 },
  glanceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  glanceIconWrapper: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fdf2f8', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  glanceItemTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  glanceItemSub: { fontSize: 12, color: '#94a3b8', fontWeight: '700', marginTop: 1 },
  
  remarkItem: { flexDirection: 'row', paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  remarkSubjectTag: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginRight: 12 },
  remarkSubjectText: { fontSize: 10, fontWeight: '900', color: '#0055d4' },
  remarkContent: { flex: 1 },
  remarkText: { fontSize: 14, color: '#334155', fontWeight: '600', lineHeight: 20 },
  remarkMeta: { fontSize: 11, color: '#94a3b8', fontWeight: '700', marginTop: 4 },

  tasksCard: { backgroundColor: 'white', borderRadius: 24, padding: 0, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden' },
  taskItem: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  taskIconWrapper: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  taskMeta: { fontSize: 12, color: '#94a3b8', fontWeight: '700', marginTop: 2 },
  taskBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginRight: 8 },
  taskBadgeText: { fontSize: 11, fontWeight: '800' },

  emptySessionsContainer: { padding: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9', marginTop: 10 },
  emptySessionsIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#0055d4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  emptySessionsTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b', marginBottom: 8 },
  emptySessionsSub: { fontSize: 13, color: '#64748b', fontWeight: '700', textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 },
  emptyNoteText: { fontSize: 14, color: '#94a3b8', fontWeight: '600', fontStyle: 'italic', textAlign: 'center', width: '100%' },
});
