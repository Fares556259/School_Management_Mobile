import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StatusBar, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Calculator, Book, Languages, Globe, Palette, Microscope, Music, BookOpen, 
  Award
} from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { useLanguage } from '../context/LanguageContext';
import { studentService } from '../services/api';
import { GlobalHeader } from '../components/GlobalHeader';
import { useQuery } from '@tanstack/react-query';
import { useFonts } from 'expo-font';

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

const getArabicDomainTitle = (domainId: string, lang: string) => {
  if (lang === 'ar') {
    switch (domainId) {
      case 'SCIENCES': return 'مجال العلوم والتكنولوجيا';
      case 'LANGUAGES': return 'مجال اللغات والآداب';
      case 'ARTS_TECH': return 'مجال الفنون والتكنولوجيا';
      case 'HUMANITIES': return 'مجال الإنسانيات والتاريخ';
      case 'RELIGION': return 'مجال التربية الإسلامية والمدنية';
      case 'SPORT': return 'مجال التربية البدنية والرياضة';
      default: return 'المواد الدراسية الأخرى';
    }
  }
  if (lang === 'fr') {
    switch (domainId) {
      case 'SCIENCES': return 'Domaine des Sciences & Tech';
      case 'LANGUAGES': return 'Domaine des Langues';
      case 'ARTS_TECH': return 'Domaine Arts & Technologie';
      case 'HUMANITIES': return 'Domaine des Sciences Humaines';
      case 'RELIGION': return 'Éducation Religieuse & Civique';
      case 'SPORT': return 'Éducation Physique & Sport';
      default: return 'Autres Matières';
    }
  }
  return domainId;
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

const getLocalizedSubjectName = (subjectName: string, language: string) => {
  const parts = subjectName.split('|');
  if (language === 'ar') return parts.find(part => /[\u0600-\u06FF]/.test(part))?.trim() || parts[0].trim();
  return parts.find(part => !/[\u0600-\u06FF]/.test(part))?.trim() || parts[0].trim();
};

const gradeCopy = {
  ar: { loading: 'جارٍ تحميل النتائج الدراسية…', title: 'دفتر الأعداد', average: 'معدل الثلاثي', term: 'الثلاثي', published: 'مواد منشورة', recorded: 'نُشرت في', pending: 'في انتظار العدد', empty: 'لا توجد أعداد بعد', emptyBody: 'ستظهر النتائج هنا حالما تنشرها المدرسة.', emptyTerm: 'لم تُنشر أعداد هذا الثلاثي بعد.', hint: 'اسحب إلى الأسفل للتحديث أو عد لاحقاً.' },
  fr: { loading: 'Chargement du bulletin…', title: 'Bulletin scolaire', average: 'Moyenne du trimestre', term: 'Trimestre', published: 'matières publiées', recorded: 'Publié le', pending: 'Note en attente', empty: 'Aucune note publiée', emptyBody: 'Les résultats apparaîtront ici dès leur publication par l’école.', emptyTerm: 'Aucune note pour ce trimestre.', hint: 'Tirez vers le bas pour actualiser ou revenez plus tard.' },
  en: { loading: 'Loading academic results…', title: 'Report card', average: 'Term average', term: 'Term', published: 'published subjects', recorded: 'Published', pending: 'Grade pending', empty: 'No grades published yet', emptyBody: 'Results will appear here once the school publishes them.', emptyTerm: 'No grades published for this term.', hint: 'Pull down to refresh or check again later.' },
} as const;

const domainLabels = {
  ar: { SCIENCES: 'العلوم والتكنولوجيا', LANGUAGES: 'اللغات والآداب', ARTS_TECH: 'الفنون والتكنولوجيا', HUMANITIES: 'الإنسانيات والتاريخ', RELIGION: 'التربية الإسلامية والمدنية', SPORT: 'التربية البدنية والرياضة', OTHER: 'مواد أخرى' },
  fr: { SCIENCES: 'Sciences et technologie', LANGUAGES: 'Langues et littérature', ARTS_TECH: 'Arts et technologie', HUMANITIES: 'Sciences humaines', RELIGION: 'Éducation religieuse et civique', SPORT: 'Éducation physique', OTHER: 'Autres matières' },
  en: { SCIENCES: 'Science & technology', LANGUAGES: 'Languages & literature', ARTS_TECH: 'Arts & technology', HUMANITIES: 'Humanities', RELIGION: 'Religion & civics', SPORT: 'Physical education', OTHER: 'Other subjects' },
} as const;

const DOMAIN_PALETTE: Record<string, { color: string; bg: string }> = {
  SCIENCES: { color: '#16756b', bg: '#edf8f6' }, LANGUAGES: { color: '#315f9b', bg: '#eef4fb' },
  ARTS_TECH: { color: '#8b629d', bg: '#f7f1f9' }, HUMANITIES: { color: '#b06b35', bg: '#fbf3ec' },
  RELIGION: { color: '#8a6c24', bg: '#faf6e8' }, SPORT: { color: '#28724a', bg: '#eef8f1' }, OTHER: { color: '#52647a', bg: '#f1f5f9' },
};

const numericScore = (score: unknown) => {
  const value = typeof score === 'number' ? score : Number(score);
  return Number.isFinite(value) ? value : null;
};

export const ResultsScreen = ({ navigation }: any) => {
  const selectedChildId = useAppStore((s) => s.selectedChildId);
  const children = useAppStore((s) => s.children);
  const { t, language, isRTL } = useLanguage();
  const [selectedTerm, setSelectedTerm] = useState<number>(1);
  const [arabicFontLoaded] = useFonts({ NotoSansArabic: require('../../assets/fonts/NotoSansArabic.ttf') });
  const copy = gradeCopy[language];
  const arabicText = isRTL && arabicFontLoaded ? styles.arabicText : undefined;
  const locale = `${language === 'ar' ? 'ar-TN' : language}-u-nu-latn`;
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }), [locale]);
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }), [locale]);

  const activeChild = useMemo(() => children.find(c => c.id === selectedChildId), [children, selectedChildId]);

  const { data: resultsData = { results: [], summary: { average: 0, totalSubjects: 0 } }, isLoading: loading, isRefetching: refreshing, refetch } = useQuery({
    queryKey: ['results', selectedChildId],
    queryFn: async () => {
      const data = await studentService.fetchResults(selectedChildId!);
      return data;
    },
    enabled: !!selectedChildId,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
  });

  useEffect(() => {
    if (resultsData.summary?.latestTerm) {
      setSelectedTerm(resultsData.summary.latestTerm);
    }
  }, [resultsData.summary?.latestTerm]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

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
    const apiDomains: Set<string> = new Set();

    termResults.forEach(r => {
      let domain: any;
      if (r.domain) {
        domain = { id: r.domain, title: r.domain, color: '#0055d4', bg: '#eff6ff', keywords: [] };
        apiDomains.add(r.domain);
      } else {
        domain = getSubjectDomain(r.subject);
      }
      if (!groups[domain.id]) groups[domain.id] = [];
      groups[domain.id].push(r);
    });
    
    // Sort domains by their appearance in DOMAIN_GROUPS
    const sortedGroups = DOMAIN_GROUPS.map(d => ({ domain: d, items: groups[d.id] || [] })).filter(g => g.items.length > 0);
    
    // Add dynamically provided domains that aren't in DOMAIN_GROUPS
    Array.from(apiDomains).forEach(apiDomain => {
      if (!DOMAIN_GROUPS.some(d => d.id === apiDomain)) {
        sortedGroups.push({
          domain: { id: apiDomain, title: apiDomain, color: '#0055d4', bg: '#eff6ff', keywords: [] },
          items: groups[apiDomain]
        });
      }
    });

    if (groups['OTHER'] && groups['OTHER'].length > 0) {
      sortedGroups.push({ domain: getSubjectDomain('OTHER'), items: groups['OTHER'] });
    }
    return sortedGroups;
  }, [termResults]);

  const termAverage = useMemo(() => {
    const scores = termResults.map(result => numericScore(result.score)).filter((score): score is number => score !== null);
    if (!scores.length) return null;
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }, [termResults]);

  const gradedCount = useMemo(() => termResults.filter(result => numericScore(result.score) !== null).length, [termResults]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <GlobalHeader navigation={navigation} showBack />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0055d4" />
          <Text style={[styles.loadingText, arabicText]}>{copy.loading}</Text>
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
        <View style={[styles.pageIntro, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.pageEyebrow, arabicText]}>{copy.term} {numberFormatter.format(selectedTerm)}</Text>
          <Text style={[styles.pageTitle, arabicText]}>{copy.title}</Text>
          <Text style={[styles.pageSubtitle, arabicText]}>{activeChild?.name || ''}</Text>
        </View>
        {resultsData.results.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Award size={30} color="#0b72df" />
            </View>
            <Text style={[styles.emptyTitle, arabicText]}>{copy.empty}</Text>
            <Text style={[styles.emptyText, arabicText]}>{copy.emptyBody}</Text>
          </View>
        ) : (
          <>
            <View style={[styles.summaryCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.summaryIcon}><Award size={25} color="#0b72df" /></View>
              <View style={[styles.summaryCopy, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.summaryEyebrow, arabicText]}>{copy.average}</Text>
                <View style={[styles.scoreRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={styles.summaryScore}>{termAverage === null ? '—' : numberFormatter.format(termAverage)}</Text>
                  <Text style={styles.gpaScale}>/ 20</Text>
                </View>
                <Text style={[styles.publishedText, arabicText]}>{numberFormatter.format(gradedCount)} {copy.published}</Text>
              </View>
            </View>

            <View style={[styles.termTabsList, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {availableTerms.map(term => {
                const isActive = selectedTerm === term;
                return (
                  <TouchableOpacity key={term} accessibilityRole="tab" accessibilityState={{ selected: isActive }} onPress={() => setSelectedTerm(term)} style={[styles.termTab, isActive && styles.activeTermTab]}>
                    <Text style={[styles.termTabText, isActive && styles.activeTermTabText, arabicText]}>{copy.term} {numberFormatter.format(term)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.gradesList}>
              {groupedResults.length > 0 ? (
                groupedResults.map((group) => (
                  <View key={group.domain.id} style={styles.domainCard}>
                    <View style={[styles.domainHeader, { backgroundColor: (DOMAIN_PALETTE[group.domain.id] || DOMAIN_PALETTE.OTHER).bg, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={[styles.domainMarker, { backgroundColor: (DOMAIN_PALETTE[group.domain.id] || DOMAIN_PALETTE.OTHER).color }]} />
                      <Text style={[styles.domainTitle, { color: (DOMAIN_PALETTE[group.domain.id] || DOMAIN_PALETTE.OTHER).color, textAlign: isRTL ? 'right' : 'left' }, arabicText]}>
                        {domainLabels[language][group.domain.id as keyof typeof domainLabels[typeof language]] || group.domain.title}
                      </Text>
                      <Text style={styles.domainCount}>{numberFormatter.format(group.items.length)}</Text>
                    </View>
                    <View>
                      {group.items.map((item, index) => {
                        const theme = Object.values(SUBJECT_THEMES).find(t => item.subject.includes(Object.keys(SUBJECT_THEMES).find(k => SUBJECT_THEMES[k] === t) || '')) || SUBJECT_THEMES.Default;
                        const ThemeIcon = theme.icon;
                        const palette = DOMAIN_PALETTE[group.domain.id] || DOMAIN_PALETTE.OTHER;
                        const score = numericScore(item.score);
                        const date = item.date ? new Date(item.date) : null;
                        return (
                          <View key={item.id || `${item.subject}-${index}`} style={[styles.gradeCardHeader, index < group.items.length - 1 && styles.gradeRowBorder, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <View style={[styles.subjectIconCircle, { backgroundColor: palette.bg }]}><ThemeIcon color={palette.color} size={20} /></View>
                            <View style={[styles.subjectTextGroup, { alignItems: isRTL ? 'flex-end' : 'flex-start', marginLeft: isRTL ? 0 : 13, marginRight: isRTL ? 13 : 0 }]}>
                              <Text style={[styles.subjectName, { textAlign: isRTL ? 'right' : 'left' }, arabicText]}>{getLocalizedSubjectName(item.subject, language)}</Text>
                              <Text style={[styles.gradeDate, arabicText]}>{date && !Number.isNaN(date.getTime()) ? `${copy.recorded} ${dateFormatter.format(date)}` : copy.pending}</Text>
                            </View>
                            <View style={[styles.scoreTextGroup, score === null && styles.pendingScore]}>
                              {score === null ? <Text style={[styles.pendingScoreText, arabicText]}>{copy.pending}</Text> : <><Text style={styles.subjectScore}>{numberFormatter.format(score)}</Text><Text style={styles.maxScore}>/20</Text></>}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyTermContainer}>
                  <View style={styles.emptyIconCircle}><BookOpen size={28} color="#0b72df" /></View>
                  <Text style={[styles.emptyTitle, arabicText]}>{copy.emptyTerm}</Text>
                  <Text style={[styles.emptyText, arabicText]}>{copy.hint}</Text>
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
  scrollContainer: { paddingHorizontal: 20, paddingTop: 20 },
  pageIntro: { marginBottom: 18 },
  pageEyebrow: { color: '#0b72df', fontSize: 12, fontWeight: '800' },
  pageTitle: { color: '#10213a', fontSize: 28, fontWeight: '900', marginTop: 3 },
  pageSubtitle: { color: '#75849a', fontSize: 14, fontWeight: '600', marginTop: 3 },
  headerTitleSection: { marginBottom: 24 },
  eyebrow: { fontSize: 13, fontWeight: '900', color: '#0055d4', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 },
  title: { fontSize: 32, fontWeight: '900', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 6, fontWeight: '600', lineHeight: 20 },
  
  summaryCard: { alignItems: 'center', backgroundColor: 'white', borderRadius: 24, padding: 18, borderWidth: 1, borderColor: '#e4eaf1', shadowColor: '#183153', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  summaryIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: '#eaf4ff', alignItems: 'center', justifyContent: 'center' },
  summaryCopy: { flex: 1, marginHorizontal: 16 },
  summaryEyebrow: { fontSize: 12, fontWeight: '800', color: '#718096' },
  scoreRow: { alignItems: 'baseline', gap: 5, marginTop: 2 },
  summaryScore: { fontSize: 34, lineHeight: 40, fontWeight: '900', color: '#10213a' },
  gpaScale: { fontSize: 14, color: '#94a3b8', fontWeight: '800' },
  publishedText: { color: '#16846b', fontSize: 11, fontWeight: '700', marginTop: 2 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  ratingBadgeText: { fontSize: 12, fontWeight: '800' },
  
  summaryComparisonRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16, alignItems: 'center' },
  compStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  compLabel: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  compValue: { color: '#0f172a', fontWeight: '800' },
  compDivider: { width: 1, height: 16, backgroundColor: '#e2e8f0', marginHorizontal: 16 },

  termTabsList: { gap: 8, marginVertical: 16 },
  termTab: { flex: 1, minHeight: 46, paddingHorizontal: 5, borderRadius: 15, backgroundColor: 'white', borderWidth: 1, borderColor: '#e5ebf2', alignItems: 'center', justifyContent: 'center' },
  activeTermTab: { backgroundColor: '#0b72df', borderColor: '#0b72df', shadowColor: '#0b72df', shadowOpacity: 0.18, shadowRadius: 7, elevation: 2 },
  termTabText: { fontSize: 12, fontWeight: '800', color: '#48566a', textAlign: 'center' },
  activeTermTabText: { color: 'white' },

  gradesList: { gap: 14 },
  domainCard: { overflow: 'hidden', backgroundColor: 'white', borderRadius: 22, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#183153', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  domainHeader: { minHeight: 54, alignItems: 'center', paddingHorizontal: 16 },
  domainMarker: { width: 4, height: 24, borderRadius: 4 },
  domainTitle: { flex: 1, marginHorizontal: 11, fontSize: 15, fontWeight: '900' },
  domainCount: { minWidth: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.8)', textAlign: 'center', textAlignVertical: 'center', color: '#64748b', fontWeight: '800', lineHeight: 28 },
  gradeCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10, elevation: 1 },
  gradeCardHeader: { minHeight: 76, alignItems: 'center', paddingHorizontal: 15, paddingVertical: 12 },
  gradeRowBorder: { borderBottomWidth: 1, borderBottomColor: '#edf1f5' },
  subjectIconCircle: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  subjectTextGroup: { flex: 1 },
  subjectName: { fontSize: 15, lineHeight: 21, fontWeight: '800', color: '#152238' },
  gradeDate: { fontSize: 11, color: '#8795a8', fontWeight: '600', marginTop: 3 },
  scoreTextGroup: { minWidth: 64, height: 40, paddingHorizontal: 9, borderRadius: 13, backgroundColor: '#edf7f3', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },
  pendingScore: { minWidth: 82, backgroundColor: '#f3f5f8', alignItems: 'center' },
  pendingScoreText: { color: '#7b8797', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  subjectScore: { fontSize: 20, fontWeight: '900', color: '#116a57' },
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

  emptyCard: { paddingHorizontal: 28, paddingVertical: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderRadius: 24, borderWidth: 1, borderColor: '#e3e9f0' },
  emptyIconCircle: { width: 58, height: 58, borderRadius: 19, backgroundColor: '#eaf4ff', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b', marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#94a3b8', fontWeight: '700', textAlign: 'center', lineHeight: 20 },

  emptyTermContainer: { paddingHorizontal: 28, paddingVertical: 38, alignItems: 'center', backgroundColor: 'white', borderRadius: 22, borderWidth: 1, borderColor: '#e3e9f0' },
  emptyTermText: { fontSize: 13, color: '#94a3b8', fontWeight: '700', fontStyle: 'italic' },
  arabicText: { fontFamily: 'NotoSansArabic', fontWeight: 'normal', letterSpacing: 0 },
});
