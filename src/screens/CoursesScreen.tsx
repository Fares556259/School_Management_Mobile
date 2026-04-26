import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, FileText, Download, ChevronRight, GraduationCap, User } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { studentService } from '../services/api';
import moment from 'moment';

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
  const child = children.find(c => c.id === selectedChildId);

  useEffect(() => {
    loadCourses();
  }, [selectedChildId]);

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

  const handleDownload = (url: string) => {
    if (url) Linking.openURL(url);
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
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                  <View style={{ flex: 1, padding: 16, borderRadius: 20, backgroundColor: '#f8fafc', borderSize: 1, borderColor: '#f1f5f9' }}>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: '#1e293b' }}>{course.tasks.length}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>Tasks</Text>
                  </View>
                  <View style={{ flex: 1, padding: 16, borderRadius: 20, backgroundColor: '#f8fafc', borderSize: 1, borderColor: '#f1f5f9' }}>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: '#1e293b' }}>{course.resources.length}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>Files</Text>
                  </View>
                </View>

                {/* Priority Tasks */}
                {course.tasks.length > 0 && (
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Active Assignments</Text>
                    {course.tasks.map((task: any) => (
                      <View key={task.id} style={{ 
                        backgroundColor: '#ffffff', 
                        borderRadius: 20, 
                        padding: 18, 
                        marginBottom: 10, 
                        borderWidth: 1, 
                        borderColor: '#fff7ed',
                        backgroundColor: '#fffcf8',
                        shadowColor: '#f59e0b',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 5
                      }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: '900', color: '#92400e' }}>{task.title}</Text>
                            <Text style={{ fontSize: 13, color: '#b45309', marginTop: 4, fontWeight: '600' }} numberOfLines={1}>{task.description}</Text>
                          </View>
                          <View style={{ backgroundColor: '#ffedd5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                            <Text style={{ fontSize: 10, fontWeight: '900', color: '#ea580c' }}>{moment(task.dueDate).format('MMM D')}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Resources */}
                {course.resources.length > 0 && (
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Learning Materials</Text>
                    {course.resources.slice(0, 2).map((res: any) => (
                      <TouchableOpacity 
                        key={res.id} 
                        onPress={() => handleDownload(res.url)}
                        style={{ 
                          flexDirection: 'row', 
                          alignItems: 'center', 
                          backgroundColor: '#f8fafc', 
                          borderRadius: 20, 
                          padding: 16, 
                          marginBottom: 8,
                          borderWidth: 1,
                          borderColor: '#f1f5f9'
                        }}
                      >
                        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' }}>
                          <Download size={16} color={theme.color} />
                        </View>
                        <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#1e293b', marginLeft: 14 }} numberOfLines={1}>{res.title}</Text>
                        <ChevronRight size={16} color="#cbd5e1" />
                      </TouchableOpacity>
                    ))}
                    {course.resources.length > 2 && (
                      <TouchableOpacity style={{ marginTop: 8, alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: theme.color }}>View all {course.resources.length} resources</Text>
                      </TouchableOpacity>
                    )}
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
      </ScrollView>
    </SafeAreaView>
  );
};
