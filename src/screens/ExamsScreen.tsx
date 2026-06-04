import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StatusBar, RefreshControl, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, FileText, Download, ExternalLink, Calendar, ChevronRight } from 'lucide-react-native';
import { GlobalHeader } from '../components/GlobalHeader';
import { useAppStore } from '../store/useAppStore';
import { studentService } from '../services/api';
import { downloadAndPreviewPDF } from '../utils/fileUtils';

const TermCard = ({ period, pdfUrl }: { period: number, pdfUrl?: string }) => {
  const [downloading, setDownloading] = React.useState(false);

  const handleOpenPDF = async () => {
    if (pdfUrl) {
      setDownloading(true);
      try {
        await downloadAndPreviewPDF(pdfUrl, `Term_${period}_Schedule.pdf`);
      } finally {
        setDownloading(false);
      }
    }
  };

  return (
    <View style={{
      backgroundColor: 'white',
      borderRadius: 24,
      padding: 20,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 3,
      borderWidth: 1,
      borderColor: '#f1f4f6'
    }}>
      <View style={{ 
        width: 56, 
        height: 56, 
        borderRadius: 18, 
        backgroundColor: pdfUrl ? '#0055d410' : '#f8f9fa', 
        alignItems: 'center', 
        justifyContent: 'center',
        marginRight: 16
      }}>
        <FileText color={pdfUrl ? '#0055d4' : '#d1d5db'} size={28} />
      </View>
      
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2b3437' }}>Term {period}</Text>
        <Text style={{ fontSize: 13, color: '#737c7f', marginTop: 2 }}>
          {pdfUrl ? 'Official Exam Schedule' : 'Schedule not yet uploaded'}
        </Text>
      </View>

      {pdfUrl && (
        <TouchableOpacity 
          onPress={handleOpenPDF}
          disabled={downloading}
          style={{ 
            width: 44, 
            height: 44, 
            borderRadius: 22, 
            backgroundColor: '#0055d4', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}
        >
          {downloading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <ExternalLink color="white" size={20} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const UpcomingExamRow = ({ exam }: any) => (
  <View style={{ 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f1f4f6' 
  }}>
    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#0055d4', marginRight: 12 }} />
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 15, fontWeight: '600', color: '#2b3437' }}>{exam.subject}</Text>
      <Text style={{ fontSize: 12, color: '#737c7f', marginTop: 1 }}>{new Date(exam.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {exam.time || 'TBD'}</Text>
    </View>
    <ChevronRight color="#d1d5db" size={18} />
  </View>
);

export const ExamsScreen = ({ navigation }: any) => {
  const { selectedChildId } = useAppStore();
  const [examPeriods, setExamPeriods] = React.useState<any[]>([]);
  const [upcomingExams, setUpcomingExams] = React.useState<any[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);

  const loadData = React.useCallback(async (childId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const data = await studentService.fetchHomeData(childId, today);
    if (data.examPeriods) {
      setExamPeriods(data.examPeriods);
    }
    if (data.upcomingExams) {
      setUpcomingExams(data.upcomingExams.slice(0, 5)); // Just show next 5
    }
  }, []);

  React.useEffect(() => {
    if (selectedChildId) loadData(selectedChildId);
  }, [selectedChildId]);

  const onRefresh = React.useCallback(async () => {
    if (!selectedChildId) return;
    setRefreshing(true);
    await loadData(selectedChildId);
    setRefreshing(false);
  }, [selectedChildId]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <GlobalHeader navigation={navigation} showBack />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0055d4']} tintColor="#0055d4" />}
      >
        <View style={{ paddingBottom: 120, paddingHorizontal: 20 }}>
          {/* Title Section */}
          <View style={{ marginTop: 24, marginBottom: 28 }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#737c7f', textTransform: 'uppercase', letterSpacing: 1 }}>Academic Year 2023-24</Text>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#2b3437', marginTop: 4 }}>Examination Center</Text>
            <Text style={{ fontSize: 14, color: '#586064', marginTop: 8 }}>Access official term schedules and result sheets sent by the administration.</Text>
          </View>

          {/* Section: Term Documents */}
          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#737c7f', marginBottom: 16, textTransform: 'uppercase' }}>Term Documents</Text>
            {examPeriods.length > 0 ? (
              examPeriods.map((p) => (
                <TermCard key={p.id} period={p.period} pdfUrl={p.pdfUrl} />
              ))
            ) : (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <FileText color="#d1d5db" size={48} />
                <Text style={{ marginTop: 12, color: '#737c7f' }}>No term documents found.</Text>
              </View>
            )}
          </View>

          {/* Section: Simplified Upcoming List */}
          {upcomingExams.length > 0 && (
            <View style={{ backgroundColor: 'white', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Calendar color="#0055d4" size={20} />
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#2b3437', marginLeft: 10 }}>Upcoming Reminders</Text>
              </View>
              {upcomingExams.map((exam) => (
                <UpcomingExamRow key={exam.id} exam={exam} />
              ))}
              <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#0055d4' }}>View Academic Calendar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
