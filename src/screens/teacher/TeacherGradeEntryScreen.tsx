import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Check, BookOpen, Users, Layout, Camera, Image as ImageIcon, X } from 'lucide-react-native';
import { teacherService, API_BASE_URL } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';
import * as ImagePicker from 'expo-image-picker';

/** Extract the French name from a pipe-separated trilingual string.
 *  e.g. "اللغة الفرنسية | Langue Française | French Language" → "Langue Française"
 */
const parseFrenchName = (name: string): string => {
  if (!name) return '';
  const parts = name.split('|').map(p => p.trim());
  // French is the 2nd segment; fallback to full name if only 1 segment
  return parts.length >= 2 ? parts[1] : parts[0];
};
export const TeacherGradeEntryScreen = ({ navigation }: any) => {
  const userId = useAppStore(state => state.userId);
  
  // State for flow
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Step 1: Classes
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);

  // Step 2: Subjects & Term
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<any | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<number>(1);

  // Step 3: Grades
  const [students, setStudents] = useState<any[]>([]);
  const [grades, setGrades] = useState<Record<string, number | null>>({});
  const [proofImage, setProofImage] = useState<any>(null);

  useEffect(() => {
    loadClasses();
  }, [userId]);

  const loadClasses = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await teacherService.fetchClasses();
      setClasses(data || []);
    } catch (err) {
      console.error(err);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClassSelect = async (cls: any) => {
    setSelectedClass(cls);
    setStep(2);
    setLoading(true);
    try {
      const subs = await teacherService.fetchSubjectsForClass(userId!, cls.id);
      setSubjects(subs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectSelect = async (subject: any) => {
    setSelectedSubject(subject);
    setStep(3);
    setLoading(true);
    try {
      const data = await teacherService.fetchGradesData(userId!, selectedClass.id, selectedTerm);
      const fetchedStudents = data.students || [];
      setStudents(fetchedStudents);
      
      // Find the matching subject's existing grades from the API response
      const matchingSubject = (data.subjects || []).find((s: any) => s.id === subject.id);
      const existingGrades = matchingSubject?.grades || {};
      
      const initialGrades: Record<string, number | null> = {};
      fetchedStudents.forEach((s: any) => {
        initialGrades[s.id] = existingGrades[s.id] !== undefined ? existingGrades[s.id] : null;
      });
      setGrades(initialGrades);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (studentId: string, value: string) => {
    const num = parseFloat(value);
    setGrades(prev => ({
      ...prev,
      [studentId]: isNaN(num) ? null : num,
    }));
  };

  const pickImage = async (useCamera = false) => {
    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      };

      const result = useCamera 
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProofImage(result.assets[0]);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSaveGrades = async () => {
    if (!userId || !selectedClass || !selectedSubject) return;
    setSaving(true);
    try {
      const gradesArray = Object.keys(grades).map(studentId => ({
        studentId,
        score: grades[studentId]
      }));
      
      let proofUrl = '';
      if (proofImage) {
        const form = new FormData();
        const filename = proofImage.uri.split('/').pop() || 'proof.jpg';
        form.append('file', { uri: proofImage.uri, name: filename, type: 'image/jpeg' } as any);
        form.append('folder', 'grades');

        const uploadRes = await fetch(`${API_BASE_URL}/api/mobile/upload`, {
          method: 'POST',
          body: form,
        });
        const uploadData = await uploadRes.json();
        if (uploadData?.url) {
          proofUrl = uploadData.url;
        }
      }
      
      await teacherService.submitGrades(userId, selectedClass.id, selectedSubject.id, selectedTerm, gradesArray, proofUrl);
      Alert.alert('Success', 'Grades saved successfully!');
      setStep(2);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to save grades.');
    } finally {
      setSaving(false);
    }
  };

  const gradedCount = Object.values(grades).filter(g => g !== null && g !== undefined).length;

  const renderStep1 = () => (
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
          <ChevronLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontWeight: '900', color: '#1e293b' }}>Select Class</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#4F46E5" />
      ) : classes.length === 0 ? (
        <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 100 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Users size={32} color="#94a3b8" />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#1e293b' }}>No classes found</Text>
          <Text style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 8, paddingHorizontal: 32 }}>
            You haven't been assigned to any classes yet.
          </Text>
        </View>
      ) : (
        classes.map((cls) => (
          <TouchableOpacity 
            key={cls.id} 
            onPress={() => handleClassSelect(cls)}
            activeOpacity={0.8}
            style={{ 
              flexDirection: 'row', alignItems: 'center', padding: 20, 
              borderRadius: 16, backgroundColor: 'white', marginBottom: 16,
              borderWidth: 1, borderColor: '#f1f5f9',
              shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
            }}
          >
            <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={28} color="#4F46E5" />
            </View>
            <View style={{ marginLeft: 20, flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b' }}>{cls.name}</Text>
              <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: '700', marginTop: 2 }}>{cls.students || cls.studentsCount || 0} students</Text>
            </View>
            <ChevronRight size={24} color="#cbd5e1" />
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );

  const renderStep2 = () => (
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
        <TouchableOpacity 
          onPress={() => setStep(1)} 
          style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9', marginRight: 16 }}
        >
          <ChevronLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#1e293b' }}>{selectedClass?.name}</Text>
          <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: '700' }}>Select Subject & Term</Text>
        </View>
      </View>

      <Text style={{ fontSize: 14, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: 12 }}>Term</Text>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
        {[1, 2, 3].map(term => (
          <TouchableOpacity
            key={term}
            onPress={() => setSelectedTerm(term)}
            style={{
              flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
              backgroundColor: selectedTerm === term ? '#4F46E5' : 'white',
              borderWidth: 1, borderColor: selectedTerm === term ? '#4F46E5' : '#e2e8f0'
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '800', color: selectedTerm === term ? 'white' : '#64748b' }}>
              Term {term}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={{ fontSize: 14, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: 12 }}>Subjects</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#4F46E5" />
      ) : (
        subjects.map((sub) => (
          <TouchableOpacity 
            key={sub.id} 
            onPress={() => handleSubjectSelect(sub)}
            activeOpacity={0.8}
            style={{ 
              flexDirection: 'row', alignItems: 'center', padding: 20, 
              borderRadius: 16, backgroundColor: 'white', marginBottom: 16,
              borderWidth: 1, borderColor: '#f1f5f9',
              shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
            }}
          >
            <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={28} color="#64748b" />
            </View>
            <View style={{ marginLeft: 20, flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b' }}>{parseFrenchName(sub.name)}</Text>
              <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: '700', marginTop: 2 }}>{sub.domain || 'General'}</Text>
            </View>
            {sub.isFullyGraded && (
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Check size={16} color="white" strokeWidth={3} />
              </View>
            )}
            <ChevronRight size={24} color="#cbd5e1" />
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );

  const renderStep3 = () => (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity 
            onPress={() => setStep(2)} 
            style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9', marginRight: 16 }}
          >
            <ChevronLeft size={22} color="#1e293b" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#1e293b' }}>{parseFrenchName(selectedSubject?.name)}</Text>
            <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: '700' }}>{selectedClass?.name} • Term {selectedTerm}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: '900', color: '#1e293b', textTransform: 'uppercase', letterSpacing: 1 }}>Grade Entry</Text>
          <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '900', color: '#4F46E5' }}>{gradedCount} / {students.length} graded</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#4F46E5" />
        ) : (
          students.map((student) => (
            <View 
              key={student.id} 
              style={{ 
                flexDirection: 'row', alignItems: 'center', padding: 16, 
                borderRadius: 16, backgroundColor: 'white', marginBottom: 12,
                borderWidth: 1, borderColor: '#f1f5f9' 
              }}
            >
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#4F46E5' }}>{student.name.charAt(0)}</Text>
              </View>
              <View style={{ marginLeft: 16, flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#1e293b' }}>{student.name} {student.surname}</Text>
              </View>
              <View style={{ width: 70 }}>
                <TextInput
                  placeholder="--"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  maxLength={5}
                  value={grades[student.id] !== null && grades[student.id] !== undefined ? grades[student.id]?.toString() : ''}
                  onChangeText={(val) => handleGradeChange(student.id, val)}
                  style={{
                    backgroundColor: '#f8fafc',
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    borderRadius: 10,
                    padding: 12,
                    fontSize: 16,
                    fontWeight: '800',
                    color: '#1e293b',
                    textAlign: 'center'
                  }}
                />
              </View>
            </View>
          ))
        )}

        <View style={{ marginTop: 24, padding: 16, borderRadius: 16, backgroundColor: 'white', borderWidth: 1, borderColor: '#f1f5f9' }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: 12 }}>Grade Sheet Proof (Optional)</Text>
          {proofImage ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12 }}>
              <ImageIcon size={24} color="#4F46E5" />
              <Text style={{ flex: 1, marginLeft: 12, fontSize: 14, fontWeight: '700', color: '#1e293b' }} numberOfLines={1}>
                {proofImage.fileName || 'Proof Image attached'}
              </Text>
              <TouchableOpacity onPress={() => setProofImage(null)} style={{ padding: 4 }}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity 
                onPress={() => pickImage(true)}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, backgroundColor: '#eff6ff', borderRadius: 12 }}
              >
                <Camera size={18} color="#4F46E5" />
                <Text style={{ marginLeft: 8, fontSize: 14, fontWeight: '800', color: '#4F46E5' }}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => pickImage(false)}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' }}
              >
                <ImageIcon size={18} color="#64748b" />
                <Text style={{ marginLeft: 8, fontSize: 14, fontWeight: '800', color: '#64748b' }}>Gallery</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {step === 3 && (
        <View style={{ position: 'absolute', bottom: 20, left: 24, right: 24 }}>
          <TouchableOpacity 
            onPress={handleSaveGrades} 
            disabled={saving}
            activeOpacity={0.9} 
            style={{ 
              backgroundColor: '#4F46E5', paddingVertical: 18, borderRadius: 16, 
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 8 }, 
              shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 
            }}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '900' }}>Save Grades</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </SafeAreaView>
  );
};
