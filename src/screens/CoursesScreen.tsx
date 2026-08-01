import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, FileText, Download, ChevronRight, ChevronLeft, GraduationCap, User, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { useLanguage } from '../context/LanguageContext';
import { studentService } from '../services/api';
import moment from 'moment';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUBJECT_THEMES: Record<string, { color: string; bg: string }> = {
  // Arabic names (primary - what we now display)
  'الرياضيات':         { color: '#ef4444', bg: '#fef2f2' },
  'الإيقاظ العلمي':   { color: '#10b981', bg: '#ecfdf5' },
  'اللغة العربية':     { color: '#f59e0b', bg: '#fffbeb' },
  'اللغة الفرنسية':    { color: '#8b5cf6', bg: '#f5f3ff' },
  'اللغة الإنجليزية': { color: '#3b82f6', bg: '#eff6ff' },
  'التربية المدنية':   { color: '#06b6d4', bg: '#ecfeff' },
  'التربية الإسلامية': { color: '#16a34a', bg: '#f0fdf4' },
  'التاريخ والجغرافيا': { color: '#7c3aed', bg: '#faf5ff' },
  'التربية الفنية':    { color: '#ec4899', bg: '#fdf2f8' },
  'التربية البدنية':   { color: '#0ea5e9', bg: '#f0f9ff' },
  'الإعلامية':         { color: '#14b8a6', bg: '#f0fdfa' },
  // Fallbacks for English / French names still in data
  'Mathematics':        { color: '#ef4444', bg: '#fef2f2' },
  'Science':            { color: '#10b981', bg: '#ecfdf5' },
  'English':            { color: '#3b82f6', bg: '#eff6ff' },
  'French':             { color: '#f59e0b', bg: '#fffbeb' },
  'History':            { color: '#8b5cf6', bg: '#f5f3ff' },
  'ICT':                { color: '#06b6d4', bg: '#ecfeff' },
  'Art':                { color: '#ec4899', bg: '#fdf2f8' },
  'Default':            { color: '#64748b', bg: '#f8fafc' },
};

