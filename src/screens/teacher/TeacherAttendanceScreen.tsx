import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  Search, 
  Filter, 
  Clock, 
  ChevronDown,
  Save,
  Calendar as CalendarIcon,
  X,
  Check,
  Layout
} from 'lucide-react-native';
import { teacherService } from '../../services/api';
import moment from 'moment';

const AttendanceButton = ({ type, active, onPress }: any) => {
  const configs: any = {
    PRESENT: { color: '#10b981', bg: '#ecfdf5', label: 'Present' },
    ABSENT: { color: '#ef4444', bg: '#fef2f2', label: 'Absent' },
    LATE: { color: '#f59e0b', bg: '#fffbeb', label: 'Late' }
  };
  const config = configs[type];

  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flex: 1,
        height: 48,
        borderRadius: 16,
        backgroundColor: active ? config.color : 'white',
        borderWidth: 1.5,
        borderColor: active ? config.color : '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 4,
        shadowColor: active ? config.color : '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: active ? 0.2 : 0,
        shadowRadius: 8,
        elevation: active ? 4 : 0
      }}
    >
      <Text style={{ 
        fontSize: 13, 
        fontWeight: '900', 
        color: active ? 'white' : '#64748b' 
      }}>
        {config.label}
      </Text>
    </TouchableOpacity>
  );
};

const StudentRow = ({ student, status, onStatusChange }: any) => (
  <View style={{ 
    backgroundColor: 'white', 
    padding: 20, 
    borderRadius: 28, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 15,
    elevation: 2
  }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
      <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' }}>
        <Text style={{ fontSize: 20, fontWeight: '900', color: '#0055d4' }}>{student.name.charAt(0)}</Text>
      </View>
      <View style={{ marginLeft: 16, flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: '900', color: '#1e293b' }}>{student.name} {student.surname}</Text>
        <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '700', marginTop: 2, textTransform: 'uppercase' }}>Student ID: {student.id}</Text>
      </View>
    </View>

    <View style={{ flexDirection: 'row' }}>
      <AttendanceButton type="PRESENT" active={status === 'PRESENT'} onPress={() => onStatusChange('PRESENT')} />
      <AttendanceButton type="ABSENT" active={status === 'ABSENT'} onPress={() => onStatusChange('ABSENT')} />
      <AttendanceButton type="LATE" active={status === 'LATE'} onPress={() => onStatusChange('LATE')} />
    </View>
  </View>
);

