import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Platform, RefreshControl, StatusBar, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Bell, 
  Info, 
  Filter, 
  DownloadCloud, 
  ReceiptText, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Wallet, 
  ChevronRight, 
  ArrowUpRight,
  TrendingDown,
  Clock
} from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { studentService } from '../services/api';
import { PaymentRecord } from '../types';
import { GlobalHeader } from '../components/GlobalHeader';

const { width } = Dimensions.get('window');

export const PaymentsScreen = ({ navigation }: any) => {
  const { selectedChildId } = useAppStore();
  const [history, setHistory] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const loadData = useCallback(async (id: string, isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    const data = await studentService.fetchPayments(id);
    setHistory(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (selectedChildId) loadData(selectedChildId);
  }, [selectedChildId]);

  const onRefresh = () => {
    if (selectedChildId) {
      setRefreshing(true);
      loadData(selectedChildId, true);
    }
  };

  // Derive counts for tabs
  const counts = useMemo(() => ({
    All: history.length,
    Paid: history.filter(p => p.status === 'Paid').length,
    Unpaid: history.filter(p => p.status !== 'Paid' && p.status !== 'Locked').length,
  }), [history]);

  // Sorting & Filtering Logic
  const processedList = useMemo(() => {
    let list = [...history];
    if (activeFilter === 'Paid') list = list.filter(p => p.status === 'Paid');
    if (activeFilter === 'Unpaid') list = list.filter(p => p.status !== 'Paid' && p.status !== 'Locked');

    // Timeline sorting: September to June
    // We can rely on the order in history which is already Sep -> Jun from the api.ts
    return list;
  }, [history, activeFilter]);

  // Summary Logic
  const summary = useMemo(() => {
    // Only include unpaid items (Due, Overdue, Partial) in the outstanding total
    const totalUnpaid = history.reduce((acc, p) => 
      (p.status !== 'Paid' && p.status !== 'Locked') ? acc + (p.totalAmount - p.paidAmount) : acc, 0);
    
    // Nearest unpaid item
    const firstUnfilled = history.find(p => p.status !== 'Paid' && p.status !== 'Locked');
    
    return { 
      outstanding: totalUnpaid, 
      nextDue: firstUnfilled ? firstUnfilled.month : 'All clear!' 
    };
  }, [history]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-surface-background" edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <GlobalHeader navigation={navigation} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0055d4" />
          <Text className="mt-4 font-jakarta font-bold text-text-muted">Loading your finances...</Text>
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
        <Text className="px-5 mt-6 mb-2 text-3xl font-jakarta font-black text-text-primary">Payment History</Text>
        <Text className="px-5 mb-8 text-sm font-manrope font-semibold text-text-muted italic">Full academic year timeline (Sep - Jun).</Text>

        {/* Global Financial Summary */}
        <View className="mb-8 px-5">
          <View className="bg-brand-primary p-6 rounded-[32px] shadow-xl relative overflow-hidden">
            <View className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full" />
            <View className="flex-row justify-between items-start mb-6">
              <View>
                <Text className="text-white/70 font-manrope font-semibold text-[10px] uppercase tracking-widest mb-1">Total Outstanding</Text>
                <Text className="text-white text-3xl font-jakarta font-black">{summary.outstanding.toLocaleString()} <Text className="text-lg font-bold">TND</Text></Text>
              </View>
              <View className="w-12 h-12 bg-white/20 rounded-2xl items-center justify-center">
                <Wallet size={24} color="white" />
              </View>
            </View>
            <View className="flex-row items-center bg-white/10 p-4 rounded-2xl border border-white/10">
              <Clock size={18} color="white" />
              <View className="ml-3">
                <Text className="text-white/60 font-manrope font-medium text-[10px] uppercase tracking-wider">Next Payment Action</Text>
                <Text className="text-white font-jakarta font-bold text-sm">{summary.nextDue}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Dynamic Filter Tabs */}
        <View className="mb-6 px-5">
          <View className="flex-row items-center mb-4">
            <Filter size={16} color="#737c7f" />
            <Text className="ml-2 text-[10px] font-jakarta font-black text-text-muted uppercase tracking-[2px]">Filter History</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {['All', 'Paid', 'Unpaid'].map(filter => {
              const isActive = activeFilter === filter;
              const count = (counts as any)[filter] || 0;
              return (
                <TouchableOpacity 
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  className={`flex-row items-center px-5 py-3 rounded-2xl border ${isActive ? 'bg-brand-primary border-brand-primary' : 'bg-white border-surface-low'}`}
                >
                  <Text className={`text-sm font-jakarta font-bold ${isActive ? 'text-white' : 'text-text-primary'}`}>{filter}</Text>
                  {count > 0 && !isActive && (
                    <View className="ml-2 bg-surface-low px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-bold text-text-muted">{count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Payment History List */}
        <View className="px-5">
          {processedList.length > 0 ? (
            processedList.map((item) => {
              const progress = (item.paidAmount / item.totalAmount) * 100;
              const isPaid = item.status === 'Paid';
              const isLocked = item.status === 'Locked';
              const isOverdue = item.isOverdue;
              
              const statusConfig: any = {
                Paid: { label: 'Paid', icon: CheckCircle2, color: '#16a34a', bg: '#f0fdf4', border: '#dcfce7' },
                Partial: { label: 'Partial', icon: TrendingDown, color: '#0055d4', bg: '#eff6ff', border: '#dbeafe' },
                Due: { label: isOverdue ? 'Overdue' : 'Due Soon', icon: isOverdue ? AlertCircle : Info, color: isOverdue ? '#dc2626' : '#d97706', bg: isOverdue ? '#fef2f2' : '#fffbeb', border: isOverdue ? '#fee2e2' : '#fef3c7' },
                Locked: { label: 'Upcoming', icon: Calendar, color: '#9ca3af', bg: '#f8f9fa', border: '#f1f4f6' }
              };
              const config = statusConfig[item.status] || statusConfig.Due;
              const StatusIcon = config.icon;

              return (
                <View 
                  key={`${item.id}-${item.month}`}
                  className={`bg-white rounded-[32px] p-6 mb-4 border-2 ${isOverdue ? 'border-red-100' : 'border-surface-low'} ${isPaid || isLocked ? 'opacity-80' : ''}`}
                >
                  <View className="flex-row justify-between items-center mb-5">
                    <View>
                      <Text className="text-xl font-jakarta font-black text-text-primary">{item.month}</Text>
                      <Text className="text-xs font-manrope font-semibold text-text-muted mt-1">Tuition & Academic Fees</Text>
                    </View>
                    <View style={{ backgroundColor: config.bg, borderColor: config.border }} className="flex-row items-center px-3 py-1.5 rounded-full border">
                      <StatusIcon size={12} color={config.color} />
                      <Text style={{ color: config.color }} className="ml-1.5 text-[10px] font-jakarta font-black uppercase tracking-wider">{config.label}</Text>
                    </View>
                  </View>

                  <View className="mb-5">
                    <View className="flex-row justify-between items-end mb-3">
                      <View>
                        <Text className="text-xs font-manrope font-bold text-text-muted mb-1">Payment Progress</Text>
                        <Text className="text-2xl font-jakarta font-black text-text-primary">
                          {item.paidAmount.toLocaleString()} 
                          <Text className="text-lg font-bold text-text-muted"> / {item.totalAmount.toLocaleString()} TND</Text>
                        </Text>
                      </View>
                      <Text style={{ color: config.color }} className="text-base font-jakarta font-extrabold">{Math.round(progress)}%</Text>
                    </View>
                    <View style={{ height: 8, width: '100%', backgroundColor: '#f1f4f6', borderRadius: 4, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${Math.min(100, progress)}%`, backgroundColor: config.color, borderRadius: 4 }} />
                    </View>
                  </View>

                  {!isPaid && !isLocked && (
                    <View className={`flex-row items-center p-3 rounded-2xl mb-5 ${isOverdue ? 'bg-red-50' : 'bg-surface-lowest'}`}>
                      <Calendar size={14} color={isOverdue ? '#dc2626' : '#737c7f'} />
                      <Text className={`ml-2 text-xs font-manrope font-bold ${isOverdue ? 'text-red-600' : 'text-text-muted'}`}>
                        {isOverdue ? `Overdue by ${item.overdueDays} days` : `Due on ${item.dueDate || 'End of Month'}`}
                      </Text>
                    </View>
                  )}

                  <View className="flex-row gap-3">
                    {isLocked ? (
                      <View className="flex-1 bg-surface-lowest h-14 rounded-2xl items-center justify-center border border-surface-low">
                        <Text className="text-text-muted font-jakarta font-bold text-sm">Not Available Yet</Text>
                      </View>
                    ) : !isPaid ? (
                      <TouchableOpacity className="flex-1 bg-brand-primary h-14 rounded-2xl flex-row items-center justify-center">
                        <Text className="text-white font-jakarta font-bold text-base">Pay Now</Text>
                        <ArrowUpRight size={18} color="white" className="ml-2" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity className="flex-1 bg-surface-lowest border border-surface-low h-14 rounded-2xl flex-row items-center justify-center">
                        <DownloadCloud size={18} color="#0055d4" />
                        <Text className="text-brand-primary font-jakarta font-bold text-base ml-2">View Receipt</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity className="w-14 h-14 bg-surface-lowest border border-surface-low rounded-2xl items-center justify-center">
                      <ReceiptText size={20} color="#737c7f" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          ) : (
            <View className="items-center justify-center py-20 bg-white rounded-[40px] border border-surface-low">
              <View className="w-20 h-20 bg-green-50 rounded-full items-center justify-center mb-6">
                <CheckCircle2 size={40} color="#16a34a" />
              </View>
              <Text className="text-xl font-jakarta font-black text-text-primary mb-2 text-center">Empty Category 🎉</Text>
              <Text className="text-sm font-manrope font-bold text-text-muted text-center px-10">There are no records matching this filter for the selected time period.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
