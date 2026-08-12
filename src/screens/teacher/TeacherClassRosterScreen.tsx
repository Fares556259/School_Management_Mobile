import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, User, Search, Mail, Phone, Calendar } from 'lucide-react-native';
import { teacherService } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

const StudentRow = ({ student, language }: any) => {
  const initials = student.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  
  return (
    <View style={{ 
      flexDirection: language === 'ar' ? 'row-reverse' : 'row', 
      alignItems: 'center', 
      backgroundColor: 'white', 
      padding: 16, 
      borderRadius: 20, 
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#f1f5f9'
    }}>
      {student.img ? (
        <Image source={{ uri: student.img }} style={{ width: 48, height: 48, borderRadius: 16 }} />
      ) : (
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '900', color: '#0055d4' }}>{initials}</Text>
        </View>
      )}
      
      <View style={{ flex: 1, marginLeft: language === 'ar' ? 0 : 16, marginRight: language === 'ar' ? 16 : 0, alignItems: language === 'ar' ? 'flex-end' : 'flex-start' }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b' }}>{student.name} {student.surname}</Text>
      </View>
      
      <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' }}>
        <ChevronLeft size={18} color="#94a3b8" style={{ transform: [{ rotate: language === 'ar' ? '0deg' : '180deg' }] }} />
      </TouchableOpacity>
    </View>
  );
};

export const TeacherClassRosterScreen = ({ route, navigation }: any) => {
  const { classItem } = route.params;
  const { t, language, isRTL } = useLanguage();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const res = await teacherService.fetchClassStudents(classItem.id.toString());
      // The API returns { students: [], assignments: [], ... }
      if (res && res.students) {
        setStudents(res.students);
      } else {
        setStudents(Array.isArray(res) ? res : []);
      }
    } catch (err) {
      console.error("[ROSTER-LOAD]", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStudents();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 14, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' }}>
          <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
            <ChevronLeft size={22} color="#1e293b" />
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: isRTL ? 0 : 16, marginRight: isRTL ? 16 : 0 }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }}>{classItem.name}</Text>
          <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '700', marginTop: 1, textAlign: isRTL ? 'right' : 'left' }}>
            {t.teacherClassRoster} · {students.length} {t.teacherStudentsTotal}
          </Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0055d4" />}
      >
        {loading && !refreshing ? (
          <View style={{ marginTop: 100 }}>
            <ActivityIndicator size="large" color="#0055d4" />
          </View>
        ) : students.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 100 }}>
            <User size={64} color="#cbd5e1" />
            <Text style={{ fontSize: 16, color: '#64748b', fontWeight: 'bold', marginTop: 16 }}>
              {(t?.noStudents || 'No students')}
            </Text>
          </View>
        ) : (
          students.map((s, index) => <StudentRow key={s.id || index} student={s} language={language} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
