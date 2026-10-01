import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
  Linking,
  Modal,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  GraduationCap,
  Users,
  Building2,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Bot,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Calendar,
  Search,
  Phone,
  MessageCircle,
  X,
  Check,
  HandCoins,
  CreditCard,
  Briefcase,
  User,
  Wallet,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { adminService } from '../../services/api';
import { trackEvent } from '../../services/posthog';

interface UnpaidItem {
  id: string;
  type: 'student' | 'teacher' | 'staff';
  name: string;
  phone?: string;
  className?: string;
  parentName?: string;
  parentPhone?: string;
  fullFee?: number;
  paidAmount?: number;
  dueAmount: number;
  status: string;
  role?: string;
  baseSalary?: number;
  hourlyRate?: number;
  advanceAmount?: number;
  missedHours?: number;
  deduction?: number;
}

interface DashboardData {
  adminName: string;
  schoolName: string;
  monthLabel: string;
  selectedMonth: number;
  selectedYear: number;
  operations: {
    students: number;
    teachers: number;
    staff: number;
    classes: number;
  };
  financialPulse: {
    collectedTuition: number;
    expectedTuition: number;
    remainingToCollect: number;
    collectionRate: number;
    monthLabel: string;
  };
  unpaidSummary?: {
    unpaidStudentsCount: number;
    unpaidStudentsTotal: number;
    unpaidEmployeesCount: number;
    unpaidEmployeesTotal: number;
    totalUnpaidCount: number;
    totalUnpaidAmount: number;
  };
  allUnpaid?: UnpaidItem[];
  attendanceToday: {
    attendanceRate: number;
    absentCount: number;
    totalRecorded: number;
    recentAbsentees: {
      id: number;
      studentName: string;
      className: string;
      time: string;
    }[];
  };
  notices: {
    id: number;
    title: string;
    message: string;
    date: string;
    important: boolean;
  }[];
}

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0);

  const now = new Date();
  const currentMonthNum = now.getMonth() + 1;
  const currentYearNum = now.getFullYear();

  const selectedMonth = currentMonthNum;
  const selectedYear = currentYearNum;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);

  // Unpaid section filtering state
  const [unpaidCategory, setUnpaidCategory] = useState<'STUDENT' | 'TEACHER' | 'STAFF' | 'ALL'>('STUDENT');
  const [unpaidSearch, setUnpaidSearch] = useState('');

  // Payment / Collection Modal State
  const [payModalItem, setPayModalItem] = useState<UnpaidItem | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'Espèces' | 'Chèque' | 'Virement'>('Espèces');
  const [submittingPay, setSubmittingPay] = useState(false);

  // Custom Feedback Modal
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  // ── DATA FETCHING ──────────────────────────────────────────────────────────
  const loadDashboard = useCallback(async (m?: number, y?: number, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    const targetM = m !== undefined ? m : selectedMonth;
    const targetY = y !== undefined ? y : selectedYear;
    try {
      const res = await adminService.fetchDashboard(targetM, targetY);
      if (res && res.success) {
        setData(res.data || res);
      }
    } catch (err: any) {
      console.warn('[AdminDashboard] Fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadDashboard(selectedMonth, selectedYear);
  }, [loadDashboard, selectedMonth, selectedYear]);

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    loadDashboard(selectedMonth, selectedYear, true);
  }, [loadDashboard, selectedMonth, selectedYear]);

  // ── UNPAID DATA DERIVATION ────────────────────────────────────────────────
  const allUnpaid = useMemo(() => {
    return data?.allUnpaid || [];
  }, [data]);

  const studentItems = useMemo(() => {
    return allUnpaid.filter((item) => item.type === 'student');
  }, [allUnpaid]);

  const teacherItems = useMemo(() => {
    return allUnpaid.filter((item) => item.type === 'teacher');
  }, [allUnpaid]);

  const staffItems = useMemo(() => {
    return allUnpaid.filter((item) => item.type === 'staff');
  }, [allUnpaid]);

  const unpaidStudentsCount = data?.unpaidSummary?.unpaidStudentsCount ?? studentItems.length;
  const unpaidStudentsTotal = data?.unpaidSummary?.unpaidStudentsTotal ?? studentItems.reduce((acc, curr) => acc + curr.dueAmount, 0);
  const unpaidEmployeesCount = data?.unpaidSummary?.unpaidEmployeesCount ?? (teacherItems.length + staffItems.length);
  const unpaidEmployeesTotal = data?.unpaidSummary?.unpaidEmployeesTotal ?? (teacherItems.reduce((acc, curr) => acc + curr.dueAmount, 0) + staffItems.reduce((acc, curr) => acc + curr.dueAmount, 0));

  const filteredUnpaid = useMemo(() => {
    let list: UnpaidItem[] = [];
    if (unpaidCategory === 'STUDENT') list = studentItems;
    else if (unpaidCategory === 'TEACHER') list = teacherItems;
    else if (unpaidCategory === 'STAFF') list = staffItems;
    else list = allUnpaid;

    if (!unpaidSearch.trim()) return list;

    const q = unpaidSearch.toLowerCase().trim();
    return list.filter((item) => {
      const matchName = item.name.toLowerCase().includes(q);
      const matchClass = item.className ? item.className.toLowerCase().includes(q) : false;
      const matchParent = item.parentName ? item.parentName.toLowerCase().includes(q) : false;
      const matchRole = item.role ? item.role.toLowerCase().includes(q) : false;
      return matchName || matchClass || matchParent || matchRole;
    });
  }, [unpaidCategory, studentItems, teacherItems, staffItems, allUnpaid, unpaidSearch]);

  // ── CONTACT ACTIONS ────────────────────────────────────────────────────────
  const handleCall = (phoneNumber?: string, contactName?: string) => {
    if (!phoneNumber) {
      setFeedback({
        type: 'error',
        title: 'Numéro indisponible',
        message: `Aucun numéro de téléphone enregistré pour ${contactName || 'ce contact'}.`,
      });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    trackEvent('admin_call_initiated', { contactName });
    Linking.openURL(`tel:${phoneNumber.replace(/\s+/g, '')}`).catch(() => {
      setFeedback({
        type: 'error',
        title: 'Appel impossible',
        message: "L'application Téléphone n'a pas pu être ouverte.",
      });
    });
  };

  const handleWhatsAppStudent = (parentPhone?: string, studentName?: string, dueAmount?: number) => {
    if (!parentPhone) {
      setFeedback({
        type: 'error',
        title: 'Numéro indisponible',
        message: `Aucun numéro de parent enregistré pour ${studentName || 'cet élève'}.`,
      });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const cleanPhone = parentPhone.replace(/[^0-9]/g, '');
    const message = `Bonjour, nous vous contactons depuis l'administration de ${data?.schoolName || 'notre établissement'} concernant les frais de scolarité de ${studentName || 'votre enfant'}. Il reste un montant dû de ${dueAmount || 0} DT pour le mois en cours. Merci de bien vouloir régulariser auprès de l'administration. Cordialement.`;
    const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;

    trackEvent('admin_whatsapp_reminder_sent', {
      studentName,
      dueAmount,
      month: selectedMonth,
      year: selectedYear,
    });

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          return Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`);
        }
      })
      .catch(() => {
        setFeedback({
          type: 'error',
          title: 'WhatsApp non disponible',
          message: "L'application WhatsApp n'est pas installée sur cet appareil.",
        });
      });
  };

  // ── QUICK PAY / COLLECT MODAL ──────────────────────────────────────────────
  const openPayModal = (item: UnpaidItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPayModalItem(item);
    setPayAmount(item.dueAmount > 0 ? item.dueAmount.toString() : (item.fullFee || item.baseSalary || 100).toString());
    setPayMethod('Espèces');
  };

  const handleConfirmPayment = async () => {
    if (!payModalItem) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      setFeedback({
        type: 'error',
        title: 'Montant invalide',
        message: 'Veuillez saisir un montant positif valide.',
      });
      return;
    }

    setSubmittingPay(true);
    try {
      if (payModalItem.type === 'student') {
        const res = await adminService.collectStudentPayment({
          studentId: payModalItem.id,
          amount: amt,
          paymentMethod: payMethod,
          month: selectedMonth,
          year: selectedYear,
        });
        if (res && res.success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          trackEvent('tuition_payment_collected', {
            amount: amt,
            paymentMethod: payMethod,
            month: selectedMonth,
            year: selectedYear,
            studentId: payModalItem.id,
            studentName: payModalItem.name,
          });
          setPayModalItem(null);
          setFeedback({
            type: 'success',
            title: 'Encaissement validé !',
            message: res.message || `✓ Encaissé ${amt} DT pour ${payModalItem.name}.`,
          });
          loadDashboard(selectedMonth, selectedYear, true);
        } else {
          throw new Error(res?.error || "Échec de l'encaissement");
        }
      } else {
        const res = await adminService.paySalary({
          recipientId: payModalItem.id,
          recipientType: payModalItem.type,
          amount: amt,
          month: selectedMonth,
          year: selectedYear,
          paymentMethod: payMethod,
        });
        if (res && res.success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          trackEvent('salary_payment_disbursed', {
            amount: amt,
            paymentMethod: payMethod,
            month: selectedMonth,
            year: selectedYear,
            recipientType: payModalItem.type,
            recipientName: payModalItem.name,
          });
          setPayModalItem(null);
          setFeedback({
            type: 'success',
            title: 'Rémunération validée !',
            message: res.message || `✓ Rémunération de ${amt} DT versée à ${payModalItem.name}.`,
          });
          loadDashboard(selectedMonth, selectedYear, true);
        } else {
          throw new Error(res?.error || 'Échec du versement');
        }
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        title: 'Erreur',
        message: err.message || 'Une erreur est survenue.',
      });
    } finally {
      setSubmittingPay(false);
    }
  };

  const todayDateStr = new Date().toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc', paddingTop: topPadding }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" translucent={Platform.OS === 'android'} />

      {/* ── HEADER (AIRY, CLEAN & EXECUTIVE) ─────────────────────────────────── */}
      <View style={styles.headerContainer}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          {/* Subtitle: School & Date */}
          <View style={styles.headerSubtitleRow}>
            <Building2 size={13} color="#0055d4" />
            <Text style={styles.headerSchoolName} numberOfLines={1}>
              {data?.schoolName || 'SnapSchool'}
            </Text>
            <Text style={styles.headerDot}>•</Text>
            <Text style={styles.headerDate}>{todayDateStr}</Text>
          </View>
          {/* Main Greeting */}
          <Text style={styles.headerGreeting} numberOfLines={1}>
            Bonjour, {data?.adminName || 'Direction'} 👋
          </Text>
        </View>

        <TouchableOpacity
          onPress={onRefresh}
          activeOpacity={0.7}
          style={styles.refreshButton}
        >
          <RefreshCw size={15} color="#0055d4" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 50 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0055d4']} />}
        showsVerticalScrollIndicator={false}
      >
        {loading && !data ? (
          <View style={{ paddingVertical: 70, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#0055d4" />
            <Text style={{ fontSize: 14, color: '#64748b', marginTop: 14, fontWeight: '500' }}>
              Chargement du tableau de bord...
            </Text>
          </View>
        ) : (
          <>
            {/* ── 1. 2x2 OPERATIONS GRID (AIRY, ROOM TO BREATHE) ──────────────── */}
            <View style={styles.statsGrid}>
              {/* Élèves */}
              <View style={styles.statCard}>
                <View style={[styles.statIconBox, { backgroundColor: '#eff6ff' }]}>
                  <GraduationCap size={18} color="#0055d4" />
                </View>
                <View style={styles.statTextBox}>
                  <Text style={styles.statNumber}>
                    {data?.operations.students.toLocaleString() || 0}
                  </Text>
                  <Text style={styles.statLabel}>Élèves inscrits</Text>
                </View>
              </View>

              {/* Profs */}
              <View style={styles.statCard}>
                <View style={[styles.statIconBox, { backgroundColor: '#ecfdf5' }]}>
                  <Users size={18} color="#059669" />
                </View>
                <View style={styles.statTextBox}>
                  <Text style={styles.statNumber}>
                    {data?.operations.teachers.toLocaleString() || 0}
                  </Text>
                  <Text style={styles.statLabel}>Enseignants</Text>
                </View>
              </View>

              {/* Classes */}
              <View style={styles.statCard}>
                <View style={[styles.statIconBox, { backgroundColor: '#fef9c3' }]}>
                  <Building2 size={18} color="#ca8a04" />
                </View>
                <View style={styles.statTextBox}>
                  <Text style={styles.statNumber}>
                    {data?.operations.classes.toLocaleString() || 0}
                  </Text>
                  <Text style={styles.statLabel}>Classes</Text>
                </View>
              </View>

              {/* Personnel */}
              <View style={styles.statCard}>
                <View style={[styles.statIconBox, { backgroundColor: '#f5f3ff' }]}>
                  <Briefcase size={18} color="#7c3aed" />
                </View>
                <View style={styles.statTextBox}>
                  <Text style={styles.statNumber}>
                    {data?.operations.staff.toLocaleString() || 0}
                  </Text>
                  <Text style={styles.statLabel}>Personnel</Text>
                </View>
              </View>
            </View>

            {/* ── 2. RECOUVREMENT SCOLARITÉS (CLEAN & NON-TRUNCATED) ──────────── */}
            <View style={styles.financialCard}>
              <View style={styles.financialHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <View style={styles.financialIconBox}>
                    <TrendingUp size={16} color="#0055d4" />
                  </View>
                  <Text style={styles.financialTitle} numberOfLines={1}>
                    Recouvrement {data?.financialPulse?.monthLabel ? `• ${data.financialPulse.monthLabel}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Caisse')}
                  activeOpacity={0.7}
                  style={styles.caisseButton}
                >
                  <Text style={styles.caisseButtonText}>Caisse</Text>
                  <ChevronRight size={13} color="#0055d4" />
                </TouchableOpacity>
              </View>

              {/* Amount collected vs expected */}
              <View style={styles.financialAmountsRow}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Text style={styles.financialBigNumber}>
                    {data?.financialPulse.collectedTuition.toLocaleString() || 0} DT
                  </Text>
                  <Text style={styles.financialSubtext}>encaissés</Text>
                </View>
                <Text style={styles.financialExpectedText}>
                  sur {data?.financialPulse.expectedTuition.toLocaleString() || 0} DT
                </Text>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, data?.financialPulse.collectionRate || 0)}%`,
                      backgroundColor:
                        (data?.financialPulse.collectionRate || 0) >= 80 ? '#10b981' : '#0055d4',
                    },
                  ]}
                />
              </View>

              {/* Bottom stats row */}
              <View style={styles.financialBottomRow}>
                <View style={styles.ratePill}>
                  <Text style={styles.ratePillText}>
                    {data?.financialPulse.collectionRate || 0}% collecté
                  </Text>
                </View>
                <View style={styles.remainingPill}>
                  <Text style={styles.remainingPillText}>
                    Reste : {data?.financialPulse.remainingToCollect.toLocaleString() || 0} DT
                  </Text>
                </View>
              </View>
            </View>

            {/* ── 3. ATTENDANCE PULSE TODAY ─────────────────────────────────── */}
            <View style={styles.attendanceCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.attendanceIconBox}>
                    <CheckCircle2 size={16} color="#059669" />
                  </View>
                  <Text style={styles.attendanceTitle}>Présence aujourd'hui</Text>
                </View>
                <View
                  style={[
                    styles.attendanceRatePill,
                    {
                      backgroundColor:
                        data?.attendanceToday.absentCount === 0 ? '#ecfdf5' : '#fff1f2',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.attendanceRateText,
                      {
                        color:
                          data?.attendanceToday.absentCount === 0 ? '#059669' : '#e11d48',
                      },
                    ]}
                  >
                    {data?.attendanceToday.attendanceRate || 98}% de présence
                  </Text>
                </View>
              </View>

              {data?.attendanceToday.recentAbsentees && data.attendanceToday.recentAbsentees.length > 0 ? (
                <View style={styles.absenteesContainer}>
                  {data.attendanceToday.recentAbsentees.map((a) => (
                    <View key={a.id} style={styles.absenteeTag}>
                      <Text style={styles.absenteeName}>{a.studentName}</Text>
                      <Text style={styles.absenteeClass}>({a.className})</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            {/* ── 4. SUIVI DES IMPAYÉS & SALAIRES (OPEN, AIRY & ELEGANT) ───────── */}
            <View style={styles.unpaidSection}>
              {/* Section Header */}
              <View style={styles.unpaidHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <Wallet size={16} color="#0055d4" />
                  <Text style={styles.unpaidTitle}>Impayés & Salaires dus</Text>
                </View>
                <View style={styles.unpaidTotalBadge}>
                  <Text style={styles.unpaidTotalBadgeText}>
                    {(unpaidStudentsTotal + unpaidEmployeesTotal).toLocaleString()} DT total
                  </Text>
                </View>
              </View>

              {/* Dual Stat Ribbon */}
              <View style={styles.dualRibbon}>
                <View style={styles.ribbonItem}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.ribbonLabel}>Scolarités dues</Text>
                    <View style={styles.ribbonCountPillGreen}>
                      <Text style={styles.ribbonCountTextGreen}>{unpaidStudentsCount}</Text>
                    </View>
                  </View>
                  <Text style={styles.ribbonAmount}>
                    {unpaidStudentsTotal.toLocaleString()} DT
                  </Text>
                </View>

                <View style={styles.ribbonItem}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.ribbonLabel}>Salaires dus</Text>
                    <View style={styles.ribbonCountPillPurple}>
                      <Text style={styles.ribbonCountTextPurple}>{unpaidEmployeesCount}</Text>
                    </View>
                  </View>
                  <Text style={styles.ribbonAmount}>
                    {unpaidEmployeesTotal.toLocaleString()} DT
                  </Text>
                </View>
              </View>

              {/* Integrated Search Input */}
              <View style={styles.searchContainer}>
                <Search size={14} color="#94a3b8" />
                <TextInput
                  value={unpaidSearch}
                  onChangeText={setUnpaidSearch}
                  placeholder="Rechercher élève, classe, prof..."
                  placeholderTextColor="#94a3b8"
                  style={styles.searchInput}
                />
                {unpaidSearch ? (
                  <TouchableOpacity onPress={() => setUnpaidSearch('')}>
                    <X size={14} color="#94a3b8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Segmented Category Filter Tabs */}
              <View style={styles.tabsContainer}>
                {[
                  { key: 'STUDENT', label: 'Élèves', count: studentItems.length },
                  { key: 'TEACHER', label: 'Profs', count: teacherItems.length },
                  { key: 'STAFF', label: 'Staff', count: staffItems.length },
                  { key: 'ALL', label: 'Tous', count: allUnpaid.length },
                ].map((tab) => {
                  const isActive = unpaidCategory === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setUnpaidCategory(tab.key as any);
                      }}
                      style={[
                        styles.tabButton,
                        isActive && styles.tabButtonActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tabText,
                          isActive && styles.tabTextActive,
                        ]}
                      >
                        {tab.label}
                      </Text>
                      <View
                        style={[
                          styles.tabCountBadge,
                          isActive && styles.tabCountBadgeActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tabCountText,
                            isActive && styles.tabCountTextActive,
                          ]}
                        >
                          {tab.count}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Student / Staff List Items */}
              {filteredUnpaid.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <CheckCircle2 size={30} color="#10b981" />
                  <Text style={styles.emptyTitle}>Tout est à jour !</Text>
                  <Text style={styles.emptySubtitle}>
                    Aucun impayé trouvé pour cette sélection.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {filteredUnpaid.map((item) => {
                    const isStudent = item.type === 'student';
                    const isTeacher = item.type === 'teacher';
                    const isStaff = item.type === 'staff';

                    return (
                      <View
                        key={`${item.type}_${item.id}`}
                        style={styles.unpaidCard}
                      >
                        <View style={styles.unpaidCardTopRow}>
                          {/* Avatar + Info */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 8 }}>
                            <View
                              style={[
                                styles.unpaidAvatar,
                                {
                                  backgroundColor: isStudent ? '#ecfdf5' : isTeacher ? '#eff6ff' : '#f5f3ff',
                                },
                              ]}
                            >
                              {isStudent ? (
                                <GraduationCap size={17} color="#059669" />
                              ) : isTeacher ? (
                                <User size={17} color="#0055d4" />
                              ) : (
                                <Briefcase size={17} color="#7c3aed" />
                              )}
                            </View>

                            <View style={{ flex: 1 }}>
                              <Text style={styles.unpaidPersonName} numberOfLines={1}>
                                {item.name}
                              </Text>
                              <View style={styles.unpaidMetaRow}>
                                {item.className ? (
                                  <View style={styles.classBadge}>
                                    <Text style={styles.classBadgeText}>{item.className}</Text>
                                  </View>
                                ) : null}
                                {isTeacher ? (
                                  <View style={styles.teacherBadge}>
                                    <Text style={styles.teacherBadgeText}>Enseignant</Text>
                                  </View>
                                ) : null}
                                {isStaff ? (
                                  <View style={styles.staffBadge}>
                                    <Text style={styles.staffBadgeText}>Personnel</Text>
                                  </View>
                                ) : null}
                                {item.parentName ? (
                                  <Text style={styles.parentNameText} numberOfLines={1}>
                                    • {item.parentName}
                                  </Text>
                                ) : null}
                              </View>
                            </View>
                          </View>

                          {/* Amount Due */}
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.dueAmountText, { color: isStudent ? '#dc2626' : '#0f172a' }]}>
                              {item.dueAmount} DT
                            </Text>
                            {isStudent && item.status === 'PARTIAL' && (
                              <Text style={styles.partialBadgeText}>
                                Acompte {item.paidAmount} DT
                              </Text>
                            )}
                          </View>
                        </View>

                        {/* Action Buttons Row */}
                        <View style={styles.unpaidActionsRow}>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            {/* Phone Call */}
                            <TouchableOpacity
                              onPress={() => handleCall(isStudent ? item.parentPhone : item.phone, item.name)}
                              style={styles.actionCircleButton}
                              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                            >
                              <Phone size={13} color="#475569" />
                            </TouchableOpacity>

                            {/* WhatsApp (Students) */}
                            {isStudent && (
                              <TouchableOpacity
                                onPress={() => handleWhatsAppStudent(item.parentPhone, item.name, item.dueAmount)}
                                style={styles.actionWhatsAppButton}
                                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                              >
                                <MessageCircle size={14} color="#059669" />
                              </TouchableOpacity>
                            )}
                          </View>

                          {/* Collect / Pay Primary Button */}
                          <TouchableOpacity
                            onPress={() => openPayModal(item)}
                            activeOpacity={0.85}
                            style={[
                              styles.primaryActionButton,
                              { backgroundColor: isStudent ? '#059669' : '#0055d4' },
                            ]}
                          >
                            {isStudent ? (
                              <>
                                <HandCoins size={13} color="#ffffff" />
                                <Text style={styles.primaryActionButtonText}>Encaisser</Text>
                              </>
                            ) : (
                              <>
                                <CreditCard size={13} color="#ffffff" />
                                <Text style={styles.primaryActionButtonText}>Payer</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* ── 5. HNIA CO-PILOT CARD ─────────────────────────────────────── */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Hnia')}
              activeOpacity={0.9}
              style={styles.hniaCopilotCard}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 10 }}>
                  <View style={styles.hniaAvatarBox}>
                    <Bot size={22} color="#0055d4" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Text style={styles.hniaTitle}>Hnia IA • Assistante</Text>
                      <Sparkles size={13} color="#0055d4" />
                    </View>
                    <Text style={styles.hniaSubtitle}>
                      Pilotage vocal, gestion de caisse et bilans en direct.
                    </Text>
                  </View>
                </View>
                <View style={styles.hniaOpenButton}>
                  <Text style={styles.hniaOpenButtonText}>Ouvrir</Text>
                  <ArrowRight size={12} color="#ffffff" />
                </View>
              </View>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* ── QUICK PAYMENT / COLLECTION MODAL ─────────────────────────────────── */}
      <Modal
        visible={Boolean(payModalItem)}
        transparent
        animationType="fade"
        onRequestClose={() => setPayModalItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalHeaderTitle}>
                  {payModalItem?.type === 'student' ? 'Encaisser la scolarité' : 'Verser la rémunération'}
                </Text>
                <Text style={styles.modalHeaderSub}>
                  {data?.monthLabel || 'Ce mois'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPayModalItem(null)}
                style={styles.modalCloseButton}
              >
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Beneficiary Card */}
            <View style={styles.modalBeneficiaryBox}>
              <Text style={styles.modalBeneficiaryName}>{payModalItem?.name}</Text>
              <Text style={styles.modalBeneficiaryMeta}>
                {payModalItem?.className || payModalItem?.role || 'Bénéficiaire'} • Reste dû :{' '}
                <Text style={{ fontWeight: '800', color: '#dc2626' }}>{payModalItem?.dueAmount} DT</Text>
              </Text>
            </View>

            {/* Amount Field */}
            <Text style={styles.modalFieldLabel}>Montant à enregistrer (DT)</Text>
            <TextInput
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="numeric"
              placeholder="Ex: 250"
              placeholderTextColor="#94a3b8"
              style={styles.modalTextInput}
            />

            {/* Payment Method Selector */}
            <Text style={styles.modalFieldLabel}>Mode de règlement</Text>
            <View style={styles.modalMethodsRow}>
              {(['Espèces', 'Chèque', 'Virement'] as const).map((method) => {
                const isSelected = payMethod === method;
                return (
                  <TouchableOpacity
                    key={method}
                    onPress={() => setPayMethod(method)}
                    style={[
                      styles.modalMethodButton,
                      isSelected && styles.modalMethodButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalMethodText,
                        isSelected && styles.modalMethodTextActive,
                      ]}
                    >
                      {method}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setPayModalItem(null)}
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmPayment}
                disabled={submittingPay}
                style={[
                  styles.modalConfirmButton,
                  { backgroundColor: payModalItem?.type === 'student' ? '#059669' : '#0055d4' },
                ]}
              >
                {submittingPay ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Check size={16} color="#ffffff" strokeWidth={2.5} />
                    <Text style={styles.modalConfirmText}>Confirmer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── CUSTOM FEEDBACK / CONFIRMATION MODAL ─────────────────────────────── */}
      <Modal
        visible={Boolean(feedback)}
        transparent
        animationType="fade"
        onRequestClose={() => setFeedback(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.feedbackCard}>
            <View
              style={[
                styles.feedbackIconBox,
                { backgroundColor: feedback?.type === 'success' ? '#ecfdf5' : '#fef2f2' },
              ]}
            >
              {feedback?.type === 'success' ? (
                <CheckCircle2 size={36} color="#059669" />
              ) : (
                <AlertCircle size={36} color="#dc2626" />
              )}
            </View>

            <Text style={styles.feedbackTitle}>{feedback?.title}</Text>
            <Text style={styles.feedbackMessage}>{feedback?.message}</Text>

            <TouchableOpacity
              onPress={() => setFeedback(null)}
              activeOpacity={0.85}
              style={[
                styles.feedbackButton,
                { backgroundColor: feedback?.type === 'success' ? '#0055d4' : '#dc2626' },
              ]}
            >
              <Text style={styles.feedbackButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  headerSchoolName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0055d4',
  },
  headerDot: {
    fontSize: 12,
    color: '#94a3b8',
  },
  headerDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'capitalize',
  },
  headerGreeting: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
    marginBottom: 12,
  },
  statCard: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTextBox: {
    marginLeft: 10,
    flex: 1,
  },
  statNumber: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 1,
  },
  financialCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 12,
  },
  financialHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  financialIconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  financialTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  caisseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    flexShrink: 0,
  },
  caisseButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0055d4',
  },
  financialAmountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 12,
  },
  financialBigNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0055d4',
    letterSpacing: -0.5,
  },
  financialSubtext: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '600',
  },
  financialExpectedText: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  financialBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  ratePill: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  remainingPill: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  remainingPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#dc2626',
  },
  attendanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
    marginBottom: 16,
  },
  attendanceIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendanceTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  attendanceRatePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  attendanceRateText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  absenteesContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  absenteeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  absenteeName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#dc2626',
  },
  absenteeClass: {
    fontSize: 10,
    color: '#ef4444',
  },
  unpaidSection: {
    marginBottom: 16,
  },
  unpaidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  unpaidTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  unpaidTotalBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  unpaidTotalBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#dc2626',
  },
  dualRibbon: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  ribbonItem: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ribbonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  ribbonCountPillGreen: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
  },
  ribbonCountTextGreen: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  ribbonCountPillPurple: {
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
  },
  ribbonCountTextPurple: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7c3aed',
  },
  ribbonAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#0f172a',
    paddingVertical: 0,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#0055d4',
  },
  tabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    fontWeight: '800',
    color: '#0055d4',
  },
  tabCountBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  tabCountBadgeActive: {
    backgroundColor: '#dbeafe',
  },
  tabCountText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748b',
  },
  tabCountTextActive: {
    color: '#0055d4',
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  unpaidCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  unpaidCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unpaidAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unpaidPersonName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  unpaidMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 2,
  },
  classBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  classBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0055d4',
  },
  teacherBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  teacherBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0055d4',
  },
  staffBadge: {
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  staffBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#7c3aed',
  },
  parentNameText: {
    fontSize: 11,
    color: '#64748b',
  },
  dueAmountText: {
    fontSize: 16,
    fontWeight: '900',
  },
  partialBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#d97706',
  },
  unpaidActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  actionCircleButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionWhatsAppButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  primaryActionButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  hniaCopilotCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    shadowColor: '#0055d4',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
    marginTop: 4,
  },
  hniaAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hniaTitle: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#0f172a',
  },
  hniaSubtitle: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  hniaOpenButton: {
    backgroundColor: '#0055d4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hniaOpenButtonText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalHeaderSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBeneficiaryBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  modalBeneficiaryName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalBeneficiaryMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  modalTextInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 14,
  },
  modalMethodsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  modalMethodButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  modalMethodButtonActive: {
    borderColor: '#0055d4',
    backgroundColor: '#eff6ff',
  },
  modalMethodText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  modalMethodTextActive: {
    fontWeight: '800',
    color: '#0055d4',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  modalConfirmButton: {
    flex: 1.4,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  feedbackCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 6,
  },
  feedbackIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  feedbackTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
  },
  feedbackMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
  },
  feedbackButton: {
    width: '100%',
    marginTop: 22,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
});
