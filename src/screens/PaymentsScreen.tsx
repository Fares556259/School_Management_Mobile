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
    const data = await studentService.fetchPayments(id, isRefreshing);
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
    const activeMonths = history.filter(p => p.status !== 'Locked');
    const totalOutstanding = activeMonths.reduce((acc, p) =>
      p.status !== 'Paid' ? acc + (p.totalAmount - p.paidAmount) : acc, 0);
    const totalPaid = history.reduce((acc, p) => acc + p.paidAmount, 0);
    const paidMonths = history.filter(p => p.status === 'Paid').length;
    const totalMonths = activeMonths.length;
    const firstUnfilled = history.find(p => p.status !== 'Paid' && p.status !== 'Locked');
    const allPaid = totalOutstanding === 0 && totalMonths > 0;
    return {
      outstanding: totalOutstanding,
      totalPaid,
      paidMonths,
      totalMonths,
      nextDue: firstUnfilled ? firstUnfilled.month : 'All clear!',
      allPaid,
    };
  }, [history]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <GlobalHeader navigation={navigation} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0072e6" />
          <Text style={{ marginTop: 12, fontSize: 14, fontWeight: '700', color: '#64748b' }}>Loading your finances...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <GlobalHeader navigation={navigation} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0072e6" />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Text style={{ paddingHorizontal: 20, marginTop: 20, marginBottom: 4, fontSize: 30, fontWeight: '900', color: '#1e293b', letterSpacing: -0.5 }}>Payment History</Text>
        <Text style={{ paddingHorizontal: 20, marginBottom: 24, fontSize: 13, fontWeight: '700', color: '#64748b', fontStyle: 'italic' }}>Full academic year timeline (Sep – Jun).</Text>


        {/* Summary Card */}
        <View style={{ marginBottom: 24, paddingHorizontal: 20 }}>
          <View style={{
            backgroundColor: summary.outstanding === 0 ? '#16a34a' : '#0055d4', borderRadius: 24,
            borderWidth: 2, borderColor: summary.outstanding === 0 ? '#15803d' : '#0040a8',
            shadowColor: summary.outstanding === 0 ? '#15803d' : '#0040a8', shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 1, shadowRadius: 0, elevation: 5,
            overflow: 'hidden',
            padding: 24,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            {/* Decorative circles */}
            <View style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.06)' }} />
            <View style={{ position: 'absolute', left: -30, bottom: -30, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.04)' }} />

            <View>
              <Text style={{ fontFamily: 'Plus Jakarta Sans', color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                {summary.outstanding === 0 ? 'All Caught Up!' : 'Outstanding Amount'}
              </Text>
              <Text style={{ fontFamily: 'Plus Jakarta Sans', color: 'white', fontSize: 36, fontWeight: '900', letterSpacing: -1 }}>
                {summary.outstanding.toLocaleString()} <Text style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.8)' }}>TND</Text>
              </Text>
            </View>
            <View style={{ width: 64, height: 64, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
              {summary.outstanding === 0 ? (
                <CheckCircle2 size={32} color="white" />
              ) : (
                <Wallet size={32} color="white" />
              )}
            </View>
          </View>
        </View>


        {/* Filter Tabs */}
        <View style={{ marginBottom: 20, paddingHorizontal: 20 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {['All', 'Paid', 'Unpaid'].map(filter => {
              const isActive = activeFilter === filter;
              const count = (counts as any)[filter] || 0;
              return (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  activeOpacity={0.85}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 16, paddingVertical: 8,
                    borderRadius: 12,
                    backgroundColor: isActive ? '#f1f5f9' : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: isActive ? '800' : '600', color: isActive ? '#1e293b' : '#64748b' }}>{filter}</Text>
                  {count > 0 && (
                    <View style={{ marginLeft: 6, backgroundColor: isActive ? '#e2e8f0' : '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: isActive ? '#475569' : '#94a3b8' }}>{count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Payment List */}
        <View style={{ paddingHorizontal: 20 }}>
          {processedList.length > 0 ? (
            processedList.map((item) => {
              const progress = (item.paidAmount / item.totalAmount) * 100;
              const isPaid = item.status === 'Paid';
              const isLocked = item.status === 'Locked';
              const isOverdue = item.isOverdue;

              const statusConfig: any = {
                Paid:    { label: 'Paid',     color: '#16a34a', bg: '#f0fdf4', border: '#86efac', text: '#15803d', shadow: '#22c55e' },
                Partial: { label: 'Partial',  color: '#d97706', bg: '#fffbeb', border: '#fcd34d', text: '#b45309', shadow: '#f59e0b' },
                Due:     { label: isOverdue ? 'Overdue' : 'Due Soon', color: isOverdue ? '#dc2626' : '#ea580c', bg: isOverdue ? '#fef2f2' : '#fff7ed', border: isOverdue ? '#fca5a5' : '#fdba74', text: isOverdue ? '#b91c1c' : '#c2410c', shadow: isOverdue ? '#ef4444' : '#f97316' },
                Locked:  { label: 'Upcoming', color: '#64748b', bg: '#f8fafc', border: '#f1f5f9', text: '#1e293b', shadow: 'transparent' },
              };
              const config = statusConfig[item.status] || statusConfig.Due;

              return (
                <View
                  key={`${item.id}-${item.month}`}
                  style={{
                    backgroundColor: config.bg, 
                    borderRadius: 16, marginBottom: 12,
                    borderWidth: 1,
                    borderColor: config.border,
                    shadowColor: config.shadow,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isLocked ? 0 : 0.15,
                    shadowRadius: 4,
                    elevation: isLocked ? 0 : 2,
                    opacity: isLocked ? 0.6 : 1,
                  }}
                >
                  {/* Header row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, paddingBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 17, fontWeight: '900', color: config.text }}>{item.month}</Text>
                        {item.status === 'Paid' && <CheckCircle2 size={16} color={config.color} />}
                        {item.status === 'Partial' && <Clock size={16} color={config.color} />}
                        {item.status === 'Due' && isOverdue && <AlertCircle size={16} color={config.color} />}
                        {item.status === 'Due' && !isOverdue && <Calendar size={16} color={config.color} />}
                      </View>
                      {/* Overdue info inline — no separate banner */}
                      <Text style={{ fontSize: 13, fontWeight: '600', color: isOverdue ? '#ef4444' : '#94a3b8', marginTop: 3 }}>
                        {isOverdue
                          ? `Overdue by ${item.overdueDays} days`
                          : isPaid
                          ? 'Tuition & Academic Fees'
                          : isLocked
                          ? 'Not available yet'
                          : `Due ${item.dueDate || 'end of month'}`}
                      </Text>
                    </View>
                    {/* Status badge */}
                    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: config.bg }}>
                      <Text style={{ color: config.color, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>{config.label}</Text>
                    </View>
                  </View>

                  {/* Divider */}
                  <View style={{ height: 1, backgroundColor: config.border, marginHorizontal: 16, opacity: 0.5 }} />

                  {/* Amount + progress */}
                  <View style={{ padding: 16, paddingTop: 12, paddingBottom: isPaid ? 16 : 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: config.text }}>
                        {item.paidAmount.toLocaleString()}
                        <Text style={{ fontSize: 13, fontWeight: '700', color: config.color }}> / {item.totalAmount.toLocaleString()} TND</Text>
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: config.color }}>{Math.round(progress)}%</Text>
                    </View>
                    {/* Progress bar */}
                    <View style={{ height: 6, width: '100%', backgroundColor: '#f8fafc', borderRadius: 999, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${Math.min(100, progress)}%`, backgroundColor: config.color, borderRadius: 999, opacity: 0.8 }} />
                    </View>
                  </View>

                  {/* Action — only if not paid and not locked */}
                  {!isPaid && !isLocked && (
                    <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                      <TouchableOpacity
                        activeOpacity={0.88}
                        style={{
                          height: 44, borderRadius: 12,
                          backgroundColor: '#f8fafc',
                          alignItems: 'center', justifyContent: 'center',
                          flexDirection: 'row', gap: 8,
                          borderWidth: 1, borderColor: '#e2e8f0',
                        }}
                      >
                        <Text style={{ color: '#1e293b', fontWeight: '700', fontSize: 14 }}>Pay Now</Text>
                        <ArrowUpRight size={16} color="#1e293b" strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  )}

                  {isPaid && (
                    <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                      <TouchableOpacity
                        activeOpacity={0.88}
                        style={{
                          height: 40, borderRadius: 12,
                          backgroundColor: '#f8fafc',
                          alignItems: 'center', justifyContent: 'center',
                          flexDirection: 'row', gap: 8,
                        }}
                      >
                        <DownloadCloud size={14} color="#64748b" />
                        <Text style={{ color: '#64748b', fontWeight: '600', fontSize: 13 }}>Download Receipt</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 64, backgroundColor: '#f8fafc', borderRadius: 20, borderWidth: 2, borderColor: '#e2e8f0' }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#dcfce7', borderWidth: 2, borderColor: '#86efac', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <CheckCircle2 size={30} color="#16a34a" />
              </View>
              <Text style={{ fontSize: 17, fontWeight: '900', color: '#1e293b', textAlign: 'center', marginBottom: 6 }}>
                {activeFilter === 'Paid' ? 'No paid records yet' : activeFilter === 'Unpaid' ? 'All caught up!' : 'No payments found'}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748b', textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 }}>
                {activeFilter === 'Unpaid' ? 'You have no outstanding payments.' : 'Records will appear here once available.'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};


