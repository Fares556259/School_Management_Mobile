import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Platform, RefreshControl, Animated, StatusBar, ActivityIndicator, Linking } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Book, Microscope, Clock, Globe, Palette, Calculator, Music, Languages, 
  MessageSquare, AlertCircle, FileText, Download, Briefcase, 
  Calendar as CalendarIcon, X, ChevronLeft, ChevronRight, BookOpen, 
  Bell, Coffee, Info, ChevronDown, Check, User, Star, Layout
} from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { useAppStore } from '../store/useAppStore';
import { studentService } from '../services/api';
import { StudentDayData } from '../types';
import { GlobalHeader } from '../components/GlobalHeader';
import { notificationService } from '../services/notificationService';
import { SkeletonBlock } from '../components/SkeletonView';

// ─── Sub-components (High Fidelity Redesign) ───────────────────────────────────

const DateItem = ({ day, date, active, isToday, onPress }: any) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={{
      width: 72, 
      height: 96, 
      borderRadius: 18, 
      alignItems: 'center', 
      justifyContent: 'center',
      marginRight: 12, 
      backgroundColor: active ? '#0055d4' : '#f8fafc',
      borderWidth: 1,
      borderColor: active ? '#0055d4' : '#f1f5f9',
      shadowColor: '#0055d4', 
      shadowOffset: { width: 0, height: active ? 10 : 0 },
      shadowOpacity: active ? 0.2 : 0, 
      shadowRadius: 15, 
      elevation: active ? 10 : 0,
    }}
  >
    <Text style={{ fontSize: 11, fontWeight: '900', color: active ? 'white' : '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>{day}</Text>
    <Text style={{ fontSize: 22, fontWeight: '900', color: active ? 'white' : '#1e293b' }}>{date}</Text>
    {isToday && (
      <Text style={{ fontSize: 9, fontWeight: '900', color: active ? 'white' : '#64748b', marginTop: 4 }}>Today</Text>
    )}
    {!active && isToday && (
      <View style={{ position: 'absolute', bottom: 8, width: 4, height: 4, borderRadius: 2, backgroundColor: '#0055d4' }} />
    )}
  </TouchableOpacity>
);

const ProgressRing = ({ size, progress }: any) => {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#0055d4"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      <Text style={{ position: 'absolute', fontSize: 20, fontWeight: '900', color: '#1e293b' }}>{progress}%</Text>
    </View>
  );
};

const GlanceItem = ({ icon: Icon, title, subtitle, color, onPress }: any) => (
  <TouchableOpacity 
    onPress={onPress}
    activeOpacity={0.7}
    style={{ backgroundColor: 'white', padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}
  >
    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: color + '15', alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={20} color={color} />
    </View>
    <View style={{ marginLeft: 16, flex: 1 }}>
      <Text style={{ fontSize: 14, fontWeight: '900', color: '#1e293b' }}>{title}</Text>
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginTop: 2 }}>{subtitle}</Text>
    </View>
    <ChevronRight size={18} color="#d1d5db" />
  </TouchableOpacity>
);

const EmptyPlaceholder = ({ text, icon: Icon }: any) => (
  <View style={{
    backgroundColor: '#f8fafc', padding: 24, borderRadius: 18, alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9', borderStyle: 'dashed', marginBottom: 16,
  }}>
    <Icon color="#94a3b8" size={32} style={{ marginBottom: 12 }} />
    <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '700', textAlign: 'center' }}>{text}</Text>
  </View>
);

