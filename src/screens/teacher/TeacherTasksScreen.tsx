import React, { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, RefreshControl, Image, StatusBar, FlatList, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, Plus, Calendar, Clock, Type, FileText, Save, Trash2, CheckCircle2,
  AlertCircle, ChevronDown, X, Check, Layout, Image as ImageIcon, File as FileIcon
} from 'lucide-react-native';
import { teacherService, API_BASE_URL } from '../../services/api';
import { Skeleton } from '../../components/Skeleton';
import { useAppStore } from '../../store/useAppStore';
import { useLanguage } from '../../context/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import moment from 'moment';

export const TeacherTasksScreen = ({ navigation }: any) => {
  const { selectedTeacherClass, setSelectedTeacherClass } = useAppStore();
  const { t, language, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [showClassSwitcher, setShowClassSwitcher] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ['teacherClasses'],
    queryFn: async () => {
      const res = await teacherService.fetchClasses();
      const safeClasses = Array.isArray(res) ? res : [];
      if (safeClasses.length > 0 && !selectedTeacherClass) {
        setSelectedTeacherClass(safeClasses[0]);
        setSelectedClassId(safeClasses[0].id);
      } else if (selectedTeacherClass && !selectedClassId) {
        setSelectedClassId(selectedTeacherClass.id);
      }
      return safeClasses;
    }
  });

  const { data: tasks = [], isLoading: loadingTasks, refetch: onRefresh, isRefetching: refreshing } = useQuery({
    queryKey: ['teacherTasks'],
    queryFn: async () => {
      const res = await teacherService.fetchTasks();
      return Array.isArray(res) ? res : [];
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => await teacherService.createTask(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacherTasks'] });
      setShowAddForm(false);
      setTitle('');
      setDescription('');
      setAttachments([]);
      Alert.alert('Success', 'Task created successfully');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to create task');
    }
  });

  const pickImages = async () => {
    if (attachments.length >= 5) {
      Alert.alert('Limit Reached', 'You can only attach up to 5 images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5 - attachments.length,
      quality: 0.7,
    });
    if (!result.canceled) {
      setAttachments(prev => [...prev, ...result.assets].slice(0, 5));
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateTask = async () => {
    if (!title || !selectedClassId) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }
    try {
      setUploading(true);
      const uploadedAttachments = [];
      for (const asset of attachments) {
        const formData = new FormData();
        const filename = asset.uri.split('/').pop() || `image_${Date.now()}.jpg`;
        formData.append('file', {
          uri: asset.uri,
          name: filename,
          type: 'image/jpeg'
        } as any);

        const uploadRes = await fetch(`${API_BASE_URL}/api/mobile/upload`, {
          method: 'POST',
          body: formData,
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const uploadData = await uploadRes.json();
        if (uploadData?.url) {
          uploadedAttachments.push({ uri: uploadData.url });
        }
      }

      createTaskMutation.mutate({
        title,
        description,
        classId: selectedClassId,
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to process attachments');
    } finally {
      setUploading(false);
    }
  };

  const handleClassSelect = (cls: any) => {
    setSelectedTeacherClass(cls);
    setSelectedClassId(cls.id);
    setShowClassSwitcher(false);
  };

  const filteredTasks = tasks.filter((t: any) => !selectedTeacherClass || t.classId === selectedTeacherClass.id || t.className === selectedTeacherClass.name);
  const loading = loadingClasses || loadingTasks;

  const renderTask = ({ item: task }: any) => (
    <TouchableOpacity key={task.id} activeOpacity={0.85} onPress={() => navigation.navigate('TeacherTaskDetail', { task })} style={{ backgroundColor: 'white', padding: 24, borderRadius: 32, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 15, elevation: 2 }}>
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 19, fontWeight: '900', color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }}>{task.title}</Text>
          
          { (task.description || task.content || task.text) ? (
            <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '600', marginTop: 8, lineHeight: 22, textAlign: isRTL ? 'right' : 'left' }}>{task.description || task.content || task.text}</Text>
          ) : (
            <Text style={{ fontSize: 14, color: '#cbd5e1', fontWeight: '500', marginTop: 8, fontStyle: 'italic', textAlign: isRTL ? 'right' : 'left' }}>{(t?.noDescriptionProvided || 'No description provided')}</Text>
          )}

          {(task.attachments && task.attachments.length > 0) ? (
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8, marginTop: 16 }}>
              {task.attachments.some((a: any) => a.type === 'IMAGE' || a.uri?.match(/\.(jpg|jpeg|png)$/i)) && (
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: '#f5f3ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }}>
                  <ImageIcon size={14} color="#8b5cf6" />
                  <Text style={{ fontSize: 11, fontWeight: '900', color: '#8b5cf6', marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 }}>{(t?.photoAttached || 'Photo Attached')}</Text>
                </View>
              )}
              {task.attachments.some((a: any) => a.type === 'PDF' || a.uri?.match(/\.pdf$/i)) && (
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }}>
                  <FileIcon size={14} color="#0055d4" />
                  <Text style={{ fontSize: 11, fontWeight: '900', color: '#0055d4', marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 }}>{(t?.documentAttached || 'Document Attached')}</Text>
                </View>
              )}
            </View>
          ) : (
             <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginTop: 16 }}>
                <AlertCircle size={14} color="#cbd5e1" />
                <Text style={{ fontSize: 11, color: '#cbd5e1', fontWeight: '700', marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 }}>{(t?.noAttachments || 'No attachments')}</Text>
             </View>
          )}

          {task.total > 0 && (
            <View style={{ marginTop: 20 }}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{(t?.submissions || 'Submissions')}</Text>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: task.submitted === task.total ? '#16a34a' : '#0055d4' }}>
                    {task.submitted}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#94a3b8' }}>/{task.total} {(t?.students || 'students')}</Text>
                </View>
              </View>
              <View style={{ height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ 
                  height: '100%', 
                  width: `${task.total > 0 ? Math.round((task.submitted / task.total) * 100) : 0}%`, 
                  backgroundColor: task.submitted === task.total ? '#16a34a' : '#0055d4',
                  borderRadius: 4,
                  alignSelf: isRTL ? 'flex-end' : 'flex-start'
                }} />
              </View>
              <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '700', marginTop: 6, textAlign: isRTL ? 'right' : 'left' }}>
                {task.total > 0 ? Math.round((task.submitted / task.total) * 100) : 0}% {(t?.completed3 || 'completed')}
              </Text>
            </View>
          )}
        </View>
        <View style={{ backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#f1f5f9', marginLeft: isRTL ? 0 : 16, marginRight: isRTL ? 16 : 0 }}>
          <Text style={{ fontSize: 11, fontWeight: '900', color: '#64748b' }}>{task.className}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <>
      {showAddForm && (
        <View style={{ backgroundColor: 'white', padding: 24, borderRadius: 28, marginBottom: 32, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 20, elevation: 5 }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#1e293b', marginBottom: 24, textAlign: isRTL ? 'right' : 'left' }}>{(t?.createNewTask || 'Create New Task')}</Text>
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: '900', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', textAlign: isRTL ? 'right' : 'left' }}>{(t?.title1 || 'Title')}</Text>
            <TextInput style={{ backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', fontSize: 16, color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }} placeholder={(t?.egMathQuizHistoryEssay || 'e.g. Math Quiz, History Essay')} placeholderTextColor="#94a3b8" value={title} onChangeText={setTitle} />
          </View>
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: '900', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', textAlign: isRTL ? 'right' : 'left' }}>{(t?.description || 'Description')}</Text>
            <TextInput style={{ backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', fontSize: 16, color: '#1e293b', height: 100, textAlign: isRTL ? 'right' : 'left', textAlignVertical: 'top' }} placeholder={(t?.detailsAboutTheTask || 'Details about the task...')} placeholderTextColor="#94a3b8" multiline value={description} onChangeText={setDescription} />
          </View>
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 12, fontWeight: '900', color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', textAlign: isRTL ? 'right' : 'left' }}>{(t?.class || 'Class')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
              {classes.map((c: any) => (
                <TouchableOpacity key={c.id} onPress={() => setSelectedClassId(c.id)} style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: selectedClassId === c.id ? '#0055d4' : '#f8fafc', borderWidth: 1, borderColor: selectedClassId === c.id ? '#0055d4' : '#f1f5f9', transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
                  <Text style={{ color: selectedClassId === c.id ? 'white' : '#64748b', fontWeight: '800' }}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 12, fontWeight: '900', color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', textAlign: isRTL ? 'right' : 'left' }}>{(t?.attachments || 'Attachments')}</Text>
            
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 12, marginBottom: attachments.length > 0 ? 16 : 0 }}>
              {attachments.map((asset, idx) => (
                <View key={idx} style={{ position: 'relative' }}>
                  <Image source={{ uri: asset.uri }} style={{ width: 80, height: 80, borderRadius: 12 }} />
                  <TouchableOpacity onPress={() => removeAttachment(idx)} style={{ position: 'absolute', top: -8, right: -8, backgroundColor: 'red', borderRadius: 12, padding: 4 }}>
                    <X size={14} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {attachments.length < 5 && (
              <TouchableOpacity onPress={pickImages} disabled={uploading} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', borderStyle: 'dashed' }}>
                <ImageIcon size={20} color="#0055d4" />
                <Text style={{ marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0, fontSize: 14, fontWeight: '800', color: '#0055d4' }}>{(t?.addImagesMax5 || 'Add Images (Max 5)')}</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={handleCreateTask} disabled={createTaskMutation.isPending || uploading} activeOpacity={0.9} style={{ backgroundColor: '#0055d4', paddingVertical: 18, borderRadius: 20, alignItems: 'center', shadowColor: '#0055d4', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 8 }}>
            {createTaskMutation.isPending || uploading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>{(t?.createTask || 'Create Task')}</Text>}
          </TouchableOpacity>
        </View>
      )}

      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Text style={{ fontSize: 16, fontWeight: '900', color: '#1e293b', textTransform: 'uppercase', letterSpacing: 1 }}>{t.teacherTasks}</Text>
        <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '900', color: '#0055d4' }}>{filteredTasks.length} {(t?.tasks || 'tasks')}</Text>
        </View>
      </View>

      {loading && filteredTasks.length === 0 && (
        <View style={{ gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={{ backgroundColor: 'white', padding: 24, borderRadius: 32, marginBottom: 16, height: 160 }}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                <Skeleton width="70%" height={20} borderRadius={4} />
                <Skeleton width={40} height={20} borderRadius={10} />
              </View>
              <Skeleton width="100%" height={14} borderRadius={4} style={{ marginBottom: 8, alignSelf: isRTL ? 'flex-end' : 'flex-start' }} />
              <Skeleton width="80%" height={14} borderRadius={4} style={{ marginBottom: 20, alignSelf: isRTL ? 'flex-end' : 'flex-start' }} />
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
                <Skeleton width={80} height={12} borderRadius={4} />
                <Skeleton width={60} height={20} borderRadius={10} />
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Premium Header */}
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' }}>
          <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
            <ChevronLeft size={22} color="#1e293b" />
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => setShowClassSwitcher(true)} style={{ flex: 1, marginHorizontal: 16, alignItems: 'center' }}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b' }}>{selectedTeacherClass?.name || ((t?.selectClass2 || 'Select Class'))}</Text>
            <ChevronDown size={16} color="#0055d4" style={{ marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 }} />
          </View>
          <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginTop: 2 }}>{(t?.tapToSwitch2 || 'Tap to switch')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowAddForm(!showAddForm)} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dbeafe' }}>
          <Plus size={24} color="#0055d4" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 24, paddingBottom: 150 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          !loading && filteredTasks.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <CheckCircle2 size={48} color="#d1d5db" />
              <Text style={{ color: '#737c7f', fontWeight: 'bold', marginTop: 16 }}>{(t?.noActiveTasksFound || 'No active tasks found')}</Text>
            </View>
          ) : null
        }
      />

      {/* Class Switcher Modal */}
      {showClassSwitcher && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end', zIndex: 1000 }}>
          <TouchableOpacity activeOpacity={1} onPress={() => setShowClassSwitcher(false)} style={{ flex: 1 }} />
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 32, paddingBottom: 60, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 30, elevation: 20 }}>
            <View style={{ width: 40, height: 5, backgroundColor: '#e2e8f0', borderRadius: 10, alignSelf: 'center', marginBottom: 24 }} />
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#1e293b' }}>{(t?.switchClass2 || 'Switch Class')}</Text>
              <TouchableOpacity onPress={() => setShowClassSwitcher(false)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}><X size={20} color="#64748b" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              {classes.map((cls: any) => (
                <TouchableOpacity key={cls.id} onPress={() => handleClassSelect(cls)} activeOpacity={0.8} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', padding: 20, borderRadius: 24, backgroundColor: selectedTeacherClass?.id === cls.id ? '#eff6ff' : 'white', marginBottom: 12, borderWidth: 1.5, borderColor: selectedTeacherClass?.id === cls.id ? '#0055d4' : '#f1f5f9', shadowColor: selectedTeacherClass?.id === cls.id ? '#0055d4' : '#000', shadowOpacity: selectedTeacherClass?.id === cls.id ? 0.05 : 0.02, shadowRadius: 10, elevation: 1 }}>
                  <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: selectedTeacherClass?.id === cls.id ? '#0055d4' : '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
                    <Layout size={28} color={selectedTeacherClass?.id === cls.id ? 'white' : '#94a3b8'} />
                  </View>
                  <View style={{ marginLeft: isRTL ? 0 : 20, marginRight: isRTL ? 20 : 0, flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: selectedTeacherClass?.id === cls.id ? '#0055d4' : '#1e293b', textAlign: isRTL ? 'right' : 'left' }}>{cls.name}</Text>
                    <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: '700', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>{cls.level || ((t?.standard || 'Standard'))}</Text>
                  </View>
                  {selectedTeacherClass?.id === cls.id && (
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
