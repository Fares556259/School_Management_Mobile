import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Dimensions, Platform, Alert, ToastAndroid } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Calculator, Book, Languages, Globe, Palette, Microscope, Music, BookOpen, 
  FileText, Download, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, Share2, Eye, RefreshCw
} from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { useLanguage } from '../context/LanguageContext';
import { API_BASE_URL, studentService } from '../services/api';
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
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import ReactNativeBlobUtil from 'react-native-blob-util';

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

type ResourceKind = 'image' | 'pdf' | 'document';

const inferResourceKind = (resource: any): ResourceKind | null => {
  const url = String(resource?.url || '').split('?')[0].toLowerCase();
  const title = String(resource?.title || '').toLowerCase();
  const type = String(resource?.type || resource?.mimeType || resource?.contentType || '').toLowerCase();
  const hints = `${url} ${title} ${type}`;
  if (/application\/pdf|\bpdf\b|\.pdf(?:\s|$)/i.test(hints)) return 'pdf';
  if (/image\/|\.(?:jpe?g|png|webp|gif|heic|heif)(?:\s|$)/i.test(hints) || type === 'image') return 'image';
  if (/\.(?:docx?|xlsx?|pptx?|txt)(?:\s|$)/i.test(hints)) return 'document';
  return null;
};

const detectResourceKind = async (resource: any): Promise<ResourceKind> => {
  const inferred = inferResourceKind(resource);
  if (inferred) return inferred;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(resource.url, { method: 'HEAD', signal: controller.signal });
    const contentType = response.headers.get('content-type')?.toLowerCase() || '';
    if (contentType.includes('pdf')) return 'pdf';
    if (contentType.startsWith('image/')) return 'image';
    if (contentType) return 'document';
  } catch {
    // Some storage providers reject HEAD. Legacy resource paths without a
    // filename have historically contained images, so keep that fallback.
  } finally {
    clearTimeout(timeout);
  }
  return String(resource.url).includes('/notices/resources/') ? 'image' : 'document';
};

