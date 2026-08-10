import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Calculator, Book, Languages, Globe, Palette, Microscope, Music, BookOpen, 
  FileText, Download, ChevronRight, ChevronLeft, ChevronDown, ChevronUp 
} from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { useLanguage } from '../context/LanguageContext';
import { studentService } from '../services/api';
import moment from 'moment';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export const CoursesScreen = () => {
  const { selectedChildId, children } = useAppStore();
  const { t, isRTL, getTranslatedSubject } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [viewedResources, setViewedResources] = useState<string[]>([]);
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});
  const child = children.find(c => c.id === selectedChildId);

  useEffect(() => {
    loadCourses();
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

  const loadCourses = async () => {
    if (!selectedChildId) return;
    setLoading(true);
    try {
      const data = await studentService.fetchCourses(selectedChildId);
      setCourses(data);
    } catch (err) {
      console.error("[COURSES-LOAD-ERROR]", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (res: any) => {
    markAsViewed(res.id);
    if (res.url) Linking.openURL(res.url);
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
        <ActivityIndicator size="large" color="#0055d4" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ marginBottom: 28, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={{ fontSize: 13, fontWeight: '900', color: '#0055d4', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }}>
            {t.academicPortal || 'ACADEMIC PORTAL'}
          </Text>
          <Text style={{ fontSize: 32, fontWeight: '900', color: '#1e293b', letterSpacing: -0.5, textAlign: isRTL ? 'right' : 'left' }}>{t.coursesHub || 'Courses Hub'}</Text>
          <Text style={{ fontSize: 14, color: '#64748b', marginTop: 6, fontWeight: '600', lineHeight: 22, textAlign: isRTL ? 'right' : 'left' }}>
            {t.coursesSub || 'Your registered courses'} {child?.name || 'التلميذ'}.
          </Text>
        </View>

        {courses.length === 0 ? (
          <View style={{ padding: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderRadius: 28, borderWidth: 1, borderColor: '#f1f5f9' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <BookOpen size={32} color="#cbd5e1" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', marginBottom: 6 }}>{t.noCourses || 'No courses yet'}</Text>
            <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: '700', textAlign: 'center', lineHeight: 20 }}>
              {t.noCoursesSub || 'You will see courses here once assigned.'}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {groupedCourses.map((group) => (
              <View key={group.domain.id} style={{ backgroundColor: 'white', borderRadius: 28, padding: 20, marginBottom: 8, borderWidth: 2, borderColor: '#e2e8f0', borderBottomWidth: 6, borderBottomColor: '#cbd5e1' }}>
                <View style={{ backgroundColor: group.domain.color, paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginBottom: 20, borderBottomWidth: 4, borderBottomColor: 'rgba(0,0,0,0.2)' }}>
                  <Text style={{ color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: 1 }}>{group.domain.title}</Text>
                </View>
                
                <View style={{ gap: 16 }}>
                  {group.items.map((course, index) => {
                    const theme = Object.values(SUBJECT_THEMES).find(t => course.name.includes(Object.keys(SUBJECT_THEMES).find(k => SUBJECT_THEMES[k] === t) || '')) || SUBJECT_THEMES.Default;
                    const ThemeIcon = theme.icon;
                    const arabicName = getTranslatedSubject(course.name);
                    const isExpanded = expandedCourses[course.id];

                    return (
                      <View key={course.id} style={{ paddingBottom: isExpanded ? 0 : (index === group.items.length - 1 ? 0 : 16), borderBottomWidth: (isExpanded || index !== group.items.length - 1) ? 2 : 0, borderBottomColor: '#f1f5f9', borderStyle: 'dashed' }}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => toggleCourse(course.id)}
                          style={{
                            flexDirection: isRTL ? 'row-reverse' : 'row',
                            alignItems: 'center',
                            paddingVertical: isExpanded ? 16 : 0,
                            paddingBottom: isExpanded ? 16 : 0,
                          }}
                        >
                          <View style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: group.domain.bg, borderWidth: 2, borderColor: group.domain.color + '30' }}>
                            <ThemeIcon color={group.domain.color} size={20} strokeWidth={2.5} />
                          </View>
                          <View style={{ flex: 1, marginHorizontal: 16, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                            <Text style={{ fontSize: 17, fontWeight: '900', color: '#1e293b' }}>{arabicName}</Text>
                            <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '700', marginTop: 2 }}>
                              {t.teacher || 'Teacher'}: {course.teacher || 'N/A'}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                            <Text style={{ fontSize: 22, fontWeight: '900', color: '#0f172a' }}>{course.resources?.length || 0}</Text>
                            <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '800', marginLeft: 2 }}>{t.filesCount || 'FILES'}</Text>
                          </View>
                        </TouchableOpacity>

                        {/* Resources Expanded View */}
                        {isExpanded && course.resources?.length > 0 && (
                          <View style={{ paddingTop: 0, paddingBottom: 16 }}>
                            {course.resources.map((res: any, idx: number) => {
                              const isNew = !viewedResources.includes(res.id.toString());
                              return (
                                <TouchableOpacity
                                  key={res.id}
                                  onPress={() => handleDownload(res)}
                                  activeOpacity={0.85}
                                  style={{
                                    flexDirection: isRTL ? 'row-reverse' : 'row',
                                    alignItems: 'center',
                                    borderRadius: 12,
                                    padding: 12,
                                    marginBottom: 8,
                                    borderWidth: 2,
                                    borderColor: isNew ? '#bfdbfe' : '#e2e8f0',
                                    backgroundColor: isNew ? '#f8fafc' : '#fafafa',
                                  }}
                                >
                                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isNew ? '#dbeafe' : '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }}>
                                    <FileText color={isNew ? "#3b82f6" : "#64748b"} size={16} />
                                  </View>
                                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#1e293b' }} numberOfLines={1}>{res.title}</Text>
                                    <Text style={{ fontSize: 10, color: '#64748b', fontWeight: '700', marginTop: 2 }}>{moment(res.createdAt).format('MMM D, YYYY')}</Text>
                                  </View>
                                  <View style={{ padding: 8, backgroundColor: 'white', borderRadius: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}>
                                    <Download color="#0055d4" size={16} />
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                        {isExpanded && course.resources?.length === 0 && (
                          <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                            <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '700' }}>{t.noFiles || 'No materials available'}</Text>
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
    </SafeAreaView>
  );
};
