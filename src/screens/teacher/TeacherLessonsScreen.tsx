import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, RefreshControl, StatusBar, Linking,
  Modal, KeyboardAvoidingView, Platform, Image, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, Plus, BookOpen, Link as LinkIcon, FileText,
  Paperclip, ChevronDown, X, Check, Layout, ExternalLink,
  Calendar, Upload, Image as ImageIcon, Trash2, Sparkles, CheckCircle2
} from 'lucide-react-native';
import { teacherService, API_BASE_URL, authStorage } from '../../services/api';
import { Skeleton } from '../../components/Skeleton';
import { useAppStore } from '../../store/useAppStore';
import { useLanguage } from '../../context/LanguageContext';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

// ─── Resource Card ──────────────────────────────────────────────────────────
const ResourceCard = ({ item }: any) => {
  const { t, getTranslatedSubject, isRTL } = useLanguage();
  const ext = item.url?.split('.').pop()?.toLowerCase();
  const isPdf = ext === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '') || item.url?.includes('/images/') || item.url?.includes('/notices/resources/');

  const open = () => {
    if (item.url) Linking.openURL(item.url);
  };

  return (
    <TouchableOpacity
      onPress={open}
      activeOpacity={0.85}
      style={{
        backgroundColor: 'white', borderRadius: 22, padding: 16,
        marginBottom: 12, borderWidth: 1.5, borderColor: '#f1f5f9',
        flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1
      }}
    >
      <View style={{
        width: 52, height: 52, borderRadius: 16,
        backgroundColor: isPdf ? '#fef2f2' : isImage ? '#eff6ff' : '#f8fafc',
        alignItems: 'center', justifyContent: 'center',
        marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0,
        overflow: 'hidden', borderWidth: 1, borderColor: isPdf ? '#fecaca' : isImage ? '#bfdbfe' : '#e2e8f0'
      }}>
        {isImage && item.url ? (
          <Image source={{ uri: item.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : isPdf ? (
          <FileText size={26} color="#ef4444" strokeWidth={2.2} />
        ) : (
          <LinkIcon size={24} color="#0055d4" strokeWidth={2.2} />
        )}
      </View>
      <View style={{ flex: 1, paddingRight: isRTL ? 0 : 8, paddingLeft: isRTL ? 8 : 0 }}>
        <Text style={{ fontSize: 16, fontWeight: '900', color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }} numberOfLines={1}>{item.title}</Text>
        {item.description ? (
          <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '500', marginTop: 2, marginBottom: 2, lineHeight: 18, textAlign: isRTL ? 'right' : 'left' }} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: isPdf ? '#fee2e2' : '#dbeafe' }}>
            <Text style={{ fontSize: 10, fontWeight: '900', color: isPdf ? '#dc2626' : '#1d4ed8', textTransform: 'uppercase' }}>
              {isPdf ? 'PDF' : isImage ? 'IMAGE' : 'DOC'}
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {getTranslatedSubject(item.subject)} · {new Date(item.createdAt).toLocaleDateString((t?.enus1 || 'en-US'), { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>
      <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
        <ExternalLink size={18} color="#94a3b8" />
      </View>
    </TouchableOpacity>
  );
};

interface AttachedItem {
  name: string;
  uri: string;
  type: 'IMAGE' | 'PDF';
  size?: number;
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export const TeacherLessonsScreen = ({ navigation }: any) => {
  const { selectedTeacherClass, setSelectedTeacherClass } = useAppStore();
  const { t, language, isRTL, getTranslatedSubject } = useLanguage();
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedItem[]>([]);
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
            setSelectedFilterSubject(prev => prev || getTranslatedSubject(res.classSubjects[0].name));
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

  // ── Pick Images (Max 5, compressed)
  const pickImages = async () => {
    const currentImages = attachedFiles.filter(f => f.type === 'IMAGE');
    const remaining = 5 - currentImages.length;
    
    if (remaining <= 0) {
      showInAppToast(language === 'ar' ? 'الحد الأقصى 5 صور فقط' : language === 'fr' ? 'Maximum 5 images autorisées' : 'Maximum 5 images allowed', 'error');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.75, // Compressed while keeping sharp readability
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const picked = result.assets.slice(0, remaining).map((asset, idx) => ({
          name: asset.fileName || `photo_${Date.now()}_${idx + 1}.jpg`,
          uri: asset.uri,
          type: 'IMAGE' as const,
          size: asset.fileSize,
        }));

        setAttachedFiles(prev => {
          const onlyImages = prev.filter(f => f.type === 'IMAGE');
          const combined = [...onlyImages, ...picked].slice(0, 5);
          if (!formTitle && combined.length > 0) {
            setFormTitle(combined[0].name.replace(/\.[^.]+$/, ''));
          }
          return combined;
        });
      }
    } catch (e: any) {
      showInAppToast(language === 'ar' ? 'تعذر اختيار الصور' : 'Could not pick images', 'error');
    }
  };

  // ── Pick PDF (Max 1)
  const pickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setAttachedFiles([{
          name: asset.name,
          uri: asset.uri,
          type: 'PDF' as const,
          size: asset.size,
        }]);
        if (!formTitle) {
          setFormTitle(asset.name.replace(/\.[^.]+$/, ''));
        }
      }
    } catch (e: any) {
      showInAppToast(language === 'ar' ? 'تعذر اختيار ملف PDF' : 'Could not pick PDF', 'error');
    }
  };

  const showInAppToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Upload to server then save resource
  const handleUpload = async () => {
    if (!formTitle.trim()) {
      showInAppToast(language === 'ar' ? 'يرجى إدخال عنوان للمادة' : 'Veuillez saisir un titre', 'error');
      return;
    }
    if (attachedFiles.length === 0) {
      showInAppToast(language === 'ar' ? 'يرجى إرفاق ملف PDF أو صور' : 'Veuillez joindre au moins un fichier', 'error');
      return;
    }

    try {
      setUploading(true);
      let finalUrl = '';

      if (attachedFiles.length > 0) {
        const schoolId = await authStorage.getSchoolId();
        const token = await authStorage.getToken();

        const uploadPromises = attachedFiles.map(async (file) => {
          const form = new FormData();
          const ext = file.name.split('.').pop()?.toLowerCase();
          const mimeType = file.type === 'PDF' || ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : 'image/jpeg';

          form.append('file', {
            uri: file.uri,
            name: file.name,
            type: mimeType
          } as any);
          form.append('type', 'resource');
          form.append('id', selectedSubjectId || 'general');

          const uploadRes = await fetch(`${API_BASE_URL}/api/mobile/upload`, {
            method: 'POST',
            body: form,
            headers: {
              'x-school-id': schoolId || '',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
          });
          const uploadData = await uploadRes.json();
          if (!uploadData?.url) throw new Error(uploadData?.error || `Upload failed for ${file.name}`);
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

      if (saved && (Array.isArray(saved) || saved.id)) {
        const newlyCreated = Array.isArray(saved) ? saved : [saved];
        setResources(prev => [...newlyCreated, ...prev]);
        // Reset form
        setFormTitle('');
        setFormDescription('');
        setAttachedFiles([]);
        setShowAddForm(false);

        const successMsg = language === 'ar'
          ? 'تم نشر المحتوى بنجاح للأولياء والطلاب ✨'
          : language === 'fr'
          ? 'Document publié avec succès ! ✨'
          : 'Material published successfully! ✨';
        showInAppToast(successMsg, 'success');
      } else {
        throw new Error(saved?.error || 'Server error');
      }
    } catch (e: any) {
      showInAppToast(e.message || (language === 'ar' ? 'فشل الرفع' : 'Upload failed'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleClassSelect = (cls: any) => {
    setSelectedTeacherClass(cls);
    setShowClassSwitcher(false);
  };

  const isImageMode = attachedFiles.some(f => f.type === 'IMAGE');
  const isPdfMode = attachedFiles.some(f => f.type === 'PDF');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' }}>
          <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
            <ChevronLeft size={22} color="#1e293b" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowClassSwitcher(true)} style={{ flex: 1, marginHorizontal: 16, alignItems: 'center' }}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b' }}>{selectedClass?.name || ((t?.selectClass1 || 'Select Class'))}</Text>
            <ChevronDown size={16} color="#0055d4" style={{ marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 }} />
          </View>
          <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginTop: 2 }}>{(t?.tapToSwitch1 || 'Tap to switch')}</Text>
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
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 19, fontWeight: '900', color: '#1e293b' }}>{(t?.addMaterial || 'Add Material')}</Text>
                  <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#0055d4' }}>{selectedClass?.name}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => { setShowAddForm(false); setAttachedFiles([]); setFormTitle(''); }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={20} color="#64748b" />
                  </View>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Title */}
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: isRTL ? 'right' : 'left' }}>{(t?.title || 'Title *')}</Text>
                <TextInput
                  style={{ backgroundColor: '#f8fafc', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#f1f5f9', fontSize: 15, color: '#1e293b', marginBottom: 16, textAlign: isRTL ? 'right' : 'left' }}
                  placeholder={(t?.egChapter3Notes || 'e.g. Chapter 3 Notes')}
                  placeholderTextColor="#94a3b8"
                  value={formTitle}
                  onChangeText={setFormTitle}
                />

                {/* Subject Picker (Inline list) */}
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: isRTL ? 'right' : 'left' }}>{(t?.subject || 'Subject *')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20, transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
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
                            flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8,
                            transform: [{ scaleX: isRTL ? -1 : 1 }]
                          }}
                        >
                          <BookOpen size={16} color={isActive ? 'white' : '#64748b'} />
                          <Text style={{ fontSize: 14, fontWeight: '800', color: isActive ? 'white' : '#1e293b' }}>
                            {getTranslatedSubject(s.name)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Description */}
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: isRTL ? 'right' : 'left' }}>{(t?.descriptionOptional1 || 'Description (optional)')}</Text>
                <TextInput
                  style={{ backgroundColor: '#f8fafc', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#f1f5f9', fontSize: 15, color: '#1e293b', marginBottom: 16, minHeight: 60, textAlignVertical: 'top', textAlign: isRTL ? 'right' : 'left' }}
                  placeholder={(t?.briefDescriptionOfThisMaterial || 'Brief description of this material...')}
                  placeholderTextColor="#94a3b8"
                  value={formDescription}
                  onChangeText={setFormDescription}
                  multiline
                />

                {/* Attachments Picker Tabs / Buttons */}
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: isRTL ? 'right' : 'left' }}>
                  {language === 'ar' ? 'إرفاق ملفات أو صور *' : language === 'fr' ? 'Joindre des fichiers *' : 'Attach Files *'}
                </Text>

                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10, marginBottom: 16 }}>
                  {/* Photos Button */}
                  <TouchableOpacity
                    onPress={pickImages}
                    activeOpacity={0.8}
                    style={{
                      flex: 1,
                      backgroundColor: isImageMode ? '#eff6ff' : '#f8fafc',
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                      borderRadius: 16,
                      borderWidth: 1.5,
                      borderColor: isImageMode ? '#0055d4' : '#e2e8f0',
                      alignItems: 'center',
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      justifyContent: 'center',
                      gap: 8
                    }}
                  >
                    <ImageIcon size={20} color={isImageMode ? '#0055d4' : '#64748b'} />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: isImageMode ? '#0055d4' : '#1e293b' }}>
                      {language === 'ar' ? 'صور (حتى 5)' : language === 'fr' ? 'Photos (max 5)' : 'Photos (max 5)'}
                    </Text>
                  </TouchableOpacity>

                  {/* PDF Button */}
                  <TouchableOpacity
                    onPress={pickPdf}
                    activeOpacity={0.8}
                    style={{
                      flex: 1,
                      backgroundColor: isPdfMode ? '#fef2f2' : '#f8fafc',
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                      borderRadius: 16,
                      borderWidth: 1.5,
                      borderColor: isPdfMode ? '#ef4444' : '#e2e8f0',
                      alignItems: 'center',
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      justifyContent: 'center',
                      gap: 8
                    }}
                  >
                    <FileText size={20} color={isPdfMode ? '#ef4444' : '#64748b'} />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: isPdfMode ? '#ef4444' : '#1e293b' }}>
                      {language === 'ar' ? 'ملف PDF (1)' : language === 'fr' ? 'Fichier PDF (1)' : 'PDF File (1)'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Rich Attachment Previews */}
                {isImageMode && (
                  <View style={{ marginBottom: 20 }}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b' }}>
                        {language === 'ar' ? `الصور المختارة (${attachedFiles.length}/5)` : `Photos sélectionnées (${attachedFiles.length}/5)`}
                      </Text>
                      {attachedFiles.length < 5 && (
                        <TouchableOpacity onPress={pickImages}>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#0055d4' }}>
                            {language === 'ar' ? '+ إضافة صورة' : '+ Ajouter'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        {attachedFiles.map((file, idx) => (
                          <View key={idx} style={{ width: 80, height: 80, borderRadius: 16, overflow: 'hidden', borderWidth: 1.5, borderColor: '#dbeafe', position: 'relative', transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
                            <Image source={{ uri: file.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            <TouchableOpacity
                              onPress={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                              style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(15,23,42,0.75)', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <X size={12} color="white" strokeWidth={3} />
                            </TouchableOpacity>
                            <View style={{ position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                              <Text style={{ color: 'white', fontSize: 9, fontWeight: '900' }}>#{idx + 1}</Text>
                            </View>
                          </View>
                        ))}

                        {attachedFiles.length < 5 && (
                          <TouchableOpacity
                            onPress={pickImages}
                            style={{ width: 80, height: 80, borderRadius: 16, borderWidth: 1.5, borderColor: '#cbd5e1', borderStyle: 'dashed', backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', transform: [{ scaleX: isRTL ? -1 : 1 }] }}
                          >
                            <Plus size={24} color="#94a3b8" />
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', marginTop: 2 }}>{5 - attachedFiles.length}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {isPdfMode && attachedFiles[0] && (
                  <View style={{ marginBottom: 20 }}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: '#fef2f2', padding: 14, borderRadius: 18, borderWidth: 1.5, borderColor: '#fecaca' }}>
                      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={24} color="#ef4444" strokeWidth={2.5} />
                      </View>
                      <View style={{ flex: 1, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }}>
                        <Text style={{ fontSize: 14, fontWeight: '900', color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }} numberOfLines={1}>
                          {attachedFiles[0].name}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '800', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>
                          PDF Document {attachedFiles[0].size ? `• ${(attachedFiles[0].size / 1024 / 1024).toFixed(1)} MB` : ''}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setAttachedFiles([])}
                        style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <X size={16} color="#ef4444" strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleUpload}
                  disabled={uploading || !formTitle.trim() || attachedFiles.length === 0}
                  style={{ backgroundColor: (!formTitle.trim() || attachedFiles.length === 0) ? '#94a3b8' : '#0055d4', paddingVertical: 16, borderRadius: 18, alignItems: 'center', flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'center', opacity: uploading ? 0.7 : 1, shadowColor: '#0055d4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 }}
                >
                  {uploading ? <ActivityIndicator color="white" /> : (
                    <>
                      <Upload size={18} color="white" />
                      <Text style={{ color: 'white', fontWeight: '900', fontSize: 16, marginLeft: isRTL ? 0 : 10, marginRight: isRTL ? 10 : 0 }}>
                        {(t?.uploadShare || 'Upload & Share')}
                      </Text>
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
                    flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                    <BookOpen size={18} color="#0055d4" style={{ marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }} />
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b' }}>
                      {selectedFilterSubject || ((t?.allSubjects || 'All Subjects'))}
                    </Text>
                  </View>
                  <ChevronDown size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            )}

            {/* Filtered Content Area */}
            {(() => {
              const filteredResources = resources.filter(r => getTranslatedSubject(r.subject) === selectedFilterSubject);
              
              if (filteredResources.length === 0) {
                return (
                  <View style={{ alignItems: 'center', paddingVertical: 80 }}>
                    <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                      <BookOpen size={44} color="#0055d4" strokeWidth={2} />
                    </View>
                    <Text style={{ fontSize: 22, fontWeight: '900', color: '#1e293b', textAlign: 'center' }}>{(t?.noMaterialsYet || 'No Materials Yet')}</Text>
                    <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '600', textAlign: 'center', marginTop: 10, paddingHorizontal: 40, lineHeight: 22 }}>
                      {(t?.uploadPdfsNotesOrLinks || 'Upload PDFs, notes, or links for your students to access.')}
                    </Text>
                    <TouchableOpacity onPress={() => setShowAddForm(true)} style={{ marginTop: 32, backgroundColor: '#0055d4', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 20 }}>
                      <Text style={{ color: 'white', fontWeight: '900', fontSize: 15 }}>{(t?.addMaterial1 || 'Add Material')}</Text>
                    </TouchableOpacity>
                  </View>
                );
              }

              return (
                <View>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#1e293b' }}>{t.teacherLessons}</Text>
                    <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                      <Text style={{ fontSize: 12, fontWeight: '900', color: '#0055d4' }}>{filteredResources.length} {t.teacherFiles}</Text>
                    </View>
                  </View>

                  {Object.entries(
                    filteredResources.reduce((acc, r) => {
                      const s = getTranslatedSubject(r.subject);
                      if (!acc[s]) acc[s] = [];
                      acc[s].push(r);
                      return acc;
                    }, {} as Record<string, any[]>)
                  ).map(([subjectName, items]: [string, any]) => (
                    <View key={subjectName} style={{ marginBottom: 28 }}>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                        <Text style={{ fontSize: 13, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>{subjectName}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#94a3b8' }}>
                          {items.length} {items.length === 1 ? ((t?.file || 'file')) : ((t?.files || 'files'))}
                        </Text>
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
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#1e293b' }}>{(t?.switchClass1 || 'Switch Class')}</Text>
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
                  style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', padding: 18, borderRadius: 20, backgroundColor: selectedClass?.id === cls.id ? '#eff6ff' : 'white', marginBottom: 10, borderWidth: 1.5, borderColor: selectedClass?.id === cls.id ? '#0055d4' : '#f1f5f9' }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: selectedClass?.id === cls.id ? '#0055d4' : '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
                    <Layout size={24} color={selectedClass?.id === cls.id ? 'white' : '#94a3b8'} />
                  </View>
                  <Text style={{ marginLeft: isRTL ? 0 : 18, marginRight: isRTL ? 18 : 0, fontSize: 17, fontWeight: '900', color: selectedClass?.id === cls.id ? '#0055d4' : '#1e293b', flex: 1, textAlign: isRTL ? 'right' : 'left' }}>{cls.name}</Text>
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
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#1e293b' }}>{(t?.filterBySubject || 'Filter by Subject')}</Text>
              <TouchableOpacity onPress={() => setShowFilterSubjectSwitcher(false)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              {Array.from(new Set(subjects.map(s => getTranslatedSubject(s.name)))).map(subjectName => {
                const isActive = selectedFilterSubject === subjectName;
                return (
                  <TouchableOpacity
                    key={subjectName}
                    onPress={() => {
                      setSelectedFilterSubject(subjectName);
                      setShowFilterSubjectSwitcher(false);
                    }}
                    activeOpacity={0.8}
                    style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', padding: 18, borderRadius: 20, backgroundColor: isActive ? '#eff6ff' : 'white', marginBottom: 10, borderWidth: 1.5, borderColor: isActive ? '#0055d4' : '#f1f5f9' }}
                  >
                    <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: isActive ? '#0055d4' : '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
                      <BookOpen size={24} color={isActive ? 'white' : '#94a3b8'} />
                    </View>
                    <Text style={{ marginLeft: isRTL ? 0 : 18, marginRight: isRTL ? 18 : 0, fontSize: 17, fontWeight: '900', color: isActive ? '#0055d4' : '#1e293b', flex: 1, textAlign: isRTL ? 'right' : 'left' }}>{subjectName}</Text>
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

      {/* In-App Toast Notification */}
      {toast && (
        <Animated.View style={{
          position: 'absolute',
          bottom: 36,
          alignSelf: 'center',
          backgroundColor: toast.type === 'success' ? '#059669' : '#dc2626',
          paddingHorizontal: 22,
          paddingVertical: 14,
          borderRadius: 30,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
          elevation: 10,
          zIndex: 9999,
          maxWidth: '90%'
        }}>
          {toast.type === 'success' ? (
            <CheckCircle2 color="white" size={20} strokeWidth={2.5} />
          ) : (
            <X color="white" size={20} strokeWidth={2.5} />
          )}
          <Text style={{
            color: 'white',
            fontWeight: '900',
            fontSize: 14,
            marginLeft: isRTL ? 0 : 10,
            marginRight: isRTL ? 10 : 0
          }}>
            {toast.message}
          </Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};
