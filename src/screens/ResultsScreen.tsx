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

const SUBJECT_THEMES: Record<string, { color: string, bg: string, icon: any }> = {
  'Mathematics': { color: '#3b82f6', bg: '#eff6ff', icon: Calculator },
  'Science': { color: '#10b981', bg: '#ecfdf5', icon: Microscope },
  'English': { color: '#8b5cf6', bg: '#f5f3ff', icon: Languages },
  'French': { color: '#f59e0b', bg: '#fffbeb', icon: Languages },
  'History': { color: '#ec4899', bg: '#fdf2f8', icon: Book },
  'Geography': { color: '#06b6d4', bg: '#ecfeff', icon: Globe },
  'Art': { color: '#f43f5e', bg: '#fff1f2', icon: Palette },
  'Music': { color: '#0ea5e9', bg: '#f0f9ff', icon: Music },
  'Default': { color: '#64748b', bg: '#f1f5f9', icon: BookOpen }
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
                <View>
                  <Text style={styles.summaryEyebrow}>TERM AVERAGE</Text>
                  <Text style={styles.summaryScore}>{termAverage} <Text style={styles.gpaScale}>/ 20</Text></Text>
                </View>
                <View style={[styles.ratingBadge, { backgroundColor: ratingColor + '15' }]}>
                  <Sparkles size={14} color={ratingColor} />
                  <Text style={[styles.ratingBadgeText, { color: ratingColor }]}>{ratingLabel}</Text>
                </View>
              </View>

              <View style={styles.summaryComparisonRow}>
                <View style={styles.compStat}>
                  <TrendingUp size={16} color="#0055d4" />
                  <Text style={styles.compLabel}>Class Avg: <Text style={styles.compValue}>{termClassAverage} / 20</Text></Text>
                </View>
                <View style={styles.compDivider} />
                <View style={styles.compStat}>
                  {termAverage >= termClassAverage ? (
                    <>
                      <TrendingUp size={16} color="#10b981" />
                      <Text style={[styles.compLabel, { color: '#10b981' }]}>Above Average</Text>
                    </>
                  ) : (
                    <>
                      <TrendingDown size={16} color="#ef4444" />
                      <Text style={[styles.compLabel, { color: '#ef4444' }]}>Below Average</Text>
                    </>
                  )}
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
              {termResults.length > 0 ? (
                termResults.map(item => {
                  const theme = SUBJECT_THEMES[item.subject] || SUBJECT_THEMES.Default;
                  const ThemeIcon = theme.icon;
                  const isAboveClassAvg = item.score >= (item.classAverage || item.score);
                  
                  // Score percentage mapping to draw progress bar track (graded out of 20)
                  const scorePercent = (item.score / 20) * 100;
                  const avgPercent = ((item.classAverage || item.score) / 20) * 100;

                  return (
                    <View key={item.id} style={styles.gradeCard}>
                      <View style={styles.gradeCardHeader}>
                        <View style={[styles.subjectIconCircle, { backgroundColor: theme.bg }]}>
                          <ThemeIcon color={theme.color} size={22} />
                        </View>
                        <View style={styles.subjectTextGroup}>
                          <Text style={styles.subjectName}>{item.subject}</Text>
                          <Text style={styles.gradeDate}>
                            Recorded {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </Text>
                        </View>
                        <View style={styles.scoreTextGroup}>
                          <Text style={styles.subjectScore}>{item.score}</Text>
                          <Text style={styles.maxScore}>/ 20</Text>
                        </View>
                      </View>

                      {/* Performance Bar Comparison */}
                      <View style={styles.comparisonBarSection}>
                        <View style={styles.barLabelRow}>
                          <Text style={styles.barLabel}>Student mark vs Class average</Text>
                          <Text style={[styles.comparisonIndicatorText, { color: isAboveClassAvg ? '#10b981' : '#ef4444' }]}>
                            {isAboveClassAvg ? 'Above Avg' : 'Below Avg'}
                          </Text>
                        </View>

                        <View style={styles.barContainer}>
                          {/* Main Progress track */}
                          <View style={styles.barTrack}>
                            {/* Student score fill */}
                            <View style={[styles.studentFillBar, { width: `${scorePercent}%`, backgroundColor: theme.color }]} />
                            {/* Class Average indicator dot */}
                            <View style={[styles.classAvgTick, { left: `${avgPercent}%` }]} />
                          </View>
                          
                          {/* Labels under the bar */}
                          <View style={styles.barLegendRow}>
                            <Text style={styles.legendText}>0</Text>
                            <View style={[styles.legendTickLabel, { left: `${avgPercent}%` }]}>
                              <Text style={styles.legendAvgText}>Avg: {item.classAverage}</Text>
                            </View>
                            <Text style={styles.legendText}>20</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })
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
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
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
  gradeCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
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
  classAvgTick: { position: 'absolute', top: -3, width: 12, height: 12, borderRadius: 6, backgroundColor: '#f59e0b', borderWidth: 2, borderColor: 'white', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 1, transform: [{ translateX: -6 }] },
  barLegendRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, position: 'relative' },
  legendText: { fontSize: 9, color: '#cbd5e1', fontWeight: '700' },
  legendTickLabel: { position: 'absolute', top: 0, transform: [{ translateX: -25 }] },
  legendAvgText: { fontSize: 9, color: '#f59e0b', fontWeight: '900' },

  emptyCard: { padding: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderRadius: 28, borderWidth: 1, borderColor: '#f1f5f9' },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b', marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#94a3b8', fontWeight: '700', textAlign: 'center', lineHeight: 20 },

  emptyTermContainer: { padding: 32, alignItems: 'center' },
  emptyTermText: { fontSize: 13, color: '#94a3b8', fontWeight: '700', fontStyle: 'italic' }
});