const HolidayBanner = ({ name }: { name: string }) => (
  <View style={{
    backgroundColor: '#eff6ff', padding: 32, borderRadius: 32, alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: '#dbeafe', marginBottom: 32
  }}>
    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#0055d4', shadowOpacity: 0.1, shadowRadius: 10 }}>
      <Coffee color="#0055d4" size={32} />
    </View>
    <Text style={{ fontSize: 11, fontWeight: '900', color: '#0055d4', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>School Holiday</Text>
    <Text style={{ fontSize: 26, fontWeight: '900', color: '#1e3a8a', textAlign: 'center', marginBottom: 8 }}>{name}</Text>
    <Text style={{ fontSize: 14, color: '#60a5fa', fontWeight: '700', textAlign: 'center' }}>Enjoy your break!</Text>
  </View>
);

const LoadingSkeleton = () => (
  <View style={{ gap: 20 }}>
    <View style={{ flexDirection: 'row', gap: 12 }}>
       {[1,2,3,4].map(i => <SkeletonBlock key={i} width={72} height={96} borderRadius={18} />)}
    </View>
    <SkeletonBlock width="100%" height={160} borderRadius={28} />
    <SkeletonBlock width="50%" height={24} borderRadius={10} marginTop={10} />
    {[1,2,3,4,5].map(i => <SkeletonBlock key={i} width="100%" height={80} borderRadius={18} />)}
  </View>
);

// ─── Main Screen ───────────────────────────────────────────────────────────────

const formatDateStr = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const EMPTY_DAY: StudentDayData = { sessions: [], notes: [], files: [], homeworkDue: [], homeworkGiven: [], exams: [] };

export const HomeScreen = ({ navigation }: any) => {
  const { 
    selectedChildId, 
    children, 
    parentName, 
    studentStatuses,
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
    return day === 0 ? 6 : day - 1;
  };

  React.useEffect(() => {
    if (!selectedChildId) return;
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await studentService.fetchDayData(selectedChildId, formatDateStr(selectedFullDate));
        setDayData(data);
        
        const payments = await studentService.fetchPayments(selectedChildId);
        const currentMonthKey = `${months[today.getMonth()]} ${today.getFullYear()}`;
        const currentMonthPayment = payments.find(p => p.month === currentMonthKey);
        const isNotPaid = currentMonthPayment && currentMonthPayment.status !== 'Paid';
        
        setShowAlert(!!isNotPaid);
        
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

  const presentCount = dayData.sessions?.filter(s => s.attendance === 'Pres' || s.attendance === 'Present').length || 0;
  const attendancePercent = (dayData.sessions?.length || 0) > 0 ? Math.round((presentCount / dayData.sessions.length) * 100) : 0;

  const sliderDates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - 3 + i);
    return d;
  });
  
  const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <GlobalHeader navigation={navigation} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0055d4']} tintColor="#0055d4" />}
      >
        <View style={{ paddingHorizontal: 24, paddingBottom: 150, paddingTop: 10 }}>
          
          {/* Today's Schedule Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#1e293b' }}>Today's Schedule</Text>
            <TouchableOpacity onPress={() => setShowPicker(true)} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 }}>
              <CalendarIcon size={22} color="#0055d4" />
            </TouchableOpacity>
          </View>

          {/* Date Slider */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 32 }} contentContainerStyle={{ paddingVertical: 10 }}>
            {sliderDates.map(d => (
              <DateItem 
                key={formatDateStr(d)} 
                day={DAYS_SHORT[d.getDay()]} 
                date={d.getDate().toString()} 
                active={formatDateStr(selectedFullDate) === formatDateStr(d)} 
                isToday={formatDateStr(today) === formatDateStr(d)}
                onPress={() => setSelectedFullDate(d)} 
              />
            ))}
          </ScrollView>

          {loading ? (
            <LoadingSkeleton />
          ) : (
            <>
              {/* Progress Overview Card */}
              <View style={{ backgroundColor: 'white', padding: 24, borderRadius: 28, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 20, elevation: 5, marginBottom: 32 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b' }}>Progress Overview</Text>
                  <TouchableOpacity 
                    onPress={() => navigation.navigate('Attendance')}
                    style={{ backgroundColor: '#eff6ff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#0055d4', marginRight: 4 }}>History</Text>
                    <ChevronRight size={14} color="#0055d4" />
                  </TouchableOpacity>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ProgressRing size={100} progress={attendancePercent} />
                  <View style={{ ml: 24, flex: 1, marginLeft: 20 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#1e293b' }}>{attendancePercent}% marked</Text>
                    <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '700', marginTop: 4 }}>Let's get started!</Text>
                  </View>
                  <View style={{ width: 80, height: 80, opacity: 0.8 }}>
                     <Image source={require('../../assets/3d/student.jpg')} style={{ width: '100%', height: '100%', borderRadius: 16 }} contentFit="cover" />
                  </View>
                </View>
              </View>

              {/* Today at a Glance */}
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#1e293b', marginBottom: 20 }}>Today at a Glance</Text>
              
              <GlanceItem 
                icon={Layout} 
                title="Sessions" 
                subtitle={dayData.sessions?.length > 0 ? `${dayData.sessions.length} sessions today` : "No sessions today"} 
                color="#0055d4" 
              />
              <GlanceItem 
                icon={Check} 
                title="Tasks to Submit" 
                subtitle={dayData.homeworkDue?.length > 0 ? `${dayData.homeworkDue.length} tasks to submit` : "No tasks to submit today"} 
                color="#10b981" 
                onPress={() => dayData.homeworkDue?.length > 0 && navigation.navigate('HomeworkDetail', { homework: dayData.homeworkDue[0] })}
              />
              <GlanceItem 
                icon={FileText} 
                title="Tasks Given" 
                subtitle={dayData.homeworkGiven?.length > 0 ? `${dayData.homeworkGiven.length} new tasks given` : "No new tasks given"} 
                color="#f59e0b" 
              />
              <GlanceItem 
                icon={BookOpen} 
                title="Course Resources" 
                subtitle={dayData.files?.length > 0 ? `${dayData.files.length} resources shared` : "No resources shared today"} 
                color="#8b5cf6" 
                onPress={() => navigation.navigate('DocumentCenter')}
              />
              <GlanceItem 
                icon={MessageSquare} 
                title="Teacher Remarks" 
                subtitle={dayData.notes?.length > 0 ? `${dayData.notes.length} remarks today` : "No remarks for this date"} 
                color="#ec4899" 
              />

              {/* Promotional/Motivational Banner */}
              <View style={{ backgroundColor: '#f0f9ff', borderRadius: 28, padding: 24, marginTop: 24, borderLeftWidth: 6, borderLeftColor: '#0055d4', flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Star size={16} color="#0055d4" fill="#0055d4" />
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', ml: 8, marginLeft: 8 }}>Keep it up, {selectedChild?.name.split(' ')[0]}!</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '700', lineHeight: 20 }}>Stay consistent and achieve your goals.</Text>
                </View>
                <Image source={require('../../assets/icon.png')} style={{ width: 60, height: 60, opacity: 0.1 }} contentFit="contain" />
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Calendar Modal */}
      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setShowPicker(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1} style={{ backgroundColor: 'white', borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 32, paddingBottom: 50 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 26, fontWeight: '900', color: '#1e293b' }}>Academic Calendar</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
              <TouchableOpacity onPress={() => changeMonth(-1)} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronLeft size={20} color="#0055d4" />
              </TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: '#1e293b' }}>{months[viewingMonth]}</Text>
                <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '800' }}>{viewingYear}</Text>
              </View>
              <TouchableOpacity onPress={() => changeMonth(1)} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRight size={20} color="#0055d4" />
              </TouchableOpacity>
            </View>
            
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                <Text key={day} style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '900', color: '#94a3b8' }}>{day}</Text>
              ))}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {Array.from({ length: getFirstDayOfMonth(viewingMonth, viewingYear) }).map((_, i) => (
                <View key={`empty-${i}`} style={{ width: '14.28%', aspectRatio: 1 }} />
              ))}
              {Array.from({ length: getDaysInMonth(viewingMonth, viewingYear) }, (_, i) => i + 1).map(day => {
                const isSelected = selectedFullDate.getDate() === day && selectedFullDate.getMonth() === viewingMonth && selectedFullDate.getFullYear() === viewingYear;
                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => { 
                      setSelectedFullDate(new Date(viewingYear, viewingMonth, day));
                      setShowPicker(false);
                    }}
                    style={{ width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? '#0055d4' : 'transparent' }}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: isSelected ? 'white' : '#1e293b' }}>{day}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};
