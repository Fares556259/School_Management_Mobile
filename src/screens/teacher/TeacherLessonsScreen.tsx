import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, RefreshControl, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  Plus, 
  BookOpen, 
  Link, 
  FileText, 
  Save, 
  Trash2, 
  Paperclip,
  Image as ImageIcon,
  ChevronDown,
  X,
  Check,
  Layout
} from 'lucide-react-native';
import { teacherService } from '../../services/api';
import moment from 'moment';

export const TeacherLessonsScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lessons, setLessons] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showClassSwitcher, setShowClassSwitcher] = useState(false);
  const [selectedDate, setSelectedDate] = useState(moment());

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const loadClasses = async () => {
      const res = await teacherService.fetchClasses();
      setClasses(res);
      if (res.length > 0) {
        setSelectedClass(res[0]);
        setSelectedClassId(res[0].id);
      }
    };
    loadClasses();
  }, []);

  const handleCreateLesson = async () => {
    if (!title || !selectedClassId) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }
    try {
      setLoading(true);
      await teacherService.createLesson({
        title,
        content,
        classId: selectedClassId,
        date
      });
      setShowAddForm(false);
      setTitle('');
      setContent('');
      Alert.alert('Success', 'Lesson material added');
    } catch (err) {
      Alert.alert('Error', 'Failed to add material');
    } finally {
      setLoading(false);
    }
  };

  const handleClassSelect = (cls: any) => {
    setSelectedClass(cls);
    setSelectedClassId(cls.id);
    setShowClassSwitcher(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Premium Header */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 24, 
        paddingVertical: 16, 
        backgroundColor: 'white',
        borderBottomWidth: 1, 
        borderBottomColor: '#f1f5f9' 
      }}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' }}
        >
          <ChevronLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => setShowClassSwitcher(true)}
          style={{ flex: 1, marginHorizontal: 16, alignItems: 'center' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b' }}>{selectedClass?.name || 'Select Class'}</Text>
            <ChevronDown size={16} color="#0055d4" style={{ marginLeft: 6 }} />
          </View>
          <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginTop: 2 }}>Tap to switch</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setShowAddForm(!showAddForm)} 
          style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dbeafe' }}
        >
          <Plus size={24} color="#0055d4" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        {showAddForm ? (
          <View style={{ backgroundColor: 'white', padding: 24, borderRadius: 28, marginBottom: 24, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 20, elevation: 5 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#1e293b', marginBottom: 24 }}>Upload Material</Text>
            
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: '900', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' }}>Subject/Title</Text>
              <TextInput 
                style={{ backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', fontSize: 16, color: '#1e293b' }}
                placeholder="e.g. Algebra Basics"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 12, fontWeight: '900', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' }}>Target Class</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {classes.map(c => (
                  <TouchableOpacity 
                    key={c.id}
                    onPress={() => setSelectedClassId(c.id)}
                    style={{ 
                      paddingHorizontal: 20, 
                      paddingVertical: 10, 
                      borderRadius: 12, 
                      backgroundColor: selectedClassId === c.id ? '#0055d4' : '#f8fafc',
                      borderWidth: 1,
                      borderColor: selectedClassId === c.id ? '#0055d4' : '#f1f5f9'
                    }}
                  >
                    <Text style={{ color: selectedClassId === c.id ? 'white' : '#64748b', fontWeight: '800' }}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity 
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                backgroundColor: '#f8fafc', 
                padding: 20, 
                borderRadius: 20, 
                borderWidth: 2, 
                borderColor: '#e2e8f0', 
                borderStyle: 'dashed',
                marginBottom: 24,
                justifyContent: 'center'
              }}
            >
              <Paperclip size={22} color="#0055d4" />
              <Text style={{ marginLeft: 12, color: '#0055d4', fontWeight: '900', fontSize: 15 }}>Attach PDF or Image</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleCreateLesson}
              disabled={loading}
              activeOpacity={0.9}
              style={{ 
                backgroundColor: '#0055d4', 
                paddingVertical: 18, 
                borderRadius: 20, 
                alignItems: 'center',
                shadowColor: '#0055d4',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.2,
                shadowRadius: 15,
                elevation: 8
              }}
            >
              {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>Upload Material</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 100 }}>
            <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 24, shadowColor: '#0055d4', shadowOpacity: 0.1, shadowRadius: 20 }}>
              <BookOpen size={50} color="#0055d4" strokeWidth={2.5} />
            </View>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#1e293b', textAlign: 'center' }}>Manage Lessons</Text>
            <Text style={{ fontSize: 15, color: '#64748b', fontWeight: '600', textAlign: 'center', marginTop: 12, lineHeight: 22, paddingHorizontal: 40 }}>
              Upload PDFs, session notes, and educational materials for your students to review.
            </Text>
            <TouchableOpacity 
              onPress={() => setShowAddForm(true)}
              activeOpacity={0.9}
              style={{ 
                marginTop: 40, 
                backgroundColor: '#0055d4', 
                paddingHorizontal: 32, 
                paddingVertical: 18, 
                borderRadius: 24,
                shadowColor: '#0055d4',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 10
              }}
            >
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>Add First Material</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Class Switcher Modal */}
      {showClassSwitcher && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end', zIndex: 1000 }}>
          <TouchableOpacity activeOpacity={1} onPress={() => setShowClassSwitcher(false)} style={{ flex: 1 }} />
          <View style={{ 
            backgroundColor: 'white', 
            borderTopLeftRadius: 40, 
            borderTopRightRadius: 40, 
            padding: 32, 
            paddingBottom: 60,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -10 },
            shadowOpacity: 0.1,
            shadowRadius: 30,
            elevation: 20
          }}>
            <View style={{ width: 40, height: 5, backgroundColor: '#e2e8f0', borderRadius: 10, alignSelf: 'center', marginBottom: 24 }} />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#1e293b' }}>Switch Class</Text>
              <TouchableOpacity 
                onPress={() => setShowClassSwitcher(false)} 
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              {classes.map((cls) => (
                <TouchableOpacity 
                  key={cls.id}
                  onPress={() => handleClassSelect(cls)}
                  activeOpacity={0.8}
                  style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    padding: 20, 
                    borderRadius: 24, 
                    backgroundColor: selectedClass?.id === cls.id ? '#eff6ff' : 'white',
                    marginBottom: 12,
                    borderWidth: 1.5,
                    borderColor: selectedClass?.id === cls.id ? '#0055d4' : '#f1f5f9',
                    shadowColor: selectedClass?.id === cls.id ? '#0055d4' : '#000',
                    shadowOpacity: selectedClass?.id === cls.id ? 0.05 : 0.02,
                    shadowRadius: 10,
                    elevation: 1
                  }}
                >
                  <View style={{ 
                    width: 56, 
                    height: 56, 
                    borderRadius: 18, 
                    backgroundColor: selectedClass?.id === cls.id ? '#0055d4' : '#f8fafc', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <Layout size={28} color={selectedClass?.id === cls.id ? 'white' : '#94a3b8'} />
                  </View>
                  <View style={{ marginLeft: 20, flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: selectedClass?.id === cls.id ? '#0055d4' : '#1e293b' }}>{cls.name}</Text>
                    <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: '700', marginTop: 2 }}>{cls.level || 'Standard'}</Text>
                  </View>
                  {selectedClass?.id === cls.id && (
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#0055d4', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={16} color="white" strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};
