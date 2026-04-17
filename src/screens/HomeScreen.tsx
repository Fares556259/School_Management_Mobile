import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Platform, RefreshControl, Animated, StatusBar, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Book, Microscope, Clock, Globe, Palette, Calculator, Music, Languages, MessageSquare, AlertCircle, FileText, Download, Briefcase, Calendar as CalendarIcon, X, ChevronLeft, ChevronRight, BookOpen, Bell, Coffee, Info, ChevronDown, Check, User } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { studentService } from '../services/api';
import { StudentDayData } from '../types';
import { GlobalHeader } from '../components/GlobalHeader';
import { notificationService } from '../services/notificationService';
import { SkeletonBlock } from '../components/SkeletonView';

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, any> = {
  Calculator, Book, Languages, Clock, Globe, Palette, Music, Microscope, Briefcase, BookOpen, FileText,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const DateItem = ({ day, date, active, onPress }: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      width: 56, height: 80, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
      marginRight: 12, backgroundColor: active ? '#0055d4' : '#f1f4f6',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: active ? 0 : 0.05, shadowRadius: 4, elevation: active ? 0 : 2,
    }}
  >
    <Text style={{ fontSize: 10, fontWeight: 'bold', color: active ? 'white' : '#586064' }}>{day}</Text>
    <Text style={{ fontSize: 18, fontWeight: 'bold', color: active ? 'white' : '#2b3437' }}>{date}</Text>
  </TouchableOpacity>
);

const EmptyPlaceholder = ({ text, icon: Icon }: any) => (
  <View style={{
    backgroundColor: '#f8f9fa', padding: 24, borderRadius: 24, alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: '#f1f4f6', borderStyle: 'dashed', marginBottom: 16,
  }}>
    <Icon color="#d1d5db" size={32} style={{ marginBottom: 8 }} />
    <Text style={{ fontSize: 14, color: '#737c7f', fontWeight: '500' }}>{text}</Text>
  </View>
);

const HolidayBanner = ({ name }: { name: string }) => (
  <View style={{
    backgroundColor: '#eff6ff', 
    padding: 24, 
    borderRadius: 28, 
    alignItems: 'center',
    justifyContent: 'center', 
    borderWidth: 1, 
    borderColor: '#dbeafe', 
    marginBottom: 32,
    shadowColor: '#0055d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2
  }}>
    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 }}>
      <Coffee color="#0055d4" size={32} />
    </View>
    <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#0055d4', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>School Holiday</Text>
    <Text style={{ fontSize: 24, fontWeight: '900', color: '#1e3a8a', textAlign: 'center', marginBottom: 4 }}>{name}</Text>
    <Text style={{ fontSize: 14, color: '#60a5fa', fontWeight: '600', textAlign: 'center' }}>Enjoy your well-deserved break!</Text>
  </View>
);


const LoadingSkeleton = () => (
  <View style={{ gap: 16 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
      <SkeletonBlock width="40%" height={24} borderRadius={8} />
      <SkeletonBlock width="20%" height={24} borderRadius={12} />
    </View>
    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
       {[1,2,3,4,5].map(i => <SkeletonBlock key={i} width={56} height={80} borderRadius={16} />)}
    </View>
    <SkeletonBlock width="100%" height={100} borderRadius={28} marginBottom={12} />
    <SkeletonBlock width="60%" height={20} borderRadius={10} marginBottom={4} />
    <SkeletonBlock width="100%" height={80} borderRadius={24} marginBottom={4} />
    <SkeletonBlock width="100%" height={80} borderRadius={24} marginBottom={4} />
  </View>
);

const SessionItem = ({ session }: any) => {
  const Icon = ICON_MAP[session.iconName] || Book;
  const getAttendanceBadge = (status: string | null) => {
    switch (status) {
      case 'Pres': return { label: 'Present', color: '#22c55e' };
      case 'Abs':  return { label: 'Absent',  color: '#ef4444' };
      case 'Late': return { label: 'Late',    color: '#f59e0b' };
      default:     return null;
    }
  };
  const badge = getAttendanceBadge(session.attendance);
  return (
    <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 24, flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: (badge?.color || '#f1f4f6') + '30', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 }}>
      <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#f8f9fa', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}><Icon color="#0055d4" size={24} /></View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#2b3437' }}>{session.subject}</Text>
        {session.teacher && <Text style={{ fontSize: 11, color: '#0055d4', marginTop: 1, fontWeight: '600' }}>{session.teacher}</Text>}
        <Text style={{ fontSize: 11, color: '#737c7f', marginTop: 1 }}>{session.room} • {session.time}</Text>
      </View>
      {badge && (
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: badge.color }}>
          <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{badge.label}</Text>
        </View>
      )}
    </View>
  );
};

