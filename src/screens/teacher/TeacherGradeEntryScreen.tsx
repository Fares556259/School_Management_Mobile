import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Check, BookOpen, Users, Layout, Camera, Image as ImageIcon, X, Award, Sparkles } from 'lucide-react-native';
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
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      {/* Top Bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' }}>
          <ChevronLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#dbeafe' }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#0055d4' }}>Grade Entry</Text>
        </View>
      </View>

      {/* Hero Header Banner */}
      <View style={{
        backgroundColor: '#0055d4', borderRadius: 24, padding: 22, marginBottom: 24,
        shadowColor: '#0055d4', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={22} color="white" />
          </View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ color: 'white', fontWeight: '800', fontSize: 11, textTransform: 'uppercase' }}>Term Assessment</Text>
          </View>
        </View>
        <Text style={{ color: 'white', fontSize: 20, fontWeight: '900', marginBottom: 4 }}>Select Class to Grade</Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', lineHeight: 18 }}>
          Record student marks, update term evaluation records, and upload exam sheets.
        </Text>
      </View>

      {/* Section Title */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <Text style={{ fontSize: 13, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>Assigned Classes</Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#94a3b8' }}>{classes.length} {classes.length === 1 ? 'Class' : 'Classes'}</Text>
      </View>

      {/* Classes List */}
      {loading ? (
        <ActivityIndicator size="large" color="#0055d4" style={{ marginVertical: 40 }} />
      ) : classes.length === 0 ? (
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Users size={28} color="#94a3b8" />
          </View>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b' }}>No classes found</Text>
          <Text style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 4, paddingHorizontal: 32 }}>
            You haven't been assigned to any classes yet.
          </Text>
        </View>
      ) : (
        classes.map((cls) => (
          <TouchableOpacity 
            key={cls.id} 
            onPress={() => handleClassSelect(cls)}
            activeOpacity={0.85}
            style={{ 
              flexDirection: 'row', alignItems: 'center', padding: 18, 
              borderRadius: 20, backgroundColor: 'white', marginBottom: 14,
              borderWidth: 1.5, borderColor: '#f1f5f9',
              shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.04, shadowRadius: 8, elevation: 2
            }}
          >
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={26} color="#0055d4" />
            </View>
            <View style={{ marginLeft: 16, flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '900', color: '#1e293b' }}>{cls.name}</Text>
              <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '700', marginTop: 2 }}>
                {cls.students || cls.studentsCount || 0} students enrolled
              </Text>
            </View>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>
        ))
      )}

      {/* Guidelines & Grading Notes Card (Fills empty space with valuable context) */}
      <View style={{ marginTop: 10, backgroundColor: 'white', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1f5f9' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
            <Sparkles size={18} color="#d97706" />
          </View>
          <Text style={{ fontSize: 15, fontWeight: '900', color: '#1e293b' }}>Grading Quick Tips</Text>
        </View>

        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#0055d4', marginTop: 6, marginRight: 10 }} />
            <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600', flex: 1, lineHeight: 18 }}>
              Select a class above, then choose the subject and term to enter scores.
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#0055d4', marginTop: 6, marginRight: 10 }} />
            <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600', flex: 1, lineHeight: 18 }}>
              You can optionally attach physical exam sheet photos or proof documents.
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#0055d4', marginTop: 6, marginRight: 10 }} />
            <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600', flex: 1, lineHeight: 18 }}>
              Submitted grades immediately update student report card calculations.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderStep2 = () => (
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
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

      <Text style={{ fontSize: 13, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Select Term</Text>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 28 }}>
        {[1, 2, 3].map(term => (
          <TouchableOpacity
            key={term}
            onPress={() => setSelectedTerm(term)}
            style={{
              flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center',
              backgroundColor: selectedTerm === term ? '#0055d4' : 'white',
              borderWidth: 1.5, borderColor: selectedTerm === term ? '#0055d4' : '#e2e8f0',
              shadowColor: selectedTerm === term ? '#0055d4' : '#000', shadowOffset: { width: 0, height: 4 },
              shadowOpacity: selectedTerm === term ? 0.2 : 0, shadowRadius: 6, elevation: selectedTerm === term ? 3 : 0
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '900', color: selectedTerm === term ? 'white' : '#64748b' }}>
              Term {term}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>Available Subjects</Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#94a3b8' }}>{subjects.length} {subjects.length === 1 ? 'Subject' : 'Subjects'}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0055d4" style={{ marginVertical: 40 }} />
      ) : (
        subjects.map((sub) => (
          <TouchableOpacity 
            key={sub.id} 
            onPress={() => handleSubjectSelect(sub)}
            activeOpacity={0.85}
            style={{ 
              flexDirection: 'row', alignItems: 'center', padding: 18, 
              borderRadius: 20, backgroundColor: 'white', marginBottom: 14,
              borderWidth: 1.5, borderColor: '#f1f5f9',
              shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.04, shadowRadius: 8, elevation: 2
            }}
          >
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={26} color="#0055d4" />
            </View>
            <View style={{ marginLeft: 16, flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '900', color: '#1e293b' }}>{parseFrenchName(sub.name)}</Text>
              <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: '700', marginTop: 2 }}>{sub.domain || 'General'}</Text>
            </View>
            {sub.isFullyGraded && (
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Check size={16} color="white" strokeWidth={3} />
              </View>
            )}
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight size={20} color="#94a3b8" />
            </View>
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
