import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Modal, Platform, RefreshControl, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Book, Microscope, Clock, Globe, Palette, Calculator, Music, Languages, MessageSquare, AlertCircle, FileText, Download, Briefcase, Calendar as CalendarIcon, X, ChevronLeft, ChevronRight, BookOpen, Bell } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';

const DateItem = ({ day, date, active, onPress }: any) => (
  <TouchableOpacity 
    onPress={onPress}
    style={{
      width: 56,
      height: 80,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      backgroundColor: active ? '#0055d4' : '#f1f4f6',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: active ? 0 : 0.05,
      shadowRadius: 4,
      elevation: active ? 0 : 2,
    }}
  >
    <Text style={{ fontSize: 10, fontWeight: 'bold', color: active ? 'white' : '#586064' }}>{day}</Text>
    <Text style={{ fontSize: 18, fontWeight: 'bold', color: active ? 'white' : '#2b3437' }}>{date}</Text>
  </TouchableOpacity>
);

const SessionItem = ({ session }: any) => {
  const Icon = session.icon;
  
  const getAttendanceColor = (status: string) => {
    switch (status) {
      case 'Pres': return '#22c55e'; // Green
      case 'Abs': return '#ef4444'; // Red
      case 'Rtr': return '#f59e0b'; // Amber
      case 'Exclu': return '#4b5563'; // Grey
      default: return '#737c7f';
    }
  };

  const attendanceColor = getAttendanceColor(session.attendance);

  return (
    <View style={{ 
      backgroundColor: 'white', 
      padding: 16, 
      borderRadius: 24, 
      flexDirection: 'row', 
      alignItems: 'center', 
      marginBottom: 16,
      borderWidth: 1,
      borderColor: attendanceColor + '40',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.03,
      shadowRadius: 10,
      elevation: 2
    }}>
      <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#f8f9fa', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
        <Icon color={session.color} size={24} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#2b3437' }}>{session.subject}</Text>
        <Text style={{ fontSize: 11, color: '#737c7f', marginTop: 2 }}>{session.room}</Text>
        <Text style={{ fontSize: 11, color: '#737c7f' }}>{session.time}</Text>
      </View>
      <View style={{ 
        paddingHorizontal: 10, 
        paddingVertical: 4, 
        borderRadius: 10, 
        backgroundColor: attendanceColor
      }}>
        <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{session.attendance}</Text>
      </View>
    </View>
  );
};

const NoteItem = ({ note }: any) => (
  <View style={{ 
    backgroundColor: '#fffbeb', 
    padding: 20, 
    borderRadius: 24, 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fef3c7'
  }}>
    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
      <MessageSquare color="#865400" size={20} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#865400', textTransform: 'uppercase', marginBottom: 4 }}>Note from {note.author}</Text>
      <Text style={{ fontSize: 14, color: '#2b3437', lineHeight: 20, fontStyle: 'italic' }}>"{note.text}"</Text>
      <Text style={{ fontSize: 10, color: '#737c7f', marginTop: 8 }}>{note.time}</Text>
    </View>
  </View>
);

const FileItem = ({ file }: any) => (
  <TouchableOpacity 
    style={{ 
      backgroundColor: 'white', 
      padding: 16, 
      borderRadius: 20, 
      flexDirection: 'row', 
      alignItems: 'center', 
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#f1f4f6'
    }}
  >
    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: file.type === 'pdf' ? '#fee2e2' : '#dcfce7', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
      {file.type === 'pdf' ? <FileText color="#ef4444" size={24} /> : <Book color="#22c55e" size={24} />}
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#2b3437' }} numberOfLines={1}>{file.name}</Text>
      <Text style={{ fontSize: 11, color: '#737c7f', marginTop: 2 }}>{file.sharedBy} • {file.size}</Text>
    </View>
    <Download size={18} color="#0055d4" />
  </TouchableOpacity>
);

const HomeworkItem = ({ homework, label, onPress }: any) => (
  <TouchableOpacity 
    onPress={onPress}
    style={{
      backgroundColor: 'white',
      padding: 16,
      borderRadius: 24,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#f1f4f6',
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.02,
      shadowRadius: 8,
      elevation: 1
    }}
  >
    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8f9fa', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
      <Clock size={20} color="#737c7f" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#2b3437' }}>{homework.title}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
        <CalendarIcon size={12} color="#737c7f" />
        <Text style={{ fontSize: 11, color: '#737c7f', marginLeft: 4 }}>{label}</Text>
      </View>
    </View>
    <View style={{ 
      paddingHorizontal: 10, 
      paddingVertical: 4, 
      borderRadius: 10, 
      backgroundColor: homework.isUrgent ? '#fee2e2' : '#f0fdf4' 
    }}>
      <Text style={{ 
        fontSize: 10, 
        fontWeight: 'bold', 
        color: homework.isUrgent ? '#ef4444' : '#22c55e' 
      }}>
        {homework.isUrgent ? 'URGENT' : 'PENDING'}
      </Text>
    </View>
  </TouchableOpacity>
);