const NoteItem = ({ note }: any) => (
  <View style={{ backgroundColor: '#fffbeb', padding: 20, borderRadius: 24, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, borderWidth: 1, borderColor: '#fef3c7' }}>
    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}><MessageSquare color="#865400" size={20} /></View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#865400', textTransform: 'uppercase', marginBottom: 2 }}>
        {note.subject || ''}{(note.teacher || note.author) ? ` — ${note.teacher || note.author}` : ''}
      </Text>
      <Text style={{ fontSize: 14, color: '#2b3437', lineHeight: 20, fontStyle: 'italic' }}>"{note.text || note.content || ''}"</Text>
      {(note.date || note.time) && (
        <Text style={{ fontSize: 10, color: '#737c7f', marginTop: 6 }}>
          {note.date ? new Date(note.date).toLocaleDateString() : note.time}
        </Text>
      )}
    </View>
  </View>
);


const FileItem = ({ file }: any) => (
  <TouchableOpacity style={{ backgroundColor: 'white', padding: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#f1f4f6' }}>
    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: file.type === 'pdf' ? '#fee2e2' : '#dcfce7', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>{file.type === 'pdf' ? <FileText color="#ef4444" size={24} /> : <Book color="#22c55e" size={24} />}</View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#2b3437' }} numberOfLines={1}>{file.name}</Text>
      <Text style={{ fontSize: 11, color: '#737c7f', marginTop: 2 }}>{file.sharedBy} • {file.size}</Text>
    </View>
    <Download size={18} color="#0055d4" />
  </TouchableOpacity>
);

const ChildCard = ({ child, active, onPress }: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: active ? '#0055d4' : 'white',
      paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, marginRight: 10,
      borderWidth: 1, borderColor: active ? '#0055d4' : '#f1f4f6',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
    }}
  >
    <View style={{ width: 32, height: 32, borderRadius: 16, overflow: 'hidden', borderWidth: 1.5, borderColor: active ? 'rgba(255,255,255,0.3)' : '#0055d420' }}>
      <Image 
        source={child.avatarUrl ? { uri: child.avatarUrl } : require('../../assets/noavatar.png')} 
        style={{ width: '100%', height: '100%' }} 
        contentFit="cover"
        transition={200}
      />
    </View>
    <Text style={{ fontSize: 13, fontWeight: 'bold', color: active ? 'white' : '#2b3437', marginLeft: 10 }}>{child.name.split(' ')[0]}</Text>
  </TouchableOpacity>
);

const HomeworkItem = ({ homework, label, onPress }: any) => (
  <TouchableOpacity onPress={onPress} style={{ backgroundColor: 'white', padding: 16, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: '#f1f4f6', flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 }}>
    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8f9fa', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}><Clock size={20} color="#737c7f" /></View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#2b3437' }}>{homework.title}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
        <CalendarIcon size={12} color="#737c7f" /><Text style={{ fontSize: 11, color: '#737c7f', marginLeft: 4 }}>{label}</Text>
      </View>
    </View>
    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: homework.isUrgent ? '#fee2e2' : '#f0fdf4' }}><Text style={{ fontSize: 10, fontWeight: 'bold', color: homework.isUrgent ? '#ef4444' : '#22c55e' }}>{homework.isUrgent ? 'URGENT' : 'PENDING'}</Text></View>
  </TouchableOpacity>
);

// ─── Main Screen ───────────────────────────────────────────────────────────────

const DATES = [
  { day: 'Mon', date: '23' }, { day: 'Tue', date: '24' }, { day: 'Wed', date: '25' },
  { day: 'Thu', date: '26' }, { day: 'Fri', date: '27' }, { day: 'Sat', date: '28' }, { day: 'Sun', date: '29' },
];

