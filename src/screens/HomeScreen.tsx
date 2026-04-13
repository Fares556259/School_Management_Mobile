import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Book, Microscope, Clock, Globe, Palette } from 'lucide-react-native';
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
      borderColor: attendanceColor + '40', // 25% opacity
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

  const sessions = [
    { id: 1, subject: 'Mathematics', room: 'Room 101', time: '08:00 - 10:00', attendance: 'Pres', icon: Book, color: '#006d4a' },
    { id: 2, subject: 'Science', room: 'Lab 2', time: '10:00 - 12:00', attendance: 'Abs', icon: Microscope, color: '#0055d4' },
    { id: 3, subject: 'History', room: 'Room 305', time: '12:00 - 14:00', attendance: 'Rtr', icon: Clock, color: '#865400' },
  ];

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
          <View>
            {sessions.map(session => <SessionItem key={session.id} session={session} />)}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
