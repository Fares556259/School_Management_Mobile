import React, { useEffect, useState } from 'react';
import { RefreshControl, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Calendar, AlertCircle, CheckCircle2, Clock, Filter, FileUp, Star } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '../store/useAppStore';
import { useLanguage } from '../context/LanguageContext';
import { studentService, uiService } from '../services/api';
import { AttendanceHistoryDay } from '../types';
import { GlobalHeader } from '../components/GlobalHeader';

const STATUS_MAP = {
  PRESENT: { label: 'Present', color: '#16a34a', bg: '#dcfce7', border: '#86efac', icon: CheckCircle2 },
  ABSENT:  { label: 'Absent',  color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', icon: AlertCircle },
  LATE:    { label: 'Late',    color: '#d97706', bg: '#fef3c7', border: '#fcd34d', icon: Clock },
};

const AttendanceHistoryItem = ({ day, onJustify }: { day: AttendanceHistoryDay, onJustify: (sessionId: number) => void }) => {
  const { getTranslatedSubject } = useLanguage();
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
        activeOpacity={0.85}
        style={{
          backgroundColor: 'white',
          padding: 16,
          borderRadius: 24,
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 2,
          borderColor: expanded ? statusConfig.color : '#e2e8f0',
          borderBottomWidth: 5,
          borderBottomColor: expanded ? statusConfig.color : '#cbd5e1',
        }}
      >
        {/* Date Box */}
        <View style={{
          width: 54, height: 54, borderRadius: 16,
          backgroundColor: '#f8fafc',
          alignItems: 'center', justifyContent: 'center',
          marginRight: 16, borderWidth: 2, borderColor: '#e2e8f0',
          borderBottomWidth: 4, borderBottomColor: '#cbd5e1'
        }}>
          <Text style={{ fontSize: 10, fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>{dayName}</Text>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#1e293b' }}>{dayNum}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '900', color: '#1e293b' }}>
            {statusConfig.label}
          </Text>
          <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '700', marginTop: 2 }}>
            {day.sessions.length} {day.sessions.length === 1 ? 'Session' : 'Sessions'}
          </Text>
        </View>

        <View style={{
          paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
          backgroundColor: statusConfig.bg, borderWidth: 2, borderColor: statusConfig.border,
          borderBottomWidth: 4, borderBottomColor: statusConfig.border,
          flexDirection: 'row', alignItems: 'center', gap: 6,
        }}>
          <Icon size={14} color={statusConfig.color} strokeWidth={3} />
          <Text style={{ color: statusConfig.color, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {day.status}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Expanded Sessions */}
      {expanded && (
        <View style={{
          marginTop: -16,
          paddingTop: 32, paddingBottom: 20, paddingHorizontal: 20,
          backgroundColor: '#f8fafc',
          borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
          zIndex: -1,
          borderWidth: 2, borderTopWidth: 0, borderColor: '#e2e8f0',
        }}>
          {day.sessions.map((s: any, i) => {
            const getStatusConfig = (status: string | null) => {
              const st = status?.toUpperCase();
              if (st === 'PRES' || st === 'PRESENT') return { label: 'Present', color: '#16a34a', bg: '#dcfce7', border: '#86efac' };
              if (st === 'ABS' || st === 'ABSENT')  return { label: 'Absent',  color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' };
              if (st === 'LATE') return { label: 'Late',    color: '#d97706', bg: '#fef3c7', border: '#fcd34d' };
              return { label: 'Pending', color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' };
            };
            const config = getStatusConfig(s.status);

            return (
              <View key={i} style={{
                backgroundColor: 'white',
                padding: 16, borderRadius: 20, marginBottom: 12,
                borderWidth: 2, borderColor: '#e2e8f0',
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, color: '#1e293b', fontWeight: '900' }}>{getTranslatedSubject(s.subject)}</Text>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: config.bg, borderWidth: 1.5, borderColor: config.border, alignSelf: 'flex-start', marginTop: 8 }}>
                      <Text style={{ color: config.color, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }}>{config.label}</Text>
                    </View>
                  </View>

                  {s.status === 'ABSENT' && (
                    <TouchableOpacity
                      onPress={() => onJustify(s.id)}
                      activeOpacity={0.8}
                      style={{ backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 2, borderColor: '#bfdbfe', borderBottomWidth: 4, borderBottomColor: '#93c5fd', flexDirection: 'row', alignItems: 'center' }}
                    >
                      <FileUp size={14} color="#0072e6" strokeWidth={2.5} />
                      <Text style={{ fontSize: 12, color: '#0072e6', fontWeight: '900', marginLeft: 6 }}>Justify</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {s.score > 0 && (
                  <View style={{ marginTop: 14, borderTopWidth: 2, borderTopColor: '#f1f5f9', paddingTop: 12, flexDirection: 'row', alignItems: 'center' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        color={s.score >= star ? '#f59e0b' : '#e2e8f0'}
                        fill={s.score >= star ? '#f59e0b' : 'none'}
                        style={{ marginRight: 4 }}
                      />
                    ))}
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#f59e0b', marginLeft: 6 }}>{s.score}/5</Text>
                  </View>
                )}
              </View>
            );
          })}

          {day.notes.length > 0 && (
            <View style={{ marginTop: 8, paddingTop: 16, borderTopWidth: 2, borderTopColor: '#e2e8f0' }}>
              <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Remarks</Text>
              {day.notes.map((n, i) => (
                <View key={i} style={{ marginBottom: 10, backgroundColor: 'white', padding: 12, borderRadius: 16, borderWidth: 2, borderColor: '#e2e8f0' }}>
                  <Text style={{ fontSize: 14, color: '#1e293b', fontStyle: 'italic', fontWeight: '700', lineHeight: 20 }}>
                    "{n.text}"
                  </Text>
                  <Text style={{ fontSize: 11, color: '#0072e6', marginTop: 6, fontWeight: '900' }}>— {n.author}</Text>
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
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.3,
      });

      if (result.canceled || !result.assets[0].uri) return;

      const uri = result.assets[0].uri;
      setLoading(true);

      const uploadRes = (await uiService.uploadImage(uri, 'student', selectedChildId!)) as any;
      await studentService.justifyAttendance(sessionId, uploadRes.url, "Parent uploaded medical certificate via mobile app.");
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Shared Global Header */}
      <GlobalHeader navigation={navigation} showBack />

      <View style={{ paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 30, fontWeight: '900', color: '#1e293b', letterSpacing: -0.5 }}>Attendance</Text>
        <TouchableOpacity style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#e2e8f0' }}>
          <Filter color="#64748b" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0072e6" />}
      >
        {/* Trend Card */}
        <View style={{
          backgroundColor: '#0072e6', borderRadius: 24, padding: 20, marginBottom: 20, overflow: 'hidden',
          borderWidth: 2, borderColor: '#0055b3',
          borderBottomWidth: 6, borderBottomColor: '#004085'
        }}>
          <View style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 }}>Performance</Text>
              <Text style={{ fontSize: 32, fontWeight: '900', color: 'white', marginTop: 2 }}>{monthlyAvg}%</Text>
              <Text style={{ fontSize: 12, color: 'white', fontWeight: '700', marginTop: 2 }}>Attendance in last 30 days</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 14, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' }}>
              <CheckCircle2 color="white" size={28} />
            </View>
          </View>
        </View>

        {/* Summary Dashboard */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
          <View style={{ flex: 1, backgroundColor: '#dcfce7', padding: 16, borderRadius: 20, borderWidth: 2, borderColor: '#86efac', borderBottomWidth: 5, borderBottomColor: '#4ade80' }}>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#16a34a' }}>{totalPresences}</Text>
            <Text style={{ fontSize: 11, color: '#16a34a', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>Presences</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#fee2e2', padding: 16, borderRadius: 20, borderWidth: 2, borderColor: '#fca5a5', borderBottomWidth: 5, borderBottomColor: '#f87171' }}>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#dc2626' }}>{totalAbsences}</Text>
            <Text style={{ fontSize: 11, color: '#dc2626', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>Absences</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#fef3c7', padding: 16, borderRadius: 20, borderWidth: 2, borderColor: '#fcd34d', borderBottomWidth: 5, borderBottomColor: '#fbbf24' }}>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#d97706' }}>{totalLates}</Text>
            <Text style={{ fontSize: 11, color: '#d97706', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>Lates</Text>
          </View>
        </View>

        <Text style={{ fontSize: 16, fontWeight: '900', color: '#1e293b', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
          Recent Activity
        </Text>

        {loading ? (
          <View style={{ gap: 12 }}>
             {[1,2,3,4].map(i => (
                <View key={i} style={{ height: 80, borderRadius: 24, backgroundColor: '#f1f5f9', borderWidth: 2, borderColor: '#e2e8f0' }} />
             ))}
          </View>
        ) : history.filter(d => d.status !== 'PRESENT').length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 48, backgroundColor: '#f8fafc', borderRadius: 24, borderWidth: 2, borderColor: '#e2e8f0' }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#f1f5f9', borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Calendar size={32} color="#94a3b8" />
            </View>
            <Text style={{ fontSize: 18, color: '#1e293b', fontWeight: '900' }}>No recent absences</Text>
            <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '700', marginTop: 6 }}>Attendance records are all clear!</Text>
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