const formatDateStr = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const EMPTY_DAY: StudentDayData = { sessions: [], notes: [], files: [], homeworkDue: [], homeworkGiven: [], exams: [] };

export const HomeScreen = ({ navigation }: any) => {
  const { 
    selectedChildId, 
    setSelectedChildId, 
    children, 
    setChildren, 
    parentName, 
    setParentName, 
    parentAvatarUrl, 
    setParentAvatarUrl,
    setStudentStatus
  } = useAppStore();
  const selectedChild = children.find((c: any) => c.id === selectedChildId);

  const today = new Date();
  const [selectedFullDate, setSelectedFullDate] = React.useState(today);
  const [showPicker, setShowPicker] = React.useState(false);
  const [showAlert, setShowAlert] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [dayData, setDayData] = React.useState<StudentDayData>(EMPTY_DAY);

  const [viewingMonth, setViewingMonth] = React.useState(today.getMonth());
  const [viewingYear, setViewingYear] = React.useState(today.getFullYear());
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const changeMonth = (delta: number) => {
    let newMonth = viewingMonth + delta;
    let newYear = viewingYear;
    if (newMonth > 11) { newMonth = 0; newYear++; } else if (newMonth < 0) { newMonth = 11; newYear--; }
    setViewingMonth(newMonth); 
    setViewingYear(newYear);
  };
  const getDaysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (m: number, y: number) => {
    const day = new Date(y, m, 1).getDay();
    // adjust so Monday is first (0) and Sunday is last (6)
    return day === 0 ? 6 : day - 1;
  };
  
  // Request notification permissions once on mount
  React.useEffect(() => {
    notificationService.requestPermissions();
  }, []);

  // Fetch data when child or date changes
  React.useEffect(() => {
    if (!selectedChildId) return;
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await studentService.fetchDayData(selectedChildId, formatDateStr(selectedFullDate));
        setDayData(data);
        
        // Schedule local reminders for exams and homework
        if (data.homeworkDue?.length > 0) {
          data.homeworkDue.forEach(item => notificationService.scheduleHomeworkReminder(item));
        }
        if (data.exams?.length > 0) {
          data.exams.forEach(item => notificationService.scheduleExamReminder(item));
        }
        
        // Determine Alert Visibility & Global Status
        const payments = await studentService.fetchPayments(selectedChildId);
        
        // Match the format "Month Year" used in api.ts fetchPayments
        const currentMonthName = months[today.getMonth()];
        const currentYearNum = today.getFullYear();
        const currentMonthKey = `${currentMonthName} ${currentYearNum}`;
        
        const currentMonthPayment = payments.find(p => p.month === currentMonthKey);
        const isNotPaid = currentMonthPayment && currentMonthPayment.status !== 'Paid';
        
        setShowAlert(!!isNotPaid);
        
        // Compute and sync global status to store (for Header)
        const hasAbsent = data.sessions?.some((s: any) => s.attendance === 'ABSENT' || s.attendance === 'Abs');
        if (hasAbsent) setStudentStatus(selectedChildId, 'Absent');
        else if (isNotPaid) setStudentStatus(selectedChildId, 'Due');
        else setStudentStatus(selectedChildId, 'Present');
      } catch (error) {
        console.error("[Home Load Error]", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedChildId, selectedFullDate]);

  const onRefresh = React.useCallback(async () => {
    if (!selectedChildId) return;
    setRefreshing(true);
    const data = await studentService.fetchDayData(selectedChildId, formatDateStr(selectedFullDate));
    setDayData(data);
    setRefreshing(false);
  }, [selectedChildId, selectedFullDate]);

  const presentCount = dayData.sessions?.filter(s => s.attendance === 'Pres').length || 0;
  const attendancePercent = (dayData.sessions?.length || 0) > 0 ? Math.round((presentCount / dayData.sessions.length) * 100) : 0;

  // Generate week slider items around selected date
  const sliderDates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(selectedFullDate);
    d.setDate(d.getDate() - 3 + i);
    return d;
  });
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <SafeAreaView className="flex-1 bg-surface-background" edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Shared Global Header */}
      <GlobalHeader navigation={navigation} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0055d4']} tintColor="#0055d4" />}
      >
        <View style={{ paddingBottom: 150, paddingHorizontal: 20 }}>
          {/* Spacing after flat header */}
          <View style={{ height: 16 }} />

          {/* Tuition Alert */}
          {showAlert && (
            <View style={{ marginBottom: 32 }}>
              <View style={{ backgroundColor: '#fff7ed', padding: 20, borderRadius: 28, borderWidth: 1, borderColor: '#ffedd5', shadowColor: '#f97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 }}>
                <TouchableOpacity onPress={() => setShowAlert(false)} style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, padding: 4 }}><X size={18} color="#9a3412" /></TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#ffedd5', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}><AlertCircle size={18} color="#f97316" /></View>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#9a3412', textTransform: 'uppercase', letterSpacing: 0.5 }}>Important Message</Text>
                </View>
                <Text style={{ fontSize: 15, color: '#431407', lineHeight: 22, fontWeight: '500' }}>
                  Dear <Text style={{ fontWeight: 'bold' }}>{parentName}</Text>, please note that tuition fees for{' '}
                  <Text style={{ fontWeight: 'bold' }}>{selectedChild?.name.split(' ')[0]}</Text> for the month of <Text style={{ fontWeight: 'bold' }}>{months[today.getMonth()]}</Text> have an outstanding balance. 
                  <Text style={{ fontWeight: 'bold' }}> {today.getDate()} days</Text> have already passed this month. Please contact administration.
                </Text>
              </View>
            </View>
          )}

          {/* Schedule Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2b3437' }}>{selectedChild?.name.split(' ')[0]}'s Schedule</Text>
            <TouchableOpacity onPress={() => setShowPicker(true)} style={{ padding: 8, backgroundColor: '#f1f4f6', borderRadius: 12 }}>
              <CalendarIcon size={20} color="#0055d4" />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 32 }} contentContainerStyle={{ paddingVertical: 10 }}>
            {sliderDates.map(d => (
              <DateItem 
                key={formatDateStr(d)} 
                day={DAYS[d.getDay()]} 
                date={d.getDate().toString()} 
                active={formatDateStr(selectedFullDate) === formatDateStr(d)} 
                onPress={() => setSelectedFullDate(d)} 
              />
            ))}
          </ScrollView>

          {/* Loading State */}
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <>
              {/* Holiday State */}
              {dayData.holidayName ? (
                <HolidayBanner name={dayData.holidayName} />
              ) : (
                <>
                  {/* Today's Sessions & Attendance */}
                  <View style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2b3437' }}>{selectedChild?.name.split(' ')[0]}'s Progress</Text>
                      <TouchableOpacity 
                        onPress={() => navigation.navigate('Attendance')}
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#0055d410', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#0055d4', marginRight: 4 }}>History</Text>
                        <ChevronRight size={14} color="#0055d4" />
                      </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                      <Text style={{ fontSize: 13, color: '#737c7f', fontWeight: 'bold' }}>Progress</Text>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#586064' }}>{attendancePercent}% marked</Text>
                    </View>
                    <View style={{ width: '100%', height: 10, backgroundColor: '#e2e9ec', borderRadius: 5, overflow: 'hidden', marginBottom: 16 }}>
                      <View style={{ width: `${attendancePercent}%`, height: '100%', backgroundColor: '#0055d4', borderRadius: 5 }} />
                    </View>
                  </View>
                  {dayData.sessions?.length > 0 ? (
                    <View style={{ marginBottom: 32 }}>{dayData.sessions.map((session: any) => <SessionItem key={session.id} session={session} />)}</View>
                  ) : (
                    <EmptyPlaceholder text="No sessions – enjoy your day!" icon={Coffee} />
                  )}
                </>
              )}

              {/* Tasks to Submit */}
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <AlertCircle size={20} color="#2b3437" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2b3437' }}>Tasks for {selectedChild?.name.split(' ')[0]}</Text>
                </View>
                {dayData.homeworkDue?.length > 0 ? (
                  dayData.homeworkDue.map((item: any) => <HomeworkItem key={item.id} homework={item} label="Submit Today" onPress={() => navigation.navigate('HomeworkDetail', { homework: item })} />)
                ) : (
                  <EmptyPlaceholder text="No tasks to submit today." icon={Clock} />
                )}
              </View>

              {/* Tasks Given */}
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <FileText size={20} color="#2b3437" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2b3437' }}>Tasks Given</Text>
                </View>
                {dayData.homeworkGiven?.length > 0 ? (
                  dayData.homeworkGiven.map((item: any) => <HomeworkItem key={item.id} homework={item} label={`Due: ${new Date(item.dueDate).toLocaleDateString()}`} onPress={() => navigation.navigate('HomeworkDetail', { homework: item })} />)
                ) : (
                  <EmptyPlaceholder text="No new tasks given." icon={Briefcase} />
                )}
              </View>

              {/* Course Resources */}
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <BookOpen size={20} color="#2b3437" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2b3437' }}>Course Resources</Text>
                </View>
                {dayData.files?.length > 0 ? (
                  dayData.files.map((file: any) => <FileItem key={file.id} file={file} />)
                ) : (
                  <EmptyPlaceholder text="No resources shared today." icon={Info} />
                )}
              </View>

              {/* Teacher Remarks */}
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <MessageSquare size={20} color="#2b3437" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2b3437' }}>Teacher Remarks</Text>
                </View>
                {dayData.notes?.length > 0 ? (
                  dayData.notes.map((note: any) => <NoteItem key={note.id} note={note} />)
                ) : (
                  <EmptyPlaceholder text="No remarks for this date." icon={MessageSquare} />
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Calendar Modal */}
      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24, paddingBottom: 50 }}>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#2b3437' }}>Academic Calendar</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)} style={{ padding: 4 }}><X size={24} color="#737c7f" /></TouchableOpacity>
            </View>
            
            {/* Month & Year Controller */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, backgroundColor: '#f8f9fa', padding: 12, borderRadius: 20 }}>
              <TouchableOpacity onPress={() => changeMonth(-1)} style={{ padding: 8, backgroundColor: 'white', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
                <ChevronLeft size={20} color="#0055d4" />
              </TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#2b3437' }}>{months[viewingMonth]}</Text>
                <Text style={{ fontSize: 13, color: '#737c7f', fontWeight: 'bold' }}>{viewingYear}</Text>
              </View>
              <TouchableOpacity onPress={() => changeMonth(1)} style={{ padding: 8, backgroundColor: 'white', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
                <ChevronRight size={20} color="#0055d4" />
              </TouchableOpacity>
            </View>
            
            {/* Weekdays Header */}
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                <Text key={day} style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: '#737c7f' }}>{day}</Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
              {Array.from({ length: getFirstDayOfMonth(viewingMonth, viewingYear) }).map((_, i) => (
                <View key={`empty-${i}`} style={{ width: '14.28%', aspectRatio: 1 }} />
              ))}
              {Array.from({ length: getDaysInMonth(viewingMonth, viewingYear) }, (_, i) => i + 1).map(day => {
                const isSelected = selectedFullDate.getDate() === day && selectedFullDate.getMonth() === viewingMonth && selectedFullDate.getFullYear() === viewingYear;
                
                // For logic realism: weekdays are selectable and have data (mostly). 
                const d = new Date(viewingYear, viewingMonth, day);
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const selectable = !isWeekend; 

                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => { 
                      setSelectedFullDate(new Date(viewingYear, viewingMonth, day));
                      setShowPicker(false);
                    }}
                    style={{ 
                      width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', 
                      marginVertical: 4
                    }}
                  >
                    <View style={{
                      width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: isSelected ? '#0055d4' : selectable ? '#f0f4f8' : 'transparent',
                    }}>
                      <Text style={{ 
                        fontSize: 15, 
                        fontWeight: isSelected ? 'bold' : '600', 
                        color: isSelected ? 'white' : selectable ? '#0055d4' : '#a0aab0' 
                      }}>
                        {day}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <View style={{ marginTop: 24, padding: 16, backgroundColor: '#f8f9fa', borderRadius: 20 }}>
              <Text style={{ fontSize: 13, color: '#737c7f', textAlign: 'center', fontWeight: '500' }}>
                <CalendarIcon size={14} color="#0055d4" style={{ top: 2 }} /> School days are Monday through Friday.
              </Text>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};
