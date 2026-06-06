import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StatusBar, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Calculator, Book, Languages, Globe, Palette, Microscope, Music, BookOpen, 
  ChevronLeft, Award, TrendingUp, TrendingDown, Sparkles
} from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { studentService } from '../services/api';
import { GlobalHeader } from '../components/GlobalHeader';

const SUBJECT_THEMES: Record<string, { icon: any }> = {
  'Mathematics': { icon: Calculator },
  'Science': { icon: Microscope },
  'English': { icon: Languages },
  'French': { icon: Languages },
  'History': { icon: Book },
  'Geography': { icon: Globe },
  'Art': { icon: Palette },
  'Music': { icon: Music },
  'Default': { icon: BookOpen }
};

const DOMAIN_GROUPS = [
  { id: 'SCIENCES', title: 'SCIENCES', color: '#0055d4', bg: '#eff6ff', keywords: ['Science', 'Math', 'الإيقاظ', 'الرياضيات', 'Scientifique', 'Mathématiques'] },
  { id: 'LANGUAGES', title: 'LANGUAGES', color: '#0055d4', bg: '#eff6ff', keywords: ['Language', 'Arabe', 'Français', 'English', 'اللغة'] },
  { id: 'ARTS_TECH', title: 'ARTS & TECHNOLOGY', color: '#0055d4', bg: '#eff6ff', keywords: ['Art', 'Technologique', 'Musicale', 'تكنولوجية', 'موسيقية', 'تشكيلية', 'Plastiques'] },
  { id: 'HUMANITIES', title: 'HUMANITIES', color: '#0055d4', bg: '#eff6ff', keywords: ['History', 'Geography', 'التاريخ', 'الجغرافيا', 'Histoire', 'Géographie'] },
  { id: 'RELIGION', title: 'RELIGION & VALUES', color: '#0055d4', bg: '#eff6ff', keywords: ['Islamique', 'Civique', 'إسلامية', 'مدنية'] },
  { id: 'SPORT', title: 'SPORT', color: '#0055d4', bg: '#eff6ff', keywords: ['Sport', 'Physique', 'بدنية'] },
];

const getSubjectDomain = (subjectName: string) => {
  for (const domain of DOMAIN_GROUPS) {
    if (domain.keywords.some(kw => subjectName.toLowerCase().includes(kw.toLowerCase()))) {
      return domain;
    }
  }
  return { id: 'OTHER', title: 'OTHER SUBJECTS', color: '#0055d4', bg: '#eff6ff', keywords: [] };
};

const getArabicName = (subjectName: string) => {
  const parts = subjectName.split('|');
  for (const part of parts) {
    if (/[\u0600-\u06FF]/.test(part)) return part.trim();
  }
  return subjectName.split('|')[0].trim();
};

