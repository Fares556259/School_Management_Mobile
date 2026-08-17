import React, { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, RefreshControl, Image, StatusBar, FlatList, ScrollView, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, ChevronRight, Plus, Calendar, Clock, Type, FileText, Save, Trash2, CheckCircle2,
  AlertCircle, ChevronDown, X, Check, Layout, Image as ImageIcon, File as FileIcon
} from 'lucide-react-native';
import { teacherService, API_BASE_URL, authStorage } from '../../services/api';
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
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(moment());
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);

  // Calendar Calculation for pure JS Picker
  const startOfMonth = calendarMonth.clone().startOf('month');
  const startDayOfWeek = startOfMonth.day();
  const daysInMonth: (moment.Moment | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    daysInMonth.push(null);
  }
  for (let i = 1; i <= calendarMonth.daysInMonth(); i++) {
    daysInMonth.push(calendarMonth.clone().date(i));
  }
  const headerDays = language === 'ar' 
    ? ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
    : language === 'fr' 
    ? ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ['teacherClasses'],
    staleTime: 1000 * 60 * 5, // 5 minutes
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
    staleTime: 1000 * 60 * 5, // 5 minutes
    queryFn: async () => {
      const res = await teacherService.fetchTasks();
      return Array.isArray(res) ? res : [];
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => await teacherService.createTask(taskData),
    onSuccess: (data, variables: any) => {
      // Optimistic update to make it appear instantly
      const selectedClass = classes.find(c => c.id === variables.classId);
      const newTask = {
        id: data?.id || 'temp-' + Date.now(),
        title: variables.title,
        description: variables.description,
        className: selectedClass?.name || 'Class',
        classId: variables.classId,
        attachments: variables.attachments || [],
        total: 0,
        submitted: 0,
        dueDate: variables.dueDate ? new Date(variables.dueDate) : null,
      };

      queryClient.setQueryData(['teacherTasks'], (oldData: any) => {
        return [newTask, ...(Array.isArray(oldData) ? oldData : [])];
      });

      // Still invalidate to ensure backend sync
      queryClient.invalidateQueries({ queryKey: ['teacherTasks'] });
      
      setShowAddForm(false);
      setTitle('');
      setDescription('');
      setDueDate(null);
      setAttachments([]);
      Alert.alert(
        language === 'ar' ? 'نجاح' : language === 'fr' ? 'Succès' : 'Success', 
        language === 'ar' ? 'تم إنشاء المهمة بنجاح' : language === 'fr' ? 'Tâche créée avec succès' : 'Task created successfully'
      );
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
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5 - attachments.length,
      quality: 0.3,
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

    const currentTitle = title;
    const currentDescription = description;
    const currentClassId = selectedClassId;
    const currentDueDate = dueDate ? dueDate.toISOString() : null;
    const currentAttachments = [...attachments];

    setShowAddForm(false);
    setTitle('');
    setDescription('');
    setDueDate(null);
    setAttachments([]);

    const selectedClass = classes.find(c => c.id === currentClassId);
    const optimisticTask = {
      id: 'temp-' + Date.now(),
      title: currentTitle,
      description: currentDescription,
      className: selectedClass?.name || 'Class',
      classId: currentClassId,
      attachments: currentAttachments.map(a => ({ uri: a.uri })),
      total: 0,
      submitted: 0,
      dueDate: currentDueDate ? new Date(currentDueDate) : null,
      isUploading: true,
    };

    queryClient.setQueryData(['teacherTasks'], (oldData: any) => {
      return [optimisticTask, ...(Array.isArray(oldData) ? oldData : [])];
    });

    try {
      const uploadPromises = currentAttachments.map(async (asset) => {
        const formData = new FormData();
        const filename = asset.uri.split('/').pop() || `image_${Date.now()}.jpg`;
        formData.append('file', {
          uri: asset.uri,
          name: filename,
          type: 'image/jpeg'
        } as any);

        const token = await authStorage.getToken();
        const uploadRes = await fetch(`${API_BASE_URL}/api/mobile/upload`, {
          method: 'POST',
          body: formData,
          headers: { 
            'Authorization': `Bearer ${token}`
          },
        });
        const uploadData = await uploadRes.json();
        if (uploadData?.url) {
          return { uri: uploadData.url };
        }
        return null;
      });

      const uploadedResults = await Promise.all(uploadPromises);
      const uploadedAttachments = uploadedResults.filter((result): result is { uri: string } => result !== null);

      console.log('[DEBUG-TASK] Creating task with dueDate:', currentDueDate, 'raw dueDate state was:', dueDate);
      
      await teacherService.createTask({
        title: currentTitle,
        description: currentDescription,
        classId: currentClassId,
        dueDate: currentDueDate,
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined
      });

      queryClient.invalidateQueries({ queryKey: ['teacherTasks'] });
    } catch (err) {
      console.error(err);
      queryClient.invalidateQueries({ queryKey: ['teacherTasks'] });
      Alert.alert('Error', 'Failed to process attachments');
    }
  };

  const handleClassSelect = (cls: any) => {
    setSelectedTeacherClass(cls);
    setSelectedClassId(cls.id);
    setShowClassSwitcher(false);
  };

  const filteredTasks = tasks.filter((t: any) => !selectedTeacherClass || t.classId === selectedTeacherClass.id || t.className === selectedTeacherClass.name);
  const loading = loadingClasses || loadingTasks;

  const renderTask = ({ item: task }: any) => {
    const hasDueDate = task.dueDate && moment(task.dueDate).year() > 1970;
    return (
      <TouchableOpacity key={task.id} activeOpacity={0.85} onPress={() => !task.isUploading && navigation.navigate('TeacherTaskDetail', { task })} style={{ backgroundColor: 'white', padding: 24, borderRadius: 32, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 15, elevation: 2, opacity: task.isUploading ? 0.6 : 1, position: 'relative', overflow: 'hidden' }}>
        {task.isUploading && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 10, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#0055d4" />
            <Text style={{ marginTop: 12, fontWeight: '800', color: '#0055d4' }}>{language === 'ar' ? 'جاري الإنشاء...' : language === 'fr' ? 'Création...' : 'Creating...'}</Text>
          </View>
        )}
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 19, fontWeight: '900', color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }}>{task.title}</Text>
            
            { (task.description || task.content || task.text) ? (
              <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '600', marginTop: 8, lineHeight: 22, textAlign: isRTL ? 'right' : 'left' }}>{task.description || task.content || task.text}</Text>
            ) : (
              <Text style={{ fontSize: 14, color: '#cbd5e1', fontWeight: '500', marginTop: 8, fontStyle: 'italic', textAlign: isRTL ? 'right' : 'left' }}>{(t?.noDescriptionProvided || 'No description provided')}</Text>
            )}

            {/* Date Badges: Uploaded and Due Date */}
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {(task.startDate || task.createdAt) && (
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: '#f1f5f9' }}>
                  <Calendar size={12} color="#64748b" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginLeft: isRTL ? 0 : 5, marginRight: isRTL ? 5 : 0 }}>
                    {language === 'ar' ? 'نُشر: ' : language === 'fr' ? 'Publié : ' : 'Posted: '}
                    {moment(task.startDate || task.createdAt).format('DD MMM YYYY')}
                  </Text>
                </View>
              )}
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: hasDueDate ? '#fff7ed' : '#f8fafc', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: hasDueDate ? '#ffedd5' : '#f1f5f9' }}>
                <Clock size={12} color={hasDueDate ? '#d97706' : '#64748b'} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: hasDueDate ? '#b45309' : '#64748b', marginLeft: isRTL ? 0 : 5, marginRight: isRTL ? 5 : 0 }}>
                  {language === 'ar' ? 'آخر موعد: ' : language === 'fr' ? 'Date limite : ' : 'Due: '}
                  {hasDueDate ? moment(task.dueDate).format('DD MMM YYYY') : (t?.notDetermined || (language === 'fr' ? 'Non déterminée' : language === 'ar' ? 'غير محدد' : 'Not set'))}
                </Text>
              </View>
            </View>

            {(task.attachments && task.attachments.length > 0) ? (
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8, marginTop: 14 }}>
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
               <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginTop: 14 }}>
                  <AlertCircle size={14} color="#cbd5e1" />
                  <Text style={{ fontSize: 11, color: '#cbd5e1', fontWeight: '700', marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 }}>{(t?.noAttachments || 'No attachments')}</Text>
               </View>
            )}

            {task.isUploading ? (
              <View style={{ marginTop: 20, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: '#eff6ff', padding: 12, borderRadius: 12, justifyContent: 'center' }}>
                <ActivityIndicator size="small" color="#0055d4" />
                <Text style={{ marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0, fontSize: 13, fontWeight: '700', color: '#0055d4' }}>{language === 'ar' ? 'جاري إنشاء المهمة...' : language === 'fr' ? 'Création de la tâche...' : 'Creating task...'}</Text>
              </View>
            ) : task.total > 0 && (
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
  };

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

          {/* Due Date (Optional) */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 12, fontWeight: '900', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', textAlign: isRTL ? 'right' : 'left' }}>
              {(t?.dueDateLabel || "Date limite")} ({(t?.optional || "Optionnel")})
            </Text>
            
            {dueDate ? (
              <View style={{ 
                flexDirection: isRTL ? 'row-reverse' : 'row', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                backgroundColor: '#fff7ed', 
                padding: 14, 
                borderRadius: 16, 
                borderWidth: 1, 
                borderColor: '#ffedd5' 
              }}>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
                  <Clock size={18} color="#d97706" />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#b45309' }}>
                    {moment(dueDate).format('DD MMM YYYY')}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setDueDate(null)} style={{ padding: 6, backgroundColor: '#ffedd5', borderRadius: 10 }}>
                  <X size={16} color="#b45309" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                onPress={() => setDatePickerVisibility(true)} 
                style={{ 
                  flexDirection: isRTL ? 'row-reverse' : 'row', 
                  alignItems: 'center', 
                  backgroundColor: '#f8fafc', 
                  padding: 16, 
                  borderRadius: 16, 
                  borderWidth: 1, 
                  borderColor: '#f1f5f9' 
                }}
              >
                <Calendar size={18} color="#64748b" />
                <Text style={{ marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0, fontSize: 14, fontWeight: '700', color: '#64748b' }}>
                  {(t?.chooseDueDateOptional || 'Définir une date limite (Optionnel)')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

      {isDatePickerVisible && (
        <Modal transparent animationType="fade" visible={isDatePickerVisible} onRequestClose={() => setDatePickerVisibility(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ backgroundColor: 'white', borderRadius: 28, padding: 20, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 }}>
              
              {/* Header Month Nav */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <TouchableOpacity onPress={() => setCalendarMonth(prev => prev.clone().subtract(1, 'month'))} style={{ padding: 8, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' }}>
                  <ChevronLeft size={20} color="#1e293b" />
                </TouchableOpacity>

                <Text style={{ fontSize: 17, fontWeight: '900', color: '#1e293b' }}>
                  {calendarMonth.format('MMMM YYYY')}
                </Text>

                <TouchableOpacity onPress={() => setCalendarMonth(prev => prev.clone().add(1, 'month'))} style={{ padding: 8, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' }}>
                  <ChevronRight size={20} color="#1e293b" />
                </TouchableOpacity>
              </View>

              {/* Days Header */}
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', marginBottom: 12 }}>
                {headerDays.map((day, idx) => (
                  <View key={`header-${idx}`} style={{ width: '14.28%', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#94a3b8' }}>{day}</Text>
                  </View>
                ))}
              </View>

              {/* Days Grid */}
              <View style={{ flexWrap: 'wrap', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                {daysInMonth.map((day, idx) => {
                  if (!day) return <View key={`empty-${idx}`} style={{ width: '14.28%', height: 38 }} />;
                  const isSelected = dueDate ? moment(dueDate).isSame(day, 'day') : false;
                  const isToday = moment().isSame(day, 'day');
                  return (
                    <TouchableOpacity 
                      key={day.format('YYYY-MM-DD')} 
                      onPress={() => {
                        setDueDate(day.clone().endOf('day').toDate());
                        setDatePickerVisibility(false);
                      }}
                      style={{ width: '14.28%', height: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}
                    >
                      <View style={{ 
                        width: 34, 
                        height: 34, 
                        borderRadius: 17, 
                        backgroundColor: isSelected ? '#0055d4' : isToday ? '#eff6ff' : 'transparent', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        borderWidth: isToday && !isSelected ? 1 : 0,
                        borderColor: '#bfdbfe'
                      }}>
                        <Text style={{ fontSize: 14, fontWeight: isSelected || isToday ? '900' : '600', color: isSelected ? 'white' : isToday ? '#0055d4' : '#1e293b' }}>
                          {day.date()}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Actions Footer */}
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 12, borderRadius: 14, alignItems: 'center' }}
                  onPress={() => setDatePickerVisibility(false)}
                >
                  <Text style={{ fontWeight: '800', color: '#64748b', fontSize: 14 }}>
                    {language === 'ar' ? 'إلغاء' : language === 'fr' ? 'Annuler' : 'Cancel'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', paddingVertical: 12, borderRadius: 14, alignItems: 'center' }}
                  onPress={() => {
                    setDueDate(moment().endOf('day').toDate());
                    setDatePickerVisibility(false);
                  }}
                >
                  <Text style={{ fontWeight: '800', color: '#0055d4', fontSize: 14 }}>
                    {language === 'ar' ? 'اليوم' : language === 'fr' ? "Aujourd'hui" : 'Today'}
                  </Text>
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </Modal>
      )}

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
              <TouchableOpacity onPress={pickImages} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', borderStyle: 'dashed' }}>
                <ImageIcon size={20} color="#0055d4" />
                <Text style={{ marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0, fontSize: 14, fontWeight: '800', color: '#0055d4' }}>{(t?.addImagesMax5 || 'Add Images (Max 5)')}</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
              onPress={handleCreateTask} 
              activeOpacity={0.8}
              style={{ backgroundColor: '#0055d4', paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#0055d4', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5, marginTop: 8 }}
            >
              <Text style={{ fontSize: 16, fontWeight: '900', color: 'white' }}>{(t?.assignATask || 'Assign Task')}</Text>
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
        ListHeaderComponent={renderHeader()}
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
