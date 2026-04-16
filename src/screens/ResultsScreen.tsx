import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Trophy, 
  Target, 
  BarChart3, 
  TrendingUp, 
  BookOpen, 
  ChevronRight, 
  Star,
  Zap,
  LayoutGrid
} from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { studentService } from '../services/api';
import { GlobalHeader } from '../components/GlobalHeader';

const { width } = Dimensions.get('window');

const SubjectCard = ({ item }: { item: any }) => {
  const diff = item.score - item.classAverage;
  const isAbove = diff >= 0;
  
  // Normalize score to 20 (assuming standard grading system)
  const percentage = (item.score / 20) * 100;
  const avgPercentage = (item.classAverage / 20) * 100;

  return (
    <View className="bg-white rounded-[32px] p-6 mb-4 border border-surface-low shadow-sm">
      <View className="flex-row justify-between items-start mb-6">
        <View className="flex-1">
          <Text className="text-xl font-jakarta font-black text-text-primary">{item.subject}</Text>
          <View className="flex-row items-center mt-2">
            <View className={`px-3 py-1 rounded-full ${isAbove ? 'bg-green-50' : 'bg-red-50'}`}>
              <Text className={`text-[10px] font-jakarta font-black uppercase tracking-wider ${isAbove ? 'text-green-600' : 'text-red-600'}`}>
                {isAbove ? `+${diff.toFixed(1)} Above` : `${diff.toFixed(1)} Below`} Average
              </Text>
            </View>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-3xl font-jakarta font-black text-brand-primary">{item.score.toFixed(1)}</Text>
          <Text className="text-[10px] font-manrope font-bold text-text-muted">SCORE / 20</Text>
        </View>
      </View>

      <View className="space-y-4">
        {/* Progress Visualization */}
        <View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-xs font-manrope font-bold text-text-primary">Your Performance</Text>
            <Text className="text-xs font-manrope font-bold text-brand-primary">{Math.round(percentage)}%</Text>
          </View>
          <View className="h-2 w-full bg-surface-low rounded-full overflow-hidden">
            <View 
              className="h-full bg-brand-primary rounded-full transition-all duration-500" 
              style={{ width: `${percentage}%` }}
            />
          </View>
        </View>

        <View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-xs font-manrope font-bold text-text-muted">Class Average</Text>
            <Text className="text-xs font-manrope font-bold text-text-muted">{Math.round(avgPercentage)}%</Text>
          </View>
          <View className="h-1.5 w-full bg-surface-low/50 rounded-full overflow-hidden">
            <View 
              className="h-full bg-text-muted/40 rounded-full" 
              style={{ width: `${avgPercentage}%` }}
            />
          </View>
        </View>
      </View>

      <TouchableOpacity className="flex-row items-center mt-6 pt-6 border-t border-surface-low justify-center">
        <Text className="text-sm font-jakarta font-bold text-text-muted">View Details & Feedback</Text>
        <ChevronRight size={14} color="#94a3b8" className="ml-1" />
      </TouchableOpacity>
    </View>
  );
};

