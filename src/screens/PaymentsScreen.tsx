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
            backgroundColor: '#0072e6', padding: 24, borderRadius: 24,
            borderWidth: 2, borderColor: '#0055b3',
            shadowColor: '#0055b3', shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 1, shadowRadius: 0, elevation: 5,
            overflow: 'hidden', position: 'relative',
          }}>
            <View style={{ position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>Total Outstanding</Text>
                <Text style={{ color: 'white', fontSize: 32, fontWeight: '900' }}>
                  {summary.outstanding.toLocaleString()} <Text style={{ fontSize: 16, fontWeight: '700' }}>TND</Text>
                </Text>
              </View>
              <View style={{ width: 48, height: 48, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet size={24} color="white" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', gap: 12 }}>
              <Clock size={18} color="white" />
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Next Payment Action</Text>
                <Text style={{ color: 'white', fontWeight: '900', fontSize: 14, marginTop: 2 }}>{summary.nextDue}</Text>
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
                Paid:    { label: 'Paid',    icon: CheckCircle2, color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
                Partial: { label: 'Partial', icon: AlertCircle,  color: '#d97706', bg: '#fef3c7', border: '#fcd34d' },
                Due:     { label: isOverdue ? 'Overdue' : 'Due Soon', icon: isOverdue ? AlertCircle : Info, color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
                Locked:  { label: 'Upcoming', icon: Calendar, color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' },
              };
              const config = statusConfig[item.status] || statusConfig.Due;
              const StatusIcon = config.icon;

              return (
                <View
                  key={`${item.id}-${item.month}`}
                  style={{
                    backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 12,
                    borderWidth: 2,
                    borderColor: isOverdue ? '#fca5a5' : isPaid ? '#86efac' : '#e2e8f0',
                    shadowColor: isOverdue ? '#fca5a5' : isPaid ? '#86efac' : '#e2e8f0',
                    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3,
                    opacity: isLocked ? 0.75 : 1,
                  }}
                >
                  {/* Month + Status */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <View>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: '#1e293b' }}>{item.month}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b', marginTop: 2 }}>Tuition & Academic Fees</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: config.bg, borderWidth: 2, borderColor: config.border }}>
                      <StatusIcon size={12} color={config.color} />
                      <Text style={{ color: config.color, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }}>{config.label}</Text>
                    </View>
                  </View>

                  {/* Progress */}
                  <View style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
                      <View>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Payment Progress</Text>
                        <Text style={{ fontSize: 22, fontWeight: '900', color: '#1e293b' }}>
                          {item.paidAmount.toLocaleString()} <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748b' }}>/ {item.totalAmount.toLocaleString()} TND</Text>
                        </Text>
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: config.color }}>{Math.round(progress)}%</Text>
                    </View>
                    {/* Duolingo-style thick progress bar */}
                    <View style={{ height: 12, width: '100%', backgroundColor: '#f1f5f9', borderRadius: 999, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' }}>
                      <View style={{ height: '100%', width: `${Math.min(100, progress)}%`, backgroundColor: config.color, borderRadius: 999 }} />
                    </View>
                  </View>

                  {/* Due Date Warning */}
                  {!isPaid && !isLocked && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, marginBottom: 14, backgroundColor: isOverdue ? '#fee2e2' : '#f1f5f9', borderWidth: 2, borderColor: isOverdue ? '#fca5a5' : '#e2e8f0' }}>
                      <Calendar size={14} color={isOverdue ? '#dc2626' : '#64748b'} />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: isOverdue ? '#dc2626' : '#64748b' }}>
                        {isOverdue ? `Overdue by ${item.overdueDays} days` : `Due on ${item.dueDate || 'End of Month'}`}
                      </Text>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {isLocked ? (
                      <View style={{ flex: 1, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderWidth: 2, borderColor: '#e2e8f0' }}>
                        {(item as any).daysUntil > 0 && (item as any).daysUntil <= 5 ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Clock size={16} color="#0072e6" />
                            <Text style={{ color: '#0072e6', fontWeight: '900', fontSize: 14 }}>In {(item as any).daysUntil} {(item as any).daysUntil === 1 ? 'day' : 'days'}</Text>
                          </View>
                        ) : (
                          <Text style={{ color: '#94a3b8', fontWeight: '800', fontSize: 14 }}>Not Available Yet</Text>
                        )}
                      </View>
                    ) : !isPaid ? (
                      // Duolingo 3D Pay Now button
                      <View style={{ flex: 1 }}>
                        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%', borderRadius: 16, backgroundColor: '#0055b3' }} />
                        <TouchableOpacity
                          activeOpacity={0.9}
                          style={{ height: 56, borderRadius: 16, backgroundColor: '#0072e6', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 4 }}
                        >
                          <Text style={{ color: 'white', fontWeight: '900', fontSize: 15 }}>Pay Now</Text>
                          <ArrowUpRight size={18} color="white" strokeWidth={3} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={{ flex: 1, height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#dcfce7', borderWidth: 2, borderColor: '#86efac' }}>
                        <DownloadCloud size={18} color="#16a34a" />
                        <Text style={{ color: '#16a34a', fontWeight: '900', fontSize: 14 }}>View Receipt</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={{ width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderWidth: 2, borderColor: '#e2e8f0' }}>
                      <ReceiptText size={20} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 64, backgroundColor: '#f8fafc', borderRadius: 24, borderWidth: 2, borderColor: '#e2e8f0' }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#dcfce7', borderWidth: 2, borderColor: '#86efac', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <CheckCircle2 size={36} color="#16a34a" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', textAlign: 'center', marginBottom: 8 }}>Empty Category 🎉</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748b', textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 }}>No records matching this filter.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};


