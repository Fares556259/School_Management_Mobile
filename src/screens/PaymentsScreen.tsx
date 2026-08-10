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
  Clock,
  CreditCard,
  CreditCardIcon
} from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { useLanguage } from '../context/LanguageContext';
import { studentService } from '../services/api';
import { PaymentRecord } from '../types';
import { GlobalHeader } from '../components/GlobalHeader';

const { width } = Dimensions.get('window');

export const PaymentsScreen = ({ navigation }: any) => {
  const { selectedChildId } = useAppStore();
  const { t, isRTL } = useLanguage();
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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <GlobalHeader navigation={navigation} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0055d4" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <GlobalHeader navigation={navigation} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0055d4" />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Summary Card */}
        <View style={{ paddingHorizontal: 20, marginTop: 16, marginBottom: 28 }}>
          <View style={{
            backgroundColor: '#0055d4',
            borderRadius: 32,
            padding: 28,
            shadowColor: '#0055d4',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.25,
            shadowRadius: 24,
            elevation: 12,
            overflow: 'hidden'
          }}>
            {/* Background design elements */}
            <View style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <View style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.08)' }} />
            
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 12 }}>
                  <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {summary.outstanding === 0 ? (isRTL ? 'خلاص تام!' : 'All Caught Up!') : t.totalOutstanding || 'Total Due'}
                  </Text>
                </View>
                <Text style={{ color: '#ffffff', fontSize: 44, fontWeight: '900', letterSpacing: -1.5, textAlign: isRTL ? 'right' : 'left' }}>
                  {summary.outstanding.toLocaleString()} <Text style={{ fontSize: 20, fontWeight: '800', color: 'rgba(255,255,255,0.8)' }}>{t.currencyTnd}</Text>
                </Text>
              </View>
              <View style={{ 
                width: 52, height: 52, 
                borderRadius: 20, 
                backgroundColor: '#ffffff',
                alignItems: 'center', justifyContent: 'center',
                shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8
              }}>
                <CreditCard size={26} color="#0055d4" strokeWidth={2.5} />
              </View>
            </View>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={{ marginBottom: 24, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12 }}>
            {[
              { key: 'All', label: t.filterAll },
              { key: 'Paid', label: t.filterPaid },
              { key: 'Unpaid', label: t.filterUnpaid }
            ].map(tab => {
              const isActive = activeFilter === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveFilter(tab.key)}
                  activeOpacity={0.85}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderRadius: 20,
                    backgroundColor: isActive ? '#0055d4' : '#ffffff',
                    borderWidth: isActive ? 0 : 1,
                    borderColor: '#e2e8f0',
                    shadowColor: isActive ? '#0055d4' : '#000',
                    shadowOffset: { width: 0, height: isActive ? 4 : 2 },
                    shadowOpacity: isActive ? 0.3 : 0.03,
                    shadowRadius: isActive ? 8 : 4,
                    elevation: isActive ? 4 : 1,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '800', color: isActive ? '#ffffff' : '#64748b' }}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Payment History Title */}
        <View style={{ paddingHorizontal: 24, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }}>{t.paymentHistory || 'Installments'}</Text>
          <View style={{ backgroundColor: '#e0e7ff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#4338ca' }}>2025/2026</Text>
          </View>
        </View>

        {/* Payment List */}
        <View style={{ paddingHorizontal: 20 }}>
          {processedList.length > 0 ? (
            <View style={{ gap: 16 }}>
              {processedList.map((item) => {
                const isPaid = item.status === 'Paid';
                const isLocked = item.status === 'Locked';
                const isOverdue = item.isOverdue;
                const isPartial = item.status === 'Partial';

                const statusConfig: any = {
                  Paid:    { label: t.paid || 'Paid',        color: '#10b981', bg: '#d1fae5', icon: <CheckCircle2 size={16} color="#10b981" strokeWidth={3} /> },
                  Partial: { label: t.pending || 'Partial',  color: '#f59e0b', bg: '#fef3c7', icon: <Clock size={16} color="#f59e0b" strokeWidth={3} /> },
                  Due:     { label: isOverdue ? (t.overdueBadge || 'Overdue') : (t.pending || 'Pending'), color: isOverdue ? '#ef4444' : '#f59e0b', bg: isOverdue ? '#fee2e2' : '#fef3c7', icon: isOverdue ? <AlertCircle size={16} color="#ef4444" strokeWidth={3} /> : <Clock size={16} color="#f59e0b" strokeWidth={3} /> },
                  Locked:  { label: t.upcoming || 'Upcoming', color: '#94a3b8', bg: '#f1f5f9', icon: null },
                };
                const config = statusConfig[item.status] || statusConfig.Due;

                const monthNamesAr: Record<string, string> = {
                  SEP: 'سبتمبر', OCT: 'أكتوبر', NOV: 'نوفمبر', DEC: 'ديسمبر', JAN: 'يناير', FEB: 'فبراير', MAR: 'مارس', APR: 'أبريل', MAY: 'ماي', JUN: 'جوان', JUL: 'جويلية', AUG: 'أوت'
                };

                const [monthStr, yearStr] = item.month.split(' ');
                const rawShortMonth = monthStr ? monthStr.substring(0, 3).toUpperCase() : '';
                const displayMonth = isRTL ? (monthNamesAr[rawShortMonth] || rawShortMonth) : rawShortMonth;

                return (
                  <View
                    key={`${item.id}-${item.month}`}
                    style={{
                      backgroundColor: '#ffffff', 
                      borderRadius: 24,
                      padding: 20,
                      shadowColor: '#000', 
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: isLocked ? 0.02 : 0.06, 
                      shadowRadius: 16, 
                      elevation: isLocked ? 0 : 2,
                      opacity: isLocked ? 0.6 : 1,
                      borderWidth: 1,
                      borderColor: 'rgba(0,0,0,0.02)'
                    }}
                  >
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      
                      {/* Left: Month Icon + Details */}
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start', flex: 1 }}>
                        <View style={{ 
                          width: 54, height: 54, 
                          borderRadius: 18, 
                          backgroundColor: config.bg,
                          alignItems: 'center', justifyContent: 'center',
                          marginRight: isRTL ? 0 : 16,
                          marginLeft: isRTL ? 16 : 0
                        }}>
                          <Calendar color={config.color} size={24} strokeWidth={2.5} />
                        </View>

                        <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', flex: 1, marginTop: 4 }}>
                          <Text style={{ fontSize: 17, fontWeight: '900', color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }}>
                            {t.tuitionFees || 'Tuition Installment'}
                          </Text>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: config.color, marginTop: 4 }}>
                            {displayMonth} {yearStr}
                          </Text>
                          
                          {isOverdue && (
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#94a3b8', marginTop: 8 }}>
                              {t.overdueDays} {item.overdueDays} {t.daysLabel}
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* Right: Amount & Status */}
                      <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                        <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a', textAlign: isRTL ? 'left' : 'right' }}>
                          {isPartial ? `${item.paidAmount.toLocaleString()} / ` : ''}{item.totalAmount.toLocaleString()} <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b' }}>{t.currencyTnd}</Text>
                        </Text>
                        
                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: config.bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, marginTop: 12, gap: 6 }}>
                          {config.icon}
                          <Text style={{ fontSize: 11, fontWeight: '800', color: config.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {config.label}
                          </Text>
                        </View>
                      </View>

                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 64, backgroundColor: '#ffffff', borderRadius: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                {activeFilter === 'Paid' ? (
                  <Wallet size={36} color="#64748b" strokeWidth={2} />
                ) : (
                  <CheckCircle2 size={40} color="#10b981" strokeWidth={2.5} />
                )}
              </View>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', textAlign: 'center', marginBottom: 8 }}>
                {activeFilter === 'Paid' ? 'لا توجد وصولات مدفوعة' : activeFilter === 'Unpaid' ? 'تم خلاص كافة الأقساط!' : 'لا توجد أقساط مسجلة'}
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#94a3b8', textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 }}>
                {activeFilter === 'Unpaid' ? 'ليس لديك أي أقساط متأخرة.' : 'ستظهر الوثائق والأقساط هنا عند تفعيلها.'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
