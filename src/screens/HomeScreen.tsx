import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Book, Microscope, Clock, Globe, Palette, Calculator, Music, Languages, MessageSquare, AlertCircle } from 'lucide-react-native';
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
    backgroundColor: '#fffbeb', // Light amber background
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

export const HomeScreen = () => {
  const { selectedChildId, children } = useAppStore();
  const selectedChild = children.find(c => c.id === selectedChildId);
  const [selectedDate, setSelectedDate] = React.useState('25');

  const dates = [
    { day: 'Mon', date: '23' },
    { day: 'Tue', date: '24' },
    { day: 'Wed', date: '25' },
    { day: 'Thu', date: '26' },
    { day: 'Fri', date: '27' },
    { day: 'Sat', date: '28' },
  ];

  const sessionsByDate: any = {
    '23': [
      { id: 1, subject: 'Mathematics', room: 'Room 101', time: '08:00 - 10:00', attendance: 'Pres', icon: Calculator, color: '#0055d4' },
      { id: 2, subject: 'French', room: 'Room 204', time: '10:00 - 12:00', attendance: 'Pres', icon: Book, color: '#865400' },
      { id: 3, subject: 'Physics', room: 'Lab 1', time: '12:00 - 14:00', attendance: 'Pres', icon: Microscope, color: '#006d4a' },
    ],
    '24': [
      { id: 1, subject: 'History', room: 'Room 305', time: '08:00 - 10:00', attendance: 'Rtr', icon: Clock, color: '#865400' },
      { id: 2, subject: 'Geography', room: 'Room 202', time: '10:00 - 12:00', attendance: 'Pres', icon: Globe, color: '#006d4a' },
      { id: 3, subject: 'Arabic', room: 'Room 108', time: '12:00 - 14:00', attendance: 'Abs', icon: Languages, color: '#0055d4' },
    ],
    '25': [
      { id: 1, subject: 'Mathematics', room: 'Room 101', time: '08:00 - 10:00', attendance: 'Pres', icon: Book, color: '#006d4a' },
      { id: 2, subject: 'Science', room: 'Lab 2', time: '10:00 - 12:00', attendance: 'Abs', icon: Microscope, color: '#0055d4' },
      { id: 3, subject: 'History', room: 'Room 305', time: '12:00 - 14:00', attendance: 'Rtr', icon: Clock, color: '#865400' },
    ],
    '26': [
      { id: 1, subject: 'English', room: 'Room 201', time: '08:00 - 10:00', attendance: 'Pres', icon: Languages, color: '#0055d4' },
      { id: 2, subject: 'Music', room: 'Studio B', time: '10:00 - 12:00', attendance: 'Pres', icon: Music, color: '#865400' },
      { id: 3, subject: 'Sports', room: 'Gymnasium', time: '12:00 - 14:00', attendance: 'Exclu', icon: Globe, color: '#4b5563' },
    ],
    '27': [
      { id: 1, subject: 'Biology', room: 'Lab 3', time: '08:00 - 10:00', attendance: 'Pres', icon: Microscope, color: '#006d4a' },
      { id: 2, subject: 'Art', room: 'Studio A', time: '10:00 - 12:00', attendance: 'Rtr', icon: Palette, color: '#f59e0b' },
      { id: 3, subject: 'IT', room: 'Computer Lab', time: '12:00 - 14:00', attendance: 'Pres', icon: Globe, color: '#0055d4' },
    ],
    '28': [
      { id: 1, subject: 'Revision', room: 'Library', time: '08:00 - 10:00', attendance: 'Pres', icon: Book, color: '#737c7f' },
      { id: 2, subject: 'Project Lab', room: 'Room 401', time: '10:00 - 12:00', attendance: 'Pres', icon: Microscope, color: '#006d4a' },
      { id: 3, subject: 'Debate', room: 'Amphitheater', time: '12:00 - 14:00', attendance: 'Pres', icon: Languages, color: '#865400' },
    ],
  };

  const notesByDate: any = {
    '23': [{ id: 1, author: 'Mr. Khalid', text: 'Sami participatory well in Mathematics discussion today.', time: '09:30 AM' }],
    '24': [{ id: 1, author: 'Admin', text: 'Please ensure history textbook is brought tomorrow.', time: '02:00 PM' }],
    '25': [
      { id: 1, author: 'Mme. Sarah', text: 'he keeps talking he s not focused during the science lab.', time: '11:15 AM' },
      { id: 2, author: 'M. Ahmed', text: 'Strong improvement in geometric calculations.', time: '09:00 AM' }
    ],
    '26': [{ id: 1, author: 'Physical Ed', text: 'Reminder: Sports gear required for Gymnasium sessions.', time: '08:00 AM' }],
  };

  const currentSessions = sessionsByDate[selectedDate] || [];
  const currentNotes = notesByDate[selectedDate] || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingBottom: 120, paddingHorizontal: 20 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 28 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, overflow: 'hidden', borderWidth: 2, borderColor: '#0055d410' }}>
               <Image 
                source={{ uri: 'https://i.pravatar.cc/100?u=boy' }} 
                style={{ width: '100%', height: '100%' }} 
              />
            </View>
            <View style={{ marginLeft: 16 }}>
              <Text style={{ fontSize: 24, color: '#2b3437', fontWeight: '500' }}>Bonjour, <Text style={{ fontWeight: 'bold' }}>Ahmed!</Text></Text>
            </View>
          </View>

          {/* Date Selector */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={{ marginBottom: 32 }} 
            contentContainerStyle={{ paddingVertical: 10 }}
          >
            {dates.map((d) => (
              <DateItem 
                key={d.date}
                day={d.day} 
                date={d.date} 
                active={selectedDate === d.date} 
                onPress={() => setSelectedDate(d.date)}
              />
            ))}
          </ScrollView>

          {/* Progress Section */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2b3437' }}>Today's Sessions</Text>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#586064' }}>50%</Text>
            </View>
            <View style={{ width: '100%', height: 10, backgroundColor: '#e2e9ec', borderRadius: 5, overflow: 'hidden' }}>
              <View style={{ width: '50%', height: '100%', backgroundColor: '#0055d4', borderRadius: 5 }} />
            </View>
          </View>

          {/* Sessions List */}
          <View style={{ marginBottom: 32 }}>
            {currentSessions.map((session: any) => <SessionItem key={session.id} session={session} />)}
          </View>

          {/* Administrative Notes Section */}
          {currentNotes.length > 0 && (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <AlertCircle size={20} color="#2b3437" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2b3437' }}>Teacher Remarks</Text>
              </View>
              {currentNotes.map((note: any) => <NoteItem key={note.id} note={note} />)}
            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
