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
  Download, X, Award, User as UserIcon
} from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { useLanguage } from '../context/LanguageContext';
import { cacheManager } from '../utils/cacheManager';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { FlingGestureHandler, Directions, State } from 'react-native-gesture-handler';
import { studentService } from '../services/api';
import { StudentDayData } from '../types';
import { GlobalHeader } from '../components/GlobalHeader';
import { SkeletonBlock } from '../components/SkeletonView';
import { useFocusEffect } from '@react-navigation/native';

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
  const { t, isRTL, getTranslatedSubject } = useLanguage();
  const isAbsent = session.attendance === 'ABSENT';
  const isPresent = session.attendance === 'PRESENT';
  const isLate = session.attendance === 'LATE';

  const pillColor = isAbsent ? '#ef4444' : isPresent ? '#22c55e' : isLate ? '#f59e0b' : '#cbd5e1';
  const badgeBg = isAbsent ? '#fee2e2' : isPresent ? '#dcfce7' : isLate ? '#fef3c7' : '#f1f5f9';
  const badgeText = isAbsent ? '#dc2626' : isPresent ? '#16a34a' : isLate ? '#d97706' : '#64748b';
  const statusLabel = isAbsent ? t.absent : isPresent ? t.present : isLate ? t.late : t.upcoming;

  return (
    <View style={[styles.sessionCardV2, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {/* Accent Pill Bar */}
      <View style={[styles.sessionPill, { backgroundColor: pillColor, borderTopRightRadius: isRTL ? 16 : 0, borderBottomRightRadius: isRTL ? 16 : 0, borderTopLeftRadius: isRTL ? 0 : 16, borderBottomLeftRadius: isRTL ? 0 : 16 }]} />
      
      <View style={[styles.sessionContentV2, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <Text style={styles.sessionTimeV2}>{session.startTime} - {session.endTime}</Text>
          <View style={[styles.statusBadgeV2, { backgroundColor: badgeBg }]}>
            <Text style={[styles.statusBadgeTextV2, { color: badgeText }]}>{statusLabel}</Text>
          </View>
        </View>

        <Text style={[styles.sessionTitleV2, { textAlign: isRTL ? 'right' : 'left', width: '100%' }]} numberOfLines={2}>
          {getTranslatedSubject(session.subject)}
        </Text>

        <View style={styles.sessionDividerV2} />

        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
            <UserIcon size={14} color="#64748b" strokeWidth={2.5} style={{ marginRight: isRTL ? 0 : 6, marginLeft: isRTL ? 6 : 0 }} />
            <Text style={styles.sessionTeacherV2}>{session.teacher || t.teacher}</Text>
          </View>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 2 }}>
            {[1, 2, 3, 4, 5].map((starIndex) => (
              <Star 
                key={starIndex} 
                size={12} 
                color={session.score >= starIndex ? "#eab308" : "#cbd5e1"} 
                fill={session.score >= starIndex ? "#eab308" : "transparent"} 
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

// ─── Empty Sessions ───────────────────────────────────────────────────────────
const EmptySessionsUI = () => {
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
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, action, onAction }: any) => {
  const { isRTL } = useLanguage();
  return (
    <View style={[styles.sectionHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction} style={[styles.sectionActionBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={styles.sectionActionText}>{action}</Text>
          <ChevronRight size={14} color="#0072e6" strokeWidth={3} style={{ transform: [{ rotate: isRTL ? '180deg' : '0deg' }] }} />
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const HomeScreen = ({ navigation, route }: any) => {
  const { selectedChildId, setStudentStatus } = useAppStore();
  const { t, isRTL, getTranslatedSubject } = useLanguage();
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

  const requestRef = React.useRef(0);

  const fetchHome = async (isRefresh = false) => {
    if (!selectedChildId) return;
    
    // Increment request ID to track the latest request
    const currentReq = ++requestRef.current;
    
    const dateStr = selectedDate.toISOString().split('T')[0];
    const cacheKey = `HOME_DAY_CACHE_${selectedChildId}_${dateStr}`;

    if (!isRefresh) {
      setLoading(true);
      setDayData({ sessions: [], notes: [], files: [], homeworkDue: [], homeworkGiven: [], exams: [] });
    }

    const cachedData = await cacheManager.get<StudentDayData>(cacheKey);
    
    // If a newer request was triggered, abort this one
    if (requestRef.current !== currentReq) return;

    if (!isRefresh && cachedData) {
      setDayData(cachedData);
      setLoading(false);
    }

    try {
      const data = await studentService.fetchDayData(selectedChildId, dateStr);
      
      // If a newer request was triggered while fetching from network, abort this one
      if (requestRef.current !== currentReq) return;

      setDayData(data);
      await cacheManager.set(cacheKey, data);
      
      const hasAbsent = data.sessions?.some((s: any) => s.attendance?.toUpperCase() === 'ABSENT' || s.attendance?.toUpperCase() === 'ABS');
      setStudentStatus(selectedChildId, hasAbsent ? 'Absent' : 'Present');
    } catch (e) {
      console.error(e);
    } finally {
      if (requestRef.current === currentReq) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchHome();
    }, [selectedChildId, selectedDate])
  );
  const onRefresh = React.useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    fetchHome();
  }, [selectedChildId, selectedDate]);

  const sliderDates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 3 + i);
    return d;
  });

  const allTasks = Array.from(
    new Map(
      (dayData.homeworkGiven || []).map((t: any) => [t.id, t])
    ).values()
  );
  const daysArr = [t.sunday, t.monday, t.tuesday, t.wednesday, t.thursday, t.friday, t.saturday];

  const changeDate = (days: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t.todaysSchedule}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
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
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedDate(d); }}
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
            <View style={{ gap: 12, marginTop: 16 }}>
              {[1, 2, 3].map(i => (
                <View key={i} style={[styles.sessionCardV2, { padding: 16 }]} >
                  <SkeletonBlock width="50%" height={14} marginBottom={10} />
                  <SkeletonBlock width="100%" height={12} marginBottom={6} />
                  <SkeletonBlock width="70%" height={12} />
                </View>
              ))}
            </View>
          ) : (
            <View style={{ gap: 12, marginTop: 16 }}>
              {dayData.sessions.length > 0 ? (
                dayData.sessions.map((s: any, index: number) => (
                  <Reanimated.View key={s.id} entering={FadeInDown.duration(400).delay(index * 100)}>
                    <SessionCard session={s} />
                  </Reanimated.View>
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
          <SectionHeader title={t.tasks} />
          
          {loading ? (
            <View style={{ gap: 12 }}>
              <View style={[styles.taskCardItem, { padding: 16 }]}><SkeletonBlock width="100%" height={40} /></View>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {allTasks.length > 0 ? (
                allTasks.map((task: any, index: number) => (
                  <Reanimated.View key={task.id} entering={FadeInDown.duration(400).delay(index * 100)}>
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
                  </Reanimated.View>
                ))
              ) : (
                <View style={styles.emptyStateBox}>
                  <View style={{width: 56, height: 56, borderRadius: 28, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center'}}>
                    <CheckCircle2 size={28} color="#16a34a" />
                  </View>
                  <Text style={styles.emptyStateText}>{t.allCaughtUp}</Text>
                </View>
              )}
            </View>
          )}

          {/* Teacher Remarks */}
          <SectionHeader title={t.teacherRemarks} />
          
          {loading ? (
             <View style={{ gap: 12 }}>
               <View style={[styles.remarkCard, { padding: 16 }]}><SkeletonBlock width="100%" height={30} /></View>
             </View>
          ) : (
            <View style={{ gap: 12 }}>
              {dayData.notes?.filter((n: any) => n.text && !n.text.includes('INITIALIZED_BULK') && !n.text.includes('AUTO_SYNCED')).length > 0 ? (
                dayData.notes.filter((n: any) => n.text && !n.text.includes('INITIALIZED_BULK') && !n.text.includes('AUTO_SYNCED')).map((note: any, index: number) => (
                    <Reanimated.View key={note.id} entering={FadeInDown.duration(400).delay(index * 100)}>
                  <TouchableOpacity
                    key={note.id}
                    activeOpacity={0.8}
                    onPress={() => { Haptics.selectionAsync(); setSelectedRemark(note); }}
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
                  </Reanimated.View>
                ))
              ) : (
                <View style={styles.emptyStateBox}>
                  <View style={{width: 56, height: 56, borderRadius: 28, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center'}}>
                    <MessageSquare size={28} color="#0072e6" />
                  </View>
                  <Text style={styles.emptyStateText}>{t.noRemarks}</Text>
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
  content: { paddingHorizontal: 20, paddingTop: 12 },

  // Section Headers
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b', letterSpacing: -0.3 },
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

  // Session Card V2 (New Design)
  sessionCardV2: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
    marginBottom: 4,
  },
  sessionPill: {
    width: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  sessionContentV2: {
    flex: 1,
  },
  sessionHeaderV2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionTimeV2: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  statusBadgeV2: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeTextV2: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sessionTitleV2: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 10,
    textAlign: 'left',
  },
  sessionDividerV2: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 10,
  },
  sessionFooterV2: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionTeacherV2: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 6,
  },

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
