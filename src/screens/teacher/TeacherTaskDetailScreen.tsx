import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, StatusBar, RefreshControl, Modal, Dimensions, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, CheckCircle2, Clock, Users, Image as ImageIcon } from 'lucide-react-native';
import { teacherService } from '../../services/api';

const { width } = Dimensions.get('window');

const Avatar = ({ name, img, size = 44 }: any) => {
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  if (img) {
    return <Image source={{ uri: img }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#e2e8f0' }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.33, fontWeight: '900', color: '#0055d4' }}>{initials}</Text>
    </View>
  );
};

export const TeacherTaskDetailScreen = ({ route, navigation }: any) => {
  const { task } = route.params;
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedImg, setSelectedImg] = React.useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await teacherService.fetchTaskSubmissions(task.id);
      if (res && res.totalStudents !== undefined) {
        setData(res);
      } else {
        // API returned null or an error object — show what we got for debugging
        console.warn('[TaskDetail] Unexpected response:', JSON.stringify(res));
        Alert.alert(
          'Could not load submissions',
          res?.error ? `Server error: ${res.error}` : 'The server returned an unexpected response. Check console logs.',
          [{ text: 'OK' }]
        );
        setData({ totalStudents: 0, submittedCount: 0, submitted: [], pending: [], title: task.title, className: task.className });
      }
    } catch (e: any) {
      console.error('[TaskDetail] fetch error:', e?.message);
      setData({ totalStudents: 0, submittedCount: 0, submitted: [], pending: [], title: task.title, className: task.className });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => { fetchData(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const total = data?.totalStudents ?? 0;
  const submittedCount = data?.submittedCount ?? 0;
  const percent = total > 0 ? Math.round((submittedCount / total) * 100) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' }}>
          <ChevronLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b' }} numberOfLines={1}>{task.title}</Text>
          <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '700', marginTop: 1 }}>{task.className}</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#0055d4" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0055d4" />}
        >
          {/* Progress Card */}
          <View style={{ backgroundColor: 'white', borderRadius: 28, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: '#f1f5f9' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Overall Progress</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
                  <Text style={{ fontSize: 36, fontWeight: '900', color: percent === 100 ? '#16a34a' : '#0055d4' }}>{percent}%</Text>
                  <Text style={{ fontSize: 14, color: '#94a3b8', marginLeft: 8, fontWeight: '700' }}>completed</Text>
                </View>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#1e293b' }}>{submittedCount}</Text>
                <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '700' }}>of {total}</Text>
              </View>
            </View>
            <View style={{ height: 10, backgroundColor: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${percent}%`, backgroundColor: percent === 100 ? '#16a34a' : '#0055d4', borderRadius: 5 }} />
            </View>
          </View>

          {/* Submitted Section */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <CheckCircle2 size={18} color="#16a34a" />
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#1e293b', marginLeft: 8 }}>Submitted ({submittedCount})</Text>
          </View>

          {data?.submitted?.length > 0 ? (
            data.submitted.map((student: any) => (
              <TouchableOpacity
                key={student.id}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('StudentSubmission', { student, task })}
                style={{ backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#dcfce7', flexDirection: 'row', alignItems: 'center' }}
              >
                <Avatar name={student.name} img={student.avatar} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#1e293b' }}>{student.name}</Text>
                  <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 2 }}>
                    {student.submittedAt ? new Date(student.submittedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                  </Text>
                </View>
                {student.submissionImg ? (
                  <View style={{ position: 'relative' }}>
                    {student.submissionImg.split(',')[0].toLowerCase().endsWith('.pdf') ? (
                      <View style={{ width: 56, height: 56, borderRadius: 12, borderWidth: 2, borderColor: '#bbf7d0', backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b' }}>PDF</Text>
                      </View>
                    ) : (
                      <Image source={{ uri: student.submissionImg.split(',')[0] }} style={{ width: 56, height: 56, borderRadius: 12, borderWidth: 2, borderColor: '#bbf7d0' }} resizeMode="cover" />
                    )}
                    {student.submissionImg.split(',').length > 1 && (
                      <View style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#0055d4', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'white' }}>
                        <Text style={{ color: 'white', fontSize: 9, fontWeight: '900' }}>+{student.submissionImg.split(',').length - 1}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={22} color="#16a34a" />
                  </View>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View style={{ padding: 24, alignItems: 'center', backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 10 }}>
              <Text style={{ color: '#94a3b8', fontWeight: '600', fontSize: 14 }}>No submissions yet</Text>
            </View>
          )}

          {/* Pending Section */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 14 }}>
            <Clock size={18} color="#f59e0b" />
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#1e293b', marginLeft: 8 }}>Pending ({data?.pending?.length ?? 0})</Text>
          </View>

          {data?.pending?.map((student: any) => (
            <View key={student.id} style={{ backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#fef3c7', flexDirection: 'row', alignItems: 'center' }}>
              <Avatar name={student.name} img={student.avatar} />
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#1e293b', marginLeft: 14, flex: 1 }}>{student.name}</Text>
              <View style={{ backgroundColor: '#fff7ed', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: '#fed7aa' }}>
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#ea580c' }}>⏳ Pending</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Full-screen Image Viewer */}
      <Modal visible={!!selectedImg} transparent animationType="fade" onRequestClose={() => setSelectedImg(null)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setSelectedImg(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          {selectedImg && (
            <Image source={{ uri: selectedImg }} style={{ width: width - 40, height: width - 40, borderRadius: 16 }} resizeMode="contain" />
          )}
          <Text style={{ color: 'white', marginTop: 20, fontSize: 14, fontWeight: '600', opacity: 0.7 }}>Tap anywhere to close</Text>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};
