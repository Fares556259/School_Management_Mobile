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
  CreditCard
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <GlobalHeader navigation={navigation} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0072e6" />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >


        {/* Summary Card */}
        <View style={{ marginBottom: 24, paddingHorizontal: 20, marginTop: 16 }}>
          <View style={{
            backgroundColor: '#0072e6',
            borderRadius: 24,
            padding: 24,
            shadowColor: '#0072e6',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 8,
          }}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, textAlign: isRTL ? 'right' : 'left' }}>
                  {summary.outstanding === 0 ? (isRTL ? 'خلاص تام لكافة الأقساط!' : 'All Caught Up!') : t.totalOutstanding}
                </Text>
                <Text style={{ color: '#ffffff', fontSize: 36, fontWeight: '900', letterSpacing: -1, textAlign: isRTL ? 'right' : 'left' }}>
                  {summary.outstanding.toLocaleString()} <Text style={{ fontSize: 18, fontWeight: '800', color: 'rgba(255,255,255,0.8)' }}>{t.currencyTnd}</Text>
                </Text>
              </View>
              <View style={{ 
                width: 48, height: 48, 
                borderRadius: 16, 
                backgroundColor: 'rgba(255,255,255,0.15)',
                alignItems: 'center', justifyContent: 'center' 
              }}>
                <CreditCard size={24} color="#ffffff" strokeWidth={2.5} />
              </View>
            </View>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={{ marginBottom: 24, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: '#f1f5f9', padding: 6, borderRadius: 16 }}>
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
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: isActive ? '#ffffff' : 'transparent',
                    shadowColor: isActive ? '#000' : 'transparent',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isActive ? 0.05 : 0,
                    shadowRadius: 4,
                    elevation: isActive ? 2 : 0,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '800', color: isActive ? '#0072e6' : '#64748b' }}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Payment History Title */}
        <View style={{ paddingHorizontal: 20, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }}>{t.paymentHistory}</Text>
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#0072e6' }}>2025/2026</Text>
        </View>

        {/* Payment List */}
        <View style={{ paddingHorizontal: 20 }}>
          {processedList.length > 0 ? (
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
              {/* Timeline Line */}
              <View style={{ width: 4, backgroundColor: '#0072e6', borderRadius: 2, marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0, marginVertical: 8, opacity: 0.8 }} />
              <View style={{ flex: 1 }}>
                {processedList.map((item) => {
              const isPaid = item.status === 'Paid';
              const isLocked = item.status === 'Locked';
              const isOverdue = item.isOverdue;
              const isPartial = item.status === 'Partial';

              const statusConfig: any = {
                Paid:    { label: t.paid,        color: '#16a34a', bg: '#dcfce7', text: '#16a34a' },
                Partial: { label: t.pending,     color: '#d97706', bg: '#fef3c7', text: '#d97706' },
                Due:     { label: isOverdue ? t.overdueBadge : t.pending, color: isOverdue ? '#dc2626' : '#d97706', bg: isOverdue ? '#fee2e2' : '#fef3c7', text: isOverdue ? '#dc2626' : '#d97706' },
                Locked:  { label: t.upcoming,    color: '#64748b', bg: '#f1f5f9', text: '#64748b' },
              };
              const config = statusConfig[item.status] || statusConfig.Due;

              const monthNamesAr: Record<string, string> = {
                SEP: 'سبتمبر', OCT: 'أكتوبر', NOV: 'نوفمبر', DEC: 'ديسمبر', JAN: 'يناير', FEB: 'فبراير', MAR: 'مارس', APR: 'أبريل', MAY: 'ماي', JUN: 'جوان', JUL: 'جويلية', AUG: 'أوت'
              };

              const [monthStr, yearStr] = item.month.split(' ');
              const rawShortMonth = monthStr ? monthStr.substring(0, 3).toUpperCase() : '';
              const displayMonth = isRTL ? (monthNamesAr[rawShortMonth] || rawShortMonth) : rawShortMonth;
              const shortYear = yearStr ? yearStr.substring(2) : '';

              return (
                <View
                  key={`${item.id}-${item.month}`}
                  style={{
                    backgroundColor: '#ffffff', 
                    borderRadius: 16, marginBottom: 12,
                    borderWidth: 1, borderColor: '#f1f5f9',
                    shadowColor: '#e2e8f0', shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isLocked ? 0 : 0.6, shadowRadius: 8, elevation: isLocked ? 0 : 2,
                    opacity: isLocked ? 0.6 : 1,
                    flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', padding: 16, gap: 12
                  }}
                >
                  <View style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: config.bg, borderRadius: 12, minWidth: 60, height: 50, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: config.color }}>{displayMonth}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: config.color }}>20{shortYear}</Text>
                  </View>

                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }}>
                        {t.tuitionFees}
                      </Text>
                      {isPaid && <CheckCircle2 size={14} color={config.color} strokeWidth={3} />}
                      {isOverdue && <AlertCircle size={14} color={config.color} strokeWidth={3} />}
                    </View>
                    
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#94a3b8', marginTop: 4, textAlign: isRTL ? 'right' : 'left' }}>
                      {isOverdue
                        ? `${t.overdueDays} ${item.overdueDays} ${t.daysLabel}`
                        : isPaid
                        ? `${t.paid}`
                        : isLocked
                        ? 'غير متاح حالياً'
                        : `${t.pending}`}
                    </Text>
                  </View>
                  
                  <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#64748b', marginBottom: 6, textAlign: isRTL ? 'left' : 'right' }}>
                      {isPartial ? `${item.paidAmount.toLocaleString()} / ` : ''}{item.totalAmount.toLocaleString()} <Text style={{ fontSize: 11, fontWeight: '700' }}>{t.currencyTnd}</Text>
                    </Text>
                    <View style={{ backgroundColor: config.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                      <Text style={{ fontSize: 10, fontWeight: '900', color: config.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {config.label}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          }
          </View>
        </View>
        ) : (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 64, backgroundColor: '#f8fafc', borderRadius: 20, borderWidth: 2, borderColor: '#e2e8f0' }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#dcfce7', borderWidth: 2, borderColor: '#86efac', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <CheckCircle2 size={30} color="#16a34a" />
              </View>
              <Text style={{ fontSize: 17, fontWeight: '900', color: '#1e293b', textAlign: 'center', marginBottom: 6 }}>
                {activeFilter === 'Paid' ? 'لا توجد وصولات مدفوعة' : activeFilter === 'Unpaid' ? 'تم خلاص كافة الأقساط!' : 'لا توجد أقساط مسجلة'}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748b', textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 }}>
                {activeFilter === 'Unpaid' ? 'ليس لديك أي أقساط متأخرة.' : 'ستظهر الوثائق والأقساط هنا عند تفعيلها.'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};