export const CoursesScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
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
  const [mediaStatus, setMediaStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [mediaRetryKey, setMediaRetryKey] = useState(0);
  const child = children.find(c => c.id === selectedChildId);

  const [viewingMedia, setViewingMedia] = useState<{ id: number; url: string; title: string; subject?: string; kind: ResourceKind } | null>(null);

  useEffect(() => {
    if (!viewingMedia || mediaStatus !== 'loading') return;
    const timeout = setTimeout(() => setMediaStatus('error'), 15000);
    return () => clearTimeout(timeout);
  }, [viewingMedia, mediaStatus, mediaRetryKey]);

  const { data: courses = [], isLoading: loading, refetch, isStale } = useQuery({
    queryKey: ['courses', selectedChildId],
    queryFn: () => studentService.fetchCourses(selectedChildId!),
    enabled: !!selectedChildId,
    staleTime: 5 * 60_000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnMount: false,
  });

  const previewableResources = courses.flatMap((course: any) => {
    const subject = getTranslatedSubject(String(course.name || ''));
    const resources = Array.isArray(course.resources) ? course.resources : [];
    return resources
      .map((resource: any) => ({ ...resource, subject, kind: inferResourceKind(resource) }))
      .filter((resource: any) => resource.url && (resource.kind === 'image' || resource.kind === 'pdf'));
  });
  const currentPreviewIndex = viewingMedia
    ? previewableResources.findIndex((resource: any) => resource.id === viewingMedia.id)
    : -1;
  const hasPreviousPreview = currentPreviewIndex > 0;
  const hasNextPreview = currentPreviewIndex >= 0 && currentPreviewIndex < previewableResources.length - 1;

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

  const getMediaFile = (media: { url: string; title: string; kind?: ResourceKind }) => {
    const urlPath = media.url.split('?')[0];
    const urlExtension = urlPath.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
    const extension = media.kind === 'pdf'
      ? 'pdf'
      : urlExtension && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'].includes(urlExtension)
        ? urlExtension
        : 'jpg';
    const mimeType = extension === 'pdf' ? 'application/pdf' : extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : extension === 'gif' ? 'image/gif' : 'image/jpeg';
    const safeTitle = (media.title || 'SnapSchool')
      .replace(/\.[a-z0-9]{2,5}$/i, '')
      .replace(/[^a-z0-9\u0600-\u06ff _-]/gi, '')
      .trim() || 'SnapSchool';
    return { extension, mimeType, safeTitle, filename: `${safeTitle}.${extension}` };
  };

  const cacheMedia = async (media: { url: string; title: string; kind?: ResourceKind }) => {
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
      if (Platform.OS === 'android') {
        const file = getMediaFile(viewingMedia);
        const downloadsDirectory = ReactNativeBlobUtil.fs.dirs.DownloadDir;
        let filename = file.filename;
        let destination = `${downloadsDirectory}/${filename}`;
        if (await ReactNativeBlobUtil.fs.exists(destination)) {
          filename = `${file.safeTitle}-${Date.now()}.${file.extension}`;
          destination = `${downloadsDirectory}/${filename}`;
        }
        await ReactNativeBlobUtil.config({
          addAndroidDownloads: {
            useDownloadManager: true,
            notification: true,
            mediaScannable: true,
            title: filename,
            description: language === 'ar' ? 'ملف من SnapSchool' : language === 'fr' ? 'Document SnapSchool' : 'SnapSchool file',
            mime: file.mimeType,
            path: destination,
          },
        }).fetch('GET', viewingMedia.url);
        ToastAndroid.show(
          language === 'ar' ? 'تم الحفظ في التنزيلات' : language === 'fr' ? 'Enregistré dans Téléchargements' : 'Saved to Downloads',
          ToastAndroid.LONG,
        );
      } else {
        const file = await cacheMedia(viewingMedia);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.localUri, { mimeType: file.mimeType, dialogTitle: viewingMedia.title });
        } else {
          await WebBrowser.openBrowserAsync(viewingMedia.url);
        }
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
    void markAsViewed(res.id);
    if (!res.url) return;
    setOpeningResourceId(res.id);
    try {
      const kind = await detectResourceKind(res);
      if (kind === 'image' || kind === 'pdf') {
        setMediaStatus('loading');
        setMediaRetryKey(0);
        setViewingMedia({ id: res.id, url: res.url, title: res.title, subject: courseName, kind });
        if (kind === 'image') void Image.prefetch(res.url, 'disk').catch(() => undefined);
        return;
      }

      try {
        await WebBrowser.openBrowserAsync(res.url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
          toolbarColor: '#0b57d0',
          controlsColor: '#ffffff',
          showTitle: true,
          enableBarCollapsing: true,
        });
      } catch {
        const cleanUrl = res.url.split('?')[0];
        const extension = cleanUrl.match(/\.([a-z0-9]{2,5})$/i)?.[1] || 'bin';
        const titleHasExtension = /\.[a-z0-9]{2,5}$/i.test(res.title || '');
        await downloadAndPreviewPDF(res.url, titleHasExtension ? res.title : `${res.title || 'SnapSchool'}.${extension}`);
      }
    } finally {
      setOpeningResourceId(null);
    }
  };

  const navigateViewingMedia = (offset: -1 | 1) => {
    const target = previewableResources[currentPreviewIndex + offset];
    if (!target) return;
    void markAsViewed(target.id);
    setMediaStatus('loading');
    setMediaRetryKey(0);
    setViewingMedia({
      id: target.id,
      url: target.url,
      title: target.title,
      subject: target.subject,
      kind: target.kind,
    });
    if (target.kind === 'image') void Image.prefetch(target.url, 'disk').catch(() => undefined);
  };

  const getPdfViewerUrl = (media: { url: string; title: string }) => {
    const safeBase = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const filename = `${(media.title || 'SnapSchool').replace(/\.pdf$/i, '').replace(/[^a-z0-9_-]/gi, '_') || 'SnapSchool'}.pdf`;
    const proxiedUrl = `${safeBase}/uploads-proxy?url=${encodeURIComponent(media.url)}&filename=${encodeURIComponent(filename)}`;
    return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(proxiedUrl)}`;
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
                        const resourceKind = inferResourceKind(res);
                        const isPdf = resourceKind === 'pdf';
                        const isImage = resourceKind === 'image';

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
                              {openingResourceId === res.id ? <ActivityIndicator size="small" color="#0b57d0" /> : <Eye color="#0b57d0" size={17} />}
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
          onRequestClose={() => { setViewingMedia(null); setMediaStatus('loading'); }}
        >
          <View style={{ flex: 1, backgroundColor: '#0B1220', paddingTop: Math.max(insets.top, 18), paddingBottom: Math.max(insets.bottom, 18) + 8 }}>
            {/* Top Bar */}
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 }}>
              <View style={{ flex: 1, marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }}>
                <Text style={{ color: 'white', fontSize: 17, fontWeight: '900', textAlign: isRTL ? 'right' : 'left' }} numberOfLines={1}>
                  {viewingMedia.title}
                </Text>
                {viewingMedia.subject && (
                  <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '700', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>
                    {viewingMedia.subject}
                    {currentPreviewIndex >= 0 && previewableResources.length > 1
                      ? `  •  ${toWestern(currentPreviewIndex + 1)}/${toWestern(previewableResources.length)}`
                      : ''}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => { setViewingMedia(null); setMediaStatus('loading'); }}
                style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={22} color="white" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Main file view */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 18 }}>
              <View style={{ width: SCREEN_WIDTH - 32, maxHeight: SCREEN_HEIGHT * 0.7, flex: 1, borderRadius: 22, overflow: 'hidden', backgroundColor: '#111827', borderWidth: 1, borderColor: '#263449', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 18, elevation: 10, alignItems: 'center', justifyContent: 'center' }}>
                {viewingMedia.kind === 'pdf' ? (
                  <WebView
                    key={`${viewingMedia.url}-${mediaRetryKey}`}
                    source={{ uri: getPdfViewerUrl(viewingMedia) }}
                    style={{ width: SCREEN_WIDTH - 34, height: '100%', backgroundColor: '#f8fafc' }}
                    originWhitelist={['https://*']}
                    javaScriptEnabled
                    domStorageEnabled
                    setSupportMultipleWindows={false}
                    allowsBackForwardNavigationGestures={false}
                    onLoadStart={() => setMediaStatus('loading')}
                    onLoadEnd={() => setMediaStatus('ready')}
                    onError={() => setMediaStatus('error')}
                    onHttpError={() => setMediaStatus('error')}
                  />
                ) : (
                  <Image
                    key={`${viewingMedia.url}-${mediaRetryKey}`}
                    source={{ uri: viewingMedia.url }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    transition={180}
                    onLoadStart={() => setMediaStatus('loading')}
                    onLoad={() => setMediaStatus('ready')}
                    onError={() => setMediaStatus('error')}
                  />
                )}
                {mediaStatus === 'loading' && (
                  <View style={{ position: 'absolute', inset: 0, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 }}>
                    <ActivityIndicator size="large" color="#60a5fa" />
                    <Text style={[{ color: '#e2e8f0', fontSize: 14, fontWeight: '800', marginTop: 16, textAlign: 'center' }, arabicText]}>
                      {viewingMedia.kind === 'pdf'
                        ? (language === 'ar' ? 'جارٍ تجهيز ملف PDF…' : language === 'fr' ? 'Préparation du PDF…' : 'Preparing PDF…')
                        : (language === 'ar' ? 'جارٍ تحميل الصورة…' : language === 'fr' ? 'Chargement de l’image…' : 'Loading image…')}
                    </Text>
                    <Text style={[{ color: '#718096', fontSize: 11, marginTop: 6, textAlign: 'center' }, arabicText]}>
                      {language === 'ar' ? 'قد يستغرق ذلك لحظات حسب سرعة الاتصال.' : language === 'fr' ? 'Cela peut prendre quelques instants selon votre connexion.' : 'This may take a moment depending on your connection.'}
                    </Text>
                  </View>
                )}
                {mediaStatus === 'error' && (
                  <View style={{ position: 'absolute', inset: 0, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
                    <View style={{ width: 58, height: 58, borderRadius: 20, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' }}><FileText size={26} color="#94a3b8" /></View>
                    <Text style={[{ color: 'white', fontSize: 16, fontWeight: '900', marginTop: 15, textAlign: 'center' }, arabicText]}>
                      {language === 'ar' ? 'تعذر عرض هذا الملف' : language === 'fr' ? 'Impossible d’afficher ce fichier' : 'Unable to display this file'}
                    </Text>
                    <Text style={[{ color: '#94a3b8', fontSize: 12, lineHeight: 18, marginTop: 6, textAlign: 'center' }, arabicText]}>
                      {language === 'ar' ? 'يمكنك إعادة المحاولة أو تنزيل الملف.' : language === 'fr' ? 'Réessayez ou téléchargez le fichier.' : 'Try again or download the file.'}
                    </Text>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10, marginTop: 18 }}>
                      <TouchableOpacity onPress={() => { setMediaStatus('loading'); setMediaRetryKey(key => key + 1); }} style={{ height: 44, paddingHorizontal: 15, borderRadius: 14, backgroundColor: '#0b6fe8', flexDirection: isRTL ? 'row-reverse' : 'row', gap: 7, alignItems: 'center', justifyContent: 'center' }}>
                        <RefreshCw size={16} color="white" /><Text style={[{ color: 'white', fontSize: 12, fontWeight: '900' }, arabicText]}>{language === 'ar' ? 'إعادة المحاولة' : language === 'fr' ? 'Réessayer' : 'Retry'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={downloadViewingMedia} style={{ height: 44, paddingHorizontal: 15, borderRadius: 14, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', flexDirection: isRTL ? 'row-reverse' : 'row', gap: 7, alignItems: 'center', justifyContent: 'center' }}>
                        <Download size={16} color="white" /><Text style={[{ color: 'white', fontSize: 12, fontWeight: '900' }, arabicText]}>{language === 'ar' ? 'تنزيل' : language === 'fr' ? 'Télécharger' : 'Download'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                {previewableResources.length > 1 && (
                  <>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={language === 'ar' ? 'الملف السابق' : language === 'fr' ? 'Document précédent' : 'Previous material'}
                      disabled={!hasPreviousPreview}
                      onPress={() => navigateViewingMedia(-1)}
                      activeOpacity={0.78}
                      style={{
                        position: 'absolute',
                        left: 8,
                        top: '50%',
                        marginTop: -27,
                        zIndex: 20,
                        elevation: 20,
                        width: 48,
                        height: 54,
                        borderRadius: 17,
                        backgroundColor: hasPreviousPreview ? 'rgba(15, 23, 42, 0.88)' : 'rgba(15, 23, 42, 0.3)',
                        borderWidth: 1,
                        borderColor: hasPreviousPreview ? '#475569' : 'rgba(71, 85, 105, 0.25)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ChevronLeft size={27} color={hasPreviousPreview ? 'white' : '#64748b'} strokeWidth={2.5} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={language === 'ar' ? 'الملف التالي' : language === 'fr' ? 'Document suivant' : 'Next material'}
                      disabled={!hasNextPreview}
                      onPress={() => navigateViewingMedia(1)}
                      activeOpacity={0.78}
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        marginTop: -27,
                        zIndex: 20,
                        elevation: 20,
                        width: 48,
                        height: 54,
                        borderRadius: 17,
                        backgroundColor: hasNextPreview ? 'rgba(15, 23, 42, 0.88)' : 'rgba(15, 23, 42, 0.3)',
                        borderWidth: 1,
                        borderColor: hasNextPreview ? '#475569' : 'rgba(71, 85, 105, 0.25)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ChevronRight size={27} color={hasNextPreview ? 'white' : '#64748b'} strokeWidth={2.5} />
                    </TouchableOpacity>
                  </>
                )}
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
                  minHeight: 54,
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
                style={{ flex: 1, minHeight: 54, justifyContent: 'center', backgroundColor: '#182235', paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: '#334155', flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}
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
