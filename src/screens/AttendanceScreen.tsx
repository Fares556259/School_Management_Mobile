import React, { useEffect, useState } from 'react';
import { RefreshControl, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Calendar, AlertCircle, CheckCircle2, Clock, MessageSquare, Filter, FileUp, Camera, Star } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '../store/useAppStore';
import { studentService, uiService } from '../services/api';
import { AttendanceHistoryDay } from '../types';
import { GlobalHeader } from '../components/GlobalHeader';

const STATUS_MAP = {
  PRESENT: { label: 'Present', color: '#22c55e', bg: '#f0fdf4', icon: CheckCircle2 },
  ABSENT: { label: 'Absent', color: '#ef4444', bg: '#fef2f2', icon: AlertCircle },
  LATE: { label: 'Late', color: '#f59e0b', bg: '#fffbeb', icon: Clock },
};

const AttendanceHistoryItem = ({ day, onJustify }: { day: AttendanceHistoryDay, onJustify: (sessionId: number) => void }) => {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = STATUS_MAP[day.status] || STATUS_MAP.PRESENT;
  const Icon = statusConfig.icon;
  const date = new Date(day.date);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const dayNum = date.getDate();

  return (
    <View style={{ marginBottom: 12 }}>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
        style={{
          backgroundColor: 'white',
          padding: 16,
          borderRadius: 24,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.03,
          shadowRadius: 10,
          elevation: 2,
          borderWidth: 1,
          borderColor: expanded ? statusConfig.color + '40' : '#f1f4f6',
        }}
      >
        <View style={{ 
          width: 50, 
          height: 50, 
          borderRadius: 16, 
          backgroundColor: '#f8f9fa', 
          alignItems: 'center', 
          justifyContent: 'center',
          marginRight: 16,
          borderWidth: 1,
          borderColor: '#e5e7eb'
        }}>
          <Text style={{ fontSize: 10, fontWeight: '900', color: '#737c7f', textTransform: 'uppercase' }}>{dayName}</Text>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2b3437' }}>{dayNum}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#2b3437' }}>
            {statusConfig.label}
          </Text>
          <Text style={{ fontSize: 11, color: '#737c7f', marginTop: 2 }}>
            {day.sessions.length} {day.sessions.length === 1 ? 'Session' : 'Sessions'} recorded
          </Text>
        </View>

        <View style={{ 
          paddingHorizontal: 12, 
          paddingVertical: 6, 
          borderRadius: 12, 
          backgroundColor: statusConfig.bg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6
        }}>
          <Icon size={14} color={statusConfig.color} />
          <Text style={{ color: statusConfig.color, fontSize: 11, fontWeight: 'bold' }}>
            {day.status}
          </Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={{ 
          marginTop: -12, 
          paddingTop: 24, 
          paddingBottom: 16, 
          paddingHorizontal: 20, 
          backgroundColor: '#f8f9fa', 
          borderBottomLeftRadius: 24, 
          borderBottomRightRadius: 24,
          zIndex: -1,
          borderWidth: 1,
          borderTopWidth: 0,
          borderColor: '#f1f4f6'
        }}>
          {day.sessions.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#586064', fontWeight: '600' }}>{s.subject}</Text>
                  {(s as any).score > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8, backgroundColor: '#fffbeb', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <Star size={10} color="#f59e0b" fill="#f59e0b" />
                      <Text style={{ fontSize: 10, fontWeight: '900', color: '#f59e0b', marginLeft: 4 }}>{(s as any).score}/5</Text>
                    </View>
                  )}
                </View>
                {s.status === 'ABSENT' && (
                  <TouchableOpacity 
                    onPress={() => onJustify(s.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}
                  >
                    <FileUp size={12} color="#0055d4" />
                    <Text style={{ fontSize: 11, color: '#0055d4', fontWeight: 'bold', marginLeft: 4 }}>Justify this absence</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={{ fontSize: 12, color: STATUS_MAP[s.status]?.color || '#9ca3af', fontWeight: 'bold' }}>{s.status}</Text>
            </View>
          ))}
          
          {day.notes.length > 0 && (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#737c7f', marginBottom: 6, textTransform: 'uppercase' }}>Remarks</Text>
              {day.notes.map((n, i) => (
                <View key={i} style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, color: '#2b3437', fontStyle: 'italic', lineHeight: 18 }}>
                    "{n.text}"
                  </Text>
                  <Text style={{ fontSize: 10, color: '#0055d4', marginTop: 2, fontWeight: 'bold' }}>— {n.author}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export const AttendanceScreen = ({ navigation }: any) => {
  const { selectedChildId } = useAppStore();
  const [history, setHistory] = useState<AttendanceHistoryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = async () => {
    if (!selectedChildId) return;
    setLoading(true);
    const data = await studentService.fetchAttendanceHistory(selectedChildId);
    setHistory(data);
    setLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, [selectedChildId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };
  
  const handleJustify = async (sessionId: number) => {
    try {
      // 1. Pick Image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });

      if (result.canceled || !result.assets[0].uri) return;

      const uri = result.assets[0].uri;
      setLoading(true);

      // 2. Upload Image
      const uploadRes = await uiService.uploadImage(uri, 'student', selectedChildId!);
      
      // 3. Justify in DB
      await studentService.justifyAttendance(sessionId, uploadRes.url, "Parent uploaded medical certificate via mobile app.");
      
      // 4. Reload
      await loadHistory();
      alert("Success! Your justification has been submitted for review.");
    } catch (error) {
      console.error("Justification error:", error);
      alert("Failed to submit justification. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const totalAbsences = history.filter(d => d.status === 'ABSENT').length;
  const totalLates = history.filter(d => d.status === 'LATE').length;
  const totalPresences = history.filter(d => d.status === 'PRESENT').length;
  const last30Days = history.filter(d => (new Date().getTime() - new Date(d.date).getTime()) < 30 * 24 * 60 * 60 * 1000);
  const monthlyPresentCount = last30Days.reduce((acc, curr) => acc + (curr.status === 'PRESENT' ? 1 : 0), 0);
  const monthlyTotalCount = last30Days.length || 1;
  const monthlyAvg = Math.round((monthlyPresentCount / monthlyTotalCount) * 100);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Shared Global Header */}
      <GlobalHeader navigation={navigation} showBack />

      <View style={{ paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 24, fontWeight: '900', color: '#2b3437' }}>Attendance</Text>
        <TouchableOpacity style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 }}>
          <Filter color="#2b3437" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0055d4']} tintColor="#0055d4" />}
      >
        {/* Trend Card */}
        <View style={{ backgroundColor: '#0055d4', borderRadius: 32, padding: 24, marginBottom: 24, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>Performance</Text>
              <Text style={{ fontSize: 32, fontWeight: '900', color: 'white', marginTop: 4 }}>{monthlyAvg}%</Text>
              <Text style={{ fontSize: 13, color: 'white', opacity: 0.9, marginTop: 4 }}>Attendance in last 30 days</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 16, borderRadius: 20 }}>
              <CheckCircle2 color="white" size={32} />
            </View>
          </View>
        </View>

        {/* Summary Dashboard */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 32 }}>
          <View style={{ flex: 1, backgroundColor: '#f0fdf4', padding: 12, borderRadius: 20, borderLeftWidth: 4, borderLeftColor: '#22c55e' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#166534' }}>{totalPresences}</Text>
            <Text style={{ fontSize: 10, color: '#22c55e', fontWeight: 'bold', textTransform: 'uppercase' }}>Presences</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#fef2f2', padding: 12, borderRadius: 20, borderLeftWidth: 4, borderLeftColor: '#ef4444' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#b91c1c' }}>{totalAbsences}</Text>
            <Text style={{ fontSize: 10, color: '#ef4444', fontWeight: 'bold', textTransform: 'uppercase' }}>Absences</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#fffbeb', padding: 12, borderRadius: 20, borderLeftWidth: 4, borderLeftColor: '#f59e0b' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#92400e' }}>{totalLates}</Text>
            <Text style={{ fontSize: 10, color: '#f59e0b', fontWeight: 'bold', textTransform: 'uppercase' }}>Lates</Text>
          </View>
        </View>

        <Text style={{ fontSize: 16, fontWeight: '900', color: '#2b3437', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
          Recent Activity
        </Text>

        {loading ? (
          <View style={{ gap: 12 }}>
             {[1,2,3,4].map(i => (
                <View key={i} style={{ height: 80, borderRadius: 24, backgroundColor: '#e2e9ec', opacity: 0.6 }} />
             ))}
          </View>
        ) : history.filter(d => d.status !== 'PRESENT').length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Calendar size={64} color="#d1d5db" style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: 16, color: '#737c7f', fontWeight: 'bold' }}>No recent absences or lates</Text>
            <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 4 }}>Attendance records are all clear!</Text>
          </View>
        ) : (
          history.filter(d => d.status !== 'PRESENT').map((day, idx) => (
            <AttendanceHistoryItem key={idx} day={day} onJustify={handleJustify} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
