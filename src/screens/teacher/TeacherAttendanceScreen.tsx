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
    PRESENT: { color: '#22c55e', bg: '#f0fdf4', label: 'Present' },
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
        height: 44,
        borderRadius: 12,
        backgroundColor: active ? config.color : 'white',
        borderWidth: 1,
        borderColor: active ? config.color : '#f1f4f6',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 4
      }}
    >
      <Text style={{ 
        fontSize: 12, 
        fontWeight: 'bold', 
        color: active ? 'white' : '#737c7f' 
      }}>
        {config.label}
      </Text>
    </TouchableOpacity>
  );
};

const StudentRow = ({ student, status, onStatusChange }: any) => (
  <View style={{ 
    backgroundColor: 'white', 
    padding: 16, 
    borderRadius: 24, 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1
  }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#f8f9fa', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#0055d4' }}>{student.name.charAt(0)}</Text>
      </View>
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '900', color: '#2b3437' }}>{student.name} {student.surname}</Text>
        <Text style={{ fontSize: 12, color: '#b0b8bc', marginTop: 2 }}>ID: {student.id}</Text>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header with Class Switcher Toggle */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f4f6' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8f9fa', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color="#2b3437" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => setShowClassSwitcher(true)}
          style={{ flex: 1, marginLeft: 16, flexDirection: 'row', alignItems: 'center' }}
        >
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#2b3437' }}>{selectedClass?.name || 'Select Class'}</Text>
              <ChevronDown size={14} color="#0055d4" style={{ marginLeft: 6 }} />
            </View>
            <Text style={{ fontSize: 12, color: '#737c7f' }}>Tap to switch class</Text>
          </View>
        </TouchableOpacity>

        {hasChanges && (
          <TouchableOpacity 
            onPress={handleSave}
            disabled={loading}
            style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}
          >
            <Save size={20} color="#0055d4" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 20, paddingBottom: 200 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Date Selector */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#2b3437' }}>{selectedDate.isSame(moment(), 'day') ? "Today's Schedule" : `${selectedDate.format('dddd')}'s Schedule`}</Text>
            <TouchableOpacity style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 }}>
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
                    width: 65, 
                    height: 85, 
                    borderRadius: 16, 
                    backgroundColor: isSelected ? '#0055d4' : '#f8f9fa',
                    alignItems: 'center', 
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: isSelected ? '#0055d4' : '#f1f4f6',
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: isSelected ? 'rgba(255,255,255,0.7)' : '#737c7f', textTransform: 'uppercase' }}>
                    {dateObj.format('ddd')}
                  </Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: isSelected ? 'white' : '#2b3437', marginTop: 4 }}>
                    {dateObj.format('D')}
                  </Text>
                  {isToday && (
                    <Text style={{ fontSize: 8, fontWeight: 'bold', color: isSelected ? 'white' : '#0055d4', marginTop: 2 }}>
                      Today
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Student List */}
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#2b3437', textTransform: 'uppercase', letterSpacing: 1 }}>Student List</Text>
            <View style={{ backgroundColor: '#f1f4f6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#737c7f' }}>{students.length} students</Text>
            </View>
          </View>

          {loading && !refreshing ? (
            <ActivityIndicator size="small" color="#0055d4" style={{ marginTop: 20 }} />
          ) : !hasLesson ? (
            <View style={{ alignItems: 'center', marginTop: 40, backgroundColor: '#f8f9fa', padding: 32, borderRadius: 32 }}>
              <Clock size={32} color="#0055d4" />
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#2b3437', textAlign: 'center', marginTop: 16 }}>No class today</Text>
              <Text style={{ fontSize: 14, color: '#737c7f', textAlign: 'center', marginTop: 4 }}>You don't have any scheduled lessons for this class on this date.</Text>
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
        <View style={{ position: 'absolute', bottom: 30, left: 20, right: 20 }}>
          <TouchableOpacity 
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.9}
            style={{ 
              backgroundColor: '#0055d4', 
              paddingVertical: 18, 
              borderRadius: 20, 
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
                <Save size={20} color="white" style={{ marginRight: 10 }} />
                <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
      {/* Class Switcher Modal */}
      {showClassSwitcher && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', zIndex: 1000 }}>
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={() => setShowClassSwitcher(false)} 
            style={{ flex: 1 }} 
          />
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 60 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#2b3437' }}>Switch Class</Text>
              <TouchableOpacity onPress={() => setShowClassSwitcher(false)} style={{ padding: 8 }}>
                <X size={24} color="#737c7f" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              {classes.map((cls) => (
                <TouchableOpacity 
                  key={cls.id}
                  onPress={() => handleClassSelect(cls)}
                  style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    padding: 16, 
                    borderRadius: 20, 
                    backgroundColor: selectedClass?.id === cls.id ? '#eff6ff' : 'white',
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: selectedClass?.id === cls.id ? '#0055d4' : '#f1f4f6'
                  }}
                >
                  <View style={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: 14, 
                    backgroundColor: selectedClass?.id === cls.id ? '#0055d4' : '#f8f9fa', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <Layout size={24} color={selectedClass?.id === cls.id ? 'white' : '#737c7f'} />
                  </View>
                  <View style={{ marginLeft: 16, flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: selectedClass?.id === cls.id ? '#0055d4' : '#2b3437' }}>{cls.name}</Text>
                    <Text style={{ fontSize: 12, color: '#737c7f', marginTop: 2 }}>{cls.level || 'Standard'}</Text>
                  </View>
                  {selectedClass?.id === cls.id && <Check size={20} color="#0055d4" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};
