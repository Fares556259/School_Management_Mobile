import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Check, BookOpen, Users, Layout, Camera, Image as ImageIcon, X, Award, Sparkles } from 'lucide-react-native';
import { teacherService, API_BASE_URL } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';
import * as ImagePicker from 'expo-image-picker';
import { useLanguage } from '../../context/LanguageContext';

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
  const { t, language, isRTL } = useLanguage();
  
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
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
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
      
      const initialGrades: Record<string, string> = {};
      fetchedStudents.forEach((s: any) => {
        const existing = existingGrades[s.id];
        initialGrades[s.id] = existing !== undefined && existing !== null ? existing.toString() : '';
      });
      setGrades(initialGrades);
      if (fetchedStudents.length > 0) setActiveStudentId(fetchedStudents[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (studentId: string, value: string) => {
    const cleaned = value.replace(',', '.');
    if (cleaned === '') {
      setGrades(prev => ({ ...prev, [studentId]: '' }));
      return;
    }
    if (!/^\d*\.?\d*$/.test(cleaned)) return;
    const num = parseFloat(cleaned);
    if (!isNaN(num) && (num < 0 || num > 20)) {
      return;
    }
    setGrades(prev => ({ ...prev, [studentId]: cleaned }));
  };

  const applyQuickFraction = (studentId: string, fraction: string) => {
    if (fraction === 'CLEAR') {
      setGrades(prev => ({ ...prev, [studentId]: '' }));
      return;
    }
    if (fraction === '20') {
      setGrades(prev => ({ ...prev, [studentId]: '20' }));
      return;
    }
    const current = grades[studentId] || '';
    const baseInt = current.split('.')[0] || '0';
    const newScore = `${baseInt}${fraction}`;
    const num = parseFloat(newScore);
    if (!isNaN(num) && num <= 20) {
      setGrades(prev => ({ ...prev, [studentId]: newScore }));
    }
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
      const gradesArray = Object.keys(grades).map(studentId => {
        const val = grades[studentId];
        const num = val !== '' && val !== null && val !== undefined ? parseFloat(val) : null;
        return {
          studentId,
          score: num !== null && !isNaN(num) ? num : null
        };
      });
      
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

  const gradedCount = Object.values(grades).filter(g => g !== '' && g !== null && g !== undefined && !isNaN(parseFloat(g))).length;

  const renderStep1 = () => (
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      {/* Top Header */}
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 28 }}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9', marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }}
        >
          <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
            <ChevronLeft size={22} color="#1e293b" />
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#1e293b', letterSpacing: -0.5, textAlign: isRTL ? 'right' : 'left' }}>{(t?.gradeEntry || 'Grade Entry')}</Text>
          <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>{(t?.selectClassToRecordEvaluations || 'Select class to record evaluations')}</Text>
        </View>
      </View>

      {/* Classes List Header */}
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <Text style={{ fontSize: 12, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 }}>{(t?.yourClasses || 'Your Classes')}</Text>
        <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#0055d4' }}>{classes.length} {(t?.available || 'Available')}</Text>
        </View>
      </View>

      {/* Classes List */}
      {loading ? (
        <ActivityIndicator size="large" color="#0055d4" style={{ marginVertical: 40 }} />
      ) : classes.length === 0 ? (
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 50, backgroundColor: 'white', borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9' }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Users size={28} color="#94a3b8" />
          </View>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b' }}>{(t?.noClassesAssigned || 'No classes assigned')}</Text>
          <Text style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 4, paddingHorizontal: 32 }}>
            {language === 'ar' ? 'لم يتم تعيينك لأي فصول بعد.' : language === 'fr' ? 'Vous n\'avez encore été affecté à aucune classe.' : 'You have not been assigned to any classes yet.'}
          </Text>
        </View>
      ) : (
        classes.map((cls) => (
          <TouchableOpacity 
            key={cls.id} 
            onPress={() => handleClassSelect(cls)}
            activeOpacity={0.85}
            style={{ 
              flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', padding: 20, 
              borderRadius: 22, backgroundColor: 'white', marginBottom: 14,
              borderWidth: 1, borderColor: '#f1f5f9',
              shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.03, shadowRadius: 10, elevation: 2
            }}
          >
            <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: '#0055d4', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: 'white' }}>{cls.name}</Text>
            </View>
            <View style={{ marginLeft: isRTL ? 0 : 16, marginRight: isRTL ? 16 : 0, flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }}>{language === 'ar' ? `الفصل ${cls.name}` : language === 'fr' ? `Classe ${cls.name}` : `Class ${cls.name}`}</Text>
              <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: 3, textAlign: isRTL ? 'right' : 'left' }}>
                {cls.students || cls.studentsCount || 0} {(t?.studentsEnrolled || 'students enrolled')}
              </Text>
            </View>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
                <ChevronRight size={20} color="#94a3b8" />
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );

  const renderStep2 = () => (
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 24 }}>
        <TouchableOpacity 
          onPress={() => setStep(1)} 
          style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9', marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }}
        >
          <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
            <ChevronLeft size={22} color="#1e293b" />
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }}>{selectedClass?.name}</Text>
          <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: '700', textAlign: isRTL ? 'right' : 'left' }}>{(t?.selectSubjectTerm || 'Select Subject & Term')}</Text>
        </View>
      </View>

      <Text style={{ fontSize: 13, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }}>{(t?.selectTerm || 'Select Term')}</Text>
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
              {language === 'ar' ? `الفصل ${term}` : language === 'fr' ? `Trimestre ${term}` : `Term ${term}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>{(t?.availableSubjects || 'Available Subjects')}</Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#94a3b8' }}>{subjects.length} {language === 'ar' ? 'مواد' : language === 'fr' ? 'Matière(s)' : (subjects.length === 1 ? 'Subject' : 'Subjects')}</Text>
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
              flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', padding: 18, 
              borderRadius: 20, backgroundColor: 'white', marginBottom: 14,
              borderWidth: 1.5, borderColor: '#f1f5f9',
              shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.04, shadowRadius: 8, elevation: 2
            }}
          >
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={26} color="#0055d4" />
            </View>
            <View style={{ marginLeft: isRTL ? 0 : 16, marginRight: isRTL ? 16 : 0, flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '900', color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }}>{parseFrenchName(sub.name)}</Text>
              <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: '700', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>{sub.domain || 'General'}</Text>
            </View>
            {sub.isFullyGraded && (
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }}>
                <Check size={16} color="white" strokeWidth={3} />
              </View>
            )}
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
                <ChevronRight size={20} color="#94a3b8" />
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );

  const renderStep3 = () => (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity 
            onPress={() => setStep(2)} 
            style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9', marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }}
          >
            <View style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
              <ChevronLeft size={22} color="#1e293b" />
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }}>{parseFrenchName(selectedSubject?.name)}</Text>
            <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: '700', textAlign: isRTL ? 'right' : 'left' }}>{selectedClass?.name} • {language === 'ar' ? `الفصل ${selectedTerm}` : language === 'fr' ? `Trimestre ${selectedTerm}` : `Term ${selectedTerm}`}</Text>
          </View>
        </View>

        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: '900', color: '#1e293b', textTransform: 'uppercase', letterSpacing: 1 }}>{(t?.gradeEntry1 || 'Grade Entry')}</Text>
          <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '900', color: '#4F46E5' }}>{gradedCount} / {students.length} {(t?.graded || 'graded')}</Text>
          </View>
        </View>

        {/* Quick Decimals Assistant Bar */}
        <View style={{ marginBottom: 16, backgroundColor: 'white', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9' }}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {(t?.quickDecimalAssistant || 'Quick Decimal Assistant')}
            </Text>
            {activeStudentId && (
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#0055d4' }}>
                {language === 'ar' ? `تعديل: ${students.find(s => s.id === activeStudentId)?.name}` : language === 'fr' ? `Modification : ${students.find(s => s.id === activeStudentId)?.name}` : `Editing: ${students.find(s => s.id === activeStudentId)?.name}`}
              </Text>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['.1', '.25', '.5', '.75', '20', 'CLEAR'].map(f => (
                <TouchableOpacity
                  key={f}
                  onPress={() => {
                    const targetId = activeStudentId || students[0]?.id;
                    if (targetId) applyQuickFraction(targetId, f);
                  }}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
                    backgroundColor: f === 'CLEAR' ? '#fef2f2' : '#eff6ff',
                    borderWidth: 1, borderColor: f === 'CLEAR' ? '#fecaca' : '#dbeafe'
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '900', color: f === 'CLEAR' ? '#ef4444' : '#0055d4' }}>
                    {f === 'CLEAR' ? ((t?.clear || 'Clear')) : f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0055d4" />
        ) : (
          students.map((student) => {
            const isSelected = activeStudentId === student.id;
            return (
              <TouchableOpacity 
                key={student.id} 
                onPress={() => setActiveStudentId(student.id)}
                activeOpacity={0.9}
                style={{ 
                  flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', padding: 16, 
                  borderRadius: 16, backgroundColor: 'white', marginBottom: 12,
                  borderWidth: 1.5, borderColor: isSelected ? '#0055d4' : '#f1f5f9' 
                }}
              >
                <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: isSelected ? '#0055d4' : '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isSelected ? '#0055d4' : '#e2e8f0' }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: isSelected ? 'white' : '#0055d4' }}>{student.name.charAt(0)}</Text>
                </View>
                <View style={{ marginLeft: isRTL ? 0 : 16, marginRight: isRTL ? 16 : 0, flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }}>{student.name} {student.surname}</Text>
                </View>
                <View style={{ width: 75 }}>
                  <TextInput
                    placeholder="--"
                    placeholderTextColor="#94a3b8"
                    keyboardType="decimal-pad"
                    maxLength={5}
                    value={grades[student.id] || ''}
                    onFocus={() => setActiveStudentId(student.id)}
                    onChangeText={(val) => handleGradeChange(student.id, val)}
                    style={{
                      backgroundColor: isSelected ? '#eff6ff' : '#f8fafc',
                      borderWidth: 1.5,
                      borderColor: isSelected ? '#0055d4' : '#e2e8f0',
                      borderRadius: 12,
                      padding: 12,
                      fontSize: 16,
                      fontWeight: '800',
                      color: '#1e293b',
                      textAlign: 'center'
                    }}
                  />
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ marginTop: 24, padding: 16, borderRadius: 16, backgroundColor: 'white', borderWidth: 1, borderColor: '#f1f5f9' }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }}>{(t?.gradeSheetProofOptional || 'Grade Sheet Proof (Optional)')}</Text>
          {proofImage ? (
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12 }}>
              <ImageIcon size={24} color="#4F46E5" />
              <Text style={{ flex: 1, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0, fontSize: 14, fontWeight: '700', color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }} numberOfLines={1}>
                {proofImage.fileName || ((t?.proofImageAttached || 'Proof Image attached'))}
              </Text>
              <TouchableOpacity onPress={() => setProofImage(null)} style={{ padding: 4 }}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12 }}>
              <TouchableOpacity 
                onPress={() => pickImage(true)}
                style={{ flex: 1, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, backgroundColor: '#eff6ff', borderRadius: 12 }}
              >
                <Camera size={18} color="#4F46E5" />
                <Text style={{ marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0, fontSize: 14, fontWeight: '800', color: '#4F46E5' }}>{(t?.camera || 'Camera')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => pickImage(false)}
                style={{ flex: 1, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' }}
              >
                <ImageIcon size={18} color="#64748b" />
                <Text style={{ marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0, fontSize: 14, fontWeight: '800', color: '#64748b' }}>{(t?.gallery || 'Gallery')}</Text>
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
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '900' }}>{(t?.saveGrades || 'Save Grades')}</Text>
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
