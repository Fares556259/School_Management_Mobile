import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, RefreshControl, StatusBar, Linking,
  Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, Plus, BookOpen, Link as LinkIcon, FileText,
  Paperclip, ChevronDown, X, Check, Layout, ExternalLink,
  Calendar, Upload
} from 'lucide-react-native';
import { teacherService, API_BASE_URL } from '../../services/api';
import { Skeleton } from '../../components/Skeleton';
import { useAppStore } from '../../store/useAppStore';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

// ─── Helper for Arabic Subject Name ───────────────────────────────────────────
const getSubjectName = (name: string) => {
  if (!name) return 'General';
  const parts = name.split('|');
  return parts[parts.length - 1].trim();
};

// ─── Resource Card ──────────────────────────────────────────────────────────
const ResourceCard = ({ item }: any) => {
  const isLink = item.url?.startsWith('http') && !item.url?.includes('upload');
  const ext = item.url?.split('.').pop()?.toLowerCase();
  const isPdf = ext === 'pdf';

  const open = () => {
    if (item.url) Linking.openURL(item.url);
  };

  return (
    <TouchableOpacity
      onPress={open}
      activeOpacity={0.85}
      style={{
        backgroundColor: 'white', borderRadius: 20, padding: 18,
        marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9',
        flexDirection: 'row', alignItems: 'center'
      }}
    >
      <View style={{
        width: 48, height: 48, borderRadius: 14,
        backgroundColor: isPdf ? '#fff7ed' : '#eff6ff',
        alignItems: 'center', justifyContent: 'center', marginRight: 16
      }}>
        {isPdf ? <FileText size={24} color="#f59e0b" /> : <LinkIcon size={24} color="#0055d4" />}
      </View>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#1e293b' }} numberOfLines={1}>{item.title}</Text>
        {item.description ? (
          <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '500', marginTop: 3, marginBottom: 2, lineHeight: 18 }} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '700', marginTop: item.description ? 4 : 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {getSubjectName(item.subject)} · {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>
      </View>
      <ExternalLink size={18} color="#94a3b8" />
    </TouchableOpacity>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
export const TeacherLessonsScreen = ({ navigation }: any) => {
  const { selectedTeacherClass, setSelectedTeacherClass } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [resources, setResources] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const selectedClass = selectedTeacherClass;
  const [showAddForm, setShowAddForm] = useState(false);
  const [showClassSwitcher, setShowClassSwitcher] = useState(false);
  const [showFilterSubjectSwitcher, setShowFilterSubjectSwitcher] = useState(false);
  const [selectedFilterSubject, setSelectedFilterSubject] = useState<string>('');

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; uri: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  // ── Load classes and subjects once
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [classesRes, profileRes] = await Promise.all([
          teacherService.fetchClasses(),
          teacherService.fetchProfile()
        ]);
        
        if (Array.isArray(classesRes) && classesRes.length > 0) {
          setClasses(classesRes);
          if (!selectedTeacherClass) {
            setSelectedTeacherClass(classesRes[0]);
          }
        }
        
        if (profileRes && profileRes.subjects) {
          setSubjects(profileRes.subjects);
          if (profileRes.subjects.length > 0) {
            setSelectedSubjectId(profileRes.subjects[0].id.toString());
          }
        }
      } catch (e) {
        console.error('[Lessons Bootstrap]', e);
      }
    };
    bootstrap();
  }, []);

  // ── Load resources when class changes
  const loadResources = useCallback(async () => {
    if (!selectedClass) return;
    try {
      setLoading(true);
      const res = await teacherService.fetchResources(selectedClass.id.toString());
      if (res && res.resources) {
        setResources(res.resources);
        if (res.classSubjects && Array.isArray(res.classSubjects)) {
          setSubjects(res.classSubjects);
          if (res.classSubjects.length > 0) {
            setSelectedSubjectId(res.classSubjects[0].id.toString());
            setSelectedFilterSubject(prev => prev || getSubjectName(res.classSubjects[0].name));
          }
        }
      } else {
        setResources(Array.isArray(res) ? res : []);
      }
    } catch (e) {
      console.error('[Resources Load]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedClass]);

  useEffect(() => { loadResources(); }, [loadResources]);

  // ── Pick files (docs or images)
  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true, copyToCacheDirectory: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newFiles = result.assets.map(f => ({ name: f.name, uri: f.uri }));
        setAttachedFiles(prev => [...prev, ...newFiles]);
        if (!formTitle && newFiles.length === 1 && attachedFiles.length === 0) {
          setFormTitle(newFiles[0].name.replace(/\.[^.]+$/, ''));
        }
      }
    } catch (e: any) {
      Alert.alert('Error', 'Could not pick files');
    }
  };

  // ── Upload to server then save resource
  const handleUpload = async () => {
    if (!formTitle.trim()) { Alert.alert('Required', 'Please enter a title.'); return; }
    if (attachedFiles.length === 0) { Alert.alert('Required', 'Attach at least one file or image.'); return; }

    try {
      setUploading(true);
      let finalUrl = '';

      if (attachedFiles.length > 0) {
        const uploadPromises = attachedFiles.map(async (file) => {
          const form = new FormData();
          form.append('file', { uri: file.uri, name: file.name, type: 'application/octet-stream' } as any);
          form.append('folder', 'resources');

          const uploadRes = await fetch(`${API_BASE_URL}/api/mobile/upload`, {
            method: 'POST',
            body: form,
          });
          const uploadData = await uploadRes.json();
          if (!uploadData?.url) throw new Error(`Upload failed for ${file.name}`);
          return uploadData.url;
        });

        const urls = await Promise.all(uploadPromises);
        finalUrl = urls.join(',');
      }

      const saved = await teacherService.uploadResource({
        classId: selectedClass.id.toString(),
        subjectId: selectedSubjectId,
        title: formTitle.trim(),
        description: formDescription.trim(),
        url: finalUrl,
      });

      if (saved && Array.isArray(saved)) {
        setResources(prev => [...saved, ...prev]);
        // Reset form
        setFormTitle(''); setFormDescription(''); setAttachedFiles([]);
        setShowAddForm(false);
        const titleText = saved.length > 1 ? `${saved.length} files` : `"${saved[0].title}"`;
        Alert.alert('✅ Uploaded', `${titleText} now visible to students.`);
      } else if (saved && saved.id) {
        setResources(prev => [saved, ...prev]);
        // Reset form
        setFormTitle(''); setFormDescription(''); setAttachedFiles([]);
        setShowAddForm(false);
        Alert.alert('✅ Uploaded', `"${saved.title}" is now visible to students.`);
      } else {
        throw new Error(saved?.error || 'Server error');
      }
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message || 'Unknown error');
    } finally {
      setUploading(false);
    }
  };

  const handleClassSelect = (cls: any) => {
    setSelectedTeacherClass(cls);
    setShowClassSwitcher(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
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

      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadResources(); }} tintColor="#0055d4" />}
      >
        {/* Add Material Modal */}
        <Modal
          visible={showAddForm}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAddForm(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
            <View style={{ backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, maxHeight: '90%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b' }}>Add Material</Text>
                <TouchableOpacity onPress={() => { setShowAddForm(false); setAttachedFiles([]); setFormTitle(''); }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={20} color="#64748b" />
                  </View>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Title */}
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Title *</Text>
                <TextInput
                  style={{ backgroundColor: '#f8fafc', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#f1f5f9', fontSize: 15, color: '#1e293b', marginBottom: 16 }}
                  placeholder="e.g. Chapter 3 Notes"
                  value={formTitle}
                  onChangeText={setFormTitle}
                />

                {/* Subject Picker (Inline list) */}
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Subject *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {subjects.map(s => {
                      const isActive = selectedSubjectId === s.id.toString();
                      return (
                        <TouchableOpacity
                          key={s.id}
                          onPress={() => setSelectedSubjectId(s.id.toString())}
                          style={{
                            paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14,
                            backgroundColor: isActive ? '#0055d4' : '#f8fafc',
                            borderWidth: 1.5, borderColor: isActive ? '#0055d4' : '#f1f5f9',
                            flexDirection: 'row', alignItems: 'center', gap: 8
                          }}
                        >
                          <BookOpen size={16} color={isActive ? 'white' : '#64748b'} />
                          <Text style={{ fontSize: 14, fontWeight: '800', color: isActive ? 'white' : '#1e293b' }}>
                            {getSubjectName(s.name)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Target Class Info */}
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Target Class</Text>
                <View style={{ backgroundColor: '#eff6ff', padding: 14, borderRadius: 14, marginBottom: 20, borderWidth: 1, borderColor: '#dbeafe', flexDirection: 'row', alignItems: 'center' }}>
                  <Layout size={18} color="#0055d4" />
                  <Text style={{ marginLeft: 10, color: '#0055d4', fontWeight: '800' }}>{selectedClass?.name || 'Loading...'}</Text>
                </View>

                {/* Description */}
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Description (optional)</Text>
                <TextInput
                  style={{ backgroundColor: '#f8fafc', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#f1f5f9', fontSize: 15, color: '#1e293b', marginBottom: 16, minHeight: 70, textAlignVertical: 'top' }}
                  placeholder="Brief description of this material..."
                  value={formDescription}
                  onChangeText={setFormDescription}
                  multiline
                />

                {/* Attached files list */}
                {attachedFiles.length > 0 && (
                  <View style={{ gap: 8, marginBottom: 12 }}>
                    {attachedFiles.map((f, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#dbeafe' }}>
                        <Paperclip size={16} color="#0055d4" />
                        <Text style={{ flex: 1, marginLeft: 8, color: '#0055d4', fontWeight: '700', fontSize: 13 }} numberOfLines={1}>{f.name}</Text>
                        <TouchableOpacity onPress={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))}>
                          <X size={16} color="#94a3b8" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Attach files */}
                <TouchableOpacity
                  onPress={pickFiles}
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed', marginBottom: 20, justifyContent: 'center' }}
                >
                  <Plus size={20} color="#94a3b8" />
                  <Text style={{ marginLeft: 10, color: '#94a3b8', fontWeight: '800', fontSize: 14 }}>
                    Attach Files or Images
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleUpload}
                  disabled={uploading || !formTitle.trim() || attachedFiles.length === 0}
                  style={{ backgroundColor: (!formTitle.trim() || attachedFiles.length === 0) ? '#94a3b8' : '#0055d4', paddingVertical: 16, borderRadius: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', opacity: uploading ? 0.7 : 1 }}
                >
                  {uploading ? <ActivityIndicator color="white" /> : (
                    <>
                      <Upload size={18} color="white" />
                      <Text style={{ color: 'white', fontWeight: '900', fontSize: 15, marginLeft: 10 }}>Upload & Share</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Resource List */}
        {loading && !refreshing ? (
          <View style={{ gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={{ marginBottom: 24 }}>
                <Skeleton width={120} height={16} borderRadius={4} style={{ marginBottom: 16 }} />
                {[1, 2].map((j) => (
                  <View key={j} style={{ backgroundColor: 'white', borderRadius: 20, padding: 18, marginBottom: 12, flexDirection: 'row', alignItems: 'center', height: 85 }}>
                    <Skeleton width={48} height={48} borderRadius={14} style={{ marginRight: 16 }} />
                    <View style={{ flex: 1 }}>
                      <Skeleton width="60%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
                      <Skeleton width="40%" height={12} borderRadius={4} />
                    </View>
                    <Skeleton width={20} height={20} borderRadius={10} />
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : (
          <View>
            {/* Subject Filter Dropdown (Always visible if subjects exist) */}
            {subjects.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <TouchableOpacity 
                  onPress={() => setShowFilterSubjectSwitcher(true)}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 20,
                    backgroundColor: '#f8fafc',
                    borderWidth: 1, borderColor: '#e2e8f0',
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <BookOpen size={18} color="#0055d4" style={{ marginRight: 12 }} />
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b' }}>
                      {selectedFilterSubject || 'All Subjects'}
                    </Text>
                  </View>
                  <ChevronDown size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            )}

            {/* Filtered Content Area */}
            {(() => {
              const filteredResources = resources.filter(r => getSubjectName(r.subject) === selectedFilterSubject);
              
              if (filteredResources.length === 0) {
                return (
                  <View style={{ alignItems: 'center', paddingVertical: 80 }}>
                    <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                      <BookOpen size={44} color="#0055d4" strokeWidth={2} />
                    </View>
                    <Text style={{ fontSize: 22, fontWeight: '900', color: '#1e293b', textAlign: 'center' }}>No Materials Yet</Text>
                    <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '600', textAlign: 'center', marginTop: 10, paddingHorizontal: 40, lineHeight: 22 }}>
                      Upload PDFs, notes, or links for your students to access.
                    </Text>
                    <TouchableOpacity onPress={() => setShowAddForm(true)} style={{ marginTop: 32, backgroundColor: '#0055d4', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 20 }}>
                      <Text style={{ color: 'white', fontWeight: '900', fontSize: 15 }}>Add Material</Text>
                    </TouchableOpacity>
                  </View>
                );
              }

              return (
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#1e293b' }}>Class Materials</Text>
                    <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                      <Text style={{ fontSize: 12, fontWeight: '900', color: '#0055d4' }}>{filteredResources.length} total files</Text>
                    </View>
                  </View>

                  {Object.entries(
                    filteredResources.reduce((acc, r) => {
                      const s = getSubjectName(r.subject);
                      if (!acc[s]) acc[s] = [];
                      acc[s].push(r);
                      return acc;
                    }, {} as Record<string, any[]>)
                  ).map(([subjectName, items]: [string, any]) => (
                    <View key={subjectName} style={{ marginBottom: 28 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                        <Text style={{ fontSize: 13, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>{subjectName}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#94a3b8' }}>{items.length} {items.length === 1 ? 'file' : 'files'}</Text>
                      </View>
                      {items.map((r: any) => <ResourceCard key={r.id} item={r} />)}
                    </View>
                  ))}
                </View>
              );
            })()}
        </View>
      )}
    </ScrollView>

      {/* Class Switcher Modal */}
      <Modal visible={showClassSwitcher} transparent animationType="slide" onRequestClose={() => setShowClassSwitcher(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1} onPress={() => setShowClassSwitcher(false)} style={{ flex: 1 }} />
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 32, paddingBottom: 60 }}>
            <View style={{ width: 40, height: 5, backgroundColor: '#e2e8f0', borderRadius: 10, alignSelf: 'center', marginBottom: 24 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#1e293b' }}>Switch Class</Text>
              <TouchableOpacity onPress={() => setShowClassSwitcher(false)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {classes.map(cls => (
                <TouchableOpacity
                  key={cls.id}
                  onPress={() => handleClassSelect(cls)}
                  activeOpacity={0.8}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, backgroundColor: selectedClass?.id === cls.id ? '#eff6ff' : 'white', marginBottom: 10, borderWidth: 1.5, borderColor: selectedClass?.id === cls.id ? '#0055d4' : '#f1f5f9' }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: selectedClass?.id === cls.id ? '#0055d4' : '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
                    <Layout size={24} color={selectedClass?.id === cls.id ? 'white' : '#94a3b8'} />
                  </View>
                  <Text style={{ marginLeft: 18, fontSize: 17, fontWeight: '900', color: selectedClass?.id === cls.id ? '#0055d4' : '#1e293b', flex: 1 }}>{cls.name}</Text>
                  {selectedClass?.id === cls.id && (
                    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#0055d4', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={14} color="white" strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Filter Subject Switcher Modal */}
      <Modal visible={showFilterSubjectSwitcher} transparent animationType="slide" onRequestClose={() => setShowFilterSubjectSwitcher(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' }}>
          <TouchableOpacity activeOpacity={1} onPress={() => setShowFilterSubjectSwitcher(false)} style={{ flex: 1 }} />
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 32, paddingBottom: 60 }}>
            <View style={{ width: 40, height: 5, backgroundColor: '#e2e8f0', borderRadius: 10, alignSelf: 'center', marginBottom: 24 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#1e293b' }}>Filter by Subject</Text>
              <TouchableOpacity onPress={() => setShowFilterSubjectSwitcher(false)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              {Array.from(new Set(subjects.map(s => getSubjectName(s.name)))).map(subjectName => {
                const isActive = selectedFilterSubject === subjectName;
                return (
                  <TouchableOpacity
                    key={subjectName}
                    onPress={() => {
                      setSelectedFilterSubject(subjectName);
                      setShowFilterSubjectSwitcher(false);
                    }}
                    activeOpacity={0.8}
                    style={{ flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, backgroundColor: isActive ? '#eff6ff' : 'white', marginBottom: 10, borderWidth: 1.5, borderColor: isActive ? '#0055d4' : '#f1f5f9' }}
                  >
                    <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: isActive ? '#0055d4' : '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
                      <BookOpen size={24} color={isActive ? 'white' : '#94a3b8'} />
                    </View>
                    <Text style={{ marginLeft: 18, fontSize: 17, fontWeight: '900', color: isActive ? '#0055d4' : '#1e293b', flex: 1 }}>{subjectName}</Text>
                    {isActive && (
                      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#0055d4', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={14} color="white" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
