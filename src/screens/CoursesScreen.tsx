import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, FileText, Download, ChevronRight, GraduationCap, User } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { studentService } from '../services/api';
import moment from 'moment';

export const CoursesScreen = () => {
  const { selectedChildId } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);

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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#0055d4" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 28, fontWeight: '900', color: '#1e293b' }}>Courses Hub</Text>
          <Text style={{ fontSize: 14, color: '#64748b', marginTop: 4, fontWeight: '600' }}>All subjects, materials and tasks in one place.</Text>
        </View>

        {courses.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <BookOpen size={48} color="#e2e8f0" />
            <Text style={{ marginTop: 16, color: '#94a3b8', fontWeight: '700' }}>No course data available yet.</Text>
          </View>
        ) : (
          courses.map((course) => (
            <View key={course.id} style={{ 
              backgroundColor: 'white', 
              borderRadius: 24, 
              padding: 20, 
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#f1f5f9',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.02,
              shadowRadius: 10,
              elevation: 2
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
                  <GraduationCap color="#0055d4" size={20} />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b' }}>{course.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <User size={12} color="#94a3b8" />
                    <Text style={{ fontSize: 12, color: '#64748b', marginLeft: 4, fontWeight: '700' }}>{course.teacher}</Text>
                  </View>
                </View>
              </View>

              {/* Tasks Section */}
              {course.tasks.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <FileText size={14} color="#f59e0b" />
                    <Text style={{ fontSize: 13, fontWeight: '900', color: '#1e293b', marginLeft: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Active Tasks ({course.tasks.length})</Text>
                  </View>
                  {course.tasks.map((task: any) => (
                    <View key={task.id} style={{ backgroundColor: '#fffbeb', borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#fef3c7' }}>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: '#92400e' }}>{task.title}</Text>
                      <Text style={{ fontSize: 12, color: '#b45309', marginTop: 4, fontWeight: '600' }} numberOfLines={1}>{task.description}</Text>
                      <Text style={{ fontSize: 10, color: '#d97706', marginTop: 8, fontWeight: '900', textTransform: 'uppercase' }}>Due {moment(task.dueDate).format('MMM Do')}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Resources Section */}
              {course.resources.length > 0 && (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <BookOpen size={14} color="#8b5cf6" />
                    <Text style={{ fontSize: 13, fontWeight: '900', color: '#1e293b', marginLeft: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Shared Resources ({course.resources.length})</Text>
                  </View>
                  {course.resources.map((res: any) => (
                    <TouchableOpacity 
                      key={res.id} 
                      onPress={() => handleDownload(res.url)}
                      style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        backgroundColor: '#f5f3ff', 
                        borderRadius: 16, 
                        padding: 12, 
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: '#ede9fe'
                      }}
                    >
                      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' }}>
                        <Download size={14} color="#8b5cf6" />
                      </View>
                      <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: '#5b21b6', marginLeft: 12 }} numberOfLines={1}>{res.title}</Text>
                      <ChevronRight size={16} color="#c4b5fd" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {course.tasks.length === 0 && course.resources.length === 0 && (
                <Text style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', paddingVertical: 10 }}>No resources or tasks shared yet.</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
