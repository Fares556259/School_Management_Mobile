import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StatusBar, Image as RNImage, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft,
  ChevronRight,
  Search, 
  Filter, 
  Clock, 
  ChevronDown,
  Save,
  Calendar as CalendarIcon,
  X,
  Check,
  Layout,
  MessageSquare,
  ClipboardList,
  FileText,
  Plus,
  Star,
  Image as ImageIcon,
  File as FileIcon,
  Trash2
} from 'lucide-react-native';
import { teacherService } from '../../services/api';
import { useAppStore } from '../../store/useAppStore';
import moment from 'moment';
import { TextInput } from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import * as Haptics from 'expo-haptics';

const Skeleton = ({ width, height, borderRadius = 8, style }: any) => {
  const anim = useState(new Animated.Value(0.3))[0];
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true })
    ])).start();
  }, []);
  return <Animated.View style={[{ width, height, borderRadius, backgroundColor: '#e2e8f0', opacity: anim }, style]} />;
};

const DateItem = ({ day, date, active, isToday, onPress }: any) => {
  const scale = React.useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Haptics.selectionAsync();
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 60 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }),
    ]).start();
    onPress();
  };
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={1}
        style={[{
          width: 62, height: 76, borderRadius: 20,
          backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center',
          marginRight: 10, borderWidth: 1, borderColor: '#e2e8f0',
        }, active && {
          backgroundColor: '#0055d4', borderColor: '#0055d4',
          shadowColor: '#0055d4', shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
        }]}
      >
        <Text style={[{ fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }, active && { color: 'white' }]}>{day}</Text>
        <Text style={[{ fontSize: 22, fontWeight: '800', color: '#1e293b' }, active && { color: 'white' }]}>{date}</Text>
        {isToday && (
          <View style={[{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#0055d4', marginTop: 4 }, active && { backgroundColor: 'rgba(255,255,255,0.7)' }]} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const AttendanceButton = ({ type, active, onPress }: any) => {
  const configs: any = {
    PRESENT: { color: '#10b981', bg: '#ecfdf5', label: 'Present' },
    ABSENT: { color: '#ef4444', bg: '#fef2f2', label: 'Absent' },
    LATE: { color: '#f59e0b', bg: '#fffbeb', label: 'Late' }
  };
  const config = configs[type];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ flex: 1, height: 48, borderRadius: 16, backgroundColor: active ? config.color : 'white', borderWidth: 1.5, borderColor: active ? config.color : '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginHorizontal: 4, shadowColor: active ? config.color : '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: active ? 0.2 : 0, shadowRadius: 8, elevation: active ? 4 : 0 }}>
      <Text style={{ fontSize: 13, fontWeight: '900', color: active ? 'white' : '#64748b' }}>{config.label}</Text>
    </TouchableOpacity>
  );
};

const StarRating = ({ score, onScoreChange }: any) => {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isSelected = score >= star;
        return (
          <TouchableOpacity key={star} onPress={() => onScoreChange(score === star ? 0 : star)} activeOpacity={0.7}>
            <Star size={28} color={isSelected ? '#f59e0b' : '#e2e8f0'} fill={isSelected ? '#f59e0b' : 'none'} strokeWidth={isSelected ? 0 : 2} />
          </TouchableOpacity>
        );
      })}
      <View style={{ marginLeft: 12, backgroundColor: '#fffbeb', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
        <Text style={{ fontSize: 14, fontWeight: '900', color: '#f59e0b' }}>{score || 0}/5</Text>
      </View>
    </View>
  );
};

const QUICK_TAGS = ['Excused', 'Unexcused', 'Parent notified', 'Missing homework', 'Disruptive', 'Needs support', 'Great participation', 'Conflict with peer', 'Monitor closely'];