export const TeacherAttendanceScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [initialAttendance, setInitialAttendance] = useState<Record<string, string>>({});
  const [assignments, setAssignments] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(moment());
  const [hasLesson, setHasLesson] = useState(true);
  const [showClassSwitcher, setShowClassSwitcher] = useState(false);
  
  // Generate dates for the current week around the selected date
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    return moment().startOf('week').add(i, 'days');
  });

  const hasChanges = JSON.stringify(attendance) !== JSON.stringify(initialAttendance);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const res = await teacherService.fetchClasses();
      setClasses(res);
      if (res.length > 0) {
        setSelectedClass(res[0]);
        loadStudents(res[0].id, selectedDate.format('YYYY-MM-DD'));
      }
    } catch (err) {
      console.error("[TEACHER-CLASSES-LOAD]", err);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (classId: string, date: string) => {
    try {
      setLoading(true);
      const res = await teacherService.fetchClassStudents(classId, date);
      
      if (!res || !Array.isArray(res.students)) {
        setStudents([]);
        return;
      }

      setStudents(res.students);
      setAssignments(res.assignments || []);
      setResources(res.resources || []);
      setHasLesson(res.hasLesson);
      setShowClassSwitcher(false); // Close switcher on selection

      const initial: Record<string, string> = {};
      res.students.forEach((s: any) => initial[s.id] = s.attendanceStatus || 'PRESENT');
      setAttendance(initial);
      setInitialAttendance(initial);
    } catch (err) {
      console.error("[TEACHER-STUDENTS-LOAD]", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    if (selectedClass) {
      await loadStudents(selectedClass.id, selectedDate.format('YYYY-MM-DD'));
    }
    setRefreshing(false);
  };

  const handleClassSelect = (cls: any) => {
    setSelectedClass(cls);
    loadStudents(cls.id, selectedDate.format('YYYY-MM-DD'));
  };

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    if (!selectedClass) return;
    try {
      setLoading(true);
      const attendanceList = Object.keys(attendance).map(studentId => ({
        studentId,
        status: attendance[studentId]
      }));
      
      await teacherService.saveAttendance({
        classId: selectedClass.id,
        date: selectedDate.format('YYYY-MM-DD'),
        attendance: attendanceList
      });
      
      setInitialAttendance(attendance);
      alert('Attendance saved successfully!');
    } catch (err) {
      console.error("[TEACHER-SAVE-ERROR]", err);
      alert('Failed to save attendance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Premium Header */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 24, 
        paddingVertical: 16, 
        backgroundColor: 'white',
        borderBottomWidth: 1, 
        borderBottomColor: '#f1f5f9' 
      }}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' }}
        >
          <ChevronLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => setShowClassSwitcher(true)}
          style={{ flex: 1, marginHorizontal: 16, alignItems: 'center' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b' }}>{selectedClass?.name || 'Select Class'}</Text>
            <ChevronDown size={16} color="#0055d4" style={{ marginLeft: 6 }} />
          </View>
          <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginTop: 2 }}>Tap to switch</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleSave}
          disabled={loading || !hasChanges}
          style={{ 
            width: 44, 
            height: 44, 
            borderRadius: 14, 
            backgroundColor: hasChanges ? '#eff6ff' : '#f8fafc', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: hasChanges ? '#dbeafe' : '#f1f5f9'
          }}
        >
          <Save size={22} color={hasChanges ? '#0055d4' : '#94a3b8'} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 24, paddingBottom: 200 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Date Selector */}
        <View style={{ marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#1e293b' }}>
              {selectedDate.isSame(moment(), 'day') ? "Today's Schedule" : `${selectedDate.format('dddd')}'s Schedule`}
            </Text>
            <TouchableOpacity style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 }}>
              <CalendarIcon size={22} color="#0055d4" />
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {weekDates.map((dateObj, idx) => {
              const isSelected = selectedDate.isSame(dateObj, 'day');
              const isToday = moment().isSame(dateObj, 'day');
              
              return (
                <TouchableOpacity 
                  key={idx}
                  onPress={() => {
                    setSelectedDate(dateObj);
                    if (selectedClass) loadStudents(selectedClass.id, dateObj.format('YYYY-MM-DD'));
                  }}
                  activeOpacity={0.8}
                  style={{ 
                    width: 72, 
                    height: 96, 
                    borderRadius: 20, 
                    backgroundColor: isSelected ? '#0055d4' : 'white',
                    alignItems: 'center', 
                    justifyContent: 'center',
                    borderWidth: 1.5,
                    borderColor: isSelected ? '#0055d4' : '#f1f5f9',
                    shadowColor: isSelected ? '#0055d4' : '#000',
                    shadowOpacity: isSelected ? 0.2 : 0,
                    shadowRadius: 10,
                    elevation: isSelected ? 5 : 0
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '900', color: isSelected ? 'rgba(255,255,255,0.7)' : '#94a3b8', textTransform: 'uppercase' }}>
                    {dateObj.format('ddd')}
                  </Text>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: isSelected ? 'white' : '#1e293b', marginTop: 4 }}>
                    {dateObj.format('D')}
                  </Text>
                  {isToday && (
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isSelected ? 'white' : '#0055d4', marginTop: 6 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Student List */}
        <View>
          {hasLesson && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#1e293b', textTransform: 'uppercase', letterSpacing: 1 }}>Student List</Text>
              <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '900', color: '#0055d4' }}>{students.length} students</Text>
              </View>
            </View>
          )}

          {loading && !refreshing ? (
            <ActivityIndicator size="small" color="#0055d4" style={{ marginTop: 20 }} />
          ) : !hasLesson ? (
            <View style={{ alignItems: 'center', marginTop: 40, backgroundColor: 'white', padding: 40, borderRadius: 32, borderWidth: 1, borderColor: '#f1f5f9' }}>
              <Clock size={48} color="#0055d4" strokeWidth={1.5} />
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#1e293b', textAlign: 'center', marginTop: 20 }}>No class today</Text>
              <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '600', textAlign: 'center', marginTop: 8, lineHeight: 20 }}>You don't have any scheduled lessons for this class on this date.</Text>
            </View>
          ) : (
            students.map(s => (
              <StudentRow 
                key={s.id} 
                student={s} 
                status={attendance[s.id]} 
                onStatusChange={(status: string) => handleStatusChange(s.id, status)} 
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating Save Button */}
      {hasChanges && (
        <View style={{ position: 'absolute', bottom: 40, left: 24, right: 24 }}>
          <TouchableOpacity 
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.9}
            style={{ 
              backgroundColor: '#0055d4', 
              paddingVertical: 20, 
              borderRadius: 24, 
              flexDirection: 'row', 
              alignItems: 'center', 
              justifyContent: 'center',
              shadowColor: '#0055d4',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10
            }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Save size={22} color="white" style={{ marginRight: 12 }} />
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '900' }}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Class Switcher Modal */}
      {showClassSwitcher && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end', zIndex: 1000 }}>
          <TouchableOpacity activeOpacity={1} onPress={() => setShowClassSwitcher(false)} style={{ flex: 1 }} />
          <View style={{ 
            backgroundColor: 'white', 
            borderTopLeftRadius: 40, 
            borderTopRightRadius: 40, 
            padding: 32, 
            paddingBottom: 60,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -10 },
            shadowOpacity: 0.1,
            shadowRadius: 30,
            elevation: 20
          }}>
            <View style={{ width: 40, height: 5, backgroundColor: '#e2e8f0', borderRadius: 10, alignSelf: 'center', marginBottom: 24 }} />
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#1e293b' }}>Switch Class</Text>
              <TouchableOpacity 
                onPress={() => setShowClassSwitcher(false)} 
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              {classes.map((cls) => (
                <TouchableOpacity 
                  key={cls.id}
                  onPress={() => handleClassSelect(cls)}
                  activeOpacity={0.8}
                  style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    padding: 20, 
                    borderRadius: 24, 
                    backgroundColor: selectedClass?.id === cls.id ? '#eff6ff' : 'white',
                    marginBottom: 12,
                    borderWidth: 1.5,
                    borderColor: selectedClass?.id === cls.id ? '#0055d4' : '#f1f5f9',
                    shadowColor: selectedClass?.id === cls.id ? '#0055d4' : '#000',
                    shadowOpacity: selectedClass?.id === cls.id ? 0.05 : 0.02,
                    shadowRadius: 10,
                    elevation: 1
                  }}
                >
                  <View style={{ 
                    width: 56, 
                    height: 56, 
                    borderRadius: 18, 
                    backgroundColor: selectedClass?.id === cls.id ? '#0055d4' : '#f8fafc', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <Layout size={28} color={selectedClass?.id === cls.id ? 'white' : '#94a3b8'} />
                  </View>
                  <View style={{ marginLeft: 20, flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: selectedClass?.id === cls.id ? '#0055d4' : '#1e293b' }}>{cls.name}</Text>
                    <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: '700', marginTop: 2 }}>{cls.level || 'Standard'}</Text>
                  </View>
                  {selectedClass?.id === cls.id && (
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#0055d4', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={16} color="white" strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};
