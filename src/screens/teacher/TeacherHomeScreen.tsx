import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Users, 
  PlusCircle, 
  ClipboardList, 
  BookOpen, 
  Clock, 
  MapPin, 
  ChevronRight,
  TrendingUp,
  MoreHorizontal
} from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { teacherService } from '../../services/api';
import { Skeleton } from '../../components/Skeleton';

const QuickAction = ({ icon: Icon, title, color, onPress }: any) => (
  <TouchableOpacity 
    onPress={onPress}
    activeOpacity={0.8}
    style={{ 
      flex: 1, 
      backgroundColor: color, 
      borderRadius: 20, 
      padding: 16, 
      alignItems: 'center',
      shadowColor: color,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4
    }}
  >
    <View style={{ 
      width: 40, 
      height: 40, 
      borderRadius: 12, 
      backgroundColor: 'rgba(255,255,255,0.2)', 
      alignItems: 'center', 
      justifyContent: 'center',
      marginBottom: 8
    }}>
      <Icon color="white" size={20} />
    </View>
    <Text style={{ color: 'white', fontSize: 12, fontWeight: '900', textAlign: 'center' }}>{title}</Text>
  </TouchableOpacity>
);

const SummaryCard = ({ value, label, color }: any) => (
  <View style={{ 
    flex: 1, 
    backgroundColor: '#ffffff', 
    borderRadius: 24, 
    padding: 16, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2
  }}>
    <Text style={{ fontSize: 24, fontWeight: '900', color: '#2b3437' }}>{value}</Text>
    <Text style={{ fontSize: 10, color: '#737c7f', fontWeight: 'bold', marginTop: 4, textTransform: 'uppercase' }}>{label}</Text>
  </View>
);

const ClassCard = ({ subject, className, time, room, students, status }: any) => {
  let statusColor = '#0055d4';
  let bgColor = '#eff6ff';
  let barColor = '#0055d4';

  if (status === 'Live') {
    statusColor = '#22c55e';
    bgColor = '#f0fdf4';
    barColor = '#22c55e';
  } else if (status === 'Completed') {
    statusColor = '#64748b';
    bgColor = '#f8fafc';
    barColor = '#cbd5e1';
  } else if (status === 'Upcoming') {
    statusColor = '#64748b';
    bgColor = '#f8fafc';
    barColor = '#e2e8f0';
  }

  return (
    <TouchableOpacity 
      activeOpacity={0.9}
      style={{ 
        backgroundColor: 'white', 
        borderRadius: 24, 
        padding: 16, 
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f1f4f6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1,
        opacity: status === 'Completed' ? 0.7 : 1
      }}
    >
      <View style={{ width: 4, height: 40, borderRadius: 2, backgroundColor: barColor, marginRight: 12 }} />
      
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 15, fontWeight: '900', color: status === 'Completed' ? '#64748b' : '#2b3437' }}>{subject} · {className}</Text>
          <View style={{ 
            paddingHorizontal: 8, 
            paddingVertical: 4, 
            borderRadius: 8, 
            backgroundColor: bgColor 
          }}>
            <Text style={{ 
              fontSize: 10, 
              fontWeight: '900', 
              color: statusColor 
            }}>{status}</Text>
          </View>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Clock size={12} color="#737c7f" />
            <Text style={{ fontSize: 12, color: '#737c7f' }}>{time}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MapPin size={12} color="#737c7f" />
            <Text style={{ fontSize: 12, color: '#737c7f' }}>Room {room}</Text>
          </View>
        </View>
        
        <Text style={{ fontSize: 12, color: '#b0b8bc', marginTop: 4 }}>{students} students enrolled</Text>
      </View>
    </TouchableOpacity>
  );
};