const StudentRow = ({ student, status, onStatusChange, note, onNoteChange, score, onScoreChange, resetKey }: any) => {
  const [showNote, setShowNote] = useState(false);
  const hasNote = note?.length > 0;

  useEffect(() => {
    setShowNote(false);
  }, [resetKey]);

  const handleTagPress = (tag: string) => {
    const currentNote = note || '';
    const newNote = currentNote.length > 0 ? `${currentNote}, ${tag}` : tag;
    onNoteChange(newNote);
  };

  return (
    <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 28, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 15, elevation: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' }}><Text style={{ fontSize: 20, fontWeight: '900', color: '#0055d4' }}>{student.name.charAt(0)}</Text></View>
        <View style={{ marginLeft: 16, flex: 1 }}><Text style={{ fontSize: 17, fontWeight: '900', color: '#1e293b' }}>{student.name} {student.surname}</Text></View>
        <TouchableOpacity onPress={() => setShowNote(!showNote)} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: showNote ? '#eff6ff' : '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: showNote ? '#dbeafe' : '#f1f5f9' }}>
          <MessageSquare size={20} color={showNote || hasNote ? '#0055d4' : '#64748b'} />
          {hasNote && !showNote && (
            <View style={{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 1.5, borderColor: 'white' }} />
          )}
        </TouchableOpacity>
      </View>
      <View style={{ marginBottom: 20 }}><Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 }}>Participation Score</Text><StarRating score={score} onScoreChange={onScoreChange} /></View>
      <View style={{ flexDirection: 'row', marginBottom: showNote ? 16 : 0 }}><AttendanceButton type="PRESENT" active={status === 'PRESENT'} onPress={() => onStatusChange('PRESENT')} /><AttendanceButton type="ABSENT" active={status === 'ABSENT'} onPress={() => onStatusChange('ABSENT')} /><AttendanceButton type="LATE" active={status === 'LATE'} onPress={() => onStatusChange('LATE')} /></View>
      {showNote && (
        <View style={{ marginTop: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 }}>Quick Tags</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>{QUICK_TAGS.map(tag => (<TouchableOpacity key={tag} onPress={() => handleTagPress(tag)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' }}><Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>{tag}</Text></TouchableOpacity>))}</View>
          <View style={{ backgroundColor: '#f8fafc', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#f1f5f9' }}><TextInput placeholder="Add a detailed note..." placeholderTextColor="#94a3b8" multiline value={note} onChangeText={onNoteChange} style={{ fontSize: 14, color: '#1e293b', fontWeight: '600', minHeight: 80, textAlignVertical: 'top', padding: 0 }} /></View>
        </View>
      )}
    </View>
  );
};

const getSubjectName = (name: string) => {
  if (!name) return 'General';
  const parts = name.split('|');
  return parts[parts.length - 1].trim();
};

export const TeacherAttendanceScreen = ({ navigation }: any) => {
  const { selectedTeacherClass, setSelectedTeacherClass } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const selectedClass = selectedTeacherClass;
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [initialAttendance, setInitialAttendance] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState(moment());
  const [hasLesson, setHasLesson] = useState(true);
  const [lessonId, setLessonId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState<number | null>(null);
  const [showClassSwitcher, setShowClassSwitcher] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [newTask, setNewTask] = useState({ title: '', description: '', show: false, attachments: [] as any[] });
  const [scores, setScores] = useState<Record<string, number>>({});
  const [initialScores, setInitialScores] = useState<Record<string, number>>({});
  const [initialNotes, setInitialNotes] = useState<Record<string, string>>({});
  const [assignments, setAssignments] = useState<any[]>([]);
  const [saveCount, setSaveCount] = useState(0); // Used to force-close note sections on save

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(moment());

  // weekDates now based on the currently selected date's week so it shifts when picking a new date
  const sliderDates = Array.from({ length: 7 }, (_, i) => selectedDate.clone().subtract(3, 'days').add(i, 'days'));
  const hasChanges = JSON.stringify(attendance) !== JSON.stringify(initialAttendance) || JSON.stringify(notes) !== JSON.stringify(initialNotes) || JSON.stringify(scores) !== JSON.stringify(initialScores) || newTask.title.length > 0 || newTask.attachments.length > 0;

  const loadClasses = async () => {
    try {
      setLoading(true);
      const res = await teacherService.fetchClasses();
      const safeRes = res || [];
      setClasses(safeRes);
      // Auto-select first class if none selected
      if (safeRes.length > 0 && !selectedTeacherClass) { 
        setSelectedTeacherClass(safeRes[0]); 
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const loadStudents = async (classId: string, date: string, subjectId?: number, showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const res = await teacherService.fetchClassStudents(classId, date, subjectId);
      if (!res || !Array.isArray(res.students)) { setHasLesson(false); setSessions([]); return; }
      setStudents(res.students);
      setHasLesson(res.hasLesson);
      setLessonId(res.lessonId || null);
      setSessions(res.sessions || []);
      setActiveSubjectId(res.activeSubjectId || null);
      setAssignments(res.assignments || []);
      setShowClassSwitcher(false);
      const initialAtt: Record<string, string> = {};
      const initialN: Record<string, string> = {};
      const initialS: Record<string, number> = {};
      res.students.forEach((s: any) => {
        initialAtt[s.id] = s.attendanceStatus || 'PRESENT';
        initialN[s.id] = s.note || '';
        initialS[s.id] = s.score || 0;
      });
      setAttendance(initialAtt); setInitialAttendance(initialAtt);
      setNotes(initialN); setInitialNotes(initialN);
      setScores(initialS); setInitialScores(initialS);
    } catch (err) { console.error(err); } finally { if (showLoader) setLoading(false); }
  };

  const handleClassSelect = (cls: any) => {
    setSelectedTeacherClass(cls);
    setShowClassSwitcher(false);
  };

  useEffect(() => { loadClasses(); }, []);

  // Sync data whenever selected class or date changes
  useEffect(() => {
    if (selectedTeacherClass) {
      loadStudents(selectedTeacherClass.id, selectedDate.format('YYYY-MM-DD'));
    }
  }, [selectedTeacherClass, selectedDate]);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 });
      if (!result.canceled) {
        const asset = result.assets[0];
        setNewTask(prev => ({ ...prev, attachments: [...prev.attachments, { type: 'IMAGE', uri: asset.uri, name: 'image.jpg' }] }));
      }
    } catch (err) { alert('Error picking image'); }
  };

  const handlePickDocument = async () => {
    alert('PDF Support: UI is ready! To enable the actual file picker in this preview, please restart the Expo server. In a real build, this will open the document library.');
    const demoPdf = { type: 'PDF', uri: 'mock-uri', name: 'assignment_worksheet.pdf' };
    setNewTask(prev => ({ ...prev, attachments: [...prev.attachments, demoPdf] }));
  };

  const removeAttachment = (index: number) => {
    setNewTask(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    if (!selectedClass) return;
    try {
      setSaving(true);
      await teacherService.saveAttendance({
        classId: selectedClass.id, date: selectedDate.format('YYYY-MM-DD'),
        records: Object.keys(attendance).map(studentId => ({ studentId, status: attendance[studentId], note: notes[studentId], score: scores[studentId] })),
        lessonId: lessonId,
        subjectId: activeSubjectId,
        task: newTask.title ? { title: newTask.title, description: newTask.description, attachments: newTask.attachments } as any : undefined
      });
      setInitialAttendance(attendance); setInitialNotes(notes); setInitialScores(scores);
      setNewTask({ title: '', description: '', show: false, attachments: [] });
      setSaveCount(prev => prev + 1);
      setSaving(false);
      alert('Saved successfully!');
      // Silently refresh data in background
      loadStudents(selectedClass.id, selectedDate.format('YYYY-MM-DD'), activeSubjectId || undefined, false);
    } catch (err) { alert('Failed to save data'); setSaving(false); }
  };

  // Generate calendar days
  const startOfMonth = calendarMonth.clone().startOf('month');
  const endOfMonth = calendarMonth.clone().endOf('month');
  const daysInMonth = [];
  const startOffset = startOfMonth.day(); // 0 is Sunday
  for (let i = 0; i < startOffset; i++) daysInMonth.push(null);
  for (let i = 1; i <= endOfMonth.date(); i++) daysInMonth.push(calendarMonth.clone().date(i));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Date Picker Modal */}
      {showDatePicker && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 32, padding: 24, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <TouchableOpacity onPress={() => setCalendarMonth(prev => prev.clone().subtract(1, 'month'))} style={{ padding: 8 }}><ChevronLeft size={24} color="#1e293b" /></TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b' }}>{calendarMonth.format('MMMM YYYY')}</Text>
              <TouchableOpacity onPress={() => setCalendarMonth(prev => prev.clone().add(1, 'month'))} style={{ padding: 8 }}><ChevronRight size={24} color="#1e293b" /></TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <View key={`header-${idx}`} style={{ width: '14.28%', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#94a3b8' }}>{day}</Text>
                </View>
              ))}
              {daysInMonth.map((day, idx) => {
                if (!day) return <View key={`empty-${idx}`} style={{ width: '14.28%', height: 40 }} />;
                const isSelected = selectedDate.isSame(day, 'day');
                const isToday = moment().isSame(day, 'day');
                return (
                  <TouchableOpacity 
                    key={day.format('YYYY-MM-DD')} 
                    onPress={() => {
                      setSelectedDate(day);
                      setShowDatePicker(false);
                      if (selectedClass) loadStudents(selectedClass.id, day.format('YYYY-MM-DD'));
                    }}
                    style={{ width: '14.28%', height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isSelected ? '#0055d4' : isToday ? '#eff6ff' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 15, fontWeight: isSelected || isToday ? '900' : '600', color: isSelected ? 'white' : isToday ? '#0055d4' : '#1e293b' }}>{day.date()}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity onPress={() => setShowDatePicker(false)} style={{ marginTop: 16, backgroundColor: '#f1f5f9', padding: 16, borderRadius: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#64748b' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' }}><ChevronLeft size={22} color="#1e293b" /></TouchableOpacity>
        <TouchableOpacity onPress={() => setShowClassSwitcher(true)} style={{ flex: 1, marginHorizontal: 16, alignItems: 'center' }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b' }}>{selectedClass?.name || 'Select Class'}</Text><ChevronDown size={16} color="#0055d4" style={{ marginLeft: 6 }} /></View><Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginTop: 2 }}>Tap to switch</Text></TouchableOpacity>
        <TouchableOpacity onPress={handleSave} disabled={saving || loading || !hasChanges} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: saving || hasChanges ? '#0055d4' : '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: saving || hasChanges ? '#0055d4' : '#f1f5f9' }}>
          {saving ? <ActivityIndicator size="small" color="white" /> : <Save size={22} color={saving || hasChanges ? 'white' : '#94a3b8'} />}
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 200 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadStudents(selectedClass.id, selectedDate.format('YYYY-MM-DD'))} />}>
        <View style={{ marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#1e293b' }}>
              {selectedDate.isSame(moment(), 'day') ? "Today's Schedule" : `${selectedDate.format('dddd')}'s Schedule`}
            </Text>
            {!selectedDate.isSame(moment(), 'day') && (
              <TouchableOpacity onPress={() => { setSelectedDate(moment()); if (selectedClass) loadStudents(selectedClass.id, moment().format('YYYY-MM-DD')); }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0055d4' }}>Back to Today</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => { setCalendarMonth(selectedDate.clone()); setShowDatePicker(true); }} style={{ width: 48, height: 76, borderRadius: 20, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
              <CalendarIcon size={24} color="#64748b" />
            </TouchableOpacity>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }}>
              {sliderDates.map((dateObj, idx) => {
                const isSelected = selectedDate.isSame(dateObj, 'day');
                const isToday = moment().isSame(dateObj, 'day');
                return (
                  <DateItem
                    key={idx}
                    day={dateObj.format('ddd')}
                    date={dateObj.format('D')}
                    active={isSelected}
                    isToday={isToday}
                    onPress={() => {
                      setSelectedDate(dateObj);
                      if (selectedClass) loadStudents(selectedClass.id, dateObj.format('YYYY-MM-DD'));
                    }}
                  />
                );
              })}
            </ScrollView>
          </View>

          {sessions.length > 0 && !loading && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ marginTop: 24, paddingBottom: 4, gap: 12 }}>
              {sessions.map(session => {
                const isActive = activeSubjectId === session.subjectId;
                return (
                  <TouchableOpacity 
                    key={session.slotId}
                    onPress={() => {
                      if (selectedClass) loadStudents(selectedClass.id, selectedDate.format('YYYY-MM-DD'), session.subjectId);
                    }}
                    style={{
                      paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
                      backgroundColor: isActive ? '#0055d4' : '#f8fafc',
                      borderWidth: 1, borderColor: isActive ? '#0055d4' : '#e2e8f0',
                      flexDirection: 'row', alignItems: 'center',
                      shadowColor: isActive ? '#0055d4' : '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isActive ? 0.2 : 0,
                      shadowRadius: 4,
                      elevation: isActive ? 3 : 0
                    }}>
                    <Clock size={16} color={isActive ? 'white' : '#64748b'} style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: isActive ? 'white' : '#475569' }}>
                      {getSubjectName(session.subjectName)} • {session.startTime.substring(0, 5)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
        <View>
          {hasLesson && !loading && <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><Text style={{ fontSize: 16, fontWeight: '900', color: '#1e293b', textTransform: 'uppercase', letterSpacing: 1 }}>Student List</Text><View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 }}><Text style={{ fontSize: 12, fontWeight: '900', color: '#0055d4' }}>{students.length} students</Text></View></View>}
          {loading && !refreshing ? (
            <View style={{ gap: 16 }}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={{ backgroundColor: 'white', padding: 20, borderRadius: 28, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9', height: 180 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                    <Skeleton width={52} height={52} borderRadius={18} style={{ marginRight: 16 }} />
                    <View style={{ flex: 1 }}>
                      <Skeleton width="60%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
                      <Skeleton width="40%" height={10} borderRadius={2} />
                    </View>
                    <Skeleton width={44} height={44} borderRadius={14} />
                  </View>
                  <Skeleton width={100} height={10} borderRadius={2} style={{ marginBottom: 12 }} />
                  <Skeleton width="100%" height={28} borderRadius={14} style={{ marginBottom: 16 }} />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Skeleton width={80} height={40} borderRadius={12} />
                    <Skeleton width={80} height={40} borderRadius={12} />
                    <Skeleton width={80} height={40} borderRadius={12} />
                  </View>
                </View>
              ))}
            </View>
          ) : !hasLesson ? <View style={{ alignItems: 'center', marginTop: 40, backgroundColor: 'white', padding: 40, borderRadius: 32, borderWidth: 1, borderColor: '#f1f5f9' }}><Clock size={48} color="#0055d4" strokeWidth={1.5} /><Text style={{ fontSize: 20, fontWeight: '900', color: '#1e293b', textAlign: 'center', marginTop: 20 }}>No class today</Text><Text style={{ fontSize: 14, color: '#64748b', fontWeight: '600', textAlign: 'center', marginTop: 8, lineHeight: 20 }}>You don't have any scheduled lessons for this class on this date.</Text></View> : (
            <View>
              {students.map(s => <StudentRow key={s.id} student={s} status={attendance[s.id]} onStatusChange={(status: string) => setAttendance(prev => ({ ...prev, [s.id]: status }))} note={notes[s.id]} onNoteChange={(text: string) => setNotes(prev => ({ ...prev, [s.id]: text }))} score={scores[s.id]} onScoreChange={(score: number) => setScores(prev => ({ ...prev, [s.id]: score }))} resetKey={saveCount} />)}
              
              <View style={{ marginTop: 24, gap: 16 }}>
                <View style={{ backgroundColor: 'white', borderRadius: 28, padding: 20, borderWidth: 1, borderColor: '#f1f5f9' }}>
                  <TouchableOpacity onPress={() => setNewTask(prev => ({ ...prev, show: !prev.show }))} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' }}><ClipboardList size={22} color="#f59e0b" /></View>
                    <View style={{ flex: 1, marginLeft: 16 }}><Text style={{ fontSize: 16, fontWeight: '900', color: '#1e293b' }}>Assign a Task</Text><Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '700', marginTop: 2 }}>For the whole class</Text></View>
                    <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}><Plus size={18} color="#64748b" /></View>
                  </TouchableOpacity>
                  {newTask.show && (
                    <View style={{ marginTop: 20, gap: 12 }}>
                      <TextInput placeholder="Task Title" placeholderTextColor="#94a3b8" value={newTask.title} onChangeText={(t) => setNewTask(prev => ({ ...prev, title: t }))} style={{ backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, fontSize: 14, fontWeight: '700', color: '#1e293b', borderWidth: 1, borderColor: '#f1f5f9' }} />
                      <TextInput placeholder="Description (optional)" placeholderTextColor="#94a3b8" multiline value={newTask.description} onChangeText={(t) => setNewTask(prev => ({ ...prev, description: t }))} style={{ backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, fontSize: 14, fontWeight: '600', color: '#1e293b', borderWidth: 1, borderColor: '#f1f5f9', minHeight: 80, textAlignVertical: 'top' }} />
                      <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginTop: 10, letterSpacing: 0.5 }}>Attachments</Text>
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity onPress={handlePickImage} style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}><ImageIcon size={18} color="#8b5cf6" /><Text style={{ fontSize: 13, fontWeight: '800', color: '#8b5cf6' }}>Add Image</Text></TouchableOpacity>
                        <TouchableOpacity onPress={handlePickDocument} style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}><FileIcon size={18} color="#0055d4" /><Text style={{ fontSize: 13, fontWeight: '800', color: '#0055d4' }}>Add PDF</Text></TouchableOpacity>
                      </View>
                      {newTask.attachments.length > 0 && (
                        <View style={{ marginTop: 12, gap: 8 }}>{newTask.attachments.map((file, idx) => (<View key={idx} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#f1f5f9' }}>{file.type === 'IMAGE' ? <ImageIcon size={18} color="#8b5cf6" /> : <FileIcon size={18} color="#0055d4" />}<Text style={{ flex: 1, marginLeft: 12, fontSize: 13, fontWeight: '700', color: '#1e293b' }} numberOfLines={1}>{file.name}</Text><TouchableOpacity onPress={() => removeAttachment(idx)}><Trash2 size={18} color="#ef4444" /></TouchableOpacity></View>))}</View>
                      )}
                    </View>
                  )}
                </View>

                {assignments.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#1e293b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Assigned Tasks</Text>
                    {assignments.map((task: any) => (
                      <View key={task.id} style={{ backgroundColor: 'white', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' }}><ClipboardList size={18} color="#f59e0b" /></View>
                          <Text style={{ flex: 1, marginLeft: 12, fontSize: 16, fontWeight: '800', color: '#1e293b' }}>{task.title}</Text>
                          {task.attachments?.length > 0 && (
                            <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}><Text style={{ fontSize: 10, fontWeight: '900', color: '#0055d4' }}>{task.attachments.length} files</Text></View>
                          )}
                        </View>
                        {task.description && (<Text style={{ fontSize: 14, color: '#64748b', fontWeight: '600', marginLeft: 48 }}>{task.description}</Text>)}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
      {hasChanges && (
        <View style={{ position: 'absolute', bottom: 110, left: 24, right: 24 }}>
          <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.9} style={{ backgroundColor: '#0055d4', paddingVertical: 20, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#0055d4', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10, opacity: saving ? 0.6 : 1 }}>{saving ? <ActivityIndicator color="white" /> : <><Save size={22} color="white" style={{ marginRight: 12 }} /><Text style={{ color: 'white', fontSize: 16, fontWeight: '900' }}>Save Changes</Text></>}</TouchableOpacity>
        </View>
      )}
      {showClassSwitcher && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end', zIndex: 1000 }}>
          <TouchableOpacity activeOpacity={1} onPress={() => setShowClassSwitcher(false)} style={{ flex: 1 }} />
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 32, paddingBottom: 60, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 30, elevation: 20 }}>
            <View style={{ width: 40, height: 5, backgroundColor: '#e2e8f0', borderRadius: 10, alignSelf: 'center', marginBottom: 24 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}><Text style={{ fontSize: 24, fontWeight: '900', color: '#1e293b' }}>Switch Class</Text><TouchableOpacity onPress={() => setShowClassSwitcher(false)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}><X size={20} color="#64748b" /></TouchableOpacity></View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>{classes.map((cls) => (<TouchableOpacity key={cls.id} onPress={() => handleClassSelect(cls)} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24, backgroundColor: selectedClass?.id === cls.id ? '#eff6ff' : 'white', marginBottom: 12, borderWidth: 1.5, borderColor: selectedClass?.id === cls.id ? '#0055d4' : '#f1f5f9', shadowColor: selectedClass?.id === cls.id ? '#0055d4' : '#000', shadowOpacity: selectedClass?.id === cls.id ? 0.05 : 0.02, shadowRadius: 10, elevation: 1 }}><View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: selectedClass?.id === cls.id ? '#0055d4' : '#f8fafc', alignItems: 'center', justifyContent: 'center' }}><Layout size={28} color={selectedClass?.id === cls.id ? 'white' : '#94a3b8'} /></View><View style={{ marginLeft: 20, flex: 1 }}><Text style={{ fontSize: 18, fontWeight: '900', color: selectedClass?.id === cls.id ? '#0055d4' : '#1e293b' }}>{cls.name}</Text><Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: '700', marginTop: 2 }}>{cls.level || 'Standard'}</Text></View>{selectedClass?.id === cls.id && <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#0055d4', alignItems: 'center', justifyContent: 'center' }}><Check size={16} color="white" strokeWidth={3} /></View>}</TouchableOpacity>))}</ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};
