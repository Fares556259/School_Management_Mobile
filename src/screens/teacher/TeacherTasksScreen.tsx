import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, RefreshControl, Image } from 'react-native';
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
  Layout
} from 'lucide-react-native';
import { teacherService } from '../../services/api';
import moment from 'moment';

export const TeacherTasksScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showClassSwitcher, setShowClassSwitcher] = useState(false);
  const [selectedDate, setSelectedDate] = useState(moment());

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
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
      if (classesRes.length > 0) {
        setSelectedClass(classesRes[0]);
        setSelectedClassId(classesRes[0].id);
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
        dueDate,
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
    setSelectedClass(cls);
    setSelectedClassId(cls.id);
    setShowClassSwitcher(false);
    // Potentially reload tasks filtered by class if the API supports it
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f4f6' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8f9fa', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color="#2b3437" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => setShowClassSwitcher(true)}
          style={{ flex: 1, marginLeft: 16, flexDirection: 'row', alignItems: 'center' }}
        >
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#2b3437' }}>{selectedClass?.name || 'Select Class'}</Text>
              <ChevronDown size={14} color="#0055d4" style={{ marginLeft: 6 }} />
            </View>
            <Text style={{ fontSize: 12, color: '#737c7f' }}>Tap to switch class</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowAddForm(!showAddForm)} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={24} color="#0055d4" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {showAddForm && (
          <View style={{ backgroundColor: '#f8f9fa', padding: 20, borderRadius: 24, marginBottom: 24, borderWidth: 1, borderColor: '#f1f4f6' }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#2b3437', marginBottom: 16 }}>Create New Task</Text>
            
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#737c7f', marginBottom: 8, textTransform: 'uppercase' }}>Title</Text>
              <TextInput 
                style={{ backgroundColor: 'white', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e9ec' }}
                placeholder="e.g. Math Quiz, History Essay"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#737c7f', marginBottom: 8, textTransform: 'uppercase' }}>Description</Text>
              <TextInput 
                style={{ backgroundColor: 'white', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e9ec', height: 80 }}
                placeholder="Details about the task..."
                multiline
                value={description}
                onChangeText={setDescription}
              />
            </View>

            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#737c7f', marginBottom: 8, textTransform: 'uppercase' }}>Class</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {classes.map(c => (
                  <TouchableOpacity 
                    key={c.id}
                    onPress={() => setSelectedClassId(c.id)}
                    style={{ 
                      paddingHorizontal: 16, 
                      paddingVertical: 8, 
                      borderRadius: 10, 
                      backgroundColor: selectedClassId === c.id ? '#0055d4' : 'white',
                      marginRight: 8,
                      borderWidth: 1,
                      borderColor: selectedClassId === c.id ? '#0055d4' : '#e2e9ec'
                    }}
                  >
                    <Text style={{ color: selectedClassId === c.id ? 'white' : '#737c7f', fontWeight: 'bold' }}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity 
              onPress={handleCreateTask}
              disabled={loading}
              style={{ backgroundColor: '#0055d4', paddingVertical: 16, borderRadius: 16, alignItems: 'center' }}
            >
              {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: 'bold' }}>Create Task</Text>}
            </TouchableOpacity>
          </View>
        )}

        {tasks.map(task => (
          <View key={task.id} style={{ backgroundColor: 'white', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#f1f4f6' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#2b3437' }}>{task.title}</Text>
                <Text style={{ fontSize: 12, color: '#737c7f', marginTop: 4 }}>{task.description}</Text>
              </View>
              <View style={{ backgroundColor: '#eff6ff', padding: 6, borderRadius: 8 }}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#0055d4' }}>{task.className}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
              <Clock size={14} color="#b0b8bc" />
              <Text style={{ fontSize: 12, color: '#b0b8bc', marginLeft: 4 }}>Due: {new Date(task.dueDate).toLocaleDateString()}</Text>
            </View>
          </View>
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
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', zIndex: 1000 }}>
          <TouchableOpacity activeOpacity={1} onPress={() => setShowClassSwitcher(false)} style={{ flex: 1 }} />
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 60 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#2b3437' }}>Switch Class</Text>
              <TouchableOpacity onPress={() => setShowClassSwitcher(false)} style={{ padding: 8 }}>
                <X size={24} color="#737c7f" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              {classes.map((cls) => (
                <TouchableOpacity 
                  key={cls.id}
                  onPress={() => handleClassSelect(cls)}
                  style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    padding: 16, 
                    borderRadius: 20, 
                    backgroundColor: selectedClass?.id === cls.id ? '#eff6ff' : 'white',
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: selectedClass?.id === cls.id ? '#0055d4' : '#f1f4f6'
                  }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: selectedClass?.id === cls.id ? '#0055d4' : '#f8f9fa', alignItems: 'center', justifyContent: 'center' }}>
                    <Layout size={24} color={selectedClass?.id === cls.id ? 'white' : '#737c7f'} />
                  </View>
                  <View style={{ marginLeft: 16, flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: selectedClass?.id === cls.id ? '#0055d4' : '#2b3437' }}>{cls.name}</Text>
                    <Text style={{ fontSize: 12, color: '#737c7f', marginTop: 2 }}>{cls.level || 'Standard'}</Text>
                  </View>
                  {selectedClass?.id === cls.id && <Check size={20} color="#0055d4" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};
