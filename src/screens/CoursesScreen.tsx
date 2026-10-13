import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Image, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Calculator, Book, Languages, Globe, Palette, Microscope, Music, BookOpen, 
  FileText, Download, ChevronDown, ChevronUp, X, Share2, Eye, LibraryBig
} from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { useLanguage } from '../context/LanguageContext';
import { studentService } from '../services/api';
import moment from 'moment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlobalHeader } from '../components/GlobalHeader';
import { useQuery } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useFocusEffect } from '@react-navigation/native';
import { downloadAndPreviewPDF } from '../utils/fileUtils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SUBJECT_THEMES: Record<string, { icon: any }> = {
  'Mathematics': { icon: Calculator },
  'Science': { icon: Microscope },
  'English': { icon: Languages },
  'French': { icon: Languages },
  'History': { icon: Book },
  'Geography': { icon: Globe },
  'Art': { icon: Palette },
  'Music': { icon: Music },
  'Default': { icon: BookOpen }
};

const DOMAIN_GROUPS = [
  { id: 'SCIENCES', title: 'SCIENCES', color: '#0055d4', bg: '#eff6ff', keywords: ['Science', 'Math', 'الإيقاظ', 'الرياضيات', 'Scientifique', 'Mathématiques', 'إعلامية', 'تكنولوجية'] },
  { id: 'LANGUAGES', title: 'LANGUAGES', color: '#0055d4', bg: '#eff6ff', keywords: ['Language', 'Arabe', 'Français', 'English', 'اللغة'] },
  { id: 'ARTS_TECH', title: 'ARTS & TECHNOLOGY', color: '#0055d4', bg: '#eff6ff', keywords: ['Art', 'Technologique', 'Musicale', 'تكنولوجية', 'موسيقية', 'تشكيلية', 'Plastiques', 'فنية'] },
  { id: 'HUMANITIES', title: 'HUMANITIES', color: '#0055d4', bg: '#eff6ff', keywords: ['History', 'Geography', 'التاريخ', 'الجغرافيا', 'Histoire', 'Géographie'] },
  { id: 'RELIGION', title: 'RELIGION & VALUES', color: '#0055d4', bg: '#eff6ff', keywords: ['Islamique', 'Civique', 'إسلامية', 'مدنية'] },
  { id: 'SPORT', title: 'SPORT', color: '#0055d4', bg: '#eff6ff', keywords: ['Sport', 'Physique', 'بدنية'] },
];

const getSubjectDomain = (subjectName: string) => {
  for (const domain of DOMAIN_GROUPS) {
    if (domain.keywords.some(kw => subjectName.toLowerCase().includes(kw.toLowerCase()))) {
      return domain;
    }
  }
  return { id: 'OTHER', title: 'OTHER SUBJECTS', color: '#0055d4', bg: '#eff6ff', keywords: [] };
};

