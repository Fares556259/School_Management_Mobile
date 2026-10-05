import React, { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ReceiptText,
  Wallet,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { GlobalHeader } from '../components/GlobalHeader';
import { SkeletonBlock } from '../components/SkeletonView';
import { useLanguage } from '../context/LanguageContext';
import { studentService } from '../services/api';
import { useAppStore } from '../store/useAppStore';

type PaymentFilter = 'Due' | 'Paid';

const MONTHS_AR: Record<string, string> = {
  SEP: 'سبتمبر',
  OCT: 'أكتوبر',
  NOV: 'نوفمبر',
  DEC: 'ديسمبر',
  JAN: 'يناير',
  FEB: 'فبراير',
  MAR: 'مارس',
  APR: 'أبريل',
  MAY: 'ماي',
  JUN: 'جوان',
  JUL: 'جويلية',
  AUG: 'أوت',
};

export const PaymentsScreen = ({ navigation }: any) => {
  const selectedChildId = useAppStore((state) => state.selectedChildId);
  const { t, isRTL, language } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<PaymentFilter>('Due');

  const {
    data: history = [],
    isLoading: loading,
    isRefetching: refreshing,
    refetch,
  } = useQuery({
    queryKey: ['payments', selectedChildId],
    queryFn: () => studentService.fetchPayments(selectedChildId!, false),
    enabled: Boolean(selectedChildId),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const actionablePayments = useMemo(
    () => history.filter((payment) => payment.status !== 'Locked'),
    [history],
  );

  const duePayments = useMemo(
    () => actionablePayments.filter((payment) => payment.status === 'Due' || payment.status === 'Partial'),
    [actionablePayments],
  );

  const paidPayments = useMemo(
    () => actionablePayments.filter((payment) => payment.status === 'Paid' || payment.status === 'Partial'),
    [actionablePayments],
  );

  const processedList = activeFilter === 'Due' ? duePayments : paidPayments;

  const summary = useMemo(() => {
    const outstanding = duePayments.reduce(
      (total, payment) => total + Math.max(0, payment.totalAmount - payment.paidAmount),
      0,
    );
    return {
      outstanding,
      overdueCount: duePayments.filter((payment) => payment.isOverdue).length,
      dueCount: duePayments.length,
    };
  }, [duePayments]);

  const schoolYear = useMemo(() => {
    const now = new Date();
    const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    return `${startYear}/${startYear + 1}`;
  }, []);

  const onRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const paymentCountLabel = useMemo(() => {
    const count = summary.overdueCount || summary.dueCount;
    if (summary.overdueCount > 0) {
      if (language === 'ar') return `${count} ${count === 1 ? 'قسط متأخر' : 'أقساط متأخرة'}`;
      if (language === 'en') return `${count} overdue ${count === 1 ? 'payment' : 'payments'}`;
      return `${count} ${count === 1 ? 'paiement en retard' : 'paiements en retard'}`;
    }
    if (language === 'ar') return `${count} ${count === 1 ? 'قسط للدفع' : 'أقساط للدفع'}`;
    if (language === 'en') return `${count} ${count === 1 ? 'payment' : 'payments'} to settle`;
    return `${count} ${count === 1 ? 'paiement à régler' : 'paiements à régler'}`;
  }, [language, summary.dueCount, summary.overdueCount]);

  const formatAmount = (amount: number) => Math.max(0, amount).toLocaleString();

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F8FC" />
      <GlobalHeader navigation={navigation} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#075ED1" />}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.summaryWrap}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.summaryHeading, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.summaryIcon}>
                  <Wallet size={20} color="#075ED1" strokeWidth={2.4} />
                </View>
                <Text style={[styles.summaryLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {t.totalDueNow}
                </Text>
              </View>
              {summary.dueCount > 0 && (
                <View style={[styles.countBadge, summary.overdueCount > 0 && styles.countBadgeDanger]}>
                  <Text style={[styles.countBadgeText, summary.overdueCount > 0 && styles.countBadgeTextDanger]}>
                    {paymentCountLabel}
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.amountRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.summaryAmount}>{formatAmount(summary.outstanding)}</Text>
              <Text style={styles.summaryCurrency}>{t.currencyTnd}</Text>
            </View>
            <Text style={[styles.summaryHint, { textAlign: isRTL ? 'right' : 'left' }]}>
              {summary.outstanding > 0
                ? language === 'ar'
                  ? 'الرصيد المتبقي المسجل لدى المدرسة'
                  : language === 'en'
                    ? 'Outstanding balance recorded by the school'
                    : 'Solde restant enregistré par l’école'
                : language === 'ar'
                  ? 'لا توجد مستحقات حالياً'
                  : language === 'en'
                    ? 'No outstanding balance right now'
                    : 'Aucun solde à régler actuellement'}
            </Text>
          </View>
        </View>

        <View style={styles.filtersWrap}>
          <View style={[styles.segmentedControl, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {[
              { key: 'Due' as const, label: t.requiredActions, count: duePayments.length, Icon: AlertCircle },
              { key: 'Paid' as const, label: t.paidHistoryTab, count: paidPayments.length, Icon: CheckCircle2 },
            ].map(({ key, label, count, Icon }) => {
              const selected = activeFilter === key;
              return (
                <TouchableOpacity
                  key={key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => setActiveFilter(key)}
                  activeOpacity={0.75}
                  style={[styles.segment, selected && styles.segmentActive]}
                >
                  <View style={[styles.segmentContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Icon size={17} color={selected ? '#075ED1' : '#64748B'} strokeWidth={2.2} />
                    <Text style={[styles.segmentLabel, selected && styles.segmentLabelActive]} numberOfLines={1}>
                      {label}
                    </Text>
                    <View style={[styles.segmentCount, selected && styles.segmentCountActive]}>
                      <Text style={[styles.segmentCountText, selected && styles.segmentCountTextActive]}>{count}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {activeFilter === 'Due' ? t.dueInstallmentsTitle : t.paidInstallmentsTitle}
            </Text>
            <Text style={[styles.sectionSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {language === 'ar' ? `السنة الدراسية ${schoolYear}` : language === 'en' ? `School year ${schoolYear}` : `Année scolaire ${schoolYear}`}
            </Text>
          </View>
          <View style={styles.yearBadge}>
            <Text style={styles.yearBadgeText}>{schoolYear}</Text>
          </View>
        </View>

        <View style={styles.listWrap}>
          {loading && !refreshing ? (
            <View style={styles.listGap}>
              {[1, 2].map((item) => (
                <View key={item} style={styles.paymentCard}>
                  <View style={[styles.cardTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <SkeletonBlock width={46} height={46} borderRadius={14} />
                    <View style={styles.skeletonCopy}>
                      <SkeletonBlock width={135} height={16} marginBottom={9} />
                      <SkeletonBlock width={90} height={13} />
                    </View>
                    <SkeletonBlock width={76} height={20} />
                  </View>
                </View>
              ))}
            </View>
          ) : processedList.length > 0 ? (
            <View style={styles.listGap}>
              {processedList.map((item) => {
                const showingPaid = activeFilter === 'Paid';
                const isPartial = item.status === 'Partial';
                const isPaid = item.status === 'Paid' || (isPartial && showingPaid);
                const isOverdue = item.isOverdue && !showingPaid;
                const statusColor = isPaid ? '#07865C' : isOverdue ? '#DC2626' : '#B45309';
                const statusBackground = isPaid ? '#E8F8F1' : isOverdue ? '#FEF2F2' : '#FFF7E6';
                const statusLabel = isPaid
                  ? t.paid
                  : isPartial
                    ? language === 'ar'
                      ? 'مدفوع جزئياً'
                      : language === 'en'
                        ? 'Partially paid'
                        : 'Partiellement payé'
                    : isOverdue
                      ? t.overdueBadge
                      : t.pending;
                const [monthName = '', year = ''] = item.month.split(' ');
                const shortMonth = monthName.slice(0, 3).toUpperCase();
                const displayMonth = isRTL ? MONTHS_AR[shortMonth] || shortMonth : shortMonth;
                const displayedAmount = showingPaid
                  ? isPartial
                    ? item.paidAmount
                    : item.totalAmount
                  : Math.max(0, item.totalAmount - item.paidAmount);
                const paidRatio = item.totalAmount > 0
                  ? Math.min(100, Math.round((item.paidAmount / item.totalAmount) * 100))
                  : 0;

                return (
                  <View key={`${item.id}-${item.month}-${activeFilter}`} style={styles.paymentCard}>
                    <View style={[styles.cardTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={[styles.cardIdentity, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={[styles.paymentIcon, { backgroundColor: statusBackground }]}>
                          {isPaid ? (
                            <ReceiptText size={22} color={statusColor} strokeWidth={2.3} />
                          ) : (
                            <Calendar size={22} color={statusColor} strokeWidth={2.3} />
                          )}
                        </View>
                        <View style={styles.cardCopy}>
                          <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
                            {t.tuitionFees}
                          </Text>
                          <Text style={[styles.cardMonth, { color: statusColor, textAlign: isRTL ? 'right' : 'left' }]}>
                            {displayMonth} {year}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.cardAmountWrap, { alignItems: isRTL ? 'flex-start' : 'flex-end' }]}>
                        <Text style={styles.cardAmount}>
                          {formatAmount(displayedAmount)} <Text style={styles.cardCurrency}>{t.currencyTnd}</Text>
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusBackground, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          {isPaid ? (
                            <CheckCircle2 size={13} color={statusColor} strokeWidth={2.8} />
                          ) : isOverdue ? (
                            <AlertCircle size={13} color={statusColor} strokeWidth={2.8} />
                          ) : (
                            <Clock size={13} color={statusColor} strokeWidth={2.8} />
                          )}
                          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                        </View>
                      </View>
                    </View>

                    {isOverdue && (
                      <View style={[styles.noticeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <AlertCircle size={15} color="#DC2626" strokeWidth={2.2} />
                        <Text style={[styles.noticeText, { textAlign: isRTL ? 'right' : 'left' }]}>
                          {t.overdueDays} {item.overdueDays || 0} {t.daysLabel}
                        </Text>
                      </View>
                    )}

                    {isPartial && !showingPaid && (
                      <View style={styles.progressSection}>
                        <View style={[styles.progressLabels, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <Text style={styles.progressLabel}>{t.totalPaid}: {formatAmount(item.paidAmount)} {t.currencyTnd}</Text>
                          <Text style={styles.progressValue}>{paidRatio}%</Text>
                        </View>
                        <View style={styles.progressTrack}>
                          <View style={[styles.progressFill, { width: `${paidRatio}%` }]} />
                        </View>
                      </View>
                    )}

                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, activeFilter === 'Due' && styles.emptyIconSuccess]}>
                {activeFilter === 'Paid' ? (
                  <ReceiptText size={30} color="#64748B" strokeWidth={2} />
                ) : (
                  <CheckCircle2 size={32} color="#07865C" strokeWidth={2.3} />
                )}
              </View>
              <Text style={styles.emptyTitle}>
                {activeFilter === 'Paid' ? t.noPaidInstallments : t.allCaughtUpState}
              </Text>
              <Text style={styles.emptyText}>
                {activeFilter === 'Paid' ? t.noPaymentsYet : t.noPendingPayments}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F8FC',
  },
  scrollContent: {
    paddingBottom: 112,
  },
  summaryWrap: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#075ED1',
    shadowColor: '#075ED1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  summaryTop: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  summaryHeading: {
    minWidth: 0,
    flex: 1,
    alignItems: 'center',
    gap: 9,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  countBadge: {
    maxWidth: '48%',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  countBadgeDanger: {
    backgroundColor: '#FFFFFF',
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  countBadgeTextDanger: {
    color: '#C62828',
  },
  amountRow: {
    marginTop: 20,
    alignItems: 'baseline',
    gap: 8,
  },
  summaryAmount: {
    color: '#FFFFFF',
    fontSize: 39,
    lineHeight: 45,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  summaryCurrency: {
    color: '#CFE2FF',
    fontSize: 16,
    fontWeight: '800',
  },
  summaryHint: {
    marginTop: 4,
    color: '#DCEAFF',
    fontSize: 11.5,
    fontWeight: '600',
  },
  filtersWrap: {
    paddingHorizontal: 20,
    marginTop: 18,
  },
  segmentedControl: {
    padding: 4,
    borderRadius: 16,
    backgroundColor: '#E9EEF6',
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 8,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  segmentContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  segmentLabel: {
    flexShrink: 1,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  segmentLabelActive: {
    color: '#0F3E7A',
    fontWeight: '800',
  },
  segmentCount: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: '#DCE3ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentCountActive: {
    backgroundColor: '#E8F2FF',
  },
  segmentCountText: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '900',
  },
  segmentCountTextActive: {
    color: '#075ED1',
  },
  sectionHeader: {
    paddingHorizontal: 22,
    marginTop: 24,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    color: '#17243B',
    fontSize: 19,
    fontWeight: '900',
  },
  sectionSubtitle: {
    marginTop: 3,
    color: '#7C8AA5',
    fontSize: 11.5,
    fontWeight: '600',
  },
  yearBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  yearBadgeText: {
    color: '#4F46E5',
    fontSize: 11.5,
    fontWeight: '800',
  },
  listWrap: {
    paddingHorizontal: 20,
  },
  listGap: {
    gap: 12,
  },
  paymentCard: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4EAF2',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.045,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTop: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardIdentity: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 11,
  },
  paymentIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    color: '#17243B',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
  },
  cardMonth: {
    marginTop: 4,
    fontSize: 11.5,
    fontWeight: '800',
  },
  cardAmountWrap: {
    flexShrink: 0,
  },
  cardAmount: {
    color: '#17243B',
    fontSize: 18,
    fontWeight: '900',
  },
  cardCurrency: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '800',
  },
  statusBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 9.5,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  noticeRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4EAF2',
    alignItems: 'center',
    gap: 7,
  },
  noticeText: {
    flex: 1,
    color: '#B42318',
    fontSize: 11.5,
    fontWeight: '700',
  },
  progressSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4EAF2',
  },
  progressLabels: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '700',
  },
  progressValue: {
    color: '#075ED1',
    fontSize: 10.5,
    fontWeight: '900',
  },
  progressTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: '#E8EDF4',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#075ED1',
  },
  skeletonCopy: {
    flex: 1,
    marginTop: 3,
  },
  emptyState: {
    paddingHorizontal: 28,
    paddingVertical: 46,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4EAF2',
    alignItems: 'center',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    marginBottom: 16,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconSuccess: {
    backgroundColor: '#E8F8F1',
  },
  emptyTitle: {
    color: '#17243B',
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyText: {
    maxWidth: 290,
    marginTop: 7,
    color: '#7C8AA5',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    textAlign: 'center',
  },
});
