import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Image, Dimensions, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Calculator, Book, Languages, Globe, Palette, Microscope, Music, BookOpen, 
  FileText, Download, ChevronDown, ChevronUp, X, Share2, Eye
} from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { useLanguage } from '../context/LanguageContext';
import { studentService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlobalHeader } from '../components/GlobalHeader';
import { useQuery } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useFocusEffect } from '@react-navigation/native';
import { downloadAndPreviewPDF } from '../utils/fileUtils';
import { SkeletonBlock } from '../components/SkeletonView';
import { useFonts } from 'expo-font';

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
  { id: 'SCIENCES', title: 'SCIENCES', color: '#416C9B', bg: '#EDF3F8', soft: '#DCE8F2', border: '#D7E3ED', keywords: ['Science', 'Math', 'الإيقاظ', 'الرياضيات', 'Scientifique', 'Mathématiques', 'إعلامية', 'تكنولوجية'] },
  { id: 'LANGUAGES', title: 'LANGUAGES', color: '#4E6590', bg: '#F0F3F8', soft: '#E0E6F0', border: '#DCE2EB', keywords: ['Language', 'Arabe', 'Français', 'English', 'اللغة'] },
  { id: 'ARTS_TECH', title: 'ARTS & TECHNOLOGY', color: '#74658E', bg: '#F5F2F7', soft: '#E9E3EE', border: '#E3DCE8', keywords: ['Art', 'Technologique', 'Musicale', 'تكنولوجية', 'موسيقية', 'تشكيلية', 'Plastiques', 'فنية'] },
  { id: 'HUMANITIES', title: 'HUMANITIES', color: '#4F7478', bg: '#EFF5F4', soft: '#DDEAE8', border: '#D8E6E3', keywords: ['History', 'Geography', 'التاريخ', 'الجغرافيا', 'Histoire', 'Géographie'] },
  { id: 'RELIGION', title: 'RELIGION & VALUES', color: '#836943', bg: '#F8F4EC', soft: '#EDE3D2', border: '#E9DFCE', keywords: ['Islamique', 'Civique', 'إسلامية', 'مدنية'] },
  { id: 'SPORT', title: 'SPORT', color: '#4F7664', bg: '#EFF5F1', soft: '#DDEAE2', border: '#D7E5DC', keywords: ['Sport', 'Physique', 'بدنية'] },
];

const COURSE_TONES = [
  { color: '#416C9B', bg: '#EDF3F8', soft: '#DCE8F2', border: '#D7E3ED' },
  { color: '#4F7664', bg: '#EFF5F1', soft: '#DDEAE2', border: '#D7E5DC' },
  { color: '#74658E', bg: '#F5F2F7', soft: '#E9E3EE', border: '#E3DCE8' },
  { color: '#836943', bg: '#F8F4EC', soft: '#EDE3D2', border: '#E9DFCE' },
  { color: '#4F7478', bg: '#EFF5F4', soft: '#DDEAE8', border: '#D8E6E3' },
  { color: '#895F6B', bg: '#F8F1F3', soft: '#F0E1E5', border: '#EAD9DE' },
  { color: '#586A86', bg: '#F1F4F8', soft: '#E2E8F0', border: '#DCE3EC' },
];

const getCourseTone = (subjectName: string, index: number) => {
  const hash = Array.from(subjectName).reduce((sum, char) => sum + char.charCodeAt(0), index * 17);
  return COURSE_TONES[hash % COURSE_TONES.length];
};

const getSubjectDomain = (subjectName: string) => {
  for (const domain of DOMAIN_GROUPS) {
    if (domain.keywords.some(kw => subjectName.toLowerCase().includes(kw.toLowerCase()))) {
      return domain;
    }
  }
  return { id: 'OTHER', title: 'OTHER SUBJECTS', color: '#5C6878', bg: '#F3F5F7', soft: '#E5E9ED', border: '#DEE3E8', keywords: [] };
};

