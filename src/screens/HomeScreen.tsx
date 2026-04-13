import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Modal, Platform, RefreshControl, Animated, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Book, Microscope, Clock, Globe, Palette, Calculator, Music, Languages, MessageSquare, AlertCircle, FileText, Download, Briefcase, Calendar as CalendarIcon, X, ChevronLeft, ChevronRight, BookOpen, Bell, Coffee, Info } from 'lucide-react-native';
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

const EmptyPlaceholder = ({ text, icon: Icon }: any) => (
  <View style={{ 
    backgroundColor: '#f8f9fa', 
    padding: 24, 
    borderRadius: 24, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 1, 
    borderColor: '#f1f4f6',
    borderStyle: 'dashed',
    marginBottom: 16 
  }}>
    <Icon color="#d1d5db" size={32} style={{ marginBottom: 8 }} />
    <Text style={{ fontSize: 14, color: '#737c7f', fontWeight: '500' }}>{text}</Text>
  </View>
);

const SessionItem = ({ session }: any) => {
  const Icon = session.icon;
  const getAttendanceColor = (status: string) => {
    switch (status) {
      case 'Pres': return '#22c55e';
      case 'Abs': return '#ef4444';
      case 'Rtr': return '#f59e0b';
      case 'Exclu': return '#4b5563';
      default: return '#737c7f';
    }
  };
  const attendanceColor = getAttendanceColor(session.attendance);
  return (
    <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 24, flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: attendanceColor + '40', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 }}>
      <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#f8f9fa', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}><Icon color={session.color} size={24} /></View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#2b3437' }}>{session.subject}</Text>
        <Text style={{ fontSize: 11, color: '#737c7f', marginTop: 2 }}>{session.room}</Text>
        <Text style={{ fontSize: 11, color: '#737c7f' }}>{session.time}</Text>
      </View>
      <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: attendanceColor }}><Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{session.attendance}</Text></View>
    </View>
  );
};

const NoteItem = ({ note }: any) => (
  <View style={{ backgroundColor: '#fffbeb', padding: 20, borderRadius: 24, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, borderWidth: 1, borderColor: '#fef3c7' }}>
    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}><MessageSquare color="#865400" size={20} /></View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#865400', textTransform: 'uppercase', marginBottom: 4 }}>Note from {note.author}</Text>
      <Text style={{ fontSize: 14, color: '#2b3437', lineHeight: 20, fontStyle: 'italic' }}>"{note.text}"</Text>
      <Text style={{ fontSize: 10, color: '#737c7f', marginTop: 8 }}>{note.time}</Text>
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