export const ResultsScreen = ({ navigation }: any) => {
  const { selectedChildId } = useAppStore();
  const [results, setResults] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTerm, setActiveTerm] = useState(1);

  const loadData = async (id: string, isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    try {
      const data = await studentService.fetchResults(id);
      setResults(data.results || []);
      setSummary(data.summary || null);
      if (data.summary?.latestTerm) setActiveTerm(data.summary.latestTerm);
    } catch (error) {
      console.error("Results Load Fail:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (selectedChildId) loadData(selectedChildId);
  }, [selectedChildId]);

  const onRefresh = () => {
    if (selectedChildId) {
      setRefreshing(true);
      loadData(selectedChildId, true);
    }
  };

  const filteredResults = useMemo(() => {
    return results.filter(r => r.term === activeTerm);
  }, [results, activeTerm]);

  const terms = useMemo(() => {
    const uniqueTerms = Array.from(new Set(results.map(r => r.term))).sort();
    return uniqueTerms;
  }, [results]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-surface-background" edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <GlobalHeader navigation={navigation} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0055d4" />
          <Text className="mt-4 font-jakarta font-bold text-text-muted">Calculating your progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-background" edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <GlobalHeader navigation={navigation} />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0055d4']} tintColor="#0055d4" />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View className="px-5 mt-6 mb-8">
          <Text className="text-3xl font-jakarta font-black text-text-primary">Academic Results</Text>
          <Text className="text-sm font-manrope font-semibold text-text-muted mt-1 italic italic">Performance tracking and analytics.</Text>
        </View>

        {/* Performance Overview Card */}
        <View className="px-5 mb-8">
          <View className="bg-text-primary p-6 rounded-[40px] shadow-2xl relative overflow-hidden">
            <View className="absolute -right-20 -top-20 w-60 h-60 bg-white/5 rounded-full" />
            <View className="absolute -left-10 -bottom-10 w-40 h-40 bg-brand-primary/20 rounded-full" />
            
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className="text-white/60 font-manrope font-bold text-[10px] uppercase tracking-widest mb-1">General Average</Text>
                <Text className="text-white text-4xl font-jakarta font-black">
                  {summary?.average?.toFixed(2) || '0.00'}
                  <Text className="text-lg font-bold text-white/50">/20</Text>
                </Text>
              </View>
              <View className="w-16 h-16 bg-brand-primary rounded-3xl items-center justify-center">
                <Trophy size={32} color="white" />
              </View>
            </View>

            <View className="flex-row gap-2">
              <View className="flex-1 bg-white/10 rounded-2xl p-4 border border-white/10">
                <View className="flex-row items-center mb-1">
                  <BookOpen size={14} color="#fcd34d" />
                  <Text className="text-white/60 font-manrope font-bold text-[9px] uppercase tracking-wider ml-1.5">Subjects</Text>
                </View>
                <Text className="text-white font-jakarta font-bold text-lg">{summary?.totalSubjects || 0}</Text>
              </View>
              <View className="flex-1 bg-white/10 rounded-2xl p-4 border border-white/10">
                <View className="flex-row items-center mb-1">
                  <Zap size={14} color="#60a5fa" />
                  <Text className="text-white/60 font-manrope font-bold text-[9px] uppercase tracking-wider ml-1.5">Current Term</Text>
                </View>
                <Text className="text-white font-jakarta font-bold text-lg">Term {summary?.latestTerm || 1}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Term Selector */}
        {terms.length > 1 && (
          <View className="mb-8 px-5">
            <View className="flex-row items-center mb-4">
              <LayoutGrid size={16} color="#737c7f" />
              <Text className="ml-2 text-[10px] font-jakarta font-black text-text-muted uppercase tracking-[2px]">Switch Term</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {terms.map(t => (
                <TouchableOpacity 
                  key={t}
                  onPress={() => setActiveTerm(t)}
                  className={`px-6 py-3 rounded-2xl border ${activeTerm === t ? 'bg-brand-primary border-brand-primary' : 'bg-white border-surface-low'}`}
                >
                  <Text className={`text-sm font-jakarta font-bold ${activeTerm === t ? 'text-white' : 'text-text-primary'}`}>Term {t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Results List */}
        <View className="px-5">
          <View className="flex-row items-center mb-6">
            <BarChart3 size={16} color="#737c7f" />
            <Text className="ml-2 text-[10px] font-jakarta font-black text-text-muted uppercase tracking-[2px]">Subject Analytics</Text>
          </View>

          {filteredResults.length > 0 ? (
            filteredResults.map((item) => (
              <SubjectCard key={item.id} item={item} />
            ))
          ) : (
            <View className="items-center justify-center py-20 bg-white rounded-[40px] border border-surface-low">
              <Target size={48} color="#e2e8f0" strokeWidth={1.5} />
              <Text className="mt-4 text-sm font-jakarta font-bold text-text-muted">No results found for this term</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
