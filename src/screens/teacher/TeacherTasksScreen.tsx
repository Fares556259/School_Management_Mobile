import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, RefreshControl, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  Plus, 
  Calendar, 
  Clock, 
  Type, 
  FileText, 
  Save, 
  Trash2, 
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  X,
  Check,
  Layout,
  Image as ImageIcon,
  File as FileIcon
} from 'lucide-react-native';
import { teacherService } from '../../services/api';
import { Skeleton } from '../../components/Skeleton';
import { useAppStore } from '../../store/useAppStore';
import moment from 'moment';

export const TeacherTasksScreen = ({ navigation }: any) => {
  const { selectedTeacherClass, setSelectedTeacherClass } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const selectedClass = selectedTeacherClass;
  const [showAddForm, setShowAddForm] = useState(false);
  const [showClassSwitcher, setShowClassSwitcher] = useState(false);
  const [selectedDate, setSelectedDate] = useState(moment());

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksRes, classesRes] = await Promise.all([
        teacherService.fetchTasks(),
        teacherService.fetchClasses()
      ]);
      setTasks(tasksRes);
      setClasses(classesRes);
      if (classesRes.length > 0 && !selectedTeacherClass) {
        setSelectedTeacherClass(classesRes[0]);
        setSelectedClassId(classesRes[0].id);
      } else if (selectedTeacherClass) {
        setSelectedClassId(selectedTeacherClass.id);
      }
    } catch (err) {
      console.error("[TEACHER-TASKS-LOAD]", err);
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

  const handleCreateTask = async () => {
    if (!title || !selectedClassId) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }
    try {
      setLoading(true);
      await teacherService.createTask({
        title,
        description,
        classId: selectedClassId
      });
      setShowAddForm(false);
      setTitle('');
      setDescription('');
      loadData();
      Alert.alert('Success', 'Task created successfully');
    } catch (err) {
      Alert.alert('Error', 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const handleClassSelect = (cls: any) => {
    setSelectedTeacherClass(cls);
    setSelectedClassId(cls.id);
    setShowClassSwitcher(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Premium Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' }}>
          <ChevronLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => setShowClassSwitcher(true)} style={{ flex: 1, marginHorizontal: 16, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b' }}>{selectedClass?.name || 'Select Class'}</Text>
            <ChevronDown size={16} color="#0055d4" style={{ marginLeft: 6 }} />
          </View>
          <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginTop: 2 }}>Tap to switch</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowAddForm(!showAddForm)} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dbeafe' }}>
          <Plus size={24} color="#0055d4" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 150 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {showAddForm && (
          <View style={{ backgroundColor: 'white', padding: 24, borderRadius: 28, marginBottom: 32, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 20, elevation: 5 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#1e293b', marginBottom: 24 }}>Create New Task</Text>
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: '900', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' }}>Title</Text>
              <TextInput style={{ backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', fontSize: 16, color: '#1e293b' }} placeholder="e.g. Math Quiz, History Essay" value={title} onChangeText={setTitle} />
            </View>
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: '900', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' }}>Description</Text>
              <TextInput style={{ backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', fontSize: 16, color: '#1e293b', height: 100 }} placeholder="Details about the task..." multiline value={description} onChangeText={setDescription} />
            </View>
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 12, fontWeight: '900', color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase' }}>Class</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {classes.map(c => (
                  <TouchableOpacity key={c.id} onPress={() => setSelectedClassId(c.id)} style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: selectedClassId === c.id ? '#0055d4' : '#f8fafc', borderWidth: 1, borderColor: selectedClassId === c.id ? '#0055d4' : '#f1f5f9' }}>
                    <Text style={{ color: selectedClassId === c.id ? 'white' : '#64748b', fontWeight: '800' }}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <TouchableOpacity onPress={handleCreateTask} disabled={loading} activeOpacity={0.9} style={{ backgroundColor: '#0055d4', paddingVertical: 18, borderRadius: 20, alignItems: 'center', shadowColor: '#0055d4', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 8 }}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>Create Task</Text>}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '900', color: '#1e293b', textTransform: 'uppercase', letterSpacing: 1 }}>Active Tasks</Text>
          <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: '900', color: '#0055d4' }}>{tasks.length} tasks</Text>
          </View>
        </View>

        {loading && tasks.length === 0 && (
          <View style={{ gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={{ backgroundColor: 'white', padding: 24, borderRadius: 32, marginBottom: 16, height: 160 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Skeleton width="70%" height={20} borderRadius={4} />
                  <Skeleton width={40} height={20} borderRadius={10} />
                </View>
                <Skeleton width="100%" height={14} borderRadius={4} style={{ marginBottom: 8 }} />
                <Skeleton width="80%" height={14} borderRadius={4} style={{ marginBottom: 20 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Skeleton width={80} height={12} borderRadius={4} />
                  <Skeleton width={60} height={20} borderRadius={10} />
                </View>
              </View>
            ))}
          </View>
        )}

        {tasks.filter(t => !selectedClass || t.classId === selectedClass.id || t.className === selectedClass.name).map(task => (
          <TouchableOpacity key={task.id} activeOpacity={0.85} onPress={() => navigation.navigate('TeacherTaskDetail', { task })} style={{ backgroundColor: 'white', padding: 24, borderRadius: 32, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 15, elevation: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 19, fontWeight: '900', color: '#1e293b' }}>{task.title}</Text>
                
                {/* Always show description if it exists */}
                { (task.description || task.content || task.text) ? (
                  <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '600', marginTop: 8, lineHeight: 22 }}>{task.description || task.content || task.text}</Text>
                ) : (
                  <Text style={{ fontSize: 14, color: '#cbd5e1', fontWeight: '500', marginTop: 8, fontStyle: 'italic' }}>No description provided</Text>
                )}

                {/* File Indicators */}
                {(task.attachments && task.attachments.length > 0) ? (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                    {task.attachments.some((a: any) => a.type === 'IMAGE' || a.uri?.match(/\.(jpg|jpeg|png)$/i)) && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f3ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }}>
                        <ImageIcon size={14} color="#8b5cf6" />
                        <Text style={{ fontSize: 11, fontWeight: '900', color: '#8b5cf6', marginLeft: 6 }}>Photo Attached</Text>
                      </View>
                    )}
                    {task.attachments.some((a: any) => a.type === 'PDF' || a.uri?.match(/\.pdf$/i)) && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }}>
                        <FileIcon size={14} color="#0055d4" />
                        <Text style={{ fontSize: 11, fontWeight: '900', color: '#0055d4', marginLeft: 6 }}>Document Attached</Text>
                      </View>
                    )}
                  </View>
                ) : (
                   <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
                      <AlertCircle size={14} color="#cbd5e1" />
                      <Text style={{ fontSize: 11, color: '#cbd5e1', fontWeight: '700', marginLeft: 6 }}>No attachments</Text>
                   </View>
                )}

                {/* Submission Progress */}
                {task.total > 0 && (
                  <View style={{ marginTop: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Submissions</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, fontWeight: '900', color: task.submitted === task.total ? '#16a34a' : '#0055d4' }}>
                          {task.submitted}
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#94a3b8' }}>/{task.total} students</Text>
                      </View>
                    </View>
                    <View style={{ height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                      <View style={{ 
                        height: '100%', 
                        width: `${task.total > 0 ? Math.round((task.submitted / task.total) * 100) : 0}%`, 
                        backgroundColor: task.submitted === task.total ? '#16a34a' : '#0055d4',
                        borderRadius: 4 
                      }} />
                    </View>
                    <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '700', marginTop: 6 }}>
                      {task.total > 0 ? Math.round((task.submitted / task.total) * 100) : 0}% completed
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#f1f5f9' }}>
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#64748b' }}>{task.className}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {tasks.length === 0 && !loading && (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <CheckCircle2 size={48} color="#d1d5db" />
            <Text style={{ color: '#737c7f', fontWeight: 'bold', marginTop: 16 }}>No active tasks found</Text>
          </View>
        )}
      </ScrollView>

      {/* Class Switcher Modal */}
      {showClassSwitcher && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end', zIndex: 1000 }}>
          <TouchableOpacity activeOpacity={1} onPress={() => setShowClassSwitcher(false)} style={{ flex: 1 }} />
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 32, paddingBottom: 60, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 30, elevation: 20 }}>
            <View style={{ width: 40, height: 5, backgroundColor: '#e2e8f0', borderRadius: 10, alignSelf: 'center', marginBottom: 24 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#1e293b' }}>Switch Class</Text>
              <TouchableOpacity onPress={() => setShowClassSwitcher(false)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}><X size={20} color="#64748b" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              {classes.map((cls) => (
                <TouchableOpacity key={cls.id} onPress={() => handleClassSelect(cls)} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24, backgroundColor: selectedClass?.id === cls.id ? '#eff6ff' : 'white', marginBottom: 12, borderWidth: 1.5, borderColor: selectedClass?.id === cls.id ? '#0055d4' : '#f1f5f9', shadowColor: selectedClass?.id === cls.id ? '#0055d4' : '#000', shadowOpacity: selectedClass?.id === cls.id ? 0.05 : 0.02, shadowRadius: 10, elevation: 1 }}>
                  <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: selectedClass?.id === cls.id ? '#0055d4' : '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
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
