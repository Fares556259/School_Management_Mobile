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
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Phone,
  MessageCircle,
  X,
  CheckCircle2,
  Clock,
  RefreshCw,
  Sparkles,
  Bot,
  ArrowRight,
  TrendingUp,
  Printer,
  Share2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Briefcase,
  User,
  CreditCard,
  HandCoins,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { adminService, authStorage } from '../../services/api';

interface Transaction {
  id: string;
  type: 'IN' | 'OUT';
  title: string;
  category: string;
  amount: number;
  createdAt: string;
}

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

interface CaisseSummary {
  todayIncome: number;
  todayExpense: number;
  todayNet: number;
  monthIncome: number;
  monthExpense: number;
  unpaidCount: number;
  unpaidTotal: number;
  unpaidStudentsCount?: number;
  unpaidStudentsTotal?: number;
  unpaidEmployeesCount?: number;
  unpaidEmployeesTotal?: number;
}

export default function AdminCaisseScreen() {
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

  // Core state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<CaisseSummary>({
    todayIncome: 0,
    todayExpense: 0,
    todayNet: 0,
    monthIncome: 0,
    monthExpense: 0,
    unpaidCount: 0,
    unpaidTotal: 0,
    unpaidStudentsCount: 0,
    unpaidStudentsTotal: 0,
    unpaidEmployeesCount: 0,
    unpaidEmployeesTotal: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allUnpaid, setAllUnpaid] = useState<UnpaidItem[]>([]);
  const [monthLabel, setMonthLabel] = useState('Ce mois');

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'movements' | 'unpaid'>('movements');

  // Filter in unpaid tab
  const [unpaidCategory, setUnpaidCategory] = useState<'ALL' | 'STUDENT' | 'TEACHER' | 'STAFF'>('ALL');
  const [unpaidSearch, setUnpaidSearch] = useState('');

  // Payment / Collection Modal State
  const [payModalItem, setPayModalItem] = useState<UnpaidItem | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'Espèces' | 'Chèque' | 'Virement'>('Espèces');
  const [submittingPay, setSubmittingPay] = useState(false);

  // ── DATA FETCHING ──────────────────────────────────────────────────────────
  const loadCaisseData = useCallback(async (m?: number, y?: number, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    const targetM = m !== undefined ? m : selectedMonth;
    const targetY = y !== undefined ? y : selectedYear;
    try {
      const data = await adminService.fetchCaisse(targetM, targetY);
      if (data && data.success) {
        setSummary(data.summary || {});
        setTransactions(data.todayTransactions || []);
        setAllUnpaid(data.allUnpaid || data.unpaidStudents || []);
        if (data.monthLabel) setMonthLabel(data.monthLabel);
      }
    } catch (err: any) {
      console.error('Failed to load caisse data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadCaisseData(selectedMonth, selectedYear);
  }, [loadCaisseData, selectedMonth, selectedYear]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCaisseData(selectedMonth, selectedYear, true);
  };

  // ── MONTH SWITCHING ────────────────────────────────────────────────────────
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
    loadCaisseData(newM, newY);
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
    loadCaisseData(newM, newY);
  };

  const handleResetToCurrentMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMonth(currentMonthNum);
    setSelectedYear(currentYearNum);
    loadCaisseData(currentMonthNum, currentYearNum);
  };

  // ── FILTERED UNPAID ENTITIES ───────────────────────────────────────────────
  const studentItems = useMemo(() => allUnpaid.filter((i) => i.type === 'student'), [allUnpaid]);
  const teacherItems = useMemo(() => allUnpaid.filter((i) => i.type === 'teacher'), [allUnpaid]);
  const staffItems = useMemo(() => allUnpaid.filter((i) => i.type === 'staff'), [allUnpaid]);

  const unpaidStudentsCount = studentItems.length;
  const unpaidStudentsTotal = studentItems.reduce((acc, curr) => acc + (curr.dueAmount || 0), 0);

  const unpaidEmployeesCount = teacherItems.length + staffItems.length;
  const unpaidEmployeesTotal = [...teacherItems, ...staffItems].reduce((acc, curr) => acc + (curr.dueAmount || 0), 0);

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

    const message = `Bonjour Madame / Monsieur, nous vous rappelons que les frais de scolarité pour ${studentName} (${dueAmount} DT) pour le mois de ${monthLabel} sont en attente. Merci de bien vouloir régulariser la situation auprès de l'administration. Cordialement, la Direction.`;
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
          loadCaisseData(selectedMonth, selectedYear, true);
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
          loadCaisseData(selectedMonth, selectedYear, true);
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

  // ── PRINT & SHARE BORDEREAU ────────────────────────────────────────────────
  const [printing, setPrinting] = useState(false);
  const [sharing, setSharing] = useState(false);

  const handlePrintBordereau = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPrinting(true);
    try {
      const token = await authStorage.getToken();
      const printUrl = `https://www.snapschool.academy/api/mobile/admin/caisse/print?token=${encodeURIComponent(token || '')}`;

      await WebBrowser.openBrowserAsync(printUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        toolbarColor: '#0f172a',
        controlsColor: '#ffffff',
      });
    } catch (err: any) {
      console.error('[AdminCaisseScreen] Print error:', err);
      Alert.alert('Erreur', "Impossible d'ouvrir le module d'impression : " + (err.message || ''));
    } finally {
      setPrinting(false);
    }
  };

  const handleShareBordereau = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSharing(true);
    try {
      const res = await adminService.fetchCaissePdf();
      if (!res || !res.success) {
        throw new Error(res?.error || 'Échec de génération du bordereau');
      }

      const filename =
        res.filename ||
        `Bordereau_Caisse_${new Date().toISOString().split('T')[0]}.pdf`;
      const localUri = `${FileSystem.documentDirectory}${filename}`;

      if (res.pdfBase64) {
        await FileSystem.writeAsStringAsync(localUri, res.pdfBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else if (res.pdfUrl) {
        const downloadRes = await FileSystem.downloadAsync(res.pdfUrl, localUri);
        if (downloadRes.status !== 200) {
          throw new Error('Échec du téléchargement du bordereau');
        }
      } else {
        throw new Error('Données PDF non reçues');
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Bordereau de Caisse Journalière',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Bordereau enregistré', `Le document PDF a été enregistré avec succès : ${filename}`);
      }
    } catch (err: any) {
      console.error('[AdminCaisseScreen] Share error:', err);
      Alert.alert('Erreur', 'Impossible de télécharger le bordereau : ' + (err.message || 'Erreur inconnue'));
    } finally {
      setSharing(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // RENDER (ULTRA-CLEAN NATIVE FINTECH DESIGN)
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc', paddingTop: topPadding }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" translucent={Platform.OS === 'android'} />

      {/* ── HEADER (COMPACT & NATIVE) ────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 }}>
        {/* Title + Quick Action Icons */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 }}>
              Caisse
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748b', marginTop: 1 }}>
              {monthLabel} • Radar financier
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Quick Hnia Chip */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Hnia')}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: '#eff6ff',
                paddingHorizontal: 11,
                paddingVertical: 6,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#bfdbfe',
              }}
            >
              <Bot size={14} color="#0055d4" />
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#0055d4' }}>Hnia</Text>
            </TouchableOpacity>

            {/* Refresh Button */}
            <TouchableOpacity
              onPress={onRefresh}
              activeOpacity={0.7}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#ffffff',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#e2e8f0',
              }}
            >
              <RefreshCw size={14} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Month Selector Bar (Compact Luxury Pill) */}
        <View
          style={{
            marginTop: 10,
            backgroundColor: '#ffffff',
            borderRadius: 12,
            paddingVertical: 5,
            paddingHorizontal: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: 1,
            borderColor: '#e2e8f0',
          }}
        >
          <TouchableOpacity
            onPress={handlePrevMonth}
            style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeft size={16} color="#0f172a" />
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Calendar size={13} color="#0055d4" />
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>
              {monthLabel}
            </Text>
            {isCurrentMonth ? (
              <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 6 }}>
                <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#0055d4' }}>En cours</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleResetToCurrentMonth}
                style={{ backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 6 }}
              >
                <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#d97706' }}>Revenir à ce mois</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={handleNextMonth}
            style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronRight size={16} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0055d4']} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. HERO BALANCE CARD (APPLE WALLET / REVOLUT STYLE) ──────────── */}
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 18,
            padding: 16,
            borderWidth: 1,
            borderColor: '#e2e8f0',
            shadowColor: '#0f172a',
            shadowOpacity: 0.04,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 3 },
            elevation: 2,
          }}
        >
          {/* Card Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet size={13} color="#059669" />
              </View>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Solde Net Caisse
              </Text>
            </View>
            <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#475569' }}>Aujourd'hui</Text>
            </View>
          </View>

          {/* Big Hero Amount */}
          <View style={{ marginVertical: 8 }}>
            <Text
              style={{
                fontSize: 32,
                fontWeight: '900',
                color: summary.todayNet >= 0 ? '#059669' : '#dc2626',
                letterSpacing: -0.8,
              }}
            >
              {summary.todayNet >= 0 ? `+${summary.todayNet.toLocaleString()} DT` : `${summary.todayNet.toLocaleString()} DT`}
            </Text>
          </View>

          {/* Compact Inflow / Outflow Split */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, gap: 5 }}>
              <ArrowDownLeft size={12} color="#059669" />
              <Text style={{ fontSize: 11, color: '#166534', fontWeight: '600' }}>Recettes</Text>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#15803d', marginLeft: 'auto' }}>
                +{summary.todayIncome.toLocaleString()} DT
              </Text>
            </View>

            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, gap: 5 }}>
              <ArrowUpRight size={12} color="#dc2626" />
              <Text style={{ fontSize: 11, color: '#991b1b', fontWeight: '600' }}>Dépenses</Text>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#b91c1c', marginLeft: 'auto' }}>
                -{summary.todayExpense.toLocaleString()} DT
              </Text>
            </View>
          </View>

          {/* Side-by-Side Quick Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={handlePrintBordereau}
              disabled={printing}
              activeOpacity={0.8}
              style={{
                flex: 1,
                backgroundColor: '#059669',
                borderRadius: 10,
                paddingVertical: 9,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {printing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Printer size={13} color="#ffffff" strokeWidth={2.2} />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#ffffff' }}>
                    Livre de Caisse A4
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShareBordereau}
              disabled={sharing}
              activeOpacity={0.8}
              style={{
                flex: 1,
                backgroundColor: '#f8fafc',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 10,
                paddingVertical: 9,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {sharing ? (
                <ActivityIndicator size="small" color="#0f172a" />
              ) : (
                <>
                  <Share2 size={13} color="#0f172a" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>
                    Partager PDF
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 2. SEGMENTED TABS (NATIVE PILL SWITCH) ──────────────────────── */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#e2e8f0',
            borderRadius: 12,
            padding: 3,
            marginTop: 12,
            marginBottom: 10,
          }}
        >
          <TouchableOpacity
            onPress={() => setActiveTab('movements')}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 9,
              backgroundColor: activeTab === 'movements' ? '#fff' : 'transparent',
              alignItems: 'center',
              shadowColor: activeTab === 'movements' ? '#000' : 'transparent',
              shadowOpacity: activeTab === 'movements' ? 0.08 : 0,
              shadowRadius: 3,
              elevation: activeTab === 'movements' ? 2 : 0,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: activeTab === 'movements' ? '#0f172a' : '#64748b',
              }}
            >
              Flux du jour ({transactions.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('unpaid')}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 9,
              backgroundColor: activeTab === 'unpaid' ? '#fff' : 'transparent',
              alignItems: 'center',
              shadowColor: activeTab === 'unpaid' ? '#000' : 'transparent',
              shadowOpacity: activeTab === 'unpaid' ? 0.08 : 0,
              shadowRadius: 3,
              elevation: activeTab === 'unpaid' ? 2 : 0,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: activeTab === 'unpaid' ? '#0f172a' : '#64748b',
                }}
              >
                Impayés ({allUnpaid.length})
              </Text>
              {allUnpaid.length > 0 && (
                <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#ef4444' }} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* ── 3. TAB CONTENT: MOVEMENTS ────────────────────────────────────── */}
        {activeTab === 'movements' && (
          <View style={{ marginTop: 4 }}>
            {loading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0055d4" />
                <Text style={{ fontSize: 13, color: '#64748b', marginTop: 12 }}>Chargement des flux...</Text>
              </View>
            ) : transactions.length === 0 ? (
              <View
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 16,
                  padding: 28,
                  alignItems: 'center',
                  marginTop: 4,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                }}
              >
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Clock size={24} color="#94a3b8" />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#1e293b' }}>Aucun flux aujourd'hui</Text>
                <Text style={{ fontSize: 12.5, color: '#64748b', textAlign: 'center', marginTop: 4, lineHeight: 18 }}>
                  Toutes les transactions encaissées ou décaissées aujourd'hui apparaîtront ici en direct.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {transactions.map((tx) => {
                  const isIncome = tx.type === 'IN';
                  const timeStr = new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <View
                      key={tx.id}
                      style={{
                        backgroundColor: '#fff',
                        borderRadius: 14,
                        padding: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderWidth: 1,
                        borderColor: '#f1f5f9',
                        shadowColor: '#000',
                        shadowOpacity: 0.02,
                        shadowRadius: 5,
                        elevation: 1,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 8 }}>
                        <View
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            backgroundColor: isIncome ? '#ecfdf5' : '#fef2f2',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isIncome ? <ArrowDownLeft size={16} color="#10b981" /> : <ArrowUpRight size={16} color="#ef4444" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#1e293b' }} numberOfLines={1}>
                            {tx.title}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                            <Text style={{ fontSize: 10.5, color: '#94a3b8' }}>{timeStr}</Text>
                            <Text style={{ fontSize: 10.5, color: '#cbd5e1' }}>•</Text>
                            <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 }}>
                              <Text style={{ fontSize: 9.5, fontWeight: '600', color: '#475569' }}>{tx.category}</Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      <Text style={{ fontSize: 15, fontWeight: '800', color: isIncome ? '#10b981' : '#ef4444' }}>
                        {isIncome ? `+${tx.amount} DT` : `-${tx.amount} DT`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ── 4. TAB CONTENT: UNPAID (STREAMLINED FINTECH LIST) ────────────── */}
        {activeTab === 'unpaid' && (
          <View style={{ marginTop: 4 }}>
            {/* 4A. Compact Dual KPI Ribbon */}
            <View
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 14,
                padding: 10,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              {/* Scolarités dues */}
              <View style={{ flex: 1, paddingLeft: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <GraduationCap size={13} color="#059669" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>Scolarités Dues</Text>
                  <View style={{ backgroundColor: '#ecfdf5', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, marginLeft: 'auto', marginRight: 8 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#059669' }}>{studentItems.length}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 17, fontWeight: '900', color: '#0f172a', marginTop: 2 }}>
                  {unpaidStudentsTotal.toLocaleString()} DT
                </Text>
              </View>

              <View style={{ width: 1, height: 32, backgroundColor: '#e2e8f0' }} />

              {/* Salaires dus */}
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Wallet size={13} color="#f43f5e" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>Salaires Dus</Text>
                  <View style={{ backgroundColor: '#fff1f2', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, marginLeft: 'auto', marginRight: 4 }}>
                    <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#e11d48' }}>{unpaidEmployeesCount}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 17, fontWeight: '900', color: '#0f172a', marginTop: 2 }}>
                  {unpaidEmployeesTotal.toLocaleString()} DT
                </Text>
              </View>
            </View>

            {/* 4B. Search + Filter Bar */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#fff',
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                marginBottom: 8,
              }}
            >
              <Search size={15} color="#94a3b8" />
              <TextInput
                value={unpaidSearch}
                onChangeText={setUnpaidSearch}
                placeholder="Rechercher élève, enseignant, classe..."
                placeholderTextColor="#94a3b8"
                style={{ flex: 1, marginLeft: 8, fontSize: 12.5, color: '#1e293b' }}
              />
              {unpaidSearch ? (
                <TouchableOpacity onPress={() => setUnpaidSearch('')}>
                  <X size={14} color="#94a3b8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* 4C. Horizontal Category Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 6 }}>
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
                      gap: 4,
                      paddingVertical: 5,
                      paddingHorizontal: 10,
                      borderRadius: 16,
                      backgroundColor: isActive ? '#0f172a' : '#ffffff',
                      borderWidth: 1,
                      borderColor: isActive ? '#0f172a' : '#e2e8f0',
                    }}
                  >
                    <Text style={{ fontSize: 11.5, fontWeight: isActive ? '800' : '600', color: isActive ? '#ffffff' : '#64748b' }}>
                      {tab.label}
                    </Text>
                    <View style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : '#f1f5f9', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8 }}>
                      <Text style={{ fontSize: 9.5, fontWeight: '800', color: isActive ? '#ffffff' : '#475569' }}>
                        {tab.count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 4D. List of Unpaid Cards */}
            {loading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0055d4" />
                <Text style={{ fontSize: 13, color: '#64748b', marginTop: 12 }}>Chargement des impayés...</Text>
              </View>
            ) : filteredUnpaid.length === 0 ? (
              <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 30, alignItems: 'center', marginTop: 4, borderWidth: 1, borderColor: '#e2e8f0' }}>
                <CheckCircle2 size={32} color="#10b981" />
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#1e293b', marginTop: 8 }}>Tout est en règle !</Text>
                <Text style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 3 }}>
                  Aucun impayé trouvé pour {monthLabel}.
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
                        borderColor: '#e2e8f0',
                        shadowColor: '#000',
                        shadowOpacity: 0.02,
                        shadowRadius: 4,
                        elevation: 1,
                      }}
                    >
                      {/* Top Row: Icon + Name + Class + Due Amount */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 8 }}>
                          {/* Role Icon */}
                          <View
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 17,
                              backgroundColor: isStudent ? '#ecfdf5' : isTeacher ? '#eff6ff' : '#f5f3ff',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {isStudent ? (
                              <GraduationCap size={16} color="#059669" />
                            ) : isTeacher ? (
                              <User size={16} color="#0055d4" />
                            ) : (
                              <Briefcase size={16} color="#7c3aed" />
                            )}
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0f172a' }} numberOfLines={1}>
                              {item.name}
                            </Text>

                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 2 }}>
                              {item.className ? (
                                <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 }}>
                                  <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#0055d4' }}>{item.className}</Text>
                                </View>
                              ) : null}

                              {isTeacher ? (
                                <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 }}>
                                  <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#0055d4' }}>Enseignant</Text>
                                </View>
                              ) : null}

                              {isStaff ? (
                                <View style={{ backgroundColor: '#f5f3ff', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 }}>
                                  <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#7c3aed' }}>Personnel</Text>
                                </View>
                              ) : null}

                              {item.parentName ? (
                                <Text style={{ fontSize: 10.5, color: '#64748b' }} numberOfLines={1}>
                                  • {item.parentName}
                                </Text>
                              ) : null}

                              {Boolean(item.advanceAmount && item.advanceAmount > 0) && (
                                <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 }}>
                                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#d97706' }}>
                                    Avance {item.advanceAmount} DT
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>

                        {/* Amount */}
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: '900',
                              color: item.dueAmount > 0 ? (isStudent ? '#dc2626' : '#0f172a') : '#10b981',
                              letterSpacing: -0.3,
                            }}
                          >
                            {item.dueAmount} DT
                          </Text>
                          {isStudent && item.status === 'PARTIAL' && (
                            <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#d97706' }}>
                              Acompte {item.paidAmount} DT
                            </Text>
                          )}
                          {!isStudent && item.dueAmount === 0 && (
                            <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#10b981' }}>
                              Soldé
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* Action Row: Sleek & Native */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                        {/* Call button */}
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
                          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                        >
                          <Phone size={13} color="#475569" />
                        </TouchableOpacity>

                        {/* WhatsApp button (Students only) */}
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
                            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                          >
                            <MessageCircle size={14} color="#059669" />
                          </TouchableOpacity>
                        )}

                        {/* Quick action button (Encaisser / Payer) */}
                        <TouchableOpacity
                          onPress={() => openPayModal(item)}
                          style={{
                            flex: 1,
                            backgroundColor: isStudent ? '#059669' : '#0f172a',
                            borderRadius: 8,
                            paddingVertical: 7,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 5,
                            marginLeft: 4,
                          }}
                          activeOpacity={0.85}
                        >
                          {isStudent ? (
                            <>
                              <HandCoins size={13} color="#ffffff" />
                              <Text style={{ fontSize: 12, fontWeight: '800', color: '#ffffff' }}>Encaisser</Text>
                            </>
                          ) : (
                            <>
                              <CreditCard size={13} color="#ffffff" />
                              <Text style={{ fontSize: 12, fontWeight: '800', color: '#ffffff' }}>Payer</Text>
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
        )}
      </ScrollView>

      {/* ── 6. QUICK PAYMENT / COLLECTION MODAL ─────────────────────────────── */}
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
              borderRadius: 20,
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
                  {monthLabel}
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