export const TeacherHomeScreen = ({ navigation }: any) => {
  const { userName, userAvatarUrl } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await teacherService.fetchHomeData();
      setData(res);
    } catch (err) {
      console.error("[TEACHER-HOME-LOAD]", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  });

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }} edges={['top']}>
        <View style={{ backgroundColor: '#0055d4', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Skeleton width={100} height={14} borderRadius={4} style={{ marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.2)' }} />
              <Skeleton width={150} height={28} borderRadius={6} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
            </View>
            <Skeleton width={50} height={50} borderRadius={25} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 40, marginBottom: -65 }}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={{ flex: 1, backgroundColor: 'white', borderRadius: 24, padding: 16, alignItems: 'center', height: 80, justifyContent: 'center' }}>
                <Skeleton width="60%" height={20} borderRadius={4} style={{ marginBottom: 8 }} />
                <Skeleton width="40%" height={10} borderRadius={2} />
              </View>
            ))}
          </View>
        </View>

        <View style={{ marginTop: 80, paddingHorizontal: 20 }}>
          <Skeleton width={120} height={16} borderRadius={4} style={{ marginBottom: 16 }} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={{ flex: 1, height: 100, backgroundColor: 'white', borderRadius: 20, padding: 16, alignItems: 'center', justifyContent: 'center' }}>
                <Skeleton width={40} height={40} borderRadius={12} style={{ marginBottom: 8 }} />
                <Skeleton width="70%" height={10} borderRadius={2} />
              </View>
            ))}
          </View>
        </View>

        <View style={{ marginTop: 32, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <Skeleton width={140} height={16} borderRadius={4} />
            <Skeleton width={50} height={16} borderRadius={4} />
          </View>
          {[1, 2, 3].map((i) => (
            <View key={i} style={{ backgroundColor: 'white', borderRadius: 24, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', height: 100 }}>
              <Skeleton width={4} height={40} borderRadius={2} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Skeleton width="50%" height={15} borderRadius={4} />
                  <Skeleton width={60} height={20} borderRadius={8} />
                </View>
                <Skeleton width="80%" height={12} borderRadius={4} style={{ marginBottom: 8 }} />
                <Skeleton width="40%" height={10} borderRadius={2} />
              </View>
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }} edges={['top']}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0055d4']} />}
      >
        {/* Header Section */}
        <View style={{ 
          backgroundColor: '#0055d4', 
          paddingHorizontal: 20, 
          paddingTop: 20, 
          paddingBottom: 40,
          borderBottomLeftRadius: 40,
          borderBottomRightRadius: 40
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' }}>Good morning 👋</Text>
              <Text style={{ color: 'white', fontSize: 24, fontWeight: '900', marginTop: 4 }}>{userName || 'Teacher'}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
              <Image 
                source={userAvatarUrl ? { uri: userAvatarUrl } : require('../../../assets/noavatar.png')} 
                style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' }} 
              />
            </TouchableOpacity>
          </View>
          
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            backgroundColor: 'rgba(255,255,255,0.15)', 
            paddingHorizontal: 12, 
            paddingVertical: 8, 
            borderRadius: 12, 
            marginTop: 16,
            alignSelf: 'flex-start'
          }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e', marginRight: 8 }} />
            <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>{today} · {data?.todayClassesCount || 0} classes today</Text>
          </View>

          {/* Floating Summary Row */}
          <View style={{ 
            flexDirection: 'row', 
            gap: 12, 
            marginTop: 32,
            marginBottom: -65 // Pull into the next section
          }}>
            <SummaryCard value={data?.totalClasses || 0} label="Classes" />
            <SummaryCard value={data?.totalTasksGiven || 0} label="Tasks given" />
            <SummaryCard value={data?.totalResources || 0} label="Resources" />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{ marginTop: 80, paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: '900', color: '#2b3437', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>Quick actions</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <QuickAction 
              icon={ClipboardList} 
              title="Attendance" 
              color="#0055d4" 
              onPress={() => navigation.navigate('Attendance')} 
            />
            <QuickAction 
              icon={BookOpen} 
              title="Add Lesson" 
              color="#22c55e" 
              onPress={() => navigation.navigate('Lessons')} 
            />
            <QuickAction 
              icon={PlusCircle} 
              title="Create Task" 
              color="#f59e0b" 
              onPress={() => navigation.navigate('Tasks')} 
            />
          </View>
        </View>

        {/* Today's Classes */}
        <View style={{ marginTop: 32, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#2b3437', textTransform: 'uppercase', letterSpacing: 1 }}>Today's classes</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Classes')}>
              <Text style={{ fontSize: 13, color: '#0055d4', fontWeight: 'bold' }}>See all</Text>
            </TouchableOpacity>
          </View>

          {(data?.todayClasses || []).map((c: any, i: number) => (
            <ClassCard 
              key={i}
              subject={c.subject}
              className={c.className}
              time={c.time}
              room={c.room}
              students={c.students}
              status={c.status}
            />
          ))}

          {(!data?.todayClasses || data.todayClasses.length === 0) && (
            <View style={{ alignItems: 'center', paddingVertical: 40, backgroundColor: 'white', borderRadius: 24, borderWidth: 1, borderColor: '#f1f4f6' }}>
              <Clock size={48} color="#d1d5db" />
              <Text style={{ color: '#737c7f', fontWeight: 'bold', marginTop: 12 }}>No classes scheduled for today</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