export const CoursesScreen = ({ navigation }: any) => {
  const selectedChildId = useAppStore((s) => s.selectedChildId);
  const children = useAppStore((s) => s.children);
  const { t, isRTL, getTranslatedSubject } = useLanguage();
  const [viewedResources, setViewedResources] = useState<string[]>([]);
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});
  const [openingResourceId, setOpeningResourceId] = useState<number | null>(null);
  const child = children.find(c => c.id === selectedChildId);

  const [viewingMedia, setViewingMedia] = useState<{ url: string; title: string; subject?: string } | null>(null);

  const { data: courses = [], isLoading: loading, refetch, isStale } = useQuery({
    queryKey: ['courses', selectedChildId],
    queryFn: () => studentService.fetchCourses(selectedChildId!),
    enabled: !!selectedChildId,
    staleTime: 30_000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnMount: false,
  });

  useFocusEffect(useCallback(() => {
    if (selectedChildId && isStale) void refetch();
  }, [refetch, selectedChildId, isStale]));

  useEffect(() => {
    loadViewedResources();
  }, [selectedChildId]);

  const loadViewedResources = async () => {
    try {
      const stored = await AsyncStorage.getItem('@viewed_resources');
      if (stored) {
        setViewedResources(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load viewed resources', e);
    }
  };

  const markAsViewed = async (id: number) => {
    const strId = id.toString();
    if (!viewedResources.includes(strId)) {
      const updated = [...viewedResources, strId];
      setViewedResources(updated);
      try {
        await AsyncStorage.setItem('@viewed_resources', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save viewed resources', e);
      }
    }
  };

  const handleOpenResource = async (res: any, courseName?: string) => {
    markAsViewed(res.id);
    if (!res.url) return;

    const ext = res.url.split('.').pop()?.toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '') || res.url.includes('/images/') || res.url.includes('/notices/resources/');

    if (isImage) {
      setViewingMedia({ url: res.url, title: res.title, subject: courseName });
    } else {
      setOpeningResourceId(res.id);
      try {
        const cleanUrl = res.url.split('?')[0];
        const extension = cleanUrl.match(/\.([a-z0-9]{2,5})$/i)?.[1] || 'pdf';
        const titleHasExtension = /\.[a-z0-9]{2,5}$/i.test(res.title || '');
        await downloadAndPreviewPDF(res.url, titleHasExtension ? res.title : `${res.title || 'SnapSchool'}.${extension}`);
      } finally {
        setOpeningResourceId(null);
      }
    }
  };

  const toggleCourse = (id: string) => {
    setExpandedCourses(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const groupedCourses = useMemo(() => {
    const groups: Record<string, typeof courses> = {};
    courses.forEach(c => {
      const domain = getSubjectDomain(c.name);
      if (!groups[domain.id]) groups[domain.id] = [];
      groups[domain.id].push(c);
    });
    
    const sortedGroups = DOMAIN_GROUPS.map(d => ({ domain: d, items: groups[d.id] || [] })).filter(g => g.items.length > 0);
    if (groups['OTHER'] && groups['OTHER'].length > 0) {
      sortedGroups.push({ domain: getSubjectDomain('OTHER'), items: groups['OTHER'] });
    }
    return sortedGroups;
  }, [courses]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f6f8fb' }}>
        <ActivityIndicator size="large" color="#0055d4" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f6f8fb' }}>
      <GlobalHeader navigation={navigation} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ marginBottom: 22, width: '100%' }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#0055d4', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 5, textAlign: isRTL ? 'right' : 'left' }}>
            {(t as any).academicPortal || 'ACADEMIC PORTAL'}
          </Text>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#0f172a', letterSpacing: -0.4, textAlign: isRTL ? 'right' : 'left' }}>{(t as any).coursesHub || 'Courses Hub'}</Text>
          <Text style={{ fontSize: 14, color: '#64748b', marginTop: 5, fontWeight: '500', lineHeight: 20, textAlign: isRTL ? 'right' : 'left' }}>
            {(t as any).coursesSub || 'Your registered courses'} {child?.name || 'التلميذ'}.
          </Text>
        </View>

        {courses.length === 0 ? (
          <View style={{ padding: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderRadius: 28, borderWidth: 1, borderColor: '#f1f5f9' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <BookOpen size={32} color="#cbd5e1" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', marginBottom: 6 }}>{(t as any).noCourses || 'No courses yet'}</Text>
            <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: '700', textAlign: 'center', lineHeight: 20 }}>
              {(t as any).noCoursesSub || 'You will see courses here once assigned.'}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {groupedCourses.map((group) => (
              <View key={group.domain.id} style={{ backgroundColor: 'white', borderRadius: 22, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1 }}>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 2 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: isRTL ? 0 : 10, marginLeft: isRTL ? 10 : 0 }}>
                    <LibraryBig size={17} color="#0055d4" strokeWidth={2.3} />
                  </View>
                  <Text style={{ flex: 1, color: '#0f172a', fontWeight: '800', fontSize: 14, letterSpacing: 0.4, textAlign: isRTL ? 'right' : 'left' }}>
                    {group.domain.id === 'SCIENCES' ? ((t as any).domainSciences || group.domain.title) :
                     group.domain.id === 'LANGUAGES' ? ((t as any).domainLanguages || group.domain.title) :
                     group.domain.id === 'ARTS_TECH' ? ((t as any).domainArtsTech || group.domain.title) :
                     group.domain.id === 'HUMANITIES' ? ((t as any).domainHumanities || group.domain.title) :
                     group.domain.id === 'RELIGION' ? ((t as any).domainReligion || group.domain.title) :
                     group.domain.id === 'SPORT' ? ((t as any).domainSport || group.domain.title) :
                     group.domain.id === 'OTHER' ? ((t as any).domainOther || group.domain.title) : group.domain.title}
                  </Text>
                  <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 }}>
                    <Text style={{ color: '#64748b', fontSize: 11, fontWeight: '700' }}>{group.items.length}</Text>
                  </View>
                </View>
                
                <View>
                  {group.items.map((course, index) => {
                    const theme = Object.values(SUBJECT_THEMES).find((tTheme: any) => course.name.includes(Object.keys(SUBJECT_THEMES).find(k => SUBJECT_THEMES[k] === tTheme) || '')) || SUBJECT_THEMES.Default;
                    const ThemeIcon = theme.icon;
                    const arabicName = getTranslatedSubject(course.name);
                    const isExpanded = expandedCourses[course.id];

                    return (
                      <View key={course.id} style={{ borderTopWidth: index === 0 ? 0 : 1, borderTopColor: '#eef2f7' }}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => toggleCourse(course.id)}
                          style={{
                            flexDirection: isRTL ? 'row-reverse' : 'row',
                            alignItems: 'center',
                            paddingVertical: 14,
                          }}
                        >
                          <View style={{ width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: group.domain.bg, borderWidth: 1, borderColor: '#bfdbfe' }}>
                            <ThemeIcon color={group.domain.color} size={20} strokeWidth={2.5} />
                          </View>
                          <View style={{ flex: 1, marginHorizontal: 12, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b' }}>{arabicName}</Text>
                            <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '500', marginTop: 3 }} numberOfLines={1}>
                              {(t as any).teacher || 'Teacher'}: {course.teacher === 'Multiple Teachers' ? (isRTL ? 'الفريق التربوي' : 'Équipe pédagogique') : (course.teacher || '—')}
                            </Text>
                          </View>
                          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, gap: 5 }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155' }}>{course.resources?.length || 0}</Text>
                            <FileText size={13} color="#94a3b8" />
                            {isExpanded ? <ChevronUp size={15} color="#64748b" /> : <ChevronDown size={15} color="#64748b" />}
                          </View>
                        </TouchableOpacity>

                        {/* Resources Expanded View */}
                        {isExpanded && course.resources?.length > 0 && (
                          <View style={{ paddingBottom: 10, paddingLeft: isRTL ? 0 : 54, paddingRight: isRTL ? 54 : 0 }}>
                            {course.resources.map((res: any, idx: number) => {
                              const isNew = !viewedResources.includes(res.id.toString());
                              const ext = res.url?.split('.').pop()?.toLowerCase();
                              const isPdf = ext === 'pdf';
                              const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '');

                              return (
                                <TouchableOpacity
                                  key={res.id}
                                  onPress={() => handleOpenResource(res, arabicName)}
                                  activeOpacity={0.85}
                                  style={{
                                    flexDirection: isRTL ? 'row-reverse' : 'row',
                                    alignItems: 'center',
                                    borderRadius: 12,
                                    padding: 11,
                                    marginBottom: 7,
                                    borderWidth: 1,
                                    borderColor: isNew ? '#bfdbfe' : '#f1f5f9',
                                    backgroundColor: isNew ? '#eff6ff' : '#f8fafc',
                                  }}
                                >
                                  <View style={{
                                    width: 40, height: 40, borderRadius: 10,
                                    backgroundColor: isPdf ? '#fee2e2' : isImage ? '#dbeafe' : '#f1f5f9',
                                    alignItems: 'center', justifyContent: 'center',
                                    marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0
                                  }}>
                                    {isPdf ? (
                                      <FileText color="#ef4444" size={18} />
                                    ) : isImage ? (
                                      <Eye color="#0055d4" size={18} />
                                    ) : (
                                      <FileText color={isNew ? "#3b82f6" : "#64748b"} size={18} />
                                    )}
                                  </View>
                                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#1e293b' }} numberOfLines={1}>{res.title}</Text>
                                    <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '700', marginTop: 2 }}>{moment(res.createdAt).format('MMM D, YYYY')}</Text>
                                  </View>
                                  <View style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' }}>
                                    {openingResourceId === res.id ? <ActivityIndicator size="small" color="#0055d4" /> : <Download color="#0055d4" size={16} />}
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                        {isExpanded && course.resources?.length === 0 && (
                          <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                            <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '700' }}>{(t as any).noFiles || 'No materials available'}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* In-App Media / Image Lightbox Modal */}
      {viewingMedia && (
        <Modal
          visible={!!viewingMedia}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setViewingMedia(null)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(11, 15, 25, 0.96)', justifyContent: 'space-between', paddingVertical: Platform.OS === 'ios' ? 50 : 30 }}>
            {/* Top Bar */}
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 }}>
              <View style={{ flex: 1, marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }}>
                <Text style={{ color: 'white', fontSize: 17, fontWeight: '900', textAlign: isRTL ? 'right' : 'left' }} numberOfLines={1}>
                  {viewingMedia.title}
                </Text>
                {viewingMedia.subject && (
                  <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '700', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>
                    {getTranslatedSubject(viewingMedia.subject)}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setViewingMedia(null)}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={22} color="white" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Main Image View */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10 }}>
              <Image
                source={{ uri: viewingMedia.url }}
                style={{ width: SCREEN_WIDTH - 20, height: SCREEN_HEIGHT * 0.72 }}
                resizeMode="contain"
              />
            </View>

            {/* Bottom Actions Bar */}
            <View style={{ paddingHorizontal: 20, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'center', gap: 16 }}>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const filename = viewingMedia.url.split('/').pop()?.split('?')[0] || `snapschool_${Date.now()}.jpg`;
                    const cacheDir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
                    const localUri = `${cacheDir}${filename}`;
                    const downloadResult = await FileSystem.downloadAsync(viewingMedia.url, localUri);

                    if (await Sharing.isAvailableAsync()) {
                      await Sharing.shareAsync(downloadResult.uri, {
                        mimeType: downloadResult.uri.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
                        dialogTitle: viewingMedia.title || 'SnapSchool Document',
                      });
                    } else {
                      await WebBrowser.openBrowserAsync(viewingMedia.url);
                    }
                  } catch (err) {
                    console.warn(err);
                  }
                }}
                style={{
                  backgroundColor: '#0055d4',
                  paddingHorizontal: 24,
                  paddingVertical: 14,
                  borderRadius: 20,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <Share2 size={18} color="white" />
                <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>
                  {isRTL ? 'مشاركة أو حفظ' : 'Partager / Enregistrer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};
