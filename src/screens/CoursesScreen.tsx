import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Image, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Calculator, Book, Languages, Globe, Palette, Microscope, Music, BookOpen, 
  FileText, Download, ChevronDown, ChevronUp, X, Share2, Eye
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
import { SkeletonBlock } from '../components/SkeletonView';

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
  { id: 'SCIENCES', title: 'SCIENCES', color: '#0b57d0', bg: '#eff6ff', keywords: ['Science', 'Math', 'الإيقاظ', 'الرياضيات', 'Scientifique', 'Mathématiques', 'إعلامية', 'تكنولوجية'] },
  { id: 'LANGUAGES', title: 'LANGUAGES', color: '#174ea6', bg: '#eef4ff', keywords: ['Language', 'Arabe', 'Français', 'English', 'اللغة'] },
  { id: 'ARTS_TECH', title: 'ARTS & TECHNOLOGY', color: '#5b45af', bg: '#f5f3ff', keywords: ['Art', 'Technologique', 'Musicale', 'تكنولوجية', 'موسيقية', 'تشكيلية', 'Plastiques', 'فنية'] },
  { id: 'HUMANITIES', title: 'HUMANITIES', color: '#146c75', bg: '#ecfeff', keywords: ['History', 'Geography', 'التاريخ', 'الجغرافيا', 'Histoire', 'Géographie'] },
  { id: 'RELIGION', title: 'RELIGION & VALUES', color: '#7c4a03', bg: '#fffbeb', keywords: ['Islamique', 'Civique', 'إسلامية', 'مدنية'] },
  { id: 'SPORT', title: 'SPORT', color: '#126b4f', bg: '#ecfdf5', keywords: ['Sport', 'Physique', 'بدنية'] },
];

