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
            backgroundColor: '#0072e6', borderRadius: 24,
            borderWidth: 2, borderColor: '#0055b3',
            shadowColor: '#0055b3', shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 1, shadowRadius: 0, elevation: 5,
            overflow: 'hidden',
          }}>
            {/* Decorative circles */}
            <View style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.06)' }} />
            <View style={{ position: 'absolute', left: -30, bottom: -30, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.04)' }} />

            <View style={{ padding: 20 }}>
              {/* Two stat boxes */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.13)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>Outstanding</Text>
                  <Text style={{ color: 'white', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 }}>
                    {summary.outstanding.toLocaleString()}
                    <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.65)' }}> TND</Text>
                  </Text>
                </View>
                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.13)', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>Total Paid</Text>
                  <Text style={{ color: 'white', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 }}>
                    {summary.totalPaid.toLocaleString()}
                    <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.65)' }}> TND</Text>
                  </Text>
                </View>
              </View>

              {/* Month progress dots */}
              {summary.totalMonths > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Academic Year</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '900' }}>{summary.paidMonths}/{summary.totalMonths} months paid</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {history.filter(p => p.status !== 'Locked').map((p, i) => (
                      <View
                        key={i}
                        style={{
                          flex: 1, height: 6, borderRadius: 999,
                          backgroundColor: p.status === 'Paid'
                            ? 'rgba(255,255,255,0.9)'
                            : p.isOverdue
                            ? 'rgba(255,120,120,0.8)'
                            : 'rgba(255,255,255,0.22)',
                        }}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Next due row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.13)', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', gap: 10 }}>
                <Clock size={15} color="rgba(255,255,255,0.75)" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Next Payment</Text>
                  <Text style={{ color: 'white', fontWeight: '900', fontSize: 13, marginTop: 1 }}>{summary.nextDue}</Text>
                </View>
                {summary.allPaid && (
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                    <Text style={{ color: 'white', fontSize: 10, fontWeight: '900' }}>✓ All Clear</Text>
                  </View>
                )}
              </View>
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
                    paddingHorizontal: 18, paddingVertical: 10,
                    borderRadius: 999, borderWidth: 2,
                    backgroundColor: isActive ? '#0072e6' : '#ffffff',
                    borderColor: isActive ? '#0055b3' : '#e2e8f0',
                    shadowColor: isActive ? '#0055b3' : '#e2e8f0',
                    shadowOffset: { width: 0, height: isActive ? 3 : 2 },
                    shadowOpacity: 1, shadowRadius: 0,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '900', color: isActive ? 'white' : '#475569' }}>{filter}</Text>
                  {count > 0 && (
                    <View style={{ marginLeft: 8, backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                      <Text style={{ fontSize: 10, fontWeight: '900', color: isActive ? 'white' : '#64748b' }}>{count}</Text>
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
                Paid:    { label: 'Paid',     color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
                Partial: { label: 'Partial',  color: '#d97706', bg: '#fef3c7', border: '#fcd34d' },
                Due:     { label: isOverdue ? 'Overdue' : 'Due Soon', color: isOverdue ? '#dc2626' : '#ea580c', bg: isOverdue ? '#fee2e2' : '#fff7ed', border: isOverdue ? '#fca5a5' : '#fed7aa' },
                Locked:  { label: 'Upcoming', color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' },
              };
              const config = statusConfig[item.status] || statusConfig.Due;

              return (
                <View
                  key={`${item.id}-${item.month}`}
                  style={{
                    backgroundColor: 'white', borderRadius: 20, marginBottom: 12,
                    borderWidth: 2,
                    borderColor: isPaid ? '#86efac' : isOverdue ? '#fca5a5' : '#e2e8f0',
                    opacity: isLocked ? 0.7 : 1,
                  }}
                >
                  {/* Header row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, paddingBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: '900', color: '#1e293b' }}>{item.month}</Text>
                      {/* Overdue info inline — no separate banner */}
                      <Text style={{ fontSize: 12, fontWeight: '700', color: isOverdue ? '#dc2626' : '#94a3b8', marginTop: 3 }}>
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
                    <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: config.bg, borderWidth: 1.5, borderColor: config.border }}>
                      <Text style={{ color: config.color, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }}>{config.label}</Text>
                    </View>
                  </View>

                  {/* Divider */}
                  <View style={{ height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 16 }} />

                  {/* Amount + progress */}
                  <View style={{ padding: 16, paddingTop: 12, paddingBottom: isPaid ? 16 : 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: '#1e293b' }}>
                        {item.paidAmount.toLocaleString()}
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#94a3b8' }}> / {item.totalAmount.toLocaleString()} TND</Text>
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: config.color }}>{Math.round(progress)}%</Text>
                    </View>
                    {/* Progress bar */}
                    <View style={{ height: 8, width: '100%', backgroundColor: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${Math.min(100, progress)}%`, backgroundColor: config.color, borderRadius: 999 }} />
                    </View>
                  </View>

                  {/* Action — only if not paid and not locked */}
                  {!isPaid && !isLocked && (
                    <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                      <TouchableOpacity
                        activeOpacity={0.88}
                        style={{
                          height: 48, borderRadius: 14,
                          backgroundColor: '#0072e6',
                          alignItems: 'center', justifyContent: 'center',
                          flexDirection: 'row', gap: 8,
                          borderBottomWidth: 3, borderBottomColor: '#0055b3',
                        }}
                      >
                        <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>Pay Now</Text>
                        <ArrowUpRight size={16} color="white" strokeWidth={3} />
                      </TouchableOpacity>
                    </View>
                  )}

                  {isPaid && (
                    <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                      <TouchableOpacity
                        activeOpacity={0.88}
                        style={{
                          height: 44, borderRadius: 14,
                          backgroundColor: '#f0fdf4',
                          alignItems: 'center', justifyContent: 'center',
                          flexDirection: 'row', gap: 8,
                          borderWidth: 1.5, borderColor: '#86efac',
                        }}
                      >
                        <DownloadCloud size={16} color="#16a34a" />
                        <Text style={{ color: '#16a34a', fontWeight: '900', fontSize: 13 }}>Download Receipt</Text>
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


