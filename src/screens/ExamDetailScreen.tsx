import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Calendar, Clock, MapPin, User, Info, CheckCircle2, AlertCircle } from 'lucide-react-native';

export const ExamDetailScreen = ({ route, navigation }: any) => {
  const { exam } = route.params;

  // Mock details for the exam
  const examDetails = {
    teacher: 'Dr. Sarah Mitchell',
    location: 'Building B - Hall 4',
    seatNumber: 'B-12',
    duration: '120 Minutes',
    weight: '35% of Final Grade',
    instructions: 'Please arrive 15 minutes before the start time. No digital devices allowed. Non-programmable calculators are permitted for this session.',
    materials: [
      { name: 'Student ID Card', required: true },
      { name: 'Non-programmable Calculator', required: true },
      { name: 'Black or Blue Pens', required: true },
      { name: 'Geometric Set', required: false },
    ]
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f4f6' }}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#f8f9fa' }}
        >
          <ChevronLeft color="#2b3437" size={24} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2b3437', marginLeft: 12 }}>Exam Details</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        {/* Subject Header */}
        <View style={{ marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: exam.bgColor, alignItems: 'center', justifyContent: 'center', marginRight: 20 }}>
              <exam.icon color={exam.accentColor} size={32} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 24, fontWeight: 'black', color: '#2b3437' }}>{exam.subject}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <User size={14} color="#737c7f" />
                <Text style={{ fontSize: 13, color: '#737c7f', marginLeft: 4 }}>{examDetails.teacher}</Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {exam.tags.map((tag: string, i: number) => (
              <View key={i} style={{ backgroundColor: '#f1f4f6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#2b3437', textTransform: 'uppercase' }}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Info Grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
          <View style={{ backgroundColor: '#f8f9fa', borderRadius: 24, padding: 16, width: '48%' }}>
            <Calendar size={18} color="#0055d4" style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 11, color: '#737c7f', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 }}>Date & Time</Text>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#2b3437' }}>April 25, 2024</Text>
            <Text style={{ fontSize: 12, color: '#586064', marginTop: 2 }}>{exam.time}</Text>
          </View>

          <View style={{ backgroundColor: '#f8f9fa', borderRadius: 24, padding: 16, width: '48%' }}>
            <Clock size={18} color="#006d4a" style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 11, color: '#737c7f', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 }}>Duration</Text>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#2b3437' }}>{examDetails.duration}</Text>
            <Text style={{ fontSize: 12, color: '#586064', marginTop: 2 }}>{examDetails.weight}</Text>
          </View>

          <View style={{ backgroundColor: '#f8f9fa', borderRadius: 24, padding: 16, width: '48%' }}>
            <MapPin size={18} color="#865400" style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 11, color: '#737c7f', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 }}>Location</Text>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#2b3437' }}>{examDetails.location}</Text>
            <Text style={{ fontSize: 12, color: '#586064', marginTop: 2 }}>Seat: {examDetails.seatNumber}</Text>
          </View>

          <View style={{ backgroundColor: '#f8f9fa', borderRadius: 24, padding: 16, width: '48%' }}>
            <Info size={18} color="#0055d4" style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 11, color: '#737c7f', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 }}>Status</Text>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#0055d4' }}>CONFIRMED</Text>
            <Text style={{ fontSize: 12, color: '#586064', marginTop: 2 }}>Ticket No: 982-1</Text>
          </View>
        </View>

        {/* Instructions */}
        <View style={{ marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
             <AlertCircle size={20} color="#2b3437" />
             <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2b3437', marginLeft: 8 }}>Preparation Info</Text>
          </View>
          <View style={{ backgroundColor: '#fffbeb', borderLeftWidth: 4, borderLeftColor: '#d97706', padding: 20, borderRadius: 16 }}>
            <Text style={{ fontSize: 14, color: '#92400e', lineHeight: 22 }}>
              {examDetails.instructions}
            </Text>
          </View>
        </View>

        {/* Materials Needed */}
        <View>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2b3437', marginBottom: 16 }}>Required Materials</Text>
          <View style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#f1f4f6', borderRadius: 24, overflow: 'hidden' }}>
            {examDetails.materials.map((item, index) => (
              <View 
                key={index} 
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  padding: 16, 
                  borderBottomWidth: index === examDetails.materials.length - 1 ? 0 : 1, 
                  borderBottomColor: '#f1f4f6' 
                }}
              >
                <CheckCircle2 color={item.required ? '#16a34a' : '#d1d5db'} size={20} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: item.required ? '600' : '400', color: '#2b3437' }}>{item.name}</Text>
                </View>
                {item.required && (
                  <View style={{ backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#16a34a', textTransform: 'uppercase' }}>Essential</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