export const HomeScreen = ({ navigation }: any) => {
  const { selectedChildId, children } = useAppStore();
  const selectedChild = children.find(c => c.id === selectedChildId);
  const [selectedDate, setSelectedDate] = React.useState('25');
  const [showPicker, setShowPicker] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [showAlert, setShowAlert] = React.useState(true);
  
  const slideAnim = React.useRef(new Animated.Value(-200)).current;

  const simulatePush = () => {
    Animated.spring(slideAnim, { toValue: Platform.OS === 'ios' ? 60 : 20, useNativeDriver: true, tension: 50, friction: 8 }).start();
    setTimeout(() => { Animated.timing(slideAnim, { toValue: -200, duration: 400, useNativeDriver: true }).start(); }, 5000);
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => { setShowAlert(true); setRefreshing(false); }, 1500);
  }, []);

  const [viewingMonth, setViewingMonth] = React.useState(3);
  const [viewingYear, setViewingYear] = React.useState(2026);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const changeMonth = (delta: number) => {
    let newMonth = viewingMonth + delta;
    let newYear = viewingYear;
    if (newMonth > 11) { newMonth = 0; newYear++; } else if (newMonth < 0) { newMonth = 11; newYear--; }
    if ((newYear === 2025 && newMonth >= 8) || (newYear === 2026 && newMonth <= 5)) { setViewingMonth(newMonth); setViewingYear(newYear); }
  };
  const getDaysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();

  const dates = [{ day: 'Mon', date: '23' }, { day: 'Tue', date: '24' }, { day: 'Wed', date: '25' }, { day: 'Thu', date: '26' }, { day: 'Fri', date: '27' }, { day: 'Sat', date: '28' }, { day: 'Sun', date: '29' }];
  const sessionsByDate: any = {
    '23': [{ id: 1, subject: 'Mathematics', room: 'Room 101', time: '08:00 - 10:00', attendance: 'Pres', icon: Calculator, color: '#0055d4' }, { id: 2, subject: 'Arabic', room: 'Room 202', time: '10:15 - 12:15', attendance: 'Pres', icon: Languages, color: '#865400' }],
    '24': [{ id: 3, subject: 'History', room: 'Room 305', time: '08:00 - 10:00', attendance: 'Rtr', icon: Clock, color: '#865400' }, { id: 4, subject: 'Geography', room: 'Room 305', time: '10:15 - 12:15', attendance: 'Pres', icon: Globe, color: '#0055d4' }],
    '25': [{ id: 5, subject: 'Mathematics', room: 'Room 101', time: '08:00 - 10:00', attendance: 'Pres', icon: Book, color: '#006d4a' }, { id: 6, subject: 'Art & Design', room: 'Studio 1', time: '13:30 - 15:30', attendance: 'Pres', icon: Palette, color: '#9333ea' }],
    '26': [{ id: 7, subject: 'English', room: 'Room 201', time: '08:00 - 10:00', attendance: 'Pres', icon: Languages, color: '#0055d4' }, { id: 8, subject: 'Physics', room: 'Lab 2', time: '10:15 - 12:15', attendance: 'Abs', icon: Microscope, color: '#ef4444' }],
    '27': [{ id: 9, subject: 'Biology', room: 'Lab 3', time: '08:00 - 10:00', attendance: 'Pres', icon: Microscope, color: '#006d4a' }, { id: 10, subject: 'Music', room: 'Music Hall', time: '14:00 - 15:30', attendance: 'Pres', icon: Music, color: '#db2777' }],
    '28': [{ id: 11, subject: 'Revision', room: 'Library', time: '09:00 - 11:00', attendance: 'Pres', icon: Book, color: '#737c7f' }, { id: 12, subject: 'Coding Club', room: 'CS Lab', time: '11:00 - 13:00', attendance: 'Pres', icon: Briefcase, color: '#0055d4' }],
    '29': []
  };
  const notesByDate: any = {
    '23': [{ id: 1, author: 'Mme. Sarah', text: 'Ahmed has started the week with great energy.', time: 'Today at 09:00' }],
    '25': [{ id: 2, author: 'M. Ben Ali', text: 'Ahmed was very participative today in solving abstract geometry problems.', time: 'Today at 10:30' }],
    '27': [{ id: 3, author: 'M. Mansour', text: 'Please ensure Ahmed brings his biology lab coat tomorrow.', time: 'Yesterday at 15:00' }]
  };
  const filesByDate: any = {
    '24': [{ id: 1, name: 'History_Project_Guide.pdf', type: 'pdf', sharedBy: 'Prof. Leila', size: '1.2 MB' }],
    '25': [{ id: 2, name: 'Geometry_Notes.pdf', type: 'pdf', sharedBy: 'Prof. Ahmed', size: '2.4 MB' }, { id: 3, name: 'Exercises_Ch3.pdf', type: 'pdf', sharedBy: 'Prof. Ahmed', size: '1.1 MB' }],
    '26': [{ id: 4, name: 'Physics_Optics_Course.pdf', type: 'pdf', sharedBy: 'Prof. Ali', size: '3.5 MB' }]
  };
  const homeworkDueTodayByDate: any = {
    '24': [{ id: 100, title: 'History Essay', dueDate: 'Apr 24, 2026', isUrgent: false, assignedDate: 'Apr 20, 2026' }],
    '25': [{ id: 101, title: 'Calculus Assignment 4', dueDate: 'Apr 25, 2026', isUrgent: true, assignedDate: 'Apr 22, 2026' }],
    '27': [{ id: 102, title: 'Biology Lab Report', dueDate: 'Apr 27, 2026', isUrgent: true, assignedDate: 'Apr 24, 2026' }]
  };
  const homeworkGivenTodayByDate: any = {
    '23': [{ id: 200, title: 'Math: Quadratic Equations', dueDate: 'Apr 26, 2026', isUrgent: false, assignedDate: 'Apr 23, 2026' }],
    '25': [{ id: 201, title: 'New Physics Lab: Optics', dueDate: 'Apr 28, 2026', isUrgent: false, assignedDate: 'Apr 25, 2026' }],
    '27': [{ id: 202, title: 'English: Creative Writing', dueDate: 'May 02, 2026', isUrgent: false, assignedDate: 'Apr 27, 2026' }]
  };

  const currentSessions = sessionsByDate[selectedDate] || [];
  const currentNotes = notesByDate[selectedDate] || [];
  const currentFiles = filesByDate[selectedDate] || [];
  const currentGivenHomework = homeworkGivenTodayByDate[selectedDate] || [];
  const currentDueHomework = homeworkDueTodayByDate[selectedDate] || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <Animated.View style={{ position: 'absolute', top: 0, left: 12, right: 12, zIndex: 10000, transform: [{ translateY: slideAnim }], backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 24, padding: 16, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 12, borderWidth: 1, borderColor: 'rgba(241, 244, 246, 0.8)' }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#0055d4', alignItems: 'center', justifyContent: 'center', marginRight: 14, shadowColor: '#0055d4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }}><Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }} style={{ width: 22, height: 22, tintColor: 'white' }} /></View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}><Text style={{ fontSize: 13, fontWeight: '800', color: '#0055d4', textTransform: 'uppercase', letterSpacing: 0.5 }}>SnapSchool Admin</Text><Text style={{ fontSize: 11, color: '#a1a8ac' }}>now</Text></View>
          <Text style={{ fontSize: 14, color: '#1a1f21', fontWeight: '600', lineHeight: 18 }} numberOfLines={2}>Nouvelle annonce: Réunion des parents ce samedi à 10h.</Text>
        </View>
        <TouchableOpacity onPress={() => Animated.timing(slideAnim, { toValue: -200, duration: 300, useNativeDriver: true }).start()} style={{ marginLeft: 10, padding: 4 }}><View style={{ backgroundColor: '#f1f4f6', borderRadius: 12, padding: 4 }}><X size={16} color="#737c7f" /></View></TouchableOpacity>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0055d4']} tintColor="#0055d4" />}>
        <View style={{ paddingBottom: 150, paddingHorizontal: 20 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 28 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, overflow: 'hidden', borderWidth: 2, borderColor: '#0055d410' }}><Image source={{ uri: 'https://i.pravatar.cc/100?u=boy' }} style={{ width: '100%', height: '100%' }} /></View>
              <View style={{ marginLeft: 16 }}><Text style={{ fontSize: 24, color: '#2b3437', fontWeight: '500' }}>Bonjour, <Text style={{ fontWeight: 'bold' }}>Ahmed!</Text></Text></View>
            </View>
            <TouchableOpacity onPress={simulatePush} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
              <Bell size={20} color="#0055d4" /><View style={{ position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 2, borderColor: 'white' }} /></TouchableOpacity>
          </View>

          {showAlert && (
            <View style={{ marginBottom: 32 }}>
              <View style={{ backgroundColor: '#fff7ed', padding: 20, borderRadius: 28, borderWidth: 1, borderColor: '#ffedd5', shadowColor: '#f97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 }}>
                <TouchableOpacity onPress={() => setShowAlert(false)} style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, padding: 4 }}><X size={18} color="#9a3412" /></TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}><View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#ffedd5', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}><AlertCircle size={18} color="#f97316" /></View><Text style={{ fontSize: 13, fontWeight: '900', color: '#9a3412', textTransform: 'uppercase', letterSpacing: 0.5 }}>Important Message</Text></View>
                <Text style={{ fontSize: 15, color: '#431407', lineHeight: 22, fontWeight: '500' }}>Dear <Text style={{ fontWeight: 'bold' }}>M. Selmi</Text>, please note that the tuition fees for <Text style={{ fontWeight: 'bold' }}>Ahmed</Text> (Amount: <Text style={{ fontWeight: 'bold', color: '#ea580c' }}>450.00 TND</Text>) are now due. Please settle at your earliest convenience.</Text>
              </View>
            </View>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}><Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2b3437' }}>Schedule</Text><TouchableOpacity onPress={() => setShowPicker(true)} style={{ padding: 8, backgroundColor: '#f1f4f6', borderRadius: 12 }}><CalendarIcon size={20} color="#0055d4" /></TouchableOpacity></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 32 }} contentContainerStyle={{ paddingVertical: 10 }}>{dates.map((d) => (<DateItem key={d.date} day={d.day} date={d.date} active={selectedDate === d.date} onPress={() => setSelectedDate(d.date)} />))}</ScrollView>

          {/* SECTION 1: TODAY'S SESSIONS */}
          <View style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2b3437' }}>Today's Sessions</Text>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#586064' }}>{selectedDate === '29' ? '0%' : '50%'}</Text>
            </View>
            <View style={{ width: '100%', height: 10, backgroundColor: '#e2e9ec', borderRadius: 5, overflow: 'hidden', marginBottom: 16 }}>
              <View style={{ width: selectedDate === '29' ? '0%' : '50%', height: '100%', backgroundColor: '#0055d4', borderRadius: 5 }} />
            </View>
          </View>
          {currentSessions.length > 0 ? (
             <View style={{ marginBottom: 32 }}>{currentSessions.map((session: any) => <SessionItem key={session.id} session={session} />)}</View>
          ) : (
             <EmptyPlaceholder text="Family Day - Enjoy your rest!" icon={Coffee} />
          )}

          {/* SECTION 2: TASKS TO SUBMIT TODAY */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <AlertCircle size={20} color="#2b3437" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2b3437' }}>Tasks to Submit Today</Text>
            </View>
            {currentDueHomework.length > 0 ? (
               currentDueHomework.map((item: any) => (<HomeworkItem key={item.id} homework={item} label="Submit Today" onPress={() => navigation.navigate('HomeworkDetail', { homework: item })} />))
            ) : (
               <EmptyPlaceholder text="No tasks to submit today." icon={Clock} />
            )}
          </View>

          {/* SECTION 3: TASKS GIVEN TODAY */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <FileText size={20} color="#2b3437" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2b3437' }}>Tasks Given Today</Text>
            </View>
            {currentGivenHomework.length > 0 ? (
               currentGivenHomework.map((item: any) => (<HomeworkItem key={item.id} homework={item} label={`Due: ${item.dueDate}`} onPress={() => navigation.navigate('HomeworkDetail', { homework: item })} />))
            ) : (
               <EmptyPlaceholder text="No new tasks given today." icon={Briefcase} />
            )}
          </View>

          {/* SECTION 4: COURSE RESOURCES */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <BookOpen size={20} color="#2b3437" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2b3437' }}>Course Resources</Text>
            </View>
            {currentFiles.length > 0 ? (
               currentFiles.map((file: any) => <FileItem key={file.id} file={file} />)
            ) : (
               <EmptyPlaceholder text="No resources shared today." icon={Info} />
            )}
          </View>

          {/* SECTION 5: TEACHER REMARKS */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <MessageSquare size={20} color="#2b3437" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2b3437' }}>Teacher Remarks</Text>
            </View>
            {currentNotes.length > 0 ? (
               currentNotes.map((note: any) => <NoteItem key={note.id} note={note} />)
            ) : (
               <EmptyPlaceholder text="No remarks for this date." icon={MessageSquare} />
            )}
          </View>
        </View>
      </ScrollView>

      <Modal visible={showPicker} transparent={true} animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 60 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}><Text style={{ fontSize: 22, fontWeight: 'black', color: '#2b3437' }}>Academic Calendar</Text></View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, backgroundColor: '#f8f9fa', padding: 12, borderRadius: 16 }}><TouchableOpacity onPress={() => changeMonth(-1)} style={{ padding: 4 }}><ChevronLeft size={24} color="#0055d4" /></TouchableOpacity><View style={{ alignItems: 'center' }}><Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2b3437' }}>{months[viewingMonth]}</Text><Text style={{ fontSize: 12, color: '#737c7f', fontWeight: 'bold' }}>{viewingYear}</Text></View><TouchableOpacity onPress={() => changeMonth(1)} style={{ padding: 4 }}><ChevronRight size={24} color="#0055d4" /></TouchableOpacity></View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }}>{Array.from({ length: getDaysInMonth(viewingMonth, viewingYear) }, (_, i) => i + 1).map((day) => { const dayStr = day.toString(); const isSelected = selectedDate === dayStr && viewingMonth === 3; const hasData = viewingMonth === 3 && ['23', '24', '25', '26', '27', '28', '29'].includes(dayStr); return (<TouchableOpacity key={day} onPress={() => { if (hasData) { setSelectedDate(dayStr); setShowPicker(false); } }} style={{ width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginVertical: 4, borderRadius: 12, backgroundColor: isSelected ? '#0055d4' : 'transparent', borderWidth: hasData && !isSelected ? 1 : 0, borderColor: '#0055d440', opacity: (viewingMonth >= 8 || viewingMonth <= 5) ? 1 : 0.3 }}><Text style={{ fontSize: 14, fontWeight: isSelected || hasData ? 'bold' : 'normal', color: isSelected ? 'white' : hasData ? '#0055d4' : '#2b3437' }}>{day}</Text></TouchableOpacity>); })}</View>
            <View style={{ marginTop: 24, padding: 16, backgroundColor: '#f1f4f6', borderRadius: 20 }}><Text style={{ fontSize: 12, color: '#737c7f', textAlign: 'center', fontWeight: '500' }}>Academic year: <Text style={{ color: '#0055d4', fontWeight: 'bold' }}>September - June</Text></Text></View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