export const HomeScreen = ({ navigation }: any) => {
  const { selectedChildId, children } = useAppStore();
  const selectedChild = children.find(c => c.id === selectedChildId);
  const [selectedDate, setSelectedDate] = React.useState('25');
  const [showPicker, setShowPicker] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [showAlert, setShowAlert] = React.useState(true);
  
  // Animation for In-App Notification
  const slideAnim = React.useRef(new Animated.Value(-200)).current;
  const [showPush, setShowPush] = React.useState(false);

  const simulatePush = () => {
    setShowPush(true);
    Animated.spring(slideAnim, {
      toValue: 20,
      useNativeDriver: true,
      tension: 40,
      friction: 7
    }).start();

    // Auto-hide after 5 seconds
    setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: -200,
        duration: 500,
        useNativeDriver: true
      }).start(() => setShowPush(false));
    }, 5000);
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setShowAlert(true);
      setRefreshing(false);
    }, 1500);
  }, []);

  // Calendar View State
  const [viewingMonth, setViewingMonth] = React.useState(3); // 0-indexed (3 = April)
  const [viewingYear, setViewingYear] = React.useState(2026);

  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  const changeMonth = (delta: number) => {
    let newMonth = viewingMonth + delta;
    let newYear = viewingYear;

    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }

    const isWithinAcademicYear = 
      (newYear === 2025 && newMonth >= 8) || 
      (newYear === 2026 && newMonth <= 5);

    if (isWithinAcademicYear) {
      setViewingMonth(newMonth);
      setViewingYear(newYear);
    }
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const dates = [
    { day: 'Mon', date: '23' },
    { day: 'Tue', date: '24' },
    { day: 'Wed', date: '25' },
    { day: 'Thu', date: '26' },
    { day: 'Fri', date: '27' },
    { day: 'Sat', date: '28' },
  ];

  const sessionsByDate: any = {
    '23': [{ id: 1, subject: 'Mathematics', room: 'Room 101', time: '08:00 - 10:00', attendance: 'Pres', icon: Calculator, color: '#0055d4' }],
    '24': [{ id: 1, subject: 'History', room: 'Room 305', time: '08:00 - 10:00', attendance: 'Rtr', icon: Clock, color: '#865400' }],
    '25': [{ id: 1, subject: 'Mathematics', room: 'Room 101', time: '08:00 - 10:00', attendance: 'Pres', icon: Book, color: '#006d4a' }],
    '26': [{ id: 1, subject: 'English', room: 'Room 201', time: '08:00 - 10:00', attendance: 'Pres', icon: Languages, color: '#0055d4' }],
    '27': [{ id: 1, subject: 'Biology', room: 'Lab 3', time: '08:00 - 10:00', attendance: 'Pres', icon: Microscope, color: '#006d4a' }],
    '28': [{ id: 1, subject: 'Revision', room: 'Library', time: '08:00 - 10:00', attendance: 'Pres', icon: Book, color: '#737c7f' }],
  };

  const currentSessions = sessionsByDate[selectedDate] || [];

  const homeworkDueTodayByDate: any = {
    '25': [{ id: 101, title: 'Calculus Assignment 4', dueDate: 'Apr 25, 2026', isUrgent: true, assignedDate: 'Apr 22, 2026' }],
  };

  const homeworkGivenTodayByDate: any = {
    '25': [{ id: 201, title: 'New Physics Lab: Optics', dueDate: 'Apr 28, 2026', isUrgent: false, assignedDate: 'Apr 25, 2026' }],
  };

  const currentDueHomework = homeworkDueTodayByDate[selectedDate] || [];
  const currentGivenHomework = homeworkGivenTodayByDate[selectedDate] || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }} edges={['top']}>
      {/* Animated Push Notification Banner */}
      <Animated.View style={{
        position: 'absolute',
        top: 0,
        left: 20,
        right: 20,
        zIndex: 1000,
        transform: [{ translateY: slideAnim }],
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#f1f4f6'
      }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#0055d408', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
          <Image 
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }} 
            style={{ width: 24, height: 24 }} 
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#0055d4' }}>SnapSchool Admin</Text>
          <Text style={{ fontSize: 14, color: '#2b3437', marginTop: 2 }} numberOfLines={2}>
            Nouvelle annonce: Réunion des parents ce samedi à 10h.
          </Text>
        </View>
        <TouchableOpacity onPress={() => {
          Animated.timing(slideAnim, { toValue: -200, duration: 300, useNativeDriver: true }).start(() => setShowPush(false));
        }}>
          <X size={20} color="#737c7f" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0055d4']} tintColor="#0055d4" />
        }
      >
        <View style={{ paddingBottom: 120, paddingHorizontal: 20 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 28 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, overflow: 'hidden', borderWidth: 2, borderColor: '#0055d410' }}>
                 <Image source={{ uri: 'https://i.pravatar.cc/100?u=boy' }} style={{ width: '100%', height: '100%' }} />
              </View>
              <View style={{ marginLeft: 16 }}>
                <Text style={{ fontSize: 24, color: '#2b3437', fontWeight: '500' }}>Bonjour, <Text style={{ fontWeight: 'bold' }}>Ahmed!</Text></Text>
              </View>
            </View>
            <TouchableOpacity 
              onPress={simulatePush}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
            >
              <Bell size={20} color="#0055d4" />
              <View style={{ position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 2, borderColor: 'white' }} />
            </TouchableOpacity>
          </View>

          {/* New Admin Notifications / Alerts Section */}
          {showAlert && (
            <View style={{ marginBottom: 32 }}>
              <View style={{ backgroundColor: '#fff7ed', padding: 20, borderRadius: 28, borderWidth: 1, borderColor: '#ffedd5', shadowColor: '#f97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 }}>
                <TouchableOpacity onPress={() => setShowAlert(false)} style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, padding: 4 }}>
                  <X size={18} color="#9a3412" />
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#ffedd5', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <AlertCircle size={18} color="#f97316" />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: '#9a3412', textTransform: 'uppercase', letterSpacing: 0.5 }}>Important Message</Text>
                </View>
                <Text style={{ fontSize: 15, color: '#431407', lineHeight: 22, fontWeight: '500' }}>
                  Dear <Text style={{ fontWeight: 'bold' }}>M. Selmi</Text>, please note that the tuition fees for <Text style={{ fontWeight: 'bold' }}>Ahmed</Text> (Amount: <Text style={{ fontWeight: 'bold', color: '#ea580c' }}>450.00 TND</Text>) are now due. Please settle at your earliest convenience.
                </Text>
              </View>
            </View>
          )}

          {/* Schedule Section */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
             <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2b3437' }}>Schedule</Text>
             <TouchableOpacity onPress={() => setShowPicker(true)} style={{ padding: 8, backgroundColor: '#f1f4f6', borderRadius: 12 }}>
               <CalendarIcon size={20} color="#0055d4" />
             </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 32 }} contentContainerStyle={{ paddingVertical: 10 }}>
            {dates.map((d) => (
              <DateItem key={d.date} day={d.day} date={d.date} active={selectedDate === d.date} onPress={() => setSelectedDate(d.date)} />
            ))}
          </ScrollView>

          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2b3437' }}>Today's Sessions</Text>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#586064' }}>50%</Text>
            </View>
            <View style={{ width: '100%', height: 10, backgroundColor: '#e2e9ec', borderRadius: 5, overflow: 'hidden' }}>
              <View style={{ width: '50%', height: '100%', backgroundColor: '#0055d4', borderRadius: 5 }} />
            </View>
          </View>

          <View style={{ marginBottom: 32 }}>
            {currentSessions.map((session: any) => <SessionItem key={session.id} session={session} />)}
          </View>

          {currentGivenHomework.length > 0 && (
            <View style={{ marginBottom: 32 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Clock size={20} color="#2b3437" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2b3437' }}>Tasks Given Today</Text>
              </View>
              {currentGivenHomework.map((item: any) => (
                <HomeworkItem key={item.id} homework={item} label={`Due: ${item.dueDate}`} onPress={() => navigation.navigate('HomeworkDetail', { homework: item })} />
              ))}
            </View>
          )}

          {currentDueHomework.length > 0 && (
            <View style={{ marginBottom: 32 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <BookOpen size={20} color="#2b3437" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2b3437' }}>Tasks to Submit Today</Text>
              </View>
              {currentDueHomework.map((item: any) => (
                <HomeworkItem key={item.id} homework={item} label="Submit Today" onPress={() => navigation.navigate('HomeworkDetail', { homework: item })} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Calendar Picker Modal */}
      <Modal visible={showPicker} transparent={true} animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 60 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 22, fontWeight: 'black', color: '#2b3437' }}>Academic Calendar</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, backgroundColor: '#f8f9fa', padding: 12, borderRadius: 16 }}>
              <TouchableOpacity onPress={() => changeMonth(-1)} style={{ padding: 4 }}><ChevronLeft size={24} color="#0055d4" /></TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2b3437' }}>{months[viewingMonth]}</Text>
                <Text style={{ fontSize: 12, color: '#737c7f', fontWeight: 'bold' }}>{viewingYear}</Text>
              </View>
              <TouchableOpacity onPress={() => changeMonth(1)} style={{ padding: 4 }}><ChevronRight size={24} color="#0055d4" /></TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
              {Array.from({ length: getDaysInMonth(viewingMonth, viewingYear) }, (_, i) => i + 1).map((day) => {
                const dayStr = day.toString();
                const isSelected = selectedDate === dayStr && viewingMonth === 3;
                const hasData = viewingMonth === 3 && ['23', '24', '25', '26', '27', '28'].includes(dayStr);
                return (
                  <TouchableOpacity key={day} onPress={() => { if (hasData) { setSelectedDate(dayStr); setShowPicker(false); } }} style={{ width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginVertical: 4, borderRadius: 12, backgroundColor: isSelected ? '#0055d4' : 'transparent', borderWidth: hasData && !isSelected ? 1 : 0, borderColor: '#0055d440', opacity: (viewingMonth >= 8 || viewingMonth <= 5) ? 1 : 0.3 }}>
                    <Text style={{ fontSize: 14, fontWeight: isSelected || hasData ? 'bold' : 'normal', color: isSelected ? 'white' : hasData ? '#0055d4' : '#2b3437' }}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