const getSubjectDomain = (subjectName: string) => {
  for (const domain of DOMAIN_GROUPS) {
    if (domain.keywords.some(kw => subjectName.toLowerCase().includes(kw.toLowerCase()))) {
      return domain;
    }
  }
  return { id: 'OTHER', title: 'OTHER SUBJECTS', color: '#334155', bg: '#f1f5f9', keywords: [] };
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
    staleTime: 5 * 60_000,
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

  const getDomainTitle = (domain: ReturnType<typeof getSubjectDomain>) => (
    domain.id === 'SCIENCES' ? ((t as any).domainSciences || domain.title) :
    domain.id === 'LANGUAGES' ? ((t as any).domainLanguages || domain.title) :
    domain.id === 'ARTS_TECH' ? ((t as any).domainArtsTech || domain.title) :
    domain.id === 'HUMANITIES' ? ((t as any).domainHumanities || domain.title) :
    domain.id === 'RELIGION' ? ((t as any).domainReligion || domain.title) :
    domain.id === 'SPORT' ? ((t as any).domainSport || domain.title) :
    ((t as any).domainOther || domain.title)
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f6f8fb' }}>
      <GlobalHeader navigation={navigation} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 20, width: '100%' }}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#0b57d0', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 5, textAlign: isRTL ? 'right' : 'left' }}>
                {(t as any).academicPortal || 'ESPACE DE CLASSE'}
              </Text>
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#0f172a', letterSpacing: -0.4, textAlign: isRTL ? 'right' : 'left' }}>
                {(t as any).coursesHub || 'Mes cours'}
              </Text>
            </View>
            {!!child?.class && (
              <View style={{ backgroundColor: '#e8f0fe', borderRadius: 12, paddingHorizontal: 11, paddingVertical: 7, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }}>
                <Text style={{ color: '#174ea6', fontSize: 12, fontWeight: '800' }}>{child.class}</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 14, color: '#64748b', marginTop: 6, fontWeight: '500', lineHeight: 20, textAlign: isRTL ? 'right' : 'left' }}>
            {(t as any).coursesSub || 'Cours et documents pour'} {child?.name || 'التلميذ'}.
          </Text>
        </View>

        {loading && courses.length === 0 ? (
          <View style={{ gap: 14 }}>
            {[0, 1, 2].map((cardIndex) => (
              <View
                key={cardIndex}
                style={{
                  backgroundColor: 'white',
                  borderRadius: 20,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                }}
              >
                <View style={{ height: 112, padding: 18, backgroundColor: '#e8eef6' }}>
                  <SkeletonBlock width={74} height={18} borderRadius={9} marginBottom={14} />
                  <SkeletonBlock width={cardIndex === 1 ? 180 : 214} height={22} borderRadius={8} marginBottom={9} />
                  <SkeletonBlock width={128} height={12} borderRadius={6} />
                </View>
                <View style={{ height: 56, paddingHorizontal: 18, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <SkeletonBlock width={94} height={14} borderRadius={7} />
                  <SkeletonBlock width={74} height={28} borderRadius={10} />
                </View>
              </View>
            ))}
          </View>
        ) : courses.length === 0 ? (
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
            {courses.map((course) => {
              const domain = getSubjectDomain(course.name);
              const themeKey = Object.keys(SUBJECT_THEMES).find((key) =>
                key !== 'Default' && course.name.toLowerCase().includes(key.toLowerCase())
              );
              const ThemeIcon = SUBJECT_THEMES[themeKey || 'Default'].icon;
              const courseName = getTranslatedSubject(course.name);
              const isExpanded = expandedCourses[course.id];
              const resources = course.resources || [];
              const newCount = resources.filter((resource: any) => !viewedResources.includes(resource.id.toString())).length;
              const teacherName = course.teacher === 'Multiple Teachers'
                ? (isRTL ? 'الفريق التربوي' : 'Équipe pédagogique')
                : (course.teacher || '—');

              return (
                <View
                  key={course.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: 20,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: '#dfe5ed',
                    shadowColor: '#0f172a',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.05,
                    shadowRadius: 10,
                    elevation: 2,
                  }}
                >
                  <TouchableOpacity activeOpacity={0.9} onPress={() => toggleCourse(course.id)}>
                    <View style={{ minHeight: 118, padding: 18, backgroundColor: domain.color }}>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                          <View style={{ backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 12 }}>
                            <Text style={{ color: 'white', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 }}>
                              {getDomainTitle(domain)}
                            </Text>
                          </View>
                          <Text style={{ color: 'white', fontSize: 21, fontWeight: '900', letterSpacing: -0.2, textAlign: isRTL ? 'right' : 'left' }} numberOfLines={2}>
                            {courseName}
                          </Text>
                          <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 12, fontWeight: '600', marginTop: 6, textAlign: isRTL ? 'right' : 'left' }} numberOfLines={1}>
                            {teacherName}
                          </Text>
                        </View>
                        <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', marginLeft: isRTL ? 0 : 14, marginRight: isRTL ? 14 : 0 }}>
                          <ThemeIcon color="white" size={24} strokeWidth={2.2} />
                        </View>
                      </View>
                    </View>

                    <View style={{ minHeight: 58, paddingHorizontal: 18, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', flex: 1 }}>
                        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: domain.bg, alignItems: 'center', justifyContent: 'center' }}>
                          <FileText size={16} color={domain.color} />
                        </View>
                        <Text style={{ marginHorizontal: 9, color: '#334155', fontSize: 13, fontWeight: '800' }}>
                          {resources.length} {resources.length === 1 ? 'document' : 'documents'}
                        </Text>
                        {newCount > 0 && (
                          <View style={{ backgroundColor: '#e8f0fe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
                            <Text style={{ color: '#174ea6', fontSize: 10, fontWeight: '900' }}>{newCount} nouveau</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                        <Text style={{ color: '#0b57d0', fontSize: 12, fontWeight: '800', marginRight: isRTL ? 0 : 6, marginLeft: isRTL ? 6 : 0 }}>
                          {isExpanded ? 'Fermer' : 'Ouvrir'}
                        </Text>
                        {isExpanded ? <ChevronUp size={17} color="#0b57d0" /> : <ChevronDown size={17} color="#0b57d0" />}
                      </View>
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={{ borderTopWidth: 1, borderTopColor: '#edf1f5', padding: 14, backgroundColor: '#fbfcfe' }}>
                      {resources.length > 0 ? resources.map((res: any) => {
                        const isNew = !viewedResources.includes(res.id.toString());
                        const ext = res.url?.split('?')[0].split('.').pop()?.toLowerCase();
                        const isPdf = ext === 'pdf';
                        const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '');

                        return (
                          <TouchableOpacity
                            key={res.id}
                            onPress={() => handleOpenResource(res, courseName)}
                            activeOpacity={0.82}
                            style={{
                              flexDirection: isRTL ? 'row-reverse' : 'row',
                              alignItems: 'center',
                              borderRadius: 13,
                              padding: 11,
                              marginBottom: 8,
                              borderWidth: 1,
                              borderColor: isNew ? '#b8cdf8' : '#e2e8f0',
                              backgroundColor: 'white',
                            }}
                          >
                            <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: isPdf ? '#fff1f0' : isImage ? '#eef4ff' : domain.bg, alignItems: 'center', justifyContent: 'center', marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }}>
                              {isImage ? <Eye color={domain.color} size={18} /> : <FileText color={isPdf ? '#d93025' : domain.color} size={18} />}
                            </View>
                            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                                <Text style={{ flexShrink: 1, fontSize: 14, fontWeight: '800', color: '#172033' }} numberOfLines={1}>{res.title}</Text>
                                {isNew && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#0b57d0', marginHorizontal: 7 }} />}
                              </View>
                              <Text style={{ fontSize: 11, color: '#718096', fontWeight: '600', marginTop: 3 }}>{moment(res.createdAt).format('D MMM YYYY')}</Text>
                            </View>
                            <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: 11, borderWidth: 1, borderColor: '#e2e8f0' }}>
                              {openingResourceId === res.id ? <ActivityIndicator size="small" color="#0b57d0" /> : <Download color="#0b57d0" size={17} />}
                            </View>
                          </TouchableOpacity>
                        );
                      }) : (
                        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: domain.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 9 }}>
                            <FileText size={20} color={domain.color} />
                          </View>
                          <Text style={{ color: '#64748b', fontSize: 13, fontWeight: '700' }}>{(t as any).noFiles || 'Aucun document disponible'}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
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