export const ResultsScreen = ({ navigation }: any) => {
  const { selectedChildId, children } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resultsData, setResultsData] = useState<{ results: any[]; summary: any }>({ results: [], summary: { average: 0, totalSubjects: 0 } });
  const [selectedTerm, setSelectedTerm] = useState<number>(1);

  const activeChild = useMemo(() => children.find(c => c.id === selectedChildId), [children, selectedChildId]);

  const loadData = useCallback(async (childId: string, isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    try {
      const data = await studentService.fetchResults(childId);
      setResultsData(data);
      if (data.summary?.latestTerm) {
        setSelectedTerm(data.summary.latestTerm);
      }
    } catch (error) {
      console.error('[RESULTS-SCREEN-ERROR]', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      loadData(selectedChildId);
    }
  }, [selectedChildId, loadData]);

  const onRefresh = useCallback(() => {
    if (selectedChildId) {
      setRefreshing(true);
      loadData(selectedChildId, true);
    }
  }, [selectedChildId, loadData]);

  // Group terms available in results
  const availableTerms = useMemo(() => {
    const termsSet = new Set<number>([1, 2, 3]); // Always show at least 1, 2, 3
    resultsData.results.forEach(r => {
      if (r.term) termsSet.add(r.term);
    });
    return Array.from(termsSet).sort((a, b) => a - b);
  }, [resultsData.results]);

  // Filter results for selected term
  const termResults = useMemo(() => {
    return resultsData.results.filter(r => r.term === selectedTerm);
  }, [resultsData.results, selectedTerm]);

  // Group results for selected term by domain
  const groupedResults = useMemo(() => {
    const groups: Record<string, typeof termResults> = {};
    termResults.forEach(r => {
      const domain = getSubjectDomain(r.subject);
      if (!groups[domain.id]) groups[domain.id] = [];
      groups[domain.id].push(r);
    });
    
    // Sort domains by their appearance in DOMAIN_GROUPS
    const sortedGroups = DOMAIN_GROUPS.map(d => ({ domain: d, items: groups[d.id] || [] })).filter(g => g.items.length > 0);
    if (groups['OTHER'] && groups['OTHER'].length > 0) {
      sortedGroups.push({ domain: getSubjectDomain('OTHER'), items: groups['OTHER'] });
    }
    return sortedGroups;
  }, [termResults]);

  // Calculate current term average
  const termAverage = useMemo(() => {
    if (termResults.length === 0) return 0;
    const sum = termResults.reduce((acc, curr) => acc + curr.score, 0);
    return parseFloat((sum / termResults.length).toFixed(2));
  }, [termResults]);

  // Calculate class average for current term
  const termClassAverage = useMemo(() => {
    if (termResults.length === 0) return 0;
    const sum = termResults.reduce((acc, curr) => acc + (curr.classAverage || curr.score), 0);
    return parseFloat((sum / termResults.length).toFixed(2));
  }, [termResults]);

  const ratingLabel = termAverage >= 15 ? 'Excellent' : termAverage >= 12 ? 'Good' : termAverage >= 10 ? 'Satisfactory' : 'Needs Work';
  const ratingColor = termAverage >= 12 ? '#10b981' : termAverage >= 10 ? '#f59e0b' : '#ef4444';

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <GlobalHeader navigation={navigation} showBack />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0055d4" />
          <Text style={styles.loadingText}>Fetching academic records...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <GlobalHeader navigation={navigation} showBack />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0055d4']} tintColor="#0055d4" />}
      >
        <View style={styles.headerTitleSection}>
          <Text style={styles.eyebrow}>Academic Achievements</Text>
          <Text style={styles.title}>Report Card</Text>
          <Text style={styles.subtitle}>
            Performance overview and official marks for {activeChild?.name || 'your child'}.
          </Text>
        </View>

        {resultsData.results.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Award size={36} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyTitle}>No grades recorded yet</Text>
            <Text style={styles.emptyText}>Academic results for this student will be displayed here once uploaded by the teachers.</Text>
          </View>
        ) : (
          <>
            {/* GPA Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.summaryEyebrow}>TERM AVERAGE</Text>
                  <Text style={styles.summaryScore}>{termAverage} <Text style={styles.gpaScale}>/ 20</Text></Text>
                </View>
              </View>


            </View>

            {/* Term Switcher */}
            <View style={styles.termTabsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.termTabsList}>
                {availableTerms.map(term => {
                  const isActive = selectedTerm === term;
                  return (
                    <TouchableOpacity
                      key={term}
                      onPress={() => setSelectedTerm(term)}
                      style={[styles.termTab, isActive && styles.activeTermTab]}
                    >
                      <Text style={[styles.termTabText, isActive && styles.activeTermTabText]}>
                        Term {term}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Grades List */}
            <View style={styles.gradesList}>
              {groupedResults.length > 0 ? (
                groupedResults.map((group) => (
                  <View key={group.domain.id} style={{ backgroundColor: 'white', borderRadius: 28, padding: 20, marginBottom: 8, borderWidth: 2, borderColor: '#e2e8f0', borderBottomWidth: 6, borderBottomColor: '#cbd5e1' }}>
                    <View style={{ backgroundColor: group.domain.color, paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginBottom: 20, borderBottomWidth: 4, borderBottomColor: 'rgba(0,0,0,0.2)' }}>
                      <Text style={{ color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: 1 }}>{group.domain.title}</Text>
                    </View>
                    
                    <View style={{ gap: 16 }}>
                      {group.items.map((item, index) => {
                        const theme = Object.values(SUBJECT_THEMES).find(t => item.subject.includes(Object.keys(SUBJECT_THEMES).find(k => SUBJECT_THEMES[k] === t) || '')) || SUBJECT_THEMES.Default;
                        const ThemeIcon = theme.icon;
                        const classAvg = item.classAverage !== undefined && item.classAverage !== null ? item.classAverage : item.score;
                        const diff = item.score - classAvg;
                        const statusText = diff > 0 ? 'Above Avg' : diff < 0 ? 'Below Avg' : 'Average';
                        const statusColor = diff > 0 ? '#10b981' : diff < 0 ? '#ef4444' : '#f59e0b';

                        return (
                          <View key={item.id} style={{ paddingBottom: index === group.items.length - 1 ? 0 : 16, borderBottomWidth: index === group.items.length - 1 ? 0 : 2, borderBottomColor: '#f1f5f9', borderStyle: 'dashed' }}>
                            <View style={styles.gradeCardHeader}>
                              <View style={[styles.subjectIconCircle, { backgroundColor: group.domain.bg, borderWidth: 2, borderColor: group.domain.color + '30' }]}>
                                <ThemeIcon color={group.domain.color} size={20} strokeWidth={2.5} />
                              </View>
                              <View style={styles.subjectTextGroup}>
                                <Text style={styles.subjectName}>{getArabicName(item.subject)}</Text>
                                <Text style={styles.gradeDate}>
                                  Recorded {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </Text>
                              </View>
                              <View style={styles.scoreTextGroup}>
                                <Text style={styles.subjectScore}>{item.score}</Text>
                                <Text style={styles.maxScore}>/ 20</Text>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyTermContainer}>
                  <Text style={styles.emptyTermText}>No grades recorded for Term {selectedTerm} yet.</Text>
                </View>
              )}
            </View>
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '700', color: '#64748b' },
  scrollContainer: { paddingHorizontal: 20, paddingTop: 10 },
  headerTitleSection: { marginBottom: 24 },
  eyebrow: { fontSize: 13, fontWeight: '900', color: '#0055d4', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 },
  title: { fontSize: 32, fontWeight: '900', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 6, fontWeight: '600', lineHeight: 20 },
  
  summaryCard: { backgroundColor: 'white', borderRadius: 28, padding: 24, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 15, elevation: 3, marginBottom: 28 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 0 },
  summaryEyebrow: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1 },
  summaryScore: { fontSize: 38, fontWeight: '900', color: '#0f172a', marginTop: 4 },
  gpaScale: { fontSize: 18, color: '#94a3b8', fontWeight: '800' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  ratingBadgeText: { fontSize: 12, fontWeight: '800' },
  
  summaryComparisonRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16, alignItems: 'center' },
  compStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  compLabel: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  compValue: { color: '#0f172a', fontWeight: '800' },
  compDivider: { width: 1, height: 16, backgroundColor: '#e2e8f0', marginHorizontal: 16 },

  termTabsContainer: { marginBottom: 24 },
  termTabsList: { gap: 10 },
  termTab: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 16, backgroundColor: 'white', borderWidth: 1, borderColor: '#f1f5f9' },
  activeTermTab: { backgroundColor: '#0055d4', borderColor: '#0055d4' },
  termTabText: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  activeTermTabText: { color: 'white' },

  gradesList: { gap: 16 },
  gradeCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10, elevation: 1 },
  gradeCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 0 },
  subjectIconCircle: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  subjectTextGroup: { flex: 1, marginLeft: 16 },
  subjectName: { fontSize: 17, fontWeight: '900', color: '#1e293b' },
  gradeDate: { fontSize: 11, color: '#94a3b8', fontWeight: '700', marginTop: 2 },
  scoreTextGroup: { flexDirection: 'row', alignItems: 'baseline' },
  subjectScore: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  maxScore: { fontSize: 12, color: '#94a3b8', fontWeight: '800', marginLeft: 2 },

  comparisonBarSection: { borderTopWidth: 1, borderTopColor: '#f8fafc', paddingTop: 14 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  barLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8' },
  comparisonIndicatorText: { fontSize: 11, fontWeight: '900' },
  barContainer: { marginTop: 4 },
  barTrack: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, position: 'relative' },
  studentFillBar: { height: '100%', borderRadius: 3 },
  classAvgTick: { position: 'absolute', top: -4, width: 4, height: 14, borderRadius: 2, backgroundColor: '#64748b', borderWidth: 1, borderColor: 'white', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 1, transform: [{ translateX: -2 }] },
  barLegendRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, position: 'relative' },
  legendText: { fontSize: 9, color: '#cbd5e1', fontWeight: '700' },
  legendTickLabel: { position: 'absolute', top: 0, transform: [{ translateX: -25 }] },
  legendAvgText: { fontSize: 10, color: '#64748b', fontWeight: '800' },

  emptyCard: { padding: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderRadius: 28, borderWidth: 1, borderColor: '#f1f5f9' },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b', marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#94a3b8', fontWeight: '700', textAlign: 'center', lineHeight: 20 },

  emptyTermContainer: { padding: 32, alignItems: 'center' },
  emptyTermText: { fontSize: 13, color: '#94a3b8', fontWeight: '700', fontStyle: 'italic' }
});
