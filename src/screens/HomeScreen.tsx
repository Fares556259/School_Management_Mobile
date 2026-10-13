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
  Clock, Coffee, MessageSquare, ChevronRight, BookOpen,
  Calendar as CalendarIcon, CheckCircle2,
  Download, X, Award, User as UserIcon
} from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { useLanguage } from '../context/LanguageContext';
import { FlingGestureHandler, Directions, State } from 'react-native-gesture-handler';
import { studentService, authStorage, authService } from '../services/api';
import { notificationService } from '../services/notificationService';
import { StudentDayData } from '../types';
import { GlobalHeader } from '../components/GlobalHeader';
import { SkeletonBlock } from '../components/SkeletonView';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatLocalDateKey } from '../utils/dateUtils';

// ─── Date Card ───────────────────────────────────────────────────────────────
const DateItem = React.memo(({ day, date, active, isToday, onPress }: any) => {
  const scale = React.useRef(new Animated.Value(1)).current;
  const handlePress = () => {
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
        <Text style={[styles.dateNum, active && styles.activeDateText]}>{String(date)}</Text>
        {isToday && (
          <View style={[styles.todayDot, active && { backgroundColor: 'rgba(255,255,255,0.7)' }]} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── Stat Pill ───────────────────────────────────────────────────────────────
const StatPill = React.memo(({ count, label, color, bgColor, borderColor }: any) => (
  <View style={[styles.statPill, { backgroundColor: bgColor, borderColor, borderBottomWidth: 4 }]}>
    <Text style={[styles.statValue, { color }]}>{count}</Text>
    <Text style={[styles.statLabel, { color }]}>{label}</Text>
  </View>
));

// ─── Session Card ─────────────────────────────────────────────────────────────
const SUBJECT_TONES = [
  { ink: '#185FA5', soft: '#EAF3FB' },
  { ink: '#39725E', soft: '#EAF5F0' },
  { ink: '#7A5A24', soft: '#F7F1E5' },
  { ink: '#70518D', soft: '#F2ECF8' },
];

const SessionCard = React.memo(({ session, isLast }: any) => {
  const { t, isRTL, getTranslatedSubject } = useLanguage();
  const attendance = String(session?.attendance || '').toUpperCase();
  const isAbsent = attendance === 'ABSENT' || attendance === 'ABS';
  const isPresent = attendance === 'PRESENT';
  const isLate = attendance === 'LATE';

  const badgeBg = isAbsent ? '#fee2e2' : isPresent ? '#dcfce7' : isLate ? '#fef3c7' : '#f1f5f9';
  const badgeText = isAbsent ? '#dc2626' : isPresent ? '#16a34a' : isLate ? '#d97706' : '#64748b';
  const statusLabel = isAbsent ? t.absent : isPresent ? t.present : isLate ? t.late : t.upcoming;
  const subject = String(session?.subject || '');
  const translatedSubject = getTranslatedSubject(subject) || subject || '—';
  const toneIndex = Array.from(subject).reduce((sum, char) => sum + char.charCodeAt(0), 0) % SUBJECT_TONES.length;
  const tone = SUBJECT_TONES[toneIndex];

  return (
    <View style={[styles.sessionRow, !isLast && styles.sessionRowDivider, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <View style={[styles.subjectMark, { backgroundColor: tone.soft }]}>
        <BookOpen size={20} color={tone.ink} strokeWidth={2.2} />
      </View>

      <View style={[styles.sessionContentV2, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, paddingRight: isRTL ? 0 : 10, paddingLeft: isRTL ? 10 : 0 }}>
            <Text style={[styles.sessionTitleV2, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
              {translatedSubject}
            </Text>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginTop: 6 }}>
              <Clock size={13} color="#667085" strokeWidth={2.2} />
              <Text style={[styles.sessionTimeV2, { marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 }]}>{String(session?.startTime || '—')} – {String(session?.endTime || '—')}</Text>
            </View>
          </View>
          <View style={[styles.statusBadgeV2, { backgroundColor: badgeBg }]}>
            <Text style={[styles.statusBadgeTextV2, { color: badgeText }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={[styles.teacherLine, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <UserIcon size={13} color="#98A2B3" strokeWidth={2.2} />
          <Text style={[styles.sessionTeacherV2, { marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 }]} numberOfLines={1}>{String(session?.teacher || t.teacher)}</Text>
          {session?.room ? <Text style={styles.roomText}> · {String(session.room)}</Text> : null}
        </View>
      </View>
    </View>
  );
});

// ─── Empty Sessions ───────────────────────────────────────────────────────────
const EmptySessionsUI = React.memo(() => {
  const { t } = useLanguage();
  return (
    <View style={[styles.emptyStateBox, { gap: 8 }]}>
      <View style={styles.emptyIconCircle}>
        <Coffee size={30} color="#0072e6" />
      </View>
      <Text style={styles.emptyTitle}>{t.noClasses}</Text>
      <Text style={styles.emptySub}>{t.freeDay}</Text>
    </View>
  );
});

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = React.memo(({ title, action, onAction, count }: any) => {
  const { isRTL } = useLanguage();
  return (
    <View style={[styles.sectionHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{title}</Text>
        {typeof count === 'number' && count > 0 ? (
          <View style={[styles.sectionCount, { marginLeft: isRTL ? 0 : 9, marginRight: isRTL ? 9 : 0 }]}>
            <Text style={styles.sectionCountText}>{count}</Text>
          </View>
        ) : null}
      </View>
      {action && (
        <TouchableOpacity onPress={onAction} style={[styles.sectionActionBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={styles.sectionActionText}>{action}</Text>
          <ChevronRight size={14} color="#0072e6" strokeWidth={3} style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }} />
        </TouchableOpacity>
      )}
    </View>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
const EMPTY_DAY: StudentDayData = { sessions: [], notes: [], files: [], homeworkDue: [], homeworkGiven: [], exams: [] };

export const HomeScreen = ({ navigation, route }: any) => {
  const selectedChildId = useAppStore(s => s.selectedChildId);
  const setStudentStatus = useAppStore(s => s.setStudentStatus);
  const { t, isRTL, language, getTranslatedSubject } = useLanguage();
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [selectedRemark, setSelectedRemark] = React.useState<any>(null);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const [tasksYPosition, setTasksYPosition] = React.useState<number>(0);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (route?.params?.targetDate) {
      const tDate = new Date(route.params.targetDate);
      if (!isNaN(tDate.getTime())) setSelectedDate(tDate);
    }
  }, [route?.params?.targetDate]);

  const dateStr = React.useMemo(() => formatLocalDateKey(selectedDate), [selectedDate]);


  // ─── React Query: stale-while-revalidate with persistent cache ──────────
  const { data: dayData = EMPTY_DAY, isLoading: loading, isFetching, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['studentDay', selectedChildId, dateStr],
    queryFn: ({ signal }) => studentService.fetchDayData(selectedChildId!, dateStr, signal),
    enabled: !!selectedChildId,
    staleTime: 2 * 60_000,
    refetchOnMount: false,
    gcTime: 24 * 60 * 60_000,
    retry: 1,
  });

  // Sync attendance status to global store whenever data changes
  const sessions = React.useMemo(
    () => Array.isArray(dayData?.sessions) ? dayData.sessions.filter(Boolean) : [],
    [dayData?.sessions],
  );
  const homeworkGiven = React.useMemo(
    () => Array.isArray(dayData?.homeworkGiven) ? dayData.homeworkGiven.filter(Boolean) : [],
    [dayData?.homeworkGiven],
  );
  const notes = React.useMemo(
    () => Array.isArray(dayData?.notes) ? dayData.notes.filter(Boolean) : [],
    [dayData?.notes],
  );

  React.useEffect(() => {
    if (selectedChildId && sessions.length > 0) {
      const hasAbsent = sessions.some((session: any) => {
        const attendance = String(session?.attendance || '').toUpperCase();
        return attendance === 'ABSENT' || attendance === 'ABS';
      });
      setStudentStatus(selectedChildId, hasAbsent ? 'Absent' : 'Present');
    }
  }, [selectedChildId, sessions, setStudentStatus]);

  // Revalidate stale snapshots on focus. Fresh or restored data paints first;
  // the background request never replaces it with a full-screen skeleton.
  useFocusEffect(
    React.useCallback(() => {
      if (!selectedChildId) return;
      if (!dataUpdatedAt || Date.now() - dataUpdatedAt > 2 * 60_000) void refetch();
    }, [selectedChildId, dateStr, dataUpdatedAt, refetch])
  );

  React.useEffect(() => {
    if (route?.params?.scrollTo === 'tasks' && !loading && tasksYPosition > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: tasksYPosition, animated: true });
        navigation.setParams({ scrollTo: undefined, targetDate: undefined });
      }, 300);
    }
  }, [route?.params?.scrollTo, loading, tasksYPosition]);

  // Pull-to-refresh
  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // ─── Memoized computed values (prevent re-creation every render) ──────────
  const sliderDates = React.useMemo(() =>
    Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - 3 + i);
      return d;
    }),
    [selectedDate]
  );

  // Cache the dates already visible in the strip. The closest dates are
  // warmed first so the common previous/next action paints immediately.
  React.useEffect(() => {
    if (!selectedChildId || loading) return;
    const adjacent = [1, -1, 2, -2, 3, -3].map(offset => {
      const date = new Date(selectedDate);
      date.setDate(date.getDate() + offset);
      return formatLocalDateKey(date);
    });
    const timers = adjacent.map((key, index) => setTimeout(() => {
      void queryClient.prefetchQuery({
        queryKey: ['studentDay', selectedChildId, key],
        queryFn: ({ signal }) => studentService.fetchDayData(selectedChildId, key, signal),
        staleTime: 2 * 60_000,
      });
    }, index * 120));
    return () => timers.forEach(clearTimeout);
  }, [loading, queryClient, selectedChildId, selectedDate]);

  const allTasks = React.useMemo(() =>
    Array.from(
      new Map(homeworkGiven.map((task: any, index: number) => [task.id || `task-${index}`, task])).values()
    ),
    [homeworkGiven]
  );
  const visibleNotes = React.useMemo(
    () => notes.filter((note: any) => {
      const text = typeof note.text === 'string' ? note.text : '';
      return text && !text.includes('INITIALIZED_BULK') && !text.includes('AUTO_SYNCED');
    }),
    [notes],
  );
  const emptyTaskLabel = language === 'ar' ? 'لا توجد مهام لهذا اليوم' : language === 'en' ? 'No tasks for this day' : 'Aucune tâche pour cette journée';
  const daysArr = [t.sunday, t.monday, t.tuesday, t.wednesday, t.thursday, t.friday, t.saturday];

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <GlobalHeader navigation={navigation} />

      <FlingGestureHandler
        direction={isRTL ? Directions.RIGHT : Directions.LEFT}
        onHandlerStateChange={({ nativeEvent }) => {
          if (nativeEvent.state === State.ACTIVE) changeDate(1);
        }}
      >
        <FlingGestureHandler
          direction={isRTL ? Directions.LEFT : Directions.RIGHT}
          onHandlerStateChange={({ nativeEvent }) => {
            if (nativeEvent.state === State.ACTIVE) changeDate(-1);
          }}
        >
          <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0072e6" />}
      >
        <View style={styles.content}>

          {/* Date Slider */}
          <View style={[styles.sectionHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.sectionTitle}>{t.todaysSchedule}</Text>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 16 }}>
              {selectedDate.toDateString() !== new Date().toDateString() && (
                <TouchableOpacity 
                  onPress={() => setSelectedDate(new Date())}
                  style={{ backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe' }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '900', color: '#0072e6' }}>{(t as any).today || 'Today'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => navigation.navigate('Attendance')} style={styles.sectionActionBtn}>
                <Text style={styles.sectionActionText}>{t.history}</Text>
                <ChevronRight size={14} color="#0072e6" strokeWidth={3} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.calendarBtn}>
              <CalendarIcon size={24} color="#64748b" />
            </TouchableOpacity>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateSlider} contentContainerStyle={{ paddingRight: 8 }}>
              {(isRTL ? [...sliderDates].reverse() : sliderDates).map(d => (
                <DateItem
                  key={d.toISOString()}
                  day={daysArr[d.getDay()]}
                  date={d.getDate()}
                  active={d.toDateString() === selectedDate.toDateString()}
                  isToday={d.toDateString() === new Date().toDateString()}
                  onPress={() => { setSelectedDate(d); }}
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
                    <Text style={{ fontWeight: '800', color: '#64748b', fontSize: 16 }}>Annuller</Text>
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

          {/* Sessions List */}
          {loading ? (
            <View style={styles.scheduleSurface}>
              {[1, 2, 3].map(i => (
                <View key={i} style={[styles.sessionRow, i < 3 && styles.sessionRowDivider]} >
                  <SkeletonBlock width="50%" height={14} marginBottom={10} />
                  <SkeletonBlock width="100%" height={12} marginBottom={6} />
                  <SkeletonBlock width="70%" height={12} />
                </View>
              ))}
            </View>
          ) : (
            <View style={sessions.length > 0 ? styles.scheduleSurface : { marginTop: 14 }}>
              {sessions.length > 0 ? (
                sessions.map((session: any, index: number) => (
                  <SessionCard key={session.id || `${dateStr}-${index}`} session={session} isLast={index === sessions.length - 1} />
                ))
              ) : (
                <EmptySessionsUI />
              )}
            </View>
          )}

          {/* Tasks & Homework Section */}
          <Text
            onLayout={(e) => setTasksYPosition(e.nativeEvent.layout.y)}
            style={{ height: 0 }}
          />
          <SectionHeader title={t.tasks} count={allTasks.length} />
          
          {loading ? (
            <View style={{ gap: 12 }}>
              <View style={[styles.taskCardItem, { padding: 16 }]}><SkeletonBlock width="100%" height={40} /></View>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {allTasks.length > 0 ? (
                allTasks.map((task: any) => (
                  <TouchableOpacity
                    key={task.id}
                    onPress={() => navigation.navigate('HomeworkDetail', { homework: task, studentId: selectedChildId })}
                    activeOpacity={0.85}
                    style={styles.taskCardItem}
                  >
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <View style={[styles.taskBadge, {
                        backgroundColor: task.isCompleted ? '#dcfce7' : '#eff6ff',
                        borderColor: task.isCompleted ? '#86efac' : '#bfdbfe',
                      }]}>
                        <Text style={[styles.taskBadgeText, { color: task.isCompleted ? '#16a34a' : '#0072e6' }]}>
                          {task.isCompleted ? '✓ ' + (t as any).completedTask : (t as any).pendingTask}
                        </Text>
                      </View>
                      <View style={[styles.taskIcon, { backgroundColor: task.isCompleted ? '#dcfce7' : '#eff6ff' }]}>
                        <CheckCircle2 size={18} color={task.isCompleted ? '#16a34a' : '#0072e6'} />
                      </View>
                    </View>
                    <Text style={[styles.listRowTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{getTranslatedSubject(task.subject)} — {task.title}</Text>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginTop: 8 }}>
                      <UserIcon size={14} color="#64748b" style={{ marginRight: isRTL ? 0 : 6, marginLeft: isRTL ? 6 : 0 }} />
                      <Text style={[styles.listRowMeta, { marginTop: 0 }]}>{t.teacher}: {task.teacher || t.teacher}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={[styles.compactEmpty, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.compactEmptyIcon, { backgroundColor: '#EAF5F0' }]}>
                    <CheckCircle2 size={21} color="#39725E" />
                  </View>
                  <Text style={[styles.compactEmptyText, { textAlign: isRTL ? 'right' : 'left' }]}>{emptyTaskLabel}</Text>
                </View>
              )}
            </View>
          )}

          {/* Teacher Remarks */}
          <SectionHeader title={t.teacherRemarks} count={visibleNotes.length} />
          
          {loading ? (
             <View style={{ gap: 12 }}>
               <View style={[styles.remarkCard, { padding: 16 }]}><SkeletonBlock width="100%" height={30} /></View>
             </View>
          ) : (
            <View style={{ gap: 12 }}>
              {visibleNotes.length > 0 ? (
                visibleNotes.map((note: any) => (
                  <TouchableOpacity
                    key={note.id}
                    activeOpacity={0.8}
                    onPress={() => { setSelectedRemark(note); }}
                    style={styles.remarkCard}
                  >
                    <View style={styles.remarkIconWrapper}>
                      <MessageSquare size={18} color="#94a3b8" />
                    </View>
                    <View style={[styles.remarkContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: 4 }}>
                        <Text style={[styles.remarkTitle, { flex: 1, marginBottom: 0, paddingRight: isRTL ? 0 : 8, paddingLeft: isRTL ? 8 : 0, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>{note.text || ''}</Text>
                      </View>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginTop: 4 }}>
                        <UserIcon size={12} color="#64748b" style={{ marginRight: isRTL ? 0 : 6, marginLeft: isRTL ? 6 : 0 }} />
                        <Text style={[styles.remarkMeta, { marginTop: 0 }]}>{t.teacher}: {note.author || t.teacher}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={[styles.compactEmpty, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.compactEmptyIcon, { backgroundColor: '#EAF3FB' }]}>
                    <MessageSquare size={21} color="#185FA5" />
                  </View>
                  <Text style={[styles.compactEmptyText, { textAlign: isRTL ? 'right' : 'left' }]}>{t.noRemarks}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
        </FlingGestureHandler>
      </FlingGestureHandler>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 110 },

  // Section Headers
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b', letterSpacing: -0.3 },
  sectionCount: { minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 7, backgroundColor: '#EAF3FB', alignItems: 'center', justifyContent: 'center' },
  sectionCountText: { fontSize: 11, fontWeight: '900', color: '#185FA5' },
  sectionActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionActionText: { fontSize: 13, fontWeight: '800', color: '#0072e6' },

  // Date Slider
  calendarBtn: {
    width: 48, height: 76, borderRadius: 20,
    backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center',
    marginRight: 12, borderWidth: 1, borderColor: '#e2e8f0',
  },
  dateSlider: { marginBottom: 0 },
  dateCard: {
    width: 62, height: 76, borderRadius: 20,
    backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center',
    marginRight: 10, borderWidth: 1, borderColor: '#e2e8f0',
  },
  activeDateCard: {
    backgroundColor: '#0072e6', borderColor: '#0072e6',
    shadowColor: '#0072e6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
  },
  dateDay: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  dateNum: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
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

  // School-day schedule: one calm surface instead of repeated floating cards.
  scheduleSurface: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E4E9F0',
    overflow: 'hidden',
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 1,
  },
  sessionRow: {
    paddingHorizontal: 14,
    paddingVertical: 15,
    alignItems: 'flex-start',
  },
  sessionRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E7EBF0',
  },
  subjectMark: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
  },
  sessionContentV2: { flex: 1, marginHorizontal: 12 },
  sessionTimeV2: {
    fontSize: 12,
    fontWeight: '700',
    color: '#667085',
  },
  statusBadgeV2: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgeTextV2: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sessionTitleV2: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1e293b',
    textAlign: 'left',
  },
  sessionTeacherV2: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667085',
  },
  teacherLine: { alignItems: 'center', marginTop: 10, maxWidth: '100%' },
  roomText: { fontSize: 12, color: '#98A2B3', fontWeight: '600' },

  // List Rows (remarks / tasks / exams)
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 12 },
  listCard: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, borderWidth: 2, borderColor: '#e2e8f0' },
  listRowTitle: { fontSize: 15, fontWeight: '900', color: '#1e293b', lineHeight: 22 },
  listRowMeta: { fontSize: 12, color: '#64748b', fontWeight: '800', marginTop: 4 },
  subjectTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 2, borderColor: '#e2e8f0', backgroundColor: '#ffffff', alignSelf: 'flex-start' },
  subjectTagText: { fontSize: 10, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Tasks
  taskCardItem: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#E4E9F0' },
  taskIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  // Remarks
  remarkCard: {
    backgroundColor: '#ffffff', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#E4E9F0',
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
  emptyStateBox: { padding: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  emptyStateText: { fontSize: 15, color: '#64748b', fontWeight: '800', marginTop: 4 },
  compactEmpty: { minHeight: 68, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E7EBF0', paddingHorizontal: 14, paddingVertical: 12 },
  compactEmptyIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  compactEmptyText: { flex: 1, marginHorizontal: 12, color: '#475467', fontSize: 14, lineHeight: 20, fontWeight: '700' },

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
