import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  Search, 
  Users, 
  BookOpen, 
  ChevronRight,
  TrendingUp,
  GraduationCap
} from 'lucide-react-native';
import { teacherService } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';

const ClassCard = ({ item, navigation, setSelectedTeacherClass }: any) => (
  <TouchableOpacity 
    activeOpacity={0.9}
    onPress={() => {
      setSelectedTeacherClass(item);
      navigation.navigate('TeacherClassRoster', { classItem: item });
    }}
    style={{ 
      backgroundColor: 'white', 
      borderRadius: 24, 
      padding: 16, 
      marginBottom: 16,
      borderWidth: 1,
      borderColor: item.id === item.selectedId ? '#0055d4' : '#f1f4f6',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 8,
      elevation: 1
    }}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ 
        width: 48, 
        height: 48, 
        borderRadius: 16, 
        backgroundColor: '#eff6ff', 
        alignItems: 'center', 
        justifyContent: 'center',
        marginRight: 16
      }}>
        <GraduationCap size={24} color="#0055d4" />
      </View>
      
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '900', color: '#2b3437' }}>{item.name}</Text>
        <Text style={{ fontSize: 12, color: '#737c7f', marginTop: 2 }}>{item.subject || 'Various subjects'} · {item.students} students</Text>
      </View>
      
      <ChevronRight size={20} color="#cbd5e1" />
    </View>

    <View style={{ flexDirection: 'row', gap: 8, marginTop: 16, pt: 12, borderTopWidth: 1, borderTopColor: '#f1f4f6' }}>
      <View style={{ flex: 1, backgroundColor: '#eff6ff', padding: 8, borderRadius: 12, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#0055d4' }}>{item.lessons || 14} lessons</Text>
      </View>
    </View>
  </TouchableOpacity>
);

export const TeacherClassesScreen = ({ navigation }: any) => {
  const { selectedTeacherClass, setSelectedTeacherClass } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadClasses = async () => {
    try {
      setLoading(true);
      const res = await teacherService.fetchClasses();
      setClasses(res);
      // Auto-select if none
      if (res.length > 0 && !selectedTeacherClass) {
        setSelectedTeacherClass(res[0]);
      }
    } catch (err) {
      console.error("[TEACHER-CLASSES-LOAD]", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadClasses();
    setRefreshing(false);
  };

  const filteredClasses = classes.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f4f6' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8f9fa', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color="#2b3437" />
        </TouchableOpacity>
        <Text style={{ flex: 1, marginLeft: 16, fontSize: 18, fontWeight: '900', color: '#2b3437' }}>Classes · Student Roster</Text>
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={{ fontSize: 24, fontWeight: '900', color: '#2b3437', marginBottom: 4 }}>All Classes</Text>
        <Text style={{ fontSize: 14, color: '#737c7f', marginBottom: 20 }}>{classes.length} active classes · {classes.reduce((acc, c) => acc + c.students, 0)} students total</Text>

        {/* Search Bar */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          backgroundColor: 'white', 
          borderRadius: 16, 
          paddingHorizontal: 16, 
          marginBottom: 24,
          borderWidth: 1,
          borderColor: '#e5e7eb',
          height: 50
        }}>
          <Search size={18} color="#94a3b8" />
          <TextInput 
            value={search}
            onChangeText={setSearch}
            placeholder="Search classes or students..."
            style={{ flex: 1, marginLeft: 12, fontSize: 15, color: '#2b3437' }}
          />
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#0055d4" style={{ marginTop: 100 }} />
        ) : filteredClasses.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 100 }}>
            <Users size={64} color="#cbd5e1" />
            <Text style={{ fontSize: 16, color: '#64748b', fontWeight: 'bold', marginTop: 16 }}>No classes found</Text>
          </View>
        ) : (
          filteredClasses.map(c => <ClassCard key={c.id} item={{ ...c, selectedId: selectedTeacherClass?.id }} navigation={navigation} setSelectedTeacherClass={setSelectedTeacherClass} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
