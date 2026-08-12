import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl, TextInput, FlatList } from 'react-native';
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
import { useLanguage } from '../../context/LanguageContext';
import { useQuery } from '@tanstack/react-query';

const ClassCard = ({ item, navigation, setSelectedTeacherClass, t, language, isRTL }: any) => (
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
      
      <View style={{ flex: 1, alignItems: language === 'ar' ? 'flex-end' : 'flex-start' }}>
        <Text style={{ fontSize: 16, fontWeight: '900', color: '#2b3437' }}>{item.name}</Text>
        <Text style={{ fontSize: 12, color: '#737c7f', marginTop: 2 }}>{item.subject || ((t?.variousSubjects || 'Various subjects'))} · {item.students} {t.teacherStudents}</Text>
      </View>
      
      <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
        <ChevronRight size={20} color="#cbd5e1" />
      </View>
    </View>

    <View style={{ flexDirection: 'row', gap: 8, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f4f6' }}>
      <View style={{ flex: 1, backgroundColor: '#eff6ff', padding: 8, borderRadius: 12, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#0055d4' }}>{item.lessons || 14} {t.teacherLessons}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

export const TeacherClassesScreen = ({ navigation }: any) => {
  const { selectedTeacherClass, setSelectedTeacherClass } = useAppStore();
  const { t, language, isRTL } = useLanguage();
  const [search, setSearch] = useState('');

  const { data: classes = [], isLoading: loading, refetch: onRefresh, isRefetching: refreshing } = useQuery({
    queryKey: ['teacherClasses'],
    queryFn: async () => {
      const res = await teacherService.fetchClasses();
      const safeClasses = Array.isArray(res) ? res : [];
      if (safeClasses.length > 0 && !selectedTeacherClass) {
        setSelectedTeacherClass(safeClasses[0]);
      }
      return safeClasses;
    }
  });

  const safeClassesList = Array.isArray(classes) ? classes : [];
  const filteredClasses = safeClassesList.filter((c: any) => 
    c && c.name && c.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderHeader = () => (
    <>
      <Text style={{ fontSize: 24, fontWeight: '900', color: '#2b3437', marginBottom: 4, textAlign: isRTL ? 'right' : 'left' }}>
        {t.teacherAllClasses}
      </Text>
      <Text style={{ fontSize: 14, color: '#737c7f', marginBottom: 20, textAlign: isRTL ? 'right' : 'left' }}>
        {classes.length} {t.teacherActiveClasses} · {classes.reduce((acc: any, c: any) => acc + (c.students || 0), 0)} {t.teacherStudentsTotal}
      </Text>

      {/* Search Bar */}
      <View style={{ 
        flexDirection: isRTL ? 'row-reverse' : 'row', 
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
          placeholder={(t?.searchClassesOrStudents || 'Search classes or students...')}
          placeholderTextColor="#94a3b8"
          style={{ flex: 1, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0, fontSize: 15, color: '#2b3437', textAlign: isRTL ? 'right' : 'left' }}
        />
      </View>
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 12, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f4f6' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8f9fa', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
            <ChevronLeft size={20} color="#2b3437" />
          </View>
        </TouchableOpacity>
        <Text style={{ flex: 1, marginLeft: isRTL ? 0 : 16, marginRight: isRTL ? 16 : 0, fontSize: 18, fontWeight: '900', color: '#2b3437', textAlign: isRTL ? 'right' : 'left' }}>
          {t.teacherClassesRoster}
        </Text>
      </View>

      <FlatList 
        data={filteredClasses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <ClassCard 
            item={{ ...item, selectedId: selectedTeacherClass?.id }} 
            navigation={navigation} 
            setSelectedTeacherClass={setSelectedTeacherClass} 
            t={t} 
            language={language} 
            isRTL={isRTL} 
          />
        )}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          loading && !refreshing ? (
            <ActivityIndicator size="large" color="#0055d4" style={{ marginTop: 100 }} />
          ) : filteredClasses.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 100 }}>
              <Users size={64} color="#cbd5e1" />
              <Text style={{ fontSize: 16, color: '#64748b', fontWeight: 'bold', marginTop: 16 }}>
                {t.teacherNoClassesFound}
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};
