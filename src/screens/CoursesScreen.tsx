import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, FileText, Download, ChevronRight, GraduationCap, User, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { studentService } from '../services/api';
import moment from 'moment';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUBJECT_THEMES: any = {
  'Mathematics': { color: '#ef4444', icon: GraduationCap, bg: '#fef2f2' },
  'Science': { color: '#10b981', icon: GraduationCap, bg: '#ecfdf5' },
  'English': { color: '#3b82f6', icon: GraduationCap, bg: '#eff6ff' },
  'French': { color: '#f59e0b', icon: GraduationCap, bg: '#fffbeb' },
  'History': { color: '#8b5cf6', icon: GraduationCap, bg: '#f5f3ff' },
  'ICT': { color: '#06b6d4', icon: GraduationCap, bg: '#ecfeff' },
  'Art': { color: '#ec4899', icon: GraduationCap, bg: '#fdf2f8' },
  'Default': { color: '#64748b', icon: GraduationCap, bg: '#f8fafc' }
};

export const CoursesScreen = () => {
  const { selectedChildId, children } = useAppStore();
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
        <ActivityIndicator size="large" color="#0055d4" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <ScrollView 
        contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 13, fontWeight: '900', color: '#0055d4', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Academic Portal</Text>
          <Text style={{ fontSize: 32, fontWeight: '900', color: '#1e293b' }}>Courses Hub</Text>
          <Text style={{ fontSize: 15, color: '#64748b', marginTop: 6, fontWeight: '600', lineHeight: 22 }}>
            Track learning materials and active assignments for {child?.name || 'your child'}.
          </Text>
        </View>

        {courses.length === 0 ? (
          <View style={{ padding: 60, alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 32, marginTop: 20 }}>
            <View style={{ width: 80, height: 80, borderRadius: 30, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 }}>
              <BookOpen size={32} color="#cbd5e1" />
            </View>
            <Text style={{ marginTop: 24, color: '#94a3b8', fontWeight: '800', fontSize: 16 }}>No active courses found</Text>
          </View>
        ) : (
          courses.map((course) => {
            const theme = SUBJECT_THEMES[course.name] || SUBJECT_THEMES.Default;
            const ThemeIcon = theme.icon;

            return (
              <View key={course.id} style={{ 
                backgroundColor: 'white', 
                borderRadius: 32, 
                padding: 24, 
                marginBottom: 24,
                borderWidth: 1,
                borderColor: '#f1f5f9',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.04,
                shadowRadius: 20,
                elevation: 4
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                  <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <ThemeIcon color={theme.color} size={26} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 18 }}>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: '#1e293b' }}>{course.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#f1f5f9' }}>
                        <Text style={{ fontSize: 10, color: '#64748b', fontWeight: '800' }}>{course.teacher}</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
                    <ChevronRight size={18} color="#cbd5e1" />
                  </TouchableOpacity>
                </View>

                {/* Content Stats */}
                <TouchableOpacity 
                  activeOpacity={0.7}
                  onPress={() => toggleCourse(course.id)}
                  disabled={course.resources.length === 0}
                  style={{ flexDirection: 'row', gap: 12, marginBottom: expandedCourses[course.id] ? 16 : 0 }}
                >
                  <View style={{ flex: 1, padding: 16, borderRadius: 20, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Learning Materials</Text>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: '#1e293b', marginTop: 2 }}>{course.resources.length} Files</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <FileText size={20} color={course.resources.length > 0 ? "#0055d4" : "#94a3b8"} style={{ marginRight: 12 }} />
                      {course.resources.length > 0 && (
                        expandedCourses[course.id] ? <ChevronUp size={20} color="#94a3b8" /> : <ChevronDown size={20} color="#94a3b8" />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Resources */}
                {expandedCourses[course.id] && course.resources.length > 0 && (
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Learning Materials</Text>
                    {course.resources.map((res: any) => {
                      const isNew = !viewedResources.includes(res.id.toString());
                      
                      return (
                      <TouchableOpacity 
                        key={res.id} 
                        onPress={() => handleDownload(res)}
                        style={{ 
                          flexDirection: 'row', 
                          alignItems: 'center', 
                          backgroundColor: '#f8fafc', 
                          borderRadius: 20, 
                          padding: 16, 
                          marginBottom: 8,
                          borderWidth: 1,
                          borderColor: isNew ? '#bfdbfe' : '#f1f5f9'
                        }}
                      >
                        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isNew ? '#eff6ff' : 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isNew ? '#bfdbfe' : '#f1f5f9' }}>
                          <Download size={16} color={theme.color} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 14 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b' }} numberOfLines={1}>{res.title}</Text>
                            {isNew && (
                              <View style={{ backgroundColor: '#ef4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 }}>
                                <Text style={{ fontSize: 9, fontWeight: '900', color: 'white' }}>NEW</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <ChevronRight size={16} color="#cbd5e1" />
                      </TouchableOpacity>
                      )
                    })}
                  </View>
                )}

                {course.tasks.length === 0 && course.resources.length === 0 && (
                  <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                    <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: '600' }}>No new materials for this subject.</Text>
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