const getTeacherName = (value: any, language: 'ar' | 'fr' | 'en') => {
  const teamLabel = language === 'ar' ? 'الفريق التربوي' : language === 'fr' ? 'Équipe pédagogique' : 'Teaching team';
  if (!value || value === 'Multiple Teachers') return value === 'Multiple Teachers' ? teamLabel : '—';
  if (typeof value === 'string') return value.replace(/\[object Object\]/gi, '').trim() || '—';
  if (typeof value === 'object') {
    return [value.name || value.firstName, value.surname || value.lastName].filter(Boolean).join(' ').trim() || teamLabel;
  }
  return '—';
};

export const CoursesScreen = ({ navigation }: any) => {
  const selectedChildId = useAppStore((s) => s.selectedChildId);
  const children = useAppStore((s) => s.children);
  const { t, isRTL, language, getTranslatedSubject, toWestern } = useLanguage();
  const [arabicFontLoaded] = useFonts({
    NotoSansArabic: require('../../assets/fonts/NotoSansArabic.ttf'),
  });
  const arabicText = isRTL && arabicFontLoaded ? { fontFamily: 'NotoSansArabic', fontWeight: 'normal' as const, letterSpacing: 0 } : undefined;
  const [viewedResources, setViewedResources] = useState<string[]>([]);
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});
  const [openingResourceId, setOpeningResourceId] = useState<number | null>(null);
  const [mediaAction, setMediaAction] = useState<'download' | 'share' | null>(null);
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

  const getMediaFile = (media: { url: string; title: string }) => {
    const urlPath = media.url.split('?')[0];
    const urlExtension = urlPath.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
    const extension = urlExtension && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'].includes(urlExtension) ? urlExtension : 'jpg';
    const mimeType = extension === 'pdf' ? 'application/pdf' : extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : extension === 'gif' ? 'image/gif' : 'image/jpeg';
    const safeTitle = (media.title || 'SnapSchool')
      .replace(/\.[a-z0-9]{2,5}$/i, '')
      .replace(/[^a-z0-9\u0600-\u06ff _-]/gi, '')
      .trim() || 'SnapSchool';
    return { extension, mimeType, safeTitle, filename: `${safeTitle}.${extension}` };
  };

  const cacheMedia = async (media: { url: string; title: string }) => {
    const file = getMediaFile(media);
    const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
    const localUri = `${cacheDir}${Date.now()}_${file.filename}`;
    const result = await FileSystem.downloadAsync(media.url, localUri);
    return { ...file, localUri: result.uri };
  };

  const downloadViewingMedia = async () => {
    if (!viewingMedia || mediaAction) return;
    setMediaAction('download');
    try {
      const file = await cacheMedia(viewingMedia);
      if (Platform.OS === 'android') {
        const initialDirectory = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Download');
        const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(initialDirectory);
        if (!permission.granted) return;
        const base64 = await FileSystem.readAsStringAsync(file.localUri, { encoding: FileSystem.EncodingType.Base64 });
        const targetUri = await FileSystem.StorageAccessFramework.createFileAsync(permission.directoryUri, file.safeTitle, file.mimeType);
        await FileSystem.StorageAccessFramework.writeAsStringAsync(targetUri, base64, { encoding: FileSystem.EncodingType.Base64 });
        Alert.alert(
          language === 'ar' ? 'تم التنزيل' : language === 'fr' ? 'Téléchargement terminé' : 'Download complete',
          language === 'ar' ? 'تم حفظ الملف في المجلد الذي اخترته.' : language === 'fr' ? 'Le fichier a été enregistré dans le dossier choisi.' : 'The file was saved in the folder you selected.',
        );
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.localUri, { mimeType: file.mimeType, dialogTitle: viewingMedia.title });
      } else {
        await WebBrowser.openBrowserAsync(viewingMedia.url);
      }
    } catch (error) {
      console.warn('Media download failed', error);
      Alert.alert(
        language === 'ar' ? 'تعذر التنزيل' : language === 'fr' ? 'Téléchargement impossible' : 'Download failed',
        language === 'ar' ? 'يرجى المحاولة مرة أخرى.' : language === 'fr' ? 'Veuillez réessayer.' : 'Please try again.',
      );
    } finally {
      setMediaAction(null);
    }
  };

  const shareViewingMedia = async () => {
    if (!viewingMedia || mediaAction) return;
    setMediaAction('share');
    try {
      const file = await cacheMedia(viewingMedia);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.localUri, { mimeType: file.mimeType, dialogTitle: viewingMedia.title });
      } else {
        await WebBrowser.openBrowserAsync(viewingMedia.url);
      }
    } catch (error) {
      console.warn('Media sharing failed', error);
    } finally {
      setMediaAction(null);
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

  const formatResourceDate = (value: string | null | undefined) => {
    const date = new Date(value || '');
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(
      language === 'ar' ? 'ar-TN-u-nu-latn' : language === 'fr' ? 'fr-TN' : 'en-GB',
      { day: 'numeric', month: 'short', year: 'numeric' },
    );
  };

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
            {courses.map((course, courseIndex) => {
              const rawCourseName = String(course.name || '');
              const domain = getSubjectDomain(rawCourseName);
              const tone = getCourseTone(rawCourseName, courseIndex);
              const themeKey = Object.keys(SUBJECT_THEMES).find((key) =>
                key !== 'Default' && rawCourseName.toLowerCase().includes(key.toLowerCase())
              );
              const ThemeIcon = SUBJECT_THEMES[themeKey || 'Default'].icon;
              const courseName = getTranslatedSubject(rawCourseName);
              const isExpanded = expandedCourses[course.id];
              const resources = Array.isArray(course.resources) ? course.resources : [];
              const newCount = resources.filter((resource: any) => !viewedResources.includes(resource.id.toString())).length;
              const teacherName = getTeacherName(course.teacher, language);

              return (
                <View
                  key={course.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: 20,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: tone.border,
                    shadowColor: '#0f172a',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.035,
                    shadowRadius: 8,
                    elevation: 1,
                  }}
                >
                  <TouchableOpacity activeOpacity={0.9} onPress={() => toggleCourse(course.id)}>
                    <View style={{ height: 128, padding: 18, backgroundColor: tone.bg }}>
                      <View
                        style={{
                          position: 'absolute',
                          top: 18,
                          bottom: 18,
                          [isRTL ? 'right' : 'left']: 0,
                          width: 4,
                          borderTopRightRadius: isRTL ? 0 : 4,
                          borderBottomRightRadius: isRTL ? 0 : 4,
                          borderTopLeftRadius: isRTL ? 4 : 0,
                          borderBottomLeftRadius: isRTL ? 4 : 0,
                          backgroundColor: tone.color,
                        }}
                      />
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                          <View style={{ backgroundColor: tone.soft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 10 }}>
                            <Text style={[{ color: tone.color, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 }, arabicText]}>
                              {getDomainTitle(domain)}
                            </Text>
                          </View>
                          <Text style={[{ width: '100%', color: '#172033', fontSize: 21, fontWeight: '900', letterSpacing: -0.2, textAlign: isRTL ? 'right' : 'left' }, arabicText]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.86}>
                            {courseName}
                          </Text>
                          <Text style={{ color: '#657184', fontSize: 12, fontWeight: '600', marginTop: 4, textAlign: isRTL ? 'right' : 'left' }} numberOfLines={1}>
                            {teacherName}
                          </Text>
                        </View>
                        <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: tone.soft, alignItems: 'center', justifyContent: 'center', marginLeft: isRTL ? 0 : 14, marginRight: isRTL ? 14 : 0 }}>
                          <ThemeIcon color={tone.color} size={24} strokeWidth={2.2} />
                        </View>
                      </View>
                    </View>

                    <View style={{ height: 58, paddingHorizontal: 18, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', flex: 1 }}>
                        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }}>
                          <FileText size={16} color={tone.color} />
                        </View>
                        <Text style={[{ marginHorizontal: 9, color: '#334155', fontSize: 13, fontWeight: '800' }, arabicText]}>
                          {toWestern(resources.length)} {resources.length === 1 ? (t as any).courseDocument : (t as any).courseDocuments}
                        </Text>
                        {newCount > 0 && (
                          <View style={{ backgroundColor: '#e8f0fe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
                            <Text style={[{ color: '#174ea6', fontSize: 10, fontWeight: '900' }, arabicText]}>{toWestern(newCount)} {(t as any).courseNew}</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                        <Text style={[{ color: '#0b57d0', fontSize: 12, fontWeight: '800', marginRight: isRTL ? 0 : 6, marginLeft: isRTL ? 6 : 0 }, arabicText]}>
                          {isExpanded ? (t as any).courseClose : (t as any).courseOpen}
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
                            <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: isPdf ? '#fff1f0' : isImage ? '#eef4ff' : tone.bg, alignItems: 'center', justifyContent: 'center', marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }}>
                              {isImage ? <Eye color={tone.color} size={18} /> : <FileText color={isPdf ? '#d93025' : tone.color} size={18} />}
                            </View>
                            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                                <Text style={{ flexShrink: 1, fontSize: 14, fontWeight: '800', color: '#172033' }} numberOfLines={1}>{res.title}</Text>
                                {isNew && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#0b57d0', marginHorizontal: 7 }} />}
                              </View>
                              <Text style={[{ fontSize: 11, color: '#718096', fontWeight: '600', marginTop: 3 }, arabicText]}>{formatResourceDate(res.createdAt)}</Text>
                            </View>
                            <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: 11, borderWidth: 1, borderColor: '#e2e8f0' }}>
                              {openingResourceId === res.id ? <ActivityIndicator size="small" color="#0b57d0" /> : <Download color="#0b57d0" size={17} />}
                            </View>
                          </TouchableOpacity>
                        );
                      }) : (
                        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 9 }}>
                            <FileText size={20} color={tone.color} />
                          </View>
                          <Text style={[{ color: '#64748b', fontSize: 13, fontWeight: '700' }, arabicText]}>{(t as any).noCourseDocuments}</Text>
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
          <View style={{ flex: 1, backgroundColor: '#0B1220', paddingTop: Platform.OS === 'ios' ? 50 : 24, paddingBottom: Platform.OS === 'ios' ? 34 : 22 }}>
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
                style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={22} color="white" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Main Image View */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 18 }}>
              <View style={{ width: SCREEN_WIDTH - 32, maxHeight: SCREEN_HEIGHT * 0.7, flex: 1, borderRadius: 22, overflow: 'hidden', backgroundColor: '#111827', borderWidth: 1, borderColor: '#263449', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 18, elevation: 10 }}>
                <Image
                  source={{ uri: viewingMedia.url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Bottom Actions Bar */}
            <View style={{ paddingHorizontal: 20, flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={downloadViewingMedia}
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  backgroundColor: '#0B6FE8',
                  paddingVertical: 14,
                  borderRadius: 16,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                {mediaAction === 'download' ? <ActivityIndicator size="small" color="white" /> : <Download size={18} color="white" />}
                <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>
                  {language === 'ar' ? 'تنزيل' : language === 'fr' ? 'Télécharger' : 'Download'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={shareViewingMedia}
                style={{ flex: 1, justifyContent: 'center', backgroundColor: '#182235', paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: '#334155', flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}
              >
                {mediaAction === 'share' ? <ActivityIndicator size="small" color="white" /> : <Share2 size={18} color="white" />}
                <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>
                  {language === 'ar' ? 'مشاركة' : language === 'fr' ? 'Partager' : 'Share'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};
