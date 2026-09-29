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

  // Always default to current month
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

  // Custom Feedback Modal (Replaces all generic OS Alert.alert!)
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
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadDashboard(selectedMonth, selectedYear);
  }, [loadDashboard, selectedMonth, selectedYear]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard(selectedMonth, selectedYear, true);
  };


  // ── UNPAID ENTITIES & FILTERING ────────────────────────────────────────────
  const allUnpaid = useMemo(() => data?.allUnpaid || [], [data?.allUnpaid]);

  const studentItems = useMemo(() => allUnpaid.filter((i) => i.type === 'student'), [allUnpaid]);
  const teacherItems = useMemo(() => allUnpaid.filter((i) => i.type === 'teacher'), [allUnpaid]);
  const staffItems = useMemo(() => allUnpaid.filter((i) => i.type === 'staff'), [allUnpaid]);

  const unpaidStudentsCount = data?.unpaidSummary?.unpaidStudentsCount ?? studentItems.length;
  const unpaidStudentsTotal = data?.unpaidSummary?.unpaidStudentsTotal ?? studentItems.reduce((acc, curr) => acc + (curr.dueAmount || 0), 0);

  const unpaidEmployeesCount = data?.unpaidSummary?.unpaidEmployeesCount ?? (teacherItems.length + staffItems.length);
  const unpaidEmployeesTotal = data?.unpaidSummary?.unpaidEmployeesTotal ?? [...teacherItems, ...staffItems].reduce((acc, curr) => acc + (curr.dueAmount || 0), 0);

  const filteredUnpaid = useMemo(() => {
    let list = allUnpaid;
    if (unpaidCategory === 'STUDENT') list = studentItems;
    else if (unpaidCategory === 'TEACHER') list = teacherItems;
    else if (unpaidCategory === 'STAFF') list = staffItems;

    if (!unpaidSearch.trim()) return list;
    const q = unpaidSearch.toLowerCase();
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.className && item.className.toLowerCase().includes(q)) ||
        (item.parentName && item.parentName.toLowerCase().includes(q)) ||
        (item.role && item.role.toLowerCase().includes(q)) ||
        (item.phone && item.phone.includes(q))
    );
  }, [allUnpaid, unpaidCategory, unpaidSearch, studentItems, teacherItems, staffItems]);

  // ── CALL & WHATSAPP SHORTCUTS ──────────────────────────────────────────────
  const handleCall = (phone: string | undefined, name: string) => {
    if (!phone) {
      setFeedback({
        type: 'error',
        title: 'Numéro manquant',
        message: `Aucun numéro de téléphone enregistré pour ${name}.`,
      });
      return;
    }
    trackEvent('admin_phone_call_initiated', { recipientName: name });
    Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsAppStudent = (phone: string | undefined, studentName: string, dueAmount: number) => {
    if (!phone) {
      setFeedback({
        type: 'error',
        title: 'Numéro manquant',
        message: `Aucun numéro de téléphone enregistré pour ${studentName}.`,
      });
      return;
    }
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 8) {
      cleanPhone = `216${cleanPhone}`;
    }

    const mLabel = data?.monthLabel || 'ce mois';
    const message = `Bonjour Madame / Monsieur, nous vous rappelons que les frais de scolarité pour ${studentName} (${dueAmount} DT) pour le mois de ${mLabel} sont en attente. Merci de bien vouloir régulariser la situation auprès de l'administration. Cordialement, la Direction.`;
    const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;

    trackEvent('admin_whatsapp_reminder_opened', {
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
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc', paddingTop: topPadding }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" translucent={Platform.OS === 'android'} />

      {/* ── HEADER (AIRY, CLEAN & EXECUTIVE) ─────────────────────────────────── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
        {/* Top Micro-Row: Date & Month badge & School */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'capitalize' }}>
              {todayDateStr}
            </Text>
            {Boolean(data?.monthLabel) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f1f5f9', paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 8 }}>
                <Calendar size={11} color="#0055d4" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#0f172a' }}>
                  {data?.monthLabel}
                </Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#eff6ff', paddingHorizontal: 9, paddingVertical: 3.5, borderRadius: 12, borderWidth: 1, borderColor: '#dbeafe' }}>
            <Building2 size={12} color="#0055d4" />
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#0055d4' }} numberOfLines={1}>
              {data?.schoolName || 'SnapSchool'}
            </Text>
          </View>
        </View>

        {/* Main Title & Refresh */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 }}>
            Bonjour, {data?.adminName || 'Direction'} 👋
          </Text>
          <TouchableOpacity
            onPress={onRefresh}
            activeOpacity={0.7}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#ffffff',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#e2e8f0',
              shadowColor: '#000',
              shadowOpacity: 0.03,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <RefreshCw size={15} color="#0055d4" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 50 }}
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
            {/* ── 1. COMPACT 4-STAT OPERATIONS BAR (LIGHT, AIRY & SPACE-SAVING) ── */}
            <View
              style={{
                marginTop: 10,
                backgroundColor: '#ffffff',
                borderRadius: 18,
                paddingVertical: 12,
                paddingHorizontal: 6,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOpacity: 0.02,
                shadowRadius: 5,
                elevation: 1,
              }}
            >
              {/* Élèves */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                  <GraduationCap size={17} color="#0055d4" />
                </View>
                <Text style={{ fontSize: 17, fontWeight: '900', color: '#0f172a' }}>
                  {data?.operations.students.toLocaleString() || 0}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 1 }}>
                  Élèves
                </Text>
              </View>

              <View style={{ width: 1, height: 32, backgroundColor: '#f1f5f9' }} />

              {/* Enseignants */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                  <Users size={17} color="#059669" />
                </View>
                <Text style={{ fontSize: 17, fontWeight: '900', color: '#0f172a' }}>
                  {data?.operations.teachers.toLocaleString() || 0}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 1 }}>
                  Profs
                </Text>
              </View>

              <View style={{ width: 1, height: 32, backgroundColor: '#f1f5f9' }} />

              {/* Classes */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#fef9c3', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                  <Building2 size={17} color="#ca8a04" />
                </View>
                <Text style={{ fontSize: 17, fontWeight: '900', color: '#0f172a' }}>
                  {data?.operations.classes.toLocaleString() || 0}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 1 }}>
                  Classes
                </Text>
              </View>

              <View style={{ width: 1, height: 32, backgroundColor: '#f1f5f9' }} />

              {/* Personnel */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                  <Briefcase size={17} color="#7c3aed" />
                </View>
                <Text style={{ fontSize: 17, fontWeight: '900', color: '#0f172a' }}>
                  {data?.operations.staff.toLocaleString() || 0}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 1 }}>
                  Staff
                </Text>
              </View>
            </View>

            {/* ── 2. FINANCIAL PROGRESS PULSE (CLEAN, MODERN & SPACIOUS) ──────── */}
            <View
              style={{
                marginTop: 14,
                backgroundColor: '#ffffff',
                borderRadius: 20,
                padding: 18,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                shadowColor: '#000',
                shadowOpacity: 0.03,
                shadowRadius: 8,
                elevation: 1,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={16} color="#0055d4" />
                  </View>
                  <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0f172a' }}>
                    Recouvrement Scolarités {data?.financialPulse?.monthLabel ? `• ${data.financialPulse.monthLabel}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Caisse')}
                  activeOpacity={0.7}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eff6ff', paddingHorizontal: 9, paddingVertical: 4.5, borderRadius: 10 }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#0055d4' }}>Voir Caisse</Text>
                  <ArrowRight size={13} color="#0055d4" />
                </TouchableOpacity>
              </View>

              {/* Amount collected vs expected */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Text style={{ fontSize: 28, fontWeight: '900', color: '#0055d4', letterSpacing: -0.5 }}>
                    {data?.financialPulse.collectedTuition.toLocaleString() || 0} DT
                  </Text>
                  <Text style={{ fontSize: 12.5, color: '#64748b', fontWeight: '600' }}>
                    encaissés
                  </Text>
                </View>
                <Text style={{ fontSize: 12.5, color: '#64748b', fontWeight: '600' }}>
                  sur {data?.financialPulse.expectedTuition.toLocaleString() || 0} DT
                </Text>
              </View>

              {/* Progress Bar */}
              <View style={{ height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, marginTop: 10, overflow: 'hidden' }}>
                <View
                  style={{
                    height: '100%',
                    width: `${Math.min(100, data?.financialPulse.collectionRate || 0)}%`,
                    backgroundColor: (data?.financialPulse.collectionRate || 0) >= 80 ? '#10b981' : '#0055d4',
                    borderRadius: 4,
                  }}
                />
              </View>

              {/* Bottom stats row */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <View style={{ backgroundColor: '#ecfdf5', paddingHorizontal: 9, paddingVertical: 3.5, borderRadius: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#059669' }}>
                    {data?.financialPulse.collectionRate || 0}% collecté
                  </Text>
                </View>
                <View style={{ backgroundColor: '#fef2f2', paddingHorizontal: 9, paddingVertical: 3.5, borderRadius: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#dc2626' }}>
                    Reste : {data?.financialPulse.remainingToCollect.toLocaleString() || 0} DT
                  </Text>
                </View>
              </View>
            </View>

            {/* ── 3. ATTENDANCE PULSE TODAY ─────────────────────────────────── */}
            <View
              style={{
                marginTop: 12,
                backgroundColor: '#ffffff',
                borderRadius: 18,
                padding: 14,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                shadowColor: '#000',
                shadowOpacity: 0.02,
                shadowRadius: 6,
                elevation: 1,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={16} color="#059669" />
                  </View>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0f172a' }}>
                    Présence aujourd'hui
                  </Text>
                </View>
                <View style={{ backgroundColor: data?.attendanceToday.absentCount === 0 ? '#ecfdf5' : '#fff1f2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: data?.attendanceToday.absentCount === 0 ? '#059669' : '#e11d48' }}>
                    {data?.attendanceToday.attendanceRate || 98}% de présence
                  </Text>
                </View>
              </View>

              {data?.attendanceToday.recentAbsentees && data.attendanceToday.recentAbsentees.length > 0 ? (
                <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {data.attendanceToday.recentAbsentees.map((a) => (
                    <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 }}>
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#dc2626' }}>{a.studentName}</Text>
                      <Text style={{ fontSize: 10, color: '#ef4444' }}>({a.className})</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            {/* ── 4. SUIVI DES IMPAYÉS & RELANCES (COMPACT, LIGHT & ELEGANT) ── */}
            <View
              style={{
                marginTop: 18,
                backgroundColor: '#ffffff',
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                shadowColor: '#000',
                shadowOpacity: 0.03,
                shadowRadius: 8,
                elevation: 1,
              }}
            >
              {/* Header: Title + Total badge */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <Wallet size={16} color="#0055d4" />
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a', letterSpacing: -0.3 }}>
                    Impayés & Salaires dus
                  </Text>
                </View>
                <View style={{ backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#dc2626' }}>
                    {(unpaidStudentsTotal + unpaidEmployeesTotal).toLocaleString()} DT total
                  </Text>
                </View>
              </View>

              {/* Dual Stat Ribbon (Airy & Lightweight) */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <View style={{ flex: 1, backgroundColor: '#f8fafc', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>Scolarités dues</Text>
                    <View style={{ backgroundColor: '#ecfdf5', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#059669' }}>{unpaidStudentsCount}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a', marginTop: 3 }}>
                    {unpaidStudentsTotal.toLocaleString()} DT
                  </Text>
                </View>

                <View style={{ flex: 1, backgroundColor: '#f8fafc', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>Salaires dus</Text>
                    <View style={{ backgroundColor: '#f5f3ff', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#7c3aed' }}>{unpaidEmployeesCount}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a', marginTop: 3 }}>
                    {unpaidEmployeesTotal.toLocaleString()} DT
                  </Text>
                </View>
              </View>

              {/* Integrated Search Input */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#f8fafc',
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  marginBottom: 10,
                }}
              >
                <Search size={14} color="#94a3b8" />
                <TextInput
                  value={unpaidSearch}
                  onChangeText={setUnpaidSearch}
                  placeholder="Rechercher élève, classe, prof..."
                  placeholderTextColor="#94a3b8"
                  style={{ flex: 1, marginLeft: 8, fontSize: 12.5, color: '#0f172a', paddingVertical: 0 }}
                />
                {unpaidSearch ? (
                  <TouchableOpacity onPress={() => setUnpaidSearch('')}>
                    <X size={14} color="#94a3b8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Category Segmented Chips - Clean Brand Blue & White, NO HARSH BLACK! */}
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
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
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        paddingVertical: 7,
                        borderRadius: 10,
                        backgroundColor: isActive ? '#eff6ff' : '#ffffff',
                        borderWidth: 1,
                        borderColor: isActive ? '#0055d4' : '#e2e8f0',
                      }}
                    >
                      <Text style={{ fontSize: 11.5, fontWeight: isActive ? '800' : '600', color: isActive ? '#0055d4' : '#64748b' }}>
                        {tab.label}
                      </Text>
                      <View style={{ backgroundColor: isActive ? '#dbeafe' : '#f1f5f9', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6 }}>
                        <Text style={{ fontSize: 9.5, fontWeight: '800', color: isActive ? '#0055d4' : '#64748b' }}>
                          {tab.count}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Compact List Items */}
              {filteredUnpaid.length === 0 ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <CheckCircle2 size={30} color="#10b981" />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#1e293b', marginTop: 8 }}>
                    Tout est à jour !
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    Aucun impayé trouvé pour cette sélection.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  {filteredUnpaid.map((item) => {
                    const isStudent = item.type === 'student';
                    const isTeacher = item.type === 'teacher';
                    const isStaff = item.type === 'staff';

                    return (
                      <View
                        key={`${item.type}_${item.id}`}
                        style={{
                          backgroundColor: '#ffffff',
                          borderRadius: 14,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: '#f1f5f9',
                          shadowColor: '#000',
                          shadowOpacity: 0.02,
                          shadowRadius: 3,
                          elevation: 1,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          {/* Left: Avatar + Info */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 8 }}>
                            <View
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor: isStudent ? '#ecfdf5' : isTeacher ? '#eff6ff' : '#f5f3ff',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
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
                              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }} numberOfLines={1}>
                                {item.name}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 2 }}>
                                {item.className ? (
                                  <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#0055d4' }}>{item.className}</Text>
                                  </View>
                                ) : null}
                                {isTeacher ? (
                                  <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#0055d4' }}>Enseignant</Text>
                                  </View>
                                ) : null}
                                {isStaff ? (
                                  <View style={{ backgroundColor: '#f5f3ff', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#7c3aed' }}>Personnel</Text>
                                  </View>
                                ) : null}
                                {item.parentName ? (
                                  <Text style={{ fontSize: 11, color: '#64748b' }} numberOfLines={1}>
                                    • {item.parentName}
                                  </Text>
                                ) : null}
                              </View>
                            </View>
                          </View>

                          {/* Right: Amount Due */}
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 15, fontWeight: '900', color: isStudent ? '#dc2626' : '#0f172a' }}>
                              {item.dueAmount} DT
                            </Text>
                            {isStudent && item.status === 'PARTIAL' && (
                              <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#d97706' }}>
                                Acompte {item.paidAmount} DT
                              </Text>
                            )}
                          </View>
                        </View>

                        {/* Action Micro-Bar */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f8fafc' }}>
                          {/* Call */}
                          <TouchableOpacity
                            onPress={() => handleCall(isStudent ? item.parentPhone : item.phone, item.name)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              backgroundColor: '#f1f5f9',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                          >
                            <Phone size={13} color="#475569" />
                          </TouchableOpacity>

                          {/* WhatsApp (Students) */}
                          {isStudent && (
                            <TouchableOpacity
                              onPress={() => handleWhatsAppStudent(item.parentPhone, item.name, item.dueAmount)}
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: '#ecfdf5',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                            >
                              <MessageCircle size={14} color="#059669" />
                            </TouchableOpacity>
                          )}

                          {/* Collect / Pay */}
                          <TouchableOpacity
                            onPress={() => openPayModal(item)}
                            activeOpacity={0.85}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 10,
                              backgroundColor: isStudent ? '#059669' : '#0055d4',
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            {isStudent ? (
                              <>
                                <HandCoins size={12} color="#ffffff" />
                                <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#ffffff' }}>Encaisser</Text>
                              </>
                            ) : (
                              <>
                                <CreditCard size={12} color="#ffffff" />
                                <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#ffffff' }}>Payer</Text>
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

            {/* ── 5. HNIA CO-PILOT CARD (LIGHT, GLOWING & ELEGANT - NO BLACK BOX!) ── */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Hnia')}
              activeOpacity={0.9}
              style={{
                marginTop: 18,
                backgroundColor: '#eff6ff',
                borderRadius: 20,
                padding: 16,
                borderWidth: 1.5,
                borderColor: '#bfdbfe',
                shadowColor: '#0055d4',
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 1,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 10 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' }}>
                    <Bot size={22} color="#0055d4" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Text style={{ fontSize: 14.5, fontWeight: '900', color: '#0f172a' }}>
                        Hnia IA • Assistante Direction
                      </Text>
                      <Sparkles size={13} color="#0055d4" />
                    </View>
                    <Text style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                      Pilotage vocal, gestion de caisse et bilans en direct.
                    </Text>
                  </View>
                </View>
                <View style={{ backgroundColor: '#0055d4', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#ffffff' }}>Ouvrir</Text>
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
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 20,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 380,
              backgroundColor: '#ffffff',
              borderRadius: 22,
              padding: 22,
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 15,
              elevation: 5,
            }}
          >
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>
                  {payModalItem?.type === 'student' ? 'Encaisser la scolarité' : 'Verser la rémunération'}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {data?.monthLabel || 'Ce mois'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPayModalItem(null)}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Beneficiary Card */}
            <View style={{ backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9' }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>{payModalItem?.name}</Text>
              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {payModalItem?.className || payModalItem?.role || 'Bénéficiaire'} • Reste dû :{' '}
                <Text style={{ fontWeight: '800', color: '#dc2626' }}>{payModalItem?.dueAmount} DT</Text>
              </Text>
            </View>

            {/* Amount Field */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
              Montant à enregistrer (DT)
            </Text>
            <TextInput
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="numeric"
              placeholder="Ex: 250"
              placeholderTextColor="#94a3b8"
              style={{
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
              }}
            />

            {/* Payment Method Selector */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
              Mode de règlement
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {(['Espèces', 'Chèque', 'Virement'] as const).map((method) => {
                const isSelected = payMethod === method;
                return (
                  <TouchableOpacity
                    key={method}
                    onPress={() => setPayMethod(method)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: isSelected ? '#0055d4' : '#e2e8f0',
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: isSelected ? '800' : '600', color: isSelected ? '#0055d4' : '#475569' }}>
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
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748b' }}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmPayment}
                disabled={submittingPay}
                style={{
                  flex: 1.4,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: payModalItem?.type === 'student' ? '#059669' : '#0055d4',
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {submittingPay ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Check size={16} color="#ffffff" strokeWidth={2.5} />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff' }}>Confirmer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── CUSTOM FEEDBACK / CONFIRMATION MODAL (NO GENERIC OS POPUP!) ─────── */}
      <Modal
        visible={Boolean(feedback)}
        transparent
        animationType="fade"
        onRequestClose={() => setFeedback(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
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
            }}
          >
            {/* Icon */}
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: feedback?.type === 'success' ? '#ecfdf5' : '#fef2f2',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              {feedback?.type === 'success' ? (
                <CheckCircle2 size={36} color="#059669" />
              ) : (
                <AlertCircle size={36} color="#dc2626" />
              )}
            </View>

            {/* Title */}
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a', textAlign: 'center' }}>
              {feedback?.title}
            </Text>

            {/* Message */}
            <Text style={{ fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8, lineHeight: 21 }}>
              {feedback?.message}
            </Text>

            {/* OK Button */}
            <TouchableOpacity
              onPress={() => setFeedback(null)}
              activeOpacity={0.85}
              style={{
                width: '100%',
                marginTop: 22,
                paddingVertical: 13,
                borderRadius: 14,
                backgroundColor: feedback?.type === 'success' ? '#0055d4' : '#dc2626',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#ffffff' }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