/** Look up theme from a pipe-separated string like "الرياضيات | Mathématiques | Mathematics" */
const getTheme = (fullName: string) => {
  const arabicPart = fullName.split('|')[0]?.trim();
  return (
    SUBJECT_THEMES[arabicPart] ||
    SUBJECT_THEMES[fullName.trim()] ||
    SUBJECT_THEMES['Default']
  );
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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#0072e6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ marginBottom: 28, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={{ fontSize: 11, fontWeight: '900', color: '#0072e6', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }}>
            {t.academicPortal}
          </Text>
          <Text style={{ fontSize: 30, fontWeight: '900', color: '#1e293b', letterSpacing: -0.5, textAlign: isRTL ? 'right' : 'left' }}>{t.coursesHub}</Text>
          <Text style={{ fontSize: 14, color: '#64748b', marginTop: 6, fontWeight: '700', lineHeight: 22, textAlign: isRTL ? 'right' : 'left' }}>
            {t.coursesSub} {child?.name || 'التلميذ'}.
          </Text>
        </View>

        {courses.length === 0 ? (
          <View style={{ padding: 48, alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 28, borderWidth: 2, borderColor: '#e2e8f0' }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#eff6ff', borderWidth: 2, borderColor: '#bfdbfe', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <BookOpen size={32} color="#0072e6" />
            </View>
            <Text style={{ color: '#1e293b', fontWeight: '900', fontSize: 18 }}>{t.noCourses}</Text>
            <Text style={{ color: '#64748b', fontWeight: '700', fontSize: 14, marginTop: 8, textAlign: 'center' }}>
              {t.noCoursesSub}
            </Text>
          </View>
        ) : (
          courses.map((course) => {
            const theme = getTheme(course.name);
            const arabicName = getTranslatedSubject(course.name);
            const isExpanded = expandedCourses[course.id];

            return (
              <View key={course.id} style={{
                backgroundColor: 'white',
                borderRadius: 20,
                marginBottom: 16,
                borderWidth: 2,
                borderColor: '#e2e8f0',
                overflow: 'hidden',
              }}>
                {/* Colored top accent bar */}
                <View style={{
                  backgroundColor: theme.bg,
                  borderBottomWidth: 2,
                  borderBottomColor: theme.color + '33',
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  {/* Icon */}
                  <View style={{
                    width: 44, height: 44, borderRadius: 14,
                    backgroundColor: '#ffffff',
                    borderWidth: 2, borderColor: theme.color + '44',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <GraduationCap color={theme.color} size={22} />
                  </View>

                  {/* Subject Name */}
                  <Text style={{
                    flex: 1,
                    fontSize: 19, fontWeight: '900', color: '#1e293b',
                    textAlign: isRTL ? 'right' : 'center',
                    marginHorizontal: 12,
                  }}>
                    {arabicName}
                  </Text>

                  {/* File count */}
                  <View style={{
                    minWidth: 54, height: 44, borderRadius: 14,
                    backgroundColor: '#ffffff',
                    borderWidth: 2, borderColor: theme.color + '44',
                    alignItems: 'center', justifyContent: 'center',
                    paddingHorizontal: 8,
                  }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: theme.color }}>{course.resources.length}</Text>
                    <Text style={{ fontSize: 8, fontWeight: '900', color: theme.color, textTransform: 'uppercase', letterSpacing: 0.3 }}>{t.filesCount}</Text>
                  </View>
                </View>

                {/* Teacher row */}
                <View style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center',
                  paddingHorizontal: 20, paddingVertical: 10,
                  borderBottomWidth: isExpanded || course.resources.length > 0 ? 1 : 0,
                  borderBottomColor: '#f1f5f9',
                }}>
                  <User size={13} color="#94a3b8" strokeWidth={2.5} style={{ marginRight: isRTL ? 0 : 6, marginLeft: isRTL ? 6 : 0 }} />
                  <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    {t.teacher}: {course.teacher}
                  </Text>
                </View>

                {/* Expand Toggle */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => toggleCourse(course.id)}
                  style={{
                    flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: 20, paddingVertical: 14,
                    backgroundColor: isExpanded ? '#f8fafc' : 'white',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '900', color: isExpanded ? '#0072e6' : '#64748b' }}>
                    {t.viewLearningMaterials}
                  </Text>
                  {isExpanded ? (
                    <ChevronDown size={18} color="#0072e6" strokeWidth={2.5} />
                  ) : (
                    isRTL ? <ChevronLeft size={18} color="#94a3b8" strokeWidth={2} /> : <ChevronRight size={18} color="#94a3b8" strokeWidth={2} />
                  )}
                </TouchableOpacity>

                {/* Resources */}
                {isExpanded && course.resources.length > 0 && (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
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
                            borderRadius: 16,
                            padding: 14,
                            marginBottom: 8,
                            borderWidth: 2,
                            borderColor: isNew ? '#bfdbfe' : '#e2e8f0',
                            backgroundColor: isNew ? '#f8fafc' : '#fafafa',
                          }}
                        >
                          <View style={{
                            width: 38, height: 38, borderRadius: 10,
                            backgroundColor: isNew ? '#eff6ff' : '#f1f5f9',
                            borderWidth: 2, borderColor: isNew ? '#bfdbfe' : '#e2e8f0',
                            alignItems: 'center', justifyContent: 'center',
                            marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
                          }}>
                            <Download size={16} color={theme.color} />
                          </View>
                          <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={{ fontSize: 14, fontWeight: '800', color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }} numberOfLines={1}>{res.title}</Text>
                              {isNew && (
                                <View style={{ backgroundColor: '#0072e6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 9, fontWeight: '900', color: 'white' }}>جديد</Text>
                                </View>
                              )}
                            </View>
                            {res.description ? (
                              <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '700', marginTop: 2, lineHeight: 16, textAlign: isRTL ? 'right' : 'left' }} numberOfLines={2}>
                                {res.description}
                              </Text>
                            ) : null}
                          </View>
                          <Download size={16} color="#94a3b8" />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {isExpanded && course.resources.length === 0 && (
                  <View style={{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 24, gap: 8 }}>
                    <View style={{
                      width: 44, height: 44, borderRadius: 12,
                      backgroundColor: '#f8fafc', borderWidth: 2, borderColor: '#e2e8f0',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <FileText size={20} color="#94a3b8" />
                    </View>
                    <Text style={{ fontSize: 13, color: '#475569', fontWeight: '800', textAlign: 'center' }}>
                      No materials yet
                    </Text>
                    <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '700', textAlign: 'center', lineHeight: 18 }}>
                      Ask your teacher to upload course materials here.
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};


