import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Platform,
  RefreshControl, StatusBar, ActivityIndicator, Linking,
  StyleSheet, Modal, Animated
} from 'react-native';
import { Image } from 'expo-image';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Book, Microscope, Clock, Globe, Palette, Coffee, Calculator, Music, Languages,
  MessageSquare, FileText, ChevronRight, BookOpen,
  Calendar as CalendarIcon, Star, Layout, Briefcase, CheckCircle2,
  Download, X, Award
} from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { studentService } from '../services/api';
import { StudentDayData } from '../types';
import { GlobalHeader } from '../components/GlobalHeader';
import { SkeletonBlock } from '../components/SkeletonView';
import * as Haptics from 'expo-haptics';

const Monitor = (props: any) => <Layout {...props} />;

const ICON_MAP: Record<string, any> = {
  Calculator, Book, Languages, Clock, Globe, Palette, Coffee, Music, Microscope, Briefcase, BookOpen, FileText,
  ICT: Monitor, Art: Palette, History: Book, English: Languages
};

// ─── Date Card ───────────────────────────────────────────────────────────────
const DateItem = ({ day, date, active, isToday, onPress }: any) => {
  const scale = React.useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Haptics.selectionAsync();
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 60 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }),
    ]).start();
    onPress();
  };
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={1}
        style={[styles.dateCard, active && styles.activeDateCard]}
      >
        <Text style={[styles.dateDay, active && styles.activeDateText]}>{day}</Text>
        <Text style={[styles.dateNum, active && styles.activeDateText]}>{date}</Text>
        {isToday && (
          <View style={[styles.todayDot, active && { backgroundColor: 'rgba(255,255,255,0.7)' }]} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Stat Pill ───────────────────────────────────────────────────────────────
const StatPill = ({ count, label, color, bgColor, borderColor }: any) => (
  <View style={[styles.statPill, { backgroundColor: bgColor, borderColor, borderBottomWidth: 4 }]}>
    <Text style={[styles.statValue, { color }]}>{count}</Text>
    <Text style={[styles.statLabel, { color }]}>{label}</Text>
  </View>
);

// ─── Session Card ─────────────────────────────────────────────────────────────
const SessionCard = ({ session }: any) => {
  const isAbsent = session.attendance?.toUpperCase() === 'ABSENT' || session.attendance?.toUpperCase() === 'ABS';
  const isPresent = session.attendance?.toUpperCase() === 'PRESENT' || session.attendance?.toUpperCase() === 'PRES';
  const isLate = session.attendance?.toUpperCase() === 'LATE';
  const isUpcoming = !session.attendance;

  const badgeBg = isAbsent ? '#fee2e2' : isPresent ? '#dcfce7' : isLate ? '#fef3c7' : '#f1f5f9';
  const badgeBorder = isAbsent ? '#fca5a5' : isPresent ? '#86efac' : isLate ? '#fcd34d' : '#e2e8f0';
  const badgeText = isAbsent ? '#dc2626' : isPresent ? '#16a34a' : isLate ? '#d97706' : '#64748b';
  const statusLabel = isAbsent ? 'Absent' : isPresent ? 'Present' : isLate ? 'Late' : 'Upcoming';
  
  const hasRating = !isUpcoming && !isAbsent && session.score !== undefined;

  return (
    <View style={[styles.sessionItem, isAbsent && styles.sessionItemAbsent]}>
      <View style={styles.sessionMain}>
        <View style={styles.sessionHeader}>
          <View style={styles.sessionTimeCol}>
            <Text style={styles.sessionTimeBold}>{session.startTime}</Text>
            <Text style={styles.sessionTimeMuted}>{session.endTime}</Text>
          </View>
          
          <View style={styles.sessionDivider} />
          
          <View style={styles.sessionTitleGroup}>
            <Text style={styles.sessionTitle} numberOfLines={2}>{session.subject?.split('|')[0]?.trim()}</Text>
            {session.teacher && (
              <Text style={styles.sessionTeacher}>{session.teacher}</Text>
            )}
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
            <Text style={[styles.statusBadgeText, { color: badgeText }]}>{statusLabel}</Text>
          </View>
        </View>

        {hasRating && (
          <View style={styles.ratingSection}>
            <Text style={styles.ratingLabel}>TEACHER RATING</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} size={15} color={session.score >= s ? '#f59e0b' : '#e2e8f0'} fill={session.score >= s ? '#f59e0b' : 'none'} style={{ marginRight: 3 }} />
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

// ─── Empty Sessions ───────────────────────────────────────────────────────────
const EmptySessionsUI = () => (
  <View style={styles.emptyBox}>
    <View style={styles.emptyIconCircle}>
      <Coffee size={30} color="#0072e6" />
    </View>
    <Text style={styles.emptyTitle}>No classes today</Text>
    <Text style={styles.emptySub}>Enjoy your free day and catch up on reading!</Text>
  </View>
);

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, action, onAction }: any) => (
  <View style={styles.sectionHeaderRow}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {action && (
      <TouchableOpacity onPress={onAction} style={styles.sectionActionBtn}>
        <Text style={styles.sectionActionText}>{action}</Text>
        <ChevronRight size={14} color="#0072e6" strokeWidth={3} />
      </TouchableOpacity>
    )}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const HomeScreen = ({ navigation, route }: any) => {
  const { selectedChildId, setStudentStatus } = useAppStore();
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [dayData, setDayData] = React.useState<StudentDayData>({ sessions: [], notes: [], files: [], homeworkDue: [], homeworkGiven: [], exams: [] });
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [selectedRemark, setSelectedRemark] = React.useState<any>(null);

  const scrollViewRef = React.useRef<ScrollView>(null);
  const [tasksYPosition, setTasksYPosition] = React.useState<number>(0);

  React.useEffect(() => {
    if (route?.params?.targetDate) {
      const tDate = new Date(route.params.targetDate);
      if (!isNaN(tDate.getTime())) setSelectedDate(tDate);
    }
  }, [route?.params?.targetDate]);

  React.useEffect(() => {
    if (route?.params?.scrollTo === 'tasks' && !loading && tasksYPosition > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: tasksYPosition, animated: true });
        navigation.setParams({ scrollTo: undefined, targetDate: undefined });
      }, 300);
    }
  }, [route?.params?.scrollTo, loading, tasksYPosition]);

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
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 3 + i);
    return d;
  });

  const presentCount = dayData.sessions?.filter(s => s.attendance?.toUpperCase() === 'PRESENT' || s.attendance?.toUpperCase() === 'PRES').length || 0;
  const absentCount = dayData.sessions?.filter(s => s.attendance?.toUpperCase() === 'ABSENT' || s.attendance?.toUpperCase() === 'ABS').length || 0;
  const lateCount = dayData.sessions?.filter(s => s.attendance?.toUpperCase() === 'LATE').length || 0;
  const upcomingCount = dayData.sessions?.filter(s => !s.attendance).length || 0;

  const allTasks = [...(dayData.homeworkDue || []), ...(dayData.homeworkGiven || [])];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <GlobalHeader navigation={navigation} />

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0072e6" />}
      >
        <View style={styles.content}>



          {/* Date Slider */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              {selectedDate.toDateString() !== new Date().toDateString() && (
                <TouchableOpacity onPress={() => setSelectedDate(new Date())}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#1e293b' }}>Back to Today</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => navigation.navigate('Attendance')} style={styles.sectionActionBtn}>
                <Text style={styles.sectionActionText}>History</Text>
                <ChevronRight size={14} color="#0072e6" strokeWidth={3} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.calendarBtn}>
              <CalendarIcon size={24} color="#64748b" />
            </TouchableOpacity>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateSlider} contentContainerStyle={{ paddingRight: 8 }}>
              {sliderDates.map(d => (
                <DateItem
                  key={d.toISOString()}
                  day={['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()]}
                  date={d.getDate()}
                  active={d.toDateString() === selectedDate.toDateString()}
                  isToday={d.toDateString() === new Date().toDateString()}
                  onPress={() => setSelectedDate(d)}
                />
              ))}
            </ScrollView>
          </View>

          {showDatePicker && Platform.OS === 'ios' ? (
            <Modal transparent animationType="fade" visible={showDatePicker}>
              <View style={styles.modalOverlay}>
                <View style={{ backgroundColor: 'white', borderRadius: 28, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 30, elevation: 10, width: '90%', alignSelf: 'center' }}>
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="inline"
                    themeVariant="light"
                    style={{ height: 330 }}
                    onChange={(event, date) => {
                      if (event.type === 'set' && date) {
                        setSelectedDate(date);
                        setShowDatePicker(false);
                      }
                    }}
                  />
                  <TouchableOpacity 
                    style={{ backgroundColor: '#f1f5f9', paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginTop: 8 }}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={{ fontWeight: '800', color: '#64748b', fontSize: 16 }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          ) : showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (event.type === 'set' && date) setSelectedDate(date);
              }}
            />
          )}

          {loading ? (
            <View style={{ gap: 12 }}>
              {[1, 2, 3].map(i => (
                <View key={i} style={[styles.card, { padding: 16 }]}>
                  <SkeletonBlock width="50%" height={14} marginBottom={10} />
                  <SkeletonBlock width="100%" height={12} marginBottom={6} />
                  <SkeletonBlock width="70%" height={12} />
                </View>
              ))}
            </View>
          ) : (
            <>
              {/* Sessions List */}
              <View style={{ gap: 12, marginTop: 16 }}>
                {dayData.sessions.length > 0 ? (
                  dayData.sessions.map((s: any) => <SessionCard key={s.id} session={s} />)
                ) : (
                  <EmptySessionsUI />
                )}
              </View>

              {/* Tasks */}
              <Text
                onLayout={(e) => setTasksYPosition(e.nativeEvent.layout.y)}
                style={{ height: 0 }}
              />
              <SectionHeader title="Tasks" />
              <View style={{ gap: 12 }}>
                {allTasks.length > 0 ? (
                  allTasks.map((task: any) => (
                    <TouchableOpacity
                      key={task.id}
                      onPress={() => navigation.navigate('HomeworkDetail', { homework: task, studentId: selectedChildId })}
                      activeOpacity={0.85}
                      style={styles.taskCardItem}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <View style={[styles.taskBadge, {
                          backgroundColor: task.isCompleted ? '#dcfce7' : '#fff7ed',
                          borderColor: task.isCompleted ? '#86efac' : '#fed7aa',
                        }]}>
                          <Text style={[styles.taskBadgeText, { color: task.isCompleted ? '#16a34a' : '#ea580c' }]}>
                            {task.isCompleted ? '✓ Done' : 'Pending'}
                          </Text>
                        </View>
                        <View style={[styles.taskIcon, { backgroundColor: task.isCompleted ? '#dcfce7' : '#eff6ff', width: 32, height: 32 }]}>
                          <CheckCircle2 size={16} color={task.isCompleted ? '#16a34a' : '#0072e6'} />
                        </View>
                      </View>
                      <Text style={styles.listRowTitle}>{task.subject?.split('|')[0]?.trim()} — {task.title}</Text>
                      <Text style={styles.listRowMeta}>By {task.teacher || 'Teacher'}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyStateBox}>
                    <CheckCircle2 size={24} color="#94a3b8" />
                    <Text style={styles.emptyStateText}>No tasks for today.</Text>
                  </View>
                )}
              </View>

              {/* Teacher Remarks */}
              <SectionHeader title="Teacher Remarks" />
              <View style={{ gap: 12 }}>
                {dayData.notes?.filter((n: any) => n.text !== 'INITIALIZED_BULK').length > 0 ? (
                  dayData.notes.filter((n: any) => n.text !== 'INITIALIZED_BULK').map((note: any) => (
                    <TouchableOpacity
                      key={note.id}
                      activeOpacity={0.8}
                      onPress={() => { Haptics.selectionAsync(); setSelectedRemark(note); }}
                      style={styles.remarkCard}
                    >
                      <View style={styles.remarkIconWrapper}>
                        <MessageSquare size={18} color="#94a3b8" />
                      </View>
                      <View style={styles.remarkContent}>
                        <View style={styles.remarkHeader}>
                          <Text style={styles.remarkSubject}>{note.subject?.split('|')[0]?.trim() || 'General'}</Text>
                          <Text style={styles.remarkTime}>{note.time || ''}</Text>
                        </View>
                        <Text style={styles.remarkTitle} numberOfLines={2}>{note.text || 'No content'}</Text>
                        <Text style={styles.remarkMeta}>By {note.author || 'Teacher'}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyStateBox}>
                    <MessageSquare size={24} color="#94a3b8" />
                    <Text style={styles.emptyStateText}>No remarks for today.</Text>
                  </View>
                )}
              </View>

              {/* Remark Modal */}
              <Modal visible={!!selectedRemark} transparent animationType="fade" onRequestClose={() => setSelectedRemark(null)}>
                <TouchableOpacity activeOpacity={1} onPress={() => setSelectedRemark(null)} style={styles.modalOverlay}>
                  <View style={styles.modalCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalTitle}>Teacher Remark</Text>
                        <Text style={styles.modalSub}>{selectedRemark?.subject?.split('|')[0]?.trim() || 'General'}</Text>
                      </View>
                      <TouchableOpacity onPress={() => setSelectedRemark(null)} style={styles.closeBtn}>
                        <X size={18} color="#64748b" />
                      </TouchableOpacity>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      <Text style={styles.modalBody}>{selectedRemark?.text}</Text>
                      <View style={{ flexDirection: 'row', marginTop: 20, gap: 16 }}>
                        <View style={styles.modalMeta}>
                          <Text style={styles.modalMetaLabel}>WRITTEN BY</Text>
                          <Text style={styles.modalMetaValue}>{selectedRemark?.teacher}</Text>
                        </View>
                        <View style={styles.modalMeta}>
                          <Text style={styles.modalMetaLabel}>TIME</Text>
                          <Text style={styles.modalMetaValue}>{selectedRemark?.time}</Text>
                        </View>
                      </View>
                    </ScrollView>
                  </View>
                </TouchableOpacity>
              </Modal>



              {/* Quick Actions */}
              <SectionHeader title="Quick Actions" />
              <View style={[styles.quickActionsRow, { marginBottom: 100 }]}>
                <TouchableOpacity
                  onPress={() => { Haptics.selectionAsync(); navigation.navigate('Exams'); }}
                  activeOpacity={0.85}
                  style={[styles.quickCard, { borderColor: '#e2e8f0' }]}
                >
                  <View style={[styles.quickIcon, { backgroundColor: '#f8fafc', borderWidth: 2, borderColor: '#e2e8f0' }]}>
                    <FileText size={20} color="#1e293b" />
                  </View>
                  <Text style={[styles.quickTitle, { color: '#1e293b' }]}>Exam Center</Text>
                  <Text style={styles.quickSub}>Dates & schedules</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => { Haptics.selectionAsync(); navigation.navigate('Results'); }}
                  activeOpacity={0.85}
                  style={[styles.quickCard, { borderColor: '#e2e8f0' }]}
                >
                  <View style={[styles.quickIcon, { backgroundColor: '#f8fafc', borderWidth: 2, borderColor: '#e2e8f0' }]}>
                    <Award size={20} color="#1e293b" />
                  </View>
                  <Text style={[styles.quickTitle, { color: '#1e293b' }]}>Report Card</Text>
                  <Text style={styles.quickSub}>Grades & averages</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { paddingHorizontal: 20, paddingTop: 12 },

  // Section Headers
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b', letterSpacing: -0.3 },
  sectionActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionActionText: { fontSize: 13, fontWeight: '800', color: '#0072e6' },

  // Date Slider
  calendarBtn: {
    width: 50, height: 86, borderRadius: 24,
    backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center',
    marginRight: 10, borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed'
  },
  dateSlider: { marginBottom: 0 },
  dateCard: {
    width: 70, height: 86, borderRadius: 24,
    backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center',
    marginRight: 10, borderWidth: 2, borderColor: '#e2e8f0',
    borderBottomWidth: 5, borderBottomColor: '#cbd5e1'
  },
  activeDateCard: {
    backgroundColor: '#0072e6', borderColor: '#0055b3',
    borderBottomWidth: 5, borderBottomColor: '#004085'
  },
  dateDay: { fontSize: 11, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  dateNum: { fontSize: 24, fontWeight: '900', color: '#1e293b' },
  activeDateText: { color: 'white' },
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#0072e6', marginTop: 4 },

  // Card
  card: {
    backgroundColor: 'white', borderRadius: 24, padding: 16,
    borderWidth: 2, borderColor: '#e2e8f0',
    shadowColor: '#e2e8f0', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1, shadowRadius: 0, elevation: 3,
    marginBottom: 4,
  },

  // Stats Row
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statPill: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 2 },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 9, fontWeight: '900', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.3 },

  // History Button
  historyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, backgroundColor: '#ffffff', paddingVertical: 12,
    borderRadius: 14, borderWidth: 2, borderColor: '#e2e8f0',
    borderBottomWidth: 4,
  },
  historyBtnText: { fontSize: 13, fontWeight: '900', color: '#1e293b' },

  // Session Item
  sessionItem: {
    flexDirection: 'row', borderRadius: 16,
    backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  sessionItemAbsent: { borderColor: '#fca5a5' },
  sessionMain: { flex: 1, padding: 16 },
  sessionHeader: { flexDirection: 'row', alignItems: 'center' },
  sessionTimeCol: { alignItems: 'flex-start', minWidth: 44 },
  sessionTimeBold: { fontSize: 13, fontWeight: '900', color: '#1e293b' },
  sessionTimeMuted: { fontSize: 11, fontWeight: '800', color: '#94a3b8', marginTop: 2 },
  sessionDivider: { width: 2, backgroundColor: '#f1f5f9', height: '100%', marginHorizontal: 12, borderRadius: 2 },
  sessionTitleGroup: { flex: 1, marginRight: 8, justifyContent: 'center' },
  sessionTitle: { fontSize: 15, fontWeight: '900', color: '#1e293b', lineHeight: 20 },
  sessionTeacher: { fontSize: 12, color: '#64748b', fontWeight: '800', marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 2, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  ratingSection: { marginTop: 12, borderTopWidth: 2, borderTopColor: '#f8fafc', paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratingLabel: { fontSize: 9, fontWeight: '900', color: '#cbd5e1', letterSpacing: 1, textTransform: 'uppercase' },
  ratingNote: { fontSize: 12, color: '#94a3b8', fontWeight: '700', fontStyle: 'italic' },
  starsRow: { flexDirection: 'row' },

  // List Rows (remarks / tasks / exams)
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 12 },
  listCard: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, borderWidth: 2, borderColor: '#e2e8f0' },
  listRowTitle: { fontSize: 15, fontWeight: '900', color: '#1e293b', lineHeight: 22 },
  listRowMeta: { fontSize: 12, color: '#64748b', fontWeight: '800', marginTop: 4 },
  subjectTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 2, borderColor: '#e2e8f0', backgroundColor: '#ffffff', alignSelf: 'flex-start' },
  subjectTagText: { fontSize: 10, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Tasks
  taskCardItem: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  taskIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  // Remarks
  remarkCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    flexDirection: 'row', gap: 12, alignItems: 'flex-start'
  },
  remarkIconWrapper: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center'
  },
  remarkContent: { flex: 1 },
  remarkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  remarkSubject: { fontSize: 11, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  remarkTime: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  remarkTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b', lineHeight: 22, marginBottom: 4 },
  remarkMeta: { fontSize: 12, color: '#64748b', fontWeight: '500' },

  // Tasks
  taskIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  taskBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 2, alignSelf: 'flex-start' },
  taskBadgeText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Quick Actions
  quickActionsRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  quickCard: {
    flex: 1, padding: 16, borderRadius: 20,
    borderWidth: 2, backgroundColor: '#ffffff',
    shadowColor: '#e2e8f0', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1, shadowRadius: 0, elevation: 2,
    alignItems: 'flex-start', gap: 6,
  },
  quickIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  quickTitle: { fontSize: 14, fontWeight: '900', letterSpacing: -0.2 },
  quickSub: { fontSize: 11, color: '#94a3b8', fontWeight: '700' },

  // Empty
  emptyBox: { padding: 32, alignItems: 'center', gap: 8 },
  emptyIconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
  emptySub: { fontSize: 13, color: '#64748b', fontWeight: '700', textAlign: 'center', lineHeight: 20 },
  emptyText: { fontSize: 14, color: '#94a3b8', fontWeight: '700', textAlign: 'center', paddingVertical: 16, fontStyle: 'italic' },
  emptyStateBox: { padding: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed' },
  emptyStateText: { fontSize: 13, color: '#94a3b8', fontWeight: '800', marginTop: 8 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 24 },
  modalCard: {
    backgroundColor: 'white', borderRadius: 28, padding: 24,
    borderWidth: 2, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
  modalSub: { fontSize: 13, color: '#64748b', fontWeight: '700', marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f1f5f9', borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  modalBody: { fontSize: 16, color: '#334155', fontWeight: '700', lineHeight: 26 },
  modalMeta: { flex: 1 },
  modalMetaLabel: { fontSize: 9, fontWeight: '900', color: '#cbd5e1', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  modalMetaValue: { fontSize: 14, fontWeight: '900', color: '#1e293b' },
});
