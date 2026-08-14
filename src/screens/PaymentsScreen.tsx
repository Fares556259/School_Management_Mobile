import React, { useMemo, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
  Check
} from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { useLanguage } from '../context/LanguageContext';
import { studentService } from '../services/api';
import { PaymentRecord } from '../types';
import { GlobalHeader } from '../components/GlobalHeader';
import { cacheManager } from '../utils/cacheManager';
import { SkeletonBlock } from '../components/SkeletonView';

const { width } = Dimensions.get('window');

export const PaymentsScreen = ({ navigation }: any) => {
  const { selectedChildId } = useAppStore();
  const { t, isRTL } = useLanguage();
  const [history, setHistory] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'Due' | 'Paid'>('Due');

  const loadData = useCallback(async (id: string, isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    const cacheKey = `PAYMENTS_CACHE_${id}`;
    
    const cachedData = await cacheManager.get<PaymentRecord[]>(cacheKey);
    if (!isRefreshing && cachedData) {
      setHistory(cachedData);
      setLoading(false);
    }
    
    const data = await studentService.fetchPayments(id, isRefreshing);
    setHistory(data);
    await cacheManager.set(cacheKey, data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (selectedChildId) {
        loadData(selectedChildId);
      }
    }, [selectedChildId, loadData])
  );

  const onRefresh = () => {
    if (selectedChildId) {
      setRefreshing(true);
      loadData(selectedChildId, true);
    }
  };

  // Sorting & Filtering Logic: Ignore "Locked" entirely.
  const processedList = useMemo(() => {
    const actionable = history.filter(p => p.status !== 'Locked');
    if (activeFilter === 'Due') {
      return actionable.filter(p => p.status === 'Due' || p.status === 'Partial');
    } else {
      return actionable.filter(p => p.status === 'Paid' || p.status === 'Partial');
    }
  }, [history, activeFilter]);

  // Summary Logic: Total outstanding for currently due items
  const summary = useMemo(() => {
    const actionable = history.filter(p => p.status !== 'Locked');
    const totalOutstanding = actionable.reduce((acc, p) =>
      p.status !== 'Paid' ? acc + Math.max(0, p.totalAmount - p.paidAmount) : acc, 0);
    return {
      outstanding: totalOutstanding,
      allPaid: totalOutstanding === 0 && actionable.length > 0,
    };
  }, [history]);

  // Removed full-screen ActivityIndicator loading state
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
        {summary.outstanding > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 16, marginBottom: 28 }}>
            <View style={{
              backgroundColor: 'white',
              borderRadius: 28,
              padding: 24,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              shadowColor: '#64748b',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.08,
              shadowRadius: 24,
              elevation: 4,
            }}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                  <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }}>
                    <Wallet size={24} color="#0055d4" strokeWidth={2.5} />
                  </View>
                  <Text style={{ color: '#475569', fontSize: 15, fontWeight: '800' }}>
                    {t.totalDueNow || (isRTL ? 'المبلغ المستحق حالياً' : 'Total Due Now')}
                  </Text>
                </View>
                <View style={{ backgroundColor: '#fef2f2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#fee2e2' }}>
                  <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '800' }}>
                    {isRTL ? 'مطلوب الدفع' : 'To Pay'}
                  </Text>
                </View>
              </View>

              <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', marginTop: 4, paddingHorizontal: 4 }}>
                <Text style={{ color: '#0f172a', fontSize: 52, fontWeight: '900', letterSpacing: -2 }}>
                  {summary.outstanding.toLocaleString()} <Text style={{ fontSize: 24, fontWeight: '700', color: '#94a3b8', letterSpacing: 0 }}>{t.currencyTnd}</Text>
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Filter Tabs */}
        <View style={{ marginBottom: 24, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12 }}>
            {[
              { key: 'Due' as const, label: t.requiredActions || (isRTL ? 'المطلوب سداده' : 'Required Actions'), icon: <AlertCircle size={18} /> },
              { key: 'Paid' as const, label: t.paidHistoryTab || (isRTL ? 'سجل الدفعات' : 'Paid History'), icon: <CheckCircle2 size={18} /> }
            ].map(tab => {
              const isActive = activeFilter === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveFilter(tab.key)}
                  activeOpacity={0.85}
                  style={{
                    flex: 1,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: 14,
                    paddingHorizontal: 8,
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
                  {React.cloneElement(tab.icon, { color: isActive ? '#ffffff' : '#64748b' })}
                  <Text 
                    numberOfLines={1} 
                    adjustsFontSizeToFit
                    style={{ fontSize: 13, fontWeight: '800', color: isActive ? '#ffffff' : '#64748b', flexShrink: 1 }}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Payment History Title */}
        <View style={{ paddingHorizontal: 24, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#1e293b', textAlign: isRTL ? 'right' : 'left' }}>
            {activeFilter === 'Due' ? (t.dueInstallmentsTitle || (isRTL ? 'الأقساط المستحقة' : 'Due Installments')) : (t.paidInstallmentsTitle || (isRTL ? 'الأقساط المدفوعة' : 'Paid Installments'))}
          </Text>
          <View style={{ backgroundColor: '#e0e7ff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#4338ca' }}>
              {new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1}/
              {new Date().getMonth() >= 6 ? new Date().getFullYear() + 1 : new Date().getFullYear()}
            </Text>
          </View>
        </View>

        {/* Payment List */}
        <View style={{ paddingHorizontal: 20 }}>
          {loading && !refreshing ? (
             <View style={{ gap: 16 }}>
               {[1, 2, 3].map(i => (
                 <View key={i} style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.02)' }}>
                   <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start', flex: 1 }}>
                        <SkeletonBlock width={54} height={54} borderRadius={18} style={{ marginRight: isRTL ? 0 : 16, marginLeft: isRTL ? 16 : 0 }} />
                        <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', flex: 1, marginTop: 4 }}>
                          <SkeletonBlock width={120} height={16} marginBottom={8} />
                          <SkeletonBlock width={80} height={14} />
                        </View>
                      </View>
                      <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                         <SkeletonBlock width={90} height={20} marginBottom={12} />
                         <SkeletonBlock width={70} height={24} borderRadius={12} />
                      </View>
                   </View>
                 </View>
               ))}
             </View>
          ) : processedList.length > 0 ? (
            <View style={{ gap: 16 }}>
              {processedList.map((item) => {
                const isPaid = item.status === 'Paid' || (item.status === 'Partial' && activeFilter === 'Paid');
                const isOverdue = item.isOverdue;
                const isPartial = item.status === 'Partial';

                const statusConfig: any = {
                  Paid:    { label: t.paid || 'Paid',        color: '#10b981', bg: '#d1fae5', icon: <CheckCircle2 size={16} color="#10b981" strokeWidth={3} /> },
                  Partial: { label: t.pending || 'Partial',  color: '#f59e0b', bg: '#fef3c7', icon: <Clock size={16} color="#f59e0b" strokeWidth={3} /> },
                  Due:     { label: isOverdue ? (t.overdueBadge || 'Overdue') : (t.pending || 'Pending'), color: isOverdue ? '#ef4444' : '#f59e0b', bg: isOverdue ? '#fee2e2' : '#fef3c7', icon: isOverdue ? <AlertCircle size={16} color="#ef4444" strokeWidth={3} /> : <Clock size={16} color="#f59e0b" strokeWidth={3} /> },
                };
                const config = statusConfig[isPaid ? 'Paid' : item.status] || statusConfig.Due;

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
                      backgroundColor: isPaid ? '#f8fafc' : '#ffffff', 
                      borderRadius: 24,
                      padding: 20,
                      shadowColor: '#000', 
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.06, 
                      shadowRadius: 16, 
                      elevation: 2,
                      borderWidth: isPaid ? 1.5 : 1,
                      borderColor: isPaid ? '#cbd5e1' : 'rgba(0,0,0,0.02)',
                      borderStyle: isPaid ? 'dashed' : 'solid',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Background Paid Watermark */}
                    {isPaid && (
                      <View style={{ position: 'absolute', right: -20, top: 10, opacity: 0.04, transform: [{ rotate: '-15deg' }] }}>
                        <Text style={{ fontSize: 80, fontWeight: '900', color: '#10b981' }}>{t.paidWatermark || (isRTL ? 'خالص' : 'PAID')}</Text>
                      </View>
                    )}

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
                          {isPaid ? (
                            <ReceiptText color={config.color} size={24} strokeWidth={2.5} />
                          ) : (
                            <Calendar color={config.color} size={24} strokeWidth={2.5} />
                          )}
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
                          {activeFilter === 'Due' ? 
                            (isPartial ? Math.max(0, item.totalAmount - item.paidAmount).toLocaleString() : item.totalAmount.toLocaleString())
                          : (isPartial ? item.paidAmount.toLocaleString() : item.totalAmount.toLocaleString())} 
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b' }}> {t.currencyTnd}</Text>
                        </Text>
                        
                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: config.bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, marginTop: 12, gap: 6 }}>
                          {config.icon}
                          <Text style={{ fontSize: 11, fontWeight: '800', color: config.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {config.label}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Paid Actions Footer */}
                    {isPaid && (
                      <>
                        <View style={{ height: 1, backgroundColor: '#e2e8f0', marginVertical: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#e2e8f0' }} />
                        <TouchableOpacity style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 4 }}>
                          <DownloadCloud size={16} color="#0055d4" strokeWidth={2.5} />
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#0055d4' }}>{t.downloadReceiptAction || (isRTL ? 'تحميل الوصل' : 'Download Receipt')}</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 64, backgroundColor: '#ffffff', borderRadius: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 2 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: activeFilter === 'Due' ? '#dcfce7' : '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                {activeFilter === 'Paid' ? (
                  <Wallet size={36} color="#64748b" strokeWidth={2} />
                ) : (
                  <CheckCircle2 size={40} color="#10b981" strokeWidth={2.5} />
                )}
              </View>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', textAlign: 'center', marginBottom: 8 }}>
                {activeFilter === 'Paid' ? (t.noPaidInstallments || (isRTL ? 'لا توجد وصولات مدفوعة' : 'No Paid Installments')) : (t.allCaughtUpState || (isRTL ? 'أنت في السليم!' : 'All Caught Up!'))}
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#94a3b8', textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 }}>
                {activeFilter === 'Paid' ? (t.noPaymentsYet || (isRTL ? 'لم تقم بخلاص أي أقساط بعد.' : 'You haven\'t made any payments yet.')) : (t.noPendingPayments || (isRTL ? 'ليس لديك أي أقساط أو مستحقات متأخرة حالياً.' : 'You have no pending or overdue payments right now.'))}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
