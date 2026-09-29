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
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  UserCheck,
  Building2,
  TrendingUp,
  Clock,
  ArrowRight,
  RefreshCw,
  Bot,
  AlertTriangle,
  Bell,
  Sparkles,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  ChevronRight,
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

  // Month navigation state
  const [selectedMonth, setSelectedMonth] = useState(currentMonthNum);
  const [selectedYear, setSelectedYear] = useState(currentYearNum);
  const isCurrentMonth = selectedMonth === currentMonthNum && selectedYear === currentYearNum;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);

  // Unpaid section filtering state
  const [unpaidCategory, setUnpaidCategory] = useState<'ALL' | 'STUDENT' | 'TEACHER' | 'STAFF'>('ALL');
  const [unpaidSearch, setUnpaidSearch] = useState('');

  // Payment / Collection Modal State
  const [payModalItem, setPayModalItem] = useState<UnpaidItem | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'Espèces' | 'Chèque' | 'Virement'>('Espèces');
  const [submittingPay, setSubmittingPay] = useState(false);

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

  // ── MONTH NAVIGATION ───────────────────────────────────────────────────────
  const handlePrevMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let newM = selectedMonth - 1;
    let newY = selectedYear;
    if (newM < 1) {
      newM = 12;
      newY -= 1;
    }
    setSelectedMonth(newM);
    setSelectedYear(newY);
    loadDashboard(newM, newY);
  };

  const handleNextMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let newM = selectedMonth + 1;
    let newY = selectedYear;
    if (newM > 12) {
      newM = 1;
      newY += 1;
    }
    setSelectedMonth(newM);
    setSelectedYear(newY);
    loadDashboard(newM, newY);
  };

  const handleResetToCurrentMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMonth(currentMonthNum);
    setSelectedYear(currentYearNum);
    loadDashboard(currentMonthNum, currentYearNum);
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
      Alert.alert('Numéro manquant', `Aucun numéro de téléphone enregistré pour ${name}.`);
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsAppStudent = (phone: string | undefined, studentName: string, dueAmount: number) => {
    if (!phone) {
      Alert.alert('Numéro manquant', `Aucun numéro de téléphone enregistré pour ${studentName}.`);
      return;
    }
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 8) {
      cleanPhone = `216${cleanPhone}`;
    }

    const mLabel = data?.monthLabel || 'ce mois';
    const message = `Bonjour Madame / Monsieur, nous vous rappelons que les frais de scolarité pour ${studentName} (${dueAmount} DT) pour le mois de ${mLabel} sont en attente. Merci de bien vouloir régulariser la situation auprès de l'administration. Cordialement, la Direction.`;
    const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          return Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`);
        }
      })
      .catch(() => {
        Alert.alert('WhatsApp non disponible', "L'application WhatsApp n'est pas installée sur cet appareil.");
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
      Alert.alert('Montant invalide', 'Veuillez saisir un montant positif valide.');
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
          Alert.alert('Succès', res.message || `✓ Encaissé ${amt} DT pour ${payModalItem.name}.`);
          setPayModalItem(null);
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
          Alert.alert('Succès', res.message || `✓ Rémunération de ${amt} DT versée à ${payModalItem.name}.`);
          setPayModalItem(null);
          loadDashboard(selectedMonth, selectedYear, true);
        } else {
          throw new Error(res?.error || 'Échec du versement');
        }
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Une erreur est survenue.');
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
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600', textTransform: 'capitalize' }}>
              {todayDateStr}
            </Text>
            <Text style={{ fontSize: 26, fontWeight: '900', color: '#0f172a', marginTop: 2, letterSpacing: -0.5 }}>
              Bonjour, {data?.adminName || 'Direction'} 👋
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={onRefresh}
              activeOpacity={0.7}
              style={{
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
                shadowRadius: 5,
                elevation: 1,
              }}
            >
              <RefreshCw size={16} color="#0055d4" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Month Selector Bar (Airy & Elegant) */}
        <View
          style={{
            marginTop: 12,
            backgroundColor: '#ffffff',
            borderRadius: 14,
            paddingVertical: 7,
            paddingHorizontal: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: 1,
            borderColor: '#e2e8f0',
            shadowColor: '#000',
            shadowOpacity: 0.02,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <TouchableOpacity
            onPress={handlePrevMonth}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeft size={18} color="#0f172a" />
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Calendar size={15} color="#0055d4" />
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>
              {data?.monthLabel || 'Ce mois'}
            </Text>
            {isCurrentMonth ? (
              <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#0055d4' }}>En cours</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleResetToCurrentMonth}
                style={{ backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}
              >
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#d97706' }}>Revenir à ce mois</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={handleNextMonth}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronRight size={18} color="#0f172a" />
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
            {/* ── 1. OPERATIONS 4-GRID (BREATHABLE & SPACIOUS) ──────────────── */}
            <View style={{ marginTop: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  Effectif de l'école • {data?.schoolName || 'SnapSchool'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                {/* Students */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#ffffff',
                    borderRadius: 18,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: '#f1f5f9',
                    shadowColor: '#000',
                    shadowOpacity: 0.03,
                    shadowRadius: 8,
                    elevation: 1,
                  }}
                >
                  <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' }}>
                    <GraduationCap size={22} color="#ea580c" />
                  </View>
                  <Text style={{ fontSize: 26, fontWeight: '900', color: '#0f172a', marginTop: 12 }}>
                    {data?.operations.students.toLocaleString() || 0}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: 2 }}>
                    Élèves
                  </Text>
                </View>

                {/* Teachers */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#ffffff',
                    borderRadius: 18,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: '#f1f5f9',
                    shadowColor: '#000',
                    shadowOpacity: 0.03,
                    shadowRadius: 8,
                    elevation: 1,
                  }}
                >
                  <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={22} color="#059669" />
                  </View>
                  <Text style={{ fontSize: 26, fontWeight: '900', color: '#0f172a', marginTop: 12 }}>
                    {data?.operations.teachers.toLocaleString() || 0}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: 2 }}>
                    Enseignants
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                {/* Staff */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#ffffff',
                    borderRadius: 18,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: '#f1f5f9',
                    shadowColor: '#000',
                    shadowOpacity: 0.03,
                    shadowRadius: 8,
                    elevation: 1,
                  }}
                >
                  <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#fdf4ff', alignItems: 'center', justifyContent: 'center' }}>
                    <UserCheck size={22} color="#c026d3" />
                  </View>
                  <Text style={{ fontSize: 26, fontWeight: '900', color: '#0f172a', marginTop: 12 }}>
                    {data?.operations.staff.toLocaleString() || 0}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: 2 }}>
                    Personnel
                  </Text>
                </View>

                {/* Classes */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#ffffff',
                    borderRadius: 18,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: '#f1f5f9',
                    shadowColor: '#000',
                    shadowOpacity: 0.03,
                    shadowRadius: 8,
                    elevation: 1,
                  }}
                >
                  <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#fef9c3', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={22} color="#ca8a04" />
                  </View>
                  <Text style={{ fontSize: 26, fontWeight: '900', color: '#0f172a', marginTop: 12 }}>
                    {data?.operations.classes.toLocaleString() || 0}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: 2 }}>
                    Classes
                  </Text>
                </View>
              </View>
            </View>

            {/* ── 2. FINANCIAL PROGRESS PULSE (CLEAN & SPACIOUS) ─────────────── */}
            <View
              style={{
                marginTop: 20,
                backgroundColor: '#ffffff',
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                shadowColor: '#000',
                shadowOpacity: 0.04,
                shadowRadius: 10,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={20} color="#0055d4" />
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>
                    Recouvrement Scolarités • {data?.monthLabel || 'Ce mois'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Caisse')}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0055d4' }}>Voir Caisse</Text>
                  <ArrowRight size={14} color="#0055d4" />
                </TouchableOpacity>
              </View>

              {/* Amount collected vs expected */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 16 }}>
                <Text style={{ fontSize: 30, fontWeight: '900', color: '#0055d4', letterSpacing: -0.5 }}>
                  {data?.financialPulse.collectedTuition.toLocaleString() || 0} DT
                </Text>
                <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '600' }}>
                  sur {data?.financialPulse.expectedTuition.toLocaleString() || 0} DT
                </Text>
              </View>

              {/* Progress Bar */}
              <View style={{ height: 10, backgroundColor: '#e2e8f0', borderRadius: 5, marginTop: 12, overflow: 'hidden' }}>
                <View
                  style={{
                    height: '100%',
                    width: `${Math.min(100, data?.financialPulse.collectionRate || 0)}%`,
                    backgroundColor: (data?.financialPulse.collectionRate || 0) >= 80 ? '#10b981' : '#0055d4',
                    borderRadius: 5,
                  }}
                />
              </View>

              {/* Bottom stats row */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <View style={{ backgroundColor: '#ecfdf5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#059669' }}>
                    {data?.financialPulse.collectionRate || 0}% recouvré
                  </Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#dc2626' }}>
                  Reste à percevoir : {data?.financialPulse.remainingToCollect.toLocaleString() || 0} DT
                </Text>
              </View>
            </View>

            {/* ── 3. ATTENDANCE PULSE TODAY ─────────────────────────────────── */}
            <View
              style={{
                marginTop: 20,
                backgroundColor: '#ffffff',
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                shadowColor: '#000',
                shadowOpacity: 0.04,
                shadowRadius: 10,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={20} color="#10b981" />
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>
                    Présence du jour
                  </Text>
                </View>
                <View style={{ backgroundColor: '#ecfdf5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#059669' }}>
                    {data?.attendanceToday.attendanceRate || 98}% de présence
                  </Text>
                </View>
              </View>

              <View style={{ marginTop: 14, padding: 14, backgroundColor: '#f8fafc', borderRadius: 14 }}>
                <Text style={{ fontSize: 13.5, color: '#334155', fontWeight: '600' }}>
                  {data?.attendanceToday.absentCount === 0
                    ? "✨ 100% des élèves présents ce matin. Aucune absence signalée."
                    : `⚠️ ${data?.attendanceToday.absentCount} absence(s) signalée(s) aujourd'hui.`}
                </Text>

                {data?.attendanceToday.recentAbsentees && data.attendanceToday.recentAbsentees.length > 0 && (
                  <View style={{ marginTop: 10, gap: 8 }}>
                    {data.attendanceToday.recentAbsentees.map((a) => (
                      <View key={a.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b' }}>
                          • {a.studentName}
                        </Text>
                        <View style={{ backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#dc2626' }}>{a.className}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* ── 4. SUIVI DES IMPAYÉS & RELANCES (THE NEW HOME OF IMPAYÉS!) ── */}
            <View style={{ marginTop: 24 }}>
              {/* Section Header */}
              <View style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Wallet size={18} color="#dc2626" />
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a', letterSpacing: -0.3 }}>
                    Suivi des Impayés & Relances
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                  Scolarités et salaires en attente de régularisation ({data?.monthLabel || 'ce mois'})
                </Text>
              </View>

              {/* Dual KPI Ribbon (Spacious & Clean) */}
              <View
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 12,
                  shadowColor: '#000',
                  shadowOpacity: 0.02,
                  shadowRadius: 5,
                  elevation: 1,
                }}
              >
                {/* Scolarités dues */}
                <View style={{ flex: 1, paddingLeft: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <GraduationCap size={15} color="#059669" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }}>Scolarités Dues</Text>
                    <View style={{ backgroundColor: '#ecfdf5', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 5, marginLeft: 'auto', marginRight: 8 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#059669' }}>{unpaidStudentsCount}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a', marginTop: 4 }}>
                    {unpaidStudentsTotal.toLocaleString()} DT
                  </Text>
                </View>

                <View style={{ width: 1, height: 38, backgroundColor: '#e2e8f0' }} />

                {/* Salaires dus */}
                <View style={{ flex: 1, paddingLeft: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Wallet size={15} color="#f43f5e" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }}>Salaires Dus</Text>
                    <View style={{ backgroundColor: '#fff1f2', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 5, marginLeft: 'auto', marginRight: 4 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#e11d48' }}>{unpaidEmployeesCount}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a', marginTop: 4 }}>
                    {unpaidEmployeesTotal.toLocaleString()} DT
                  </Text>
                </View>
              </View>

              {/* Search Bar */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  borderRadius: 14,
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  marginBottom: 10,
                }}
              >
                <Search size={16} color="#94a3b8" />
                <TextInput
                  value={unpaidSearch}
                  onChangeText={setUnpaidSearch}
                  placeholder="Rechercher élève, classe, enseignant..."
                  placeholderTextColor="#94a3b8"
                  style={{ flex: 1, marginLeft: 8, fontSize: 13.5, color: '#1e293b' }}
                />
                {unpaidSearch ? (
                  <TouchableOpacity onPress={() => setUnpaidSearch('')}>
                    <X size={16} color="#94a3b8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Category Filter Chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
                {[
                  { key: 'ALL', label: 'Tous', count: allUnpaid.length },
                  { key: 'STUDENT', label: 'Élèves', count: studentItems.length },
                  { key: 'TEACHER', label: 'Enseignants', count: teacherItems.length },
                  { key: 'STAFF', label: 'Personnel', count: staffItems.length },
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
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingVertical: 7,
                        paddingHorizontal: 13,
                        borderRadius: 18,
                        backgroundColor: isActive ? '#0f172a' : '#ffffff',
                        borderWidth: 1,
                        borderColor: isActive ? '#0f172a' : '#e2e8f0',
                      }}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: isActive ? '800' : '600', color: isActive ? '#ffffff' : '#64748b' }}>
                        {tab.label}
                      </Text>
                      <View style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : '#f1f5f9', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 8 }}>
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: isActive ? '#ffffff' : '#475569' }}>
                          {tab.count}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Unpaid Cards List */}
              {filteredUnpaid.length === 0 ? (
                <View
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 18,
                    padding: 30,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                  }}
                >
                  <CheckCircle2 size={36} color="#10b981" />
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b', marginTop: 10 }}>
                    Tout est en règle !
                  </Text>
                  <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 4 }}>
                    Aucun impayé trouvé pour {data?.monthLabel || 'ce mois'}.
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
                        style={{
                          backgroundColor: '#ffffff',
                          borderRadius: 16,
                          padding: 15,
                          borderWidth: 1,
                          borderColor: '#e2e8f0',
                          shadowColor: '#000',
                          shadowOpacity: 0.02,
                          shadowRadius: 5,
                          elevation: 1,
                        }}
                      >
                        {/* Top: Icon + Name + Role + Due Amount */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 8 }}>
                            <View
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 19,
                                backgroundColor: isStudent ? '#ecfdf5' : isTeacher ? '#eff6ff' : '#f5f3ff',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {isStudent ? (
                                <GraduationCap size={18} color="#059669" />
                              ) : isTeacher ? (
                                <User size={18} color="#0055d4" />
                              ) : (
                                <Briefcase size={18} color="#7c3aed" />
                              )}
                            </View>

                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }} numberOfLines={1}>
                                {item.name}
                              </Text>

                              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 3 }}>
                                {item.className ? (
                                  <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 6 }}>
                                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#0055d4' }}>{item.className}</Text>
                                  </View>
                                ) : null}

                                {isTeacher && (
                                  <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 6 }}>
                                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#0055d4' }}>Enseignant</Text>
                                  </View>
                                )}

                                {isStaff && (
                                  <View style={{ backgroundColor: '#f5f3ff', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 6 }}>
                                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#7c3aed' }}>Personnel</Text>
                                  </View>
                                )}

                                {item.parentName && (
                                  <Text style={{ fontSize: 11.5, color: '#64748b' }} numberOfLines={1}>
                                    • {item.parentName}
                                  </Text>
                                )}

                                {Boolean(item.advanceAmount && item.advanceAmount > 0) && (
                                  <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 6 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#d97706' }}>
                                      Avance {item.advanceAmount} DT
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>

                          {/* Due Amount */}
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text
                              style={{
                                fontSize: 17,
                                fontWeight: '900',
                                color: item.dueAmount > 0 ? (isStudent ? '#dc2626' : '#0f172a') : '#10b981',
                                letterSpacing: -0.3,
                              }}
                            >
                              {item.dueAmount} DT
                            </Text>
                            {isStudent && item.status === 'PARTIAL' && (
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#d97706' }}>
                                Acompte {item.paidAmount} DT
                              </Text>
                            )}
                          </View>
                        </View>

                        {/* Bottom Actions Row */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                          {/* Call Button */}
                          <TouchableOpacity
                            onPress={() => handleCall(isStudent ? item.parentPhone : item.phone, item.name)}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 18,
                              backgroundColor: '#f1f5f9',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                          >
                            <Phone size={15} color="#475569" />
                          </TouchableOpacity>

                          {/* WhatsApp Button (Students) */}
                          {isStudent && (
                            <TouchableOpacity
                              onPress={() => handleWhatsAppStudent(item.parentPhone, item.name, item.dueAmount)}
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor: '#ecfdf5',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                            >
                              <MessageCircle size={16} color="#059669" />
                            </TouchableOpacity>
                          )}

                          {/* Action Button: Encaisser / Payer */}
                          <TouchableOpacity
                            onPress={() => openPayModal(item)}
                            style={{
                              flex: 1,
                              backgroundColor: isStudent ? '#059669' : '#0f172a',
                              borderRadius: 10,
                              paddingVertical: 9,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              marginLeft: 4,
                            }}
                            activeOpacity={0.85}
                          >
                            {isStudent ? (
                              <>
                                <HandCoins size={14} color="#ffffff" />
                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff' }}>Encaisser</Text>
                              </>
                            ) : (
                              <>
                                <CreditCard size={14} color="#ffffff" />
                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff' }}>Payer</Text>
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

            {/* ── 5. HNIA CO-PILOT CARD ────────────────────────────────────── */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Hnia')}
              activeOpacity={0.9}
              style={{
                marginTop: 24,
                backgroundColor: '#0f172a',
                borderRadius: 20,
                padding: 18,
                shadowColor: '#0f172a',
                shadowOpacity: 0.15,
                shadowRadius: 10,
                elevation: 3,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 10 }}>
                  <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: '#1e3a8a', alignItems: 'center', justifyContent: 'center' }}>
                    <Bot size={24} color="#60a5fa" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>
                      Hnia IA • Assistante Direction
                    </Text>
                    <Text style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 2 }}>
                      Encaisser, dépense, remplacement ou alerte vocale.
                    </Text>
                  </View>
                </View>
                <ArrowRight size={20} color="#60a5fa" />
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
              placeholder="Ex: 450"
              style={{
                backgroundColor: '#ffffff',
                borderWidth: 1.5,
                borderColor: '#cbd5e1',
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: 18,
                fontWeight: '800',
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
    </View>
  );
}
