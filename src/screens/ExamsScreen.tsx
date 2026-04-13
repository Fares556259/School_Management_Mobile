import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Modal, StatusBar, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar as CalendarIcon, Bell, ChevronLeft, ChevronRight, BookOpen, FileText, Calculator, Microscope } from 'lucide-react-native';
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
    }}
  >
    <Text style={{ fontSize: 10, fontWeight: 'bold', color: active ? 'white' : '#586064', textTransform: 'uppercase' }}>{day}</Text>
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

const ExamCard = ({ exam }: any) => {
  const Icon = exam.icon;
  return (
    <TouchableOpacity 
      style={{
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 24,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: exam.accentColor,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2
      }}
    >
      <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: exam.bgColor, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
        <Icon color={exam.accentColor} size={24} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#2b3437' }}>{exam.subject}</Text>
          <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#737c7f', textTransform: 'uppercase' }}>{exam.time}</Text>
        </View>
        <Text style={{ fontSize: 12, color: '#586064', marginTop: 4 }} numberOfLines={2}>{exam.description}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
          {exam.tags.map((tag: string, i: number) => (
            <View key={i} style={{ backgroundColor: '#f1f4f6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginRight: 6 }}>
              <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#2b3437', textTransform: 'uppercase' }}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const ExamsScreen = () => {
  const { selectedChildId, children } = useAppStore();
  const selectedChild = children.find(c => c.id === selectedChildId);
  const [selectedDate, setSelectedDate] = React.useState('25');
  const [showPicker, setShowPicker] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

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

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const dates = [{ day: 'Mon', date: '23' }, { day: 'Tue', date: '24' }, { day: 'Wed', date: '25' }, { day: 'Thu', date: '26' }, { day: 'Fri', date: '27' }, { day: 'Sat', date: '28' }, { day: 'Sun', date: '29' }];

  const examsByDate: any = {
    '23': [{ id: 10, subject: 'Arabic Literature', time: '09:00 AM', description: 'Classical poetry and modern prose analysis.', icon: BookOpen, accentColor: '#865400', bgColor: '#fffbeb', tags: ['Poetry', 'Vocalization'] }],
    '25': [{ id: 1, subject: 'Mathematics (Algebra)', time: '10:30 AM', description: 'Quadratic equations and function limits.', icon: Calculator, accentColor: '#0055d4', bgColor: '#eff6ff', tags: ['Units 1-4', 'Calculator'] }],
    '27': [{ id: 3, subject: 'Biology', time: '01:45 PM', description: 'Genetics and molecular biology foundations.', icon: Microscope, accentColor: '#006d4a', bgColor: '#f0fdf4', tags: ['Lab Notes'] }]
  };

  const currentExams = examsByDate[selectedDate] || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f4f6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: 2, borderColor: '#0055d410' }}>
            <Image source={{ uri: 'https://i.pravatar.cc/100?u=boy' }} style={{ width: '100%', height: '100%' }} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0055d4', marginLeft: 12 }}>SnapSchool</Text>
        </View>
        <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f8f9fa', alignItems: 'center', justifyContent: 'center' }}>
          <Bell color="#737c7f" size={20} />
          <View style={{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 2, borderColor: 'white' }} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0055d4']} tintColor="#0055d4" />}
      >
        <View style={{ paddingBottom: 120, paddingHorizontal: 20 }}>
          {/* Title Section */}
          <View style={{ marginTop: 24, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#737c7f', textTransform: 'uppercase', letterSpacing: 1 }}>Academic Year 2023-24</Text>
              <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#2b3437', marginTop: 4 }}>Exams & Dates</Text>
            </View>
            <TouchableOpacity onPress={() => setShowPicker(true)} style={{ backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
              <CalendarIcon color="#0055d4" size={16} /><Text style={{ fontSize: 12, fontWeight: 'bold', color: '#2b3437', marginLeft: 8 }}>{months[viewingMonth]} {viewingYear}</Text>
            </TouchableOpacity>
          </View>

          {/* Timeline Picker */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 32 }} contentContainerStyle={{ paddingVertical: 10 }}>
            {dates.map((d) => (
              <DateItem key={d.date} day={d.day} date={d.date} active={selectedDate === d.date} onPress={() => setSelectedDate(d.date)} />
            ))}
          </ScrollView>

          {/* SECTION 1: UPCOMING EXAMS */}
          <View style={{ marginBottom: 32 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2b3437' }}>Upcoming Exams</Text>
              <View style={{ backgroundColor: '#0055d410', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#0055d4', textTransform: 'uppercase' }}>Next 14 Days</Text>
              </View>
            </View>
            {currentExams.length > 0 ? (
               currentExams.map((exam: any) => <ExamCard key={exam.id} exam={exam} />)
            ) : (
               <EmptyPlaceholder text="No exams scheduled for this date." icon={FileText} />
            )}
          </View>
        </View>
      </ScrollView>

      {/* Academic Calendar Modal */}
      <Modal visible={showPicker} transparent={true} animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 60 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}><Text style={{ fontSize: 22, fontWeight: 'black', color: '#2b3437' }}>Academic Calendar</Text></View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, backgroundColor: '#f8f9fa', padding: 12, borderRadius: 16 }}><TouchableOpacity onPress={() => changeMonth(-1)} style={{ padding: 4 }}><ChevronLeft size={24} color="#0055d4" /></TouchableOpacity><View style={{ alignItems: 'center' }}><Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2b3437' }}>{months[viewingMonth]}</Text><Text style={{ fontSize: 12, color: '#737c7f', fontWeight: 'bold' }}>{viewingYear}</Text></View><TouchableOpacity onPress={() => changeMonth(1)} style={{ padding: 4 }}><ChevronRight size={24} color="#0055d4" /></TouchableOpacity></View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }}>{Array.from({ length: getDaysInMonth(viewingMonth, viewingYear) }, (_, i) => i + 1).map((day) => { const dayStr = day.toString(); return (<TouchableOpacity key={day} onPress={() => { setSelectedDate(dayStr); setShowPicker(false); }} style={{ width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginVertical: 4, borderRadius: 12, backgroundColor: selectedDate === dayStr ? '#0055d4' : 'transparent' }}><Text style={{ fontSize: 14, color: selectedDate === dayStr ? 'white' : '#2b3437' }}>{day}</Text></TouchableOpacity>); })}</View>
            <View style={{ marginTop: 24, padding: 16, backgroundColor: '#f1f4f6', borderRadius: 20 }}><Text style={{ fontSize: 12, color: '#737c7f', textAlign: 'center', fontWeight: '500' }}>Academic year: <Text style={{ color: '#0055d4', fontWeight: 'bold' }}>September - June</Text></Text></View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
