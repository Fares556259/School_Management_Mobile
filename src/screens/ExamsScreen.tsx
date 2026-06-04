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
      borderWidth: 2,
      borderColor: pdfUrl ? '#bfdbfe' : '#e2e8f0',
      borderBottomWidth: 6,
      borderBottomColor: pdfUrl ? '#60a5fa' : '#cbd5e1',
    }}>
      <View style={{ 
        width: 56, 
        height: 56, 
        borderRadius: 20, 
        backgroundColor: pdfUrl ? '#eff6ff' : '#f8fafc', 
        alignItems: 'center', 
        justifyContent: 'center',
        marginRight: 16,
        borderWidth: 2,
        borderColor: pdfUrl ? '#bfdbfe' : '#e2e8f0',
        borderBottomWidth: 4,
        borderBottomColor: pdfUrl ? '#93c5fd' : '#cbd5e1',
      }}>
        <FileText color={pdfUrl ? '#3b82f6' : '#94a3b8'} size={28} />
      </View>
      
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b' }}>Term {period}</Text>
        <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '700', marginTop: 4 }}>
          {pdfUrl ? 'Official Exam Schedule' : 'Schedule not yet uploaded'}
        </Text>
      </View>

      {pdfUrl && (
        <TouchableOpacity 
          onPress={handleOpenPDF}
          disabled={downloading}
          style={{ 
            width: 48, 
            height: 48, 
            borderRadius: 16, 
            backgroundColor: '#0072e6', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderBottomWidth: 4,
            borderBottomColor: '#0055b3',
          }}
        >
          {downloading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Download color="white" size={20} strokeWidth={3} />
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
    paddingVertical: 14, 
    borderBottomWidth: 2, 
    borderBottomColor: '#f1f5f9' 
  }}>
    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#0072e6', marginRight: 16 }} />
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 16, fontWeight: '900', color: '#1e293b' }}>{exam.subject}</Text>
      <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '700', marginTop: 2 }}>{new Date(exam.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {exam.time || 'TBD'}</Text>
    </View>
    <ChevronRight color="#cbd5e1" size={20} strokeWidth={3} />
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
      // deduplicate
      const map = new Map();
      data.examPeriods.forEach((p: any) => {
        if (!map.has(p.period) || p.pdfUrl) {
          map.set(p.period, p);
        }
      });
      setExamPeriods(Array.from(map.values()).sort((a,b) => a.period - b.period));
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <GlobalHeader navigation={navigation} showBack />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0055d4']} tintColor="#0055d4" />}
      >
        <View style={{ paddingBottom: 20, paddingHorizontal: 20 }}>
          {/* Title Section */}
          <View style={{ marginTop: 24, marginBottom: 28 }}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Academic Year 2023-24</Text>
            <Text style={{ fontSize: 30, fontWeight: '900', color: '#1e293b', marginTop: 4, letterSpacing: -0.5 }}>Examination Center</Text>
            <Text style={{ fontSize: 15, color: '#64748b', fontWeight: '600', marginTop: 8, lineHeight: 22 }}>Access official term schedules and result sheets sent by the administration.</Text>
          </View>

          {/* Section: Term Documents */}
          <View>
            <Text style={{ fontSize: 13, fontWeight: '900', color: '#94a3b8', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>Term Documents</Text>
            {examPeriods.length > 0 ? (
              examPeriods.map((p, idx) => (
                <TermCard key={p.period || idx} period={p.period} pdfUrl={p.pdfUrl} />
              ))
            ) : (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <FileText color="#d1d5db" size={48} />
                <Text style={{ marginTop: 12, color: '#737c7f' }}>No term documents found.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
