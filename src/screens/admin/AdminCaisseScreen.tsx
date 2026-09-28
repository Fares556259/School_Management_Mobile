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
  // RENDER
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc', paddingTop: topPadding }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" translucent={Platform.OS === 'android'} />

      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: '#0f172a' }}>💰 Caisse & Finances</Text>
          <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '500', marginTop: 2 }}>{monthLabel} • Radar financier</Text>
        </View>
        <TouchableOpacity
          onPress={onRefresh}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 }}
        >
          <RefreshCw size={18} color="#0055d4" />
        </TouchableOpacity>
      </View>

      {/* ── MONTH SELECTOR BAR (MINIMAL LUXURY) ───────────────────────────── */}
      <View
        style={{
          marginHorizontal: 20,
          marginTop: 4,
          marginBottom: 6,
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
          shadowRadius: 5,
          elevation: 1,
        }}
      >
        <TouchableOpacity
          onPress={handlePrevMonth}
          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
          activeOpacity={0.7}
        >
          <ChevronLeft size={18} color="#0f172a" />
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Calendar size={15} color="#0055d4" />
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a', letterSpacing: -0.2 }}>
            {monthLabel}
          </Text>
          {isCurrentMonth ? (
            <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#0055d4' }}>En cours</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleResetToCurrentMonth}
              style={{ backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}
            >
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#d97706' }}>Ce mois</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={handleNextMonth}
          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
          activeOpacity={0.7}
        >
          <ChevronRight size={18} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0055d4']} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. HERO CASH BALANCE CARD (CLEAN APPLE / MINIMAL LUXURY) ─────── */}
        <View
          style={{
            marginTop: 8,
            backgroundColor: '#ffffff',
            borderRadius: 20,
            padding: 20,
            borderWidth: 1,
            borderColor: '#e2e8f0',
            shadowColor: '#0f172a',
            shadowOpacity: 0.05,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
          }}
        >
          {/* Header Row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet size={16} color="#059669" />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a', letterSpacing: -0.2 }}>
                Point de Caisse du Jour
              </Text>
            </View>
            <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b' }}>
                Aujourd'hui
              </Text>
            </View>
          </View>

          {/* Hero Net Amount */}
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 }}>
              Solde Net en Caisse
            </Text>
            <Text
              style={{
                fontSize: 34,
                fontWeight: '900',
                color: summary.todayNet >= 0 ? '#059669' : '#dc2626',
                letterSpacing: -0.5,
              }}
            >
              {summary.todayNet >= 0 ? `+${summary.todayNet.toLocaleString()} DT` : `${summary.todayNet.toLocaleString()} DT`}
            </Text>
          </View>

          {/* Inflow vs Outflow Split Row */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#f8fafc',
              borderRadius: 14,
              paddingVertical: 12,
              paddingHorizontal: 16,
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
              borderWidth: 1,
              borderColor: '#f1f5f9',
            }}
          >
            <View style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <ArrowDownLeft size={13} color="#059669" />
                <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '600' }}>Recettes</Text>
              </View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#059669' }}>
                +{summary.todayIncome.toLocaleString()} DT
              </Text>
            </View>

            <View style={{ width: 1, height: 34, backgroundColor: '#e2e8f0' }} />

            <View style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <ArrowUpRight size={13} color="#dc2626" />
                <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '600' }}>Dépenses</Text>
              </View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#dc2626' }}>
                -{summary.todayExpense.toLocaleString()} DT
              </Text>
            </View>
          </View>

          {/* Primary Action Button: 🖨️ IMPRIMER LE LIVRE DE CAISSE */}
          <TouchableOpacity
            onPress={handlePrintBordereau}
            disabled={printing}
            activeOpacity={0.85}
            style={{
              backgroundColor: '#059669',
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 8,
              shadowColor: '#059669',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.18,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            {printing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Printer size={16} color="#ffffff" strokeWidth={2.2} />
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff', letterSpacing: -0.2 }}>
                  Imprimer le Livre de Caisse (A4)
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Secondary Action: Partager PDF */}
          <TouchableOpacity
            onPress={handleShareBordereau}
            disabled={sharing}
            activeOpacity={0.8}
            style={{
              backgroundColor: '#f8fafc',
              borderWidth: 1,
              borderColor: '#e2e8f0',
              borderRadius: 10,
              paddingVertical: 9,
              paddingHorizontal: 12,
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
                  Partager le PDF officiel (WhatsApp / Email)
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── 2. HNIA ACTION BANNER (CO-PILOT ENTRY) ────────────────────────── */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Hnia')}
          activeOpacity={0.88}
          style={{
            marginTop: 14,
            backgroundColor: '#eff6ff',
            borderWidth: 1.5,
            borderColor: '#bfdbfe',
            borderRadius: 16,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 10 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#0055d4', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#1e3a8a' }}>Actionner la caisse avec Hnia</Text>
              <Text style={{ fontSize: 12, color: '#475569', marginTop: 2 }} numberOfLines={1}>
                "Hnia, note 150 DT pour Youssef" ou "Dépense 30 DT"
              </Text>
            </View>
          </View>
          <ArrowRight size={18} color="#0055d4" />
        </TouchableOpacity>

        {/* ── 3. SEGMENTED TABS ────────────────────────────────────────────── */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#e2e8f0',
            borderRadius: 12,
            padding: 4,
            marginTop: 20,
          }}
        >
          <TouchableOpacity
            onPress={() => setActiveTab('movements')}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: activeTab === 'movements' ? '#fff' : 'transparent',
              alignItems: 'center',
              shadowColor: activeTab === 'movements' ? '#000' : 'transparent',
              shadowOpacity: activeTab === 'movements' ? 0.08 : 0,
              shadowRadius: 4,
              elevation: activeTab === 'movements' ? 2 : 0,
            }}
          >
            <Text
              style={{
                fontSize: 14,
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
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: activeTab === 'unpaid' ? '#fff' : 'transparent',
              alignItems: 'center',
              shadowColor: activeTab === 'unpaid' ? '#000' : 'transparent',
              shadowOpacity: activeTab === 'unpaid' ? 0.08 : 0,
              shadowRadius: 4,
              elevation: activeTab === 'unpaid' ? 2 : 0,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: activeTab === 'unpaid' ? '#0f172a' : '#64748b',
                }}
              >
                Impayés ({allUnpaid.length})
              </Text>
              {allUnpaid.length > 0 && (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* ── 4. TAB CONTENT: MOVEMENTS ────────────────────────────────────── */}
        {activeTab === 'movements' && (
          <View style={{ marginTop: 16 }}>
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
                  padding: 32,
                  alignItems: 'center',
                  marginTop: 8,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                }}
              >
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Clock size={28} color="#94a3b8" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e293b' }}>Aucun flux aujourd'hui</Text>
                <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 6, lineHeight: 18 }}>
                  Toutes les transactions encaissées ou dépensées aujourd'hui apparaîtront ici en temps réel.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {transactions.map((tx) => {
                  const isIncome = tx.type === 'IN';
                  const timeStr = new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <View
                      key={tx.id}
                      style={{
                        backgroundColor: '#fff',
                        borderRadius: 14,
                        padding: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderWidth: 1,
                        borderColor: '#f1f5f9',
                        shadowColor: '#000',
                        shadowOpacity: 0.02,
                        shadowRadius: 6,
                        elevation: 1,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 10 }}>
                        <View
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 19,
                            backgroundColor: isIncome ? '#ecfdf5' : '#fef2f2',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isIncome ? <ArrowDownLeft size={18} color="#10b981" /> : <ArrowUpRight size={18} color="#ef4444" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b' }} numberOfLines={1}>
                            {tx.title}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                            <Text style={{ fontSize: 11, color: '#94a3b8' }}>{timeStr}</Text>
                            <Text style={{ fontSize: 11, color: '#cbd5e1' }}>•</Text>
                            <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                              <Text style={{ fontSize: 10, fontWeight: '600', color: '#475569' }}>{tx.category}</Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      <Text style={{ fontSize: 16, fontWeight: '800', color: isIncome ? '#10b981' : '#ef4444' }}>
                        {isIncome ? `+${tx.amount} DT` : `-${tx.amount} DT`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ── 5. TAB CONTENT: UNPAID ENTITIES (STUDENTS, TEACHERS, STAFF) ──── */}
        {activeTab === 'unpaid' && (
          <View style={{ marginTop: 16 }}>
            {/* 5A. Dual KPI Overview (ActionCenter Style Adapted to Mobile) */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              {/* Card 1: Rémunérations En Attente */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#ffffff',
                  borderRadius: 14,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderLeftWidth: 4,
                  borderLeftColor: '#f43f5e',
                  shadowColor: '#000',
                  shadowOpacity: 0.02,
                  shadowRadius: 5,
                  elevation: 1,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Wallet size={13} color="#f43f5e" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>
                      Salaires Dus
                    </Text>
                  </View>
                  <View style={{ backgroundColor: '#fff1f2', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#e11d48' }}>
                      {unpaidEmployeesCount}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>
                  {unpaidEmployeesTotal.toLocaleString()} DT
                </Text>
                <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                  {teacherItems.length} ens. • {staffItems.length} pers.
                </Text>
              </View>

              {/* Card 2: Scolarités En Souffrance */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#ffffff',
                  borderRadius: 14,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderLeftWidth: 4,
                  borderLeftColor: '#10b981',
                  shadowColor: '#000',
                  shadowOpacity: 0.02,
                  shadowRadius: 5,
                  elevation: 1,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <GraduationCap size={13} color="#10b981" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>
                      Scolarités Dues
                    </Text>
                  </View>
                  <View style={{ backgroundColor: '#ecfdf5', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#059669' }}>
                      {studentItems.length}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>
                  {unpaidStudentsTotal.toLocaleString()} DT
                </Text>
                <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                  {studentItems.length} élève(s) en attente
                </Text>
              </View>
            </View>

            {/* 5B. Category Filter Pills */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              {[
                { key: 'ALL', label: `Tous (${allUnpaid.length})` },
                { key: 'STUDENT', label: `Élèves (${studentItems.length})` },
                { key: 'TEACHER', label: `Enseignants (${teacherItems.length})` },
                { key: 'STAFF', label: `Personnel (${staffItems.length})` },
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
                      paddingVertical: 7,
                      paddingHorizontal: 11,
                      borderRadius: 18,
                      backgroundColor: isActive ? '#0f172a' : '#ffffff',
                      borderWidth: 1,
                      borderColor: isActive ? '#0f172a' : '#e2e8f0',
                      shadowColor: isActive ? '#0f172a' : 'transparent',
                      shadowOpacity: isActive ? 0.12 : 0,
                      shadowRadius: 3,
                      elevation: isActive ? 1 : 0,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11.5,
                        fontWeight: isActive ? '800' : '600',
                        color: isActive ? '#ffffff' : '#64748b',
                      }}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 5C. Search Input */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#fff',
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 9,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                marginBottom: 12,
              }}
            >
              <Search size={16} color="#94a3b8" />
              <TextInput
                value={unpaidSearch}
                onChangeText={setUnpaidSearch}
                placeholder="Chercher par nom, classe, contact..."
                placeholderTextColor="#94a3b8"
                style={{ flex: 1, marginLeft: 8, fontSize: 13, color: '#1e293b' }}
              />
              {unpaidSearch ? (
                <TouchableOpacity onPress={() => setUnpaidSearch('')}>
                  <X size={15} color="#94a3b8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* 5D. Unpaid Entities List */}
            {loading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0055d4" />
                <Text style={{ fontSize: 13, color: '#64748b', marginTop: 12 }}>Chargement des impayés...</Text>
              </View>
            ) : filteredUnpaid.length === 0 ? (
              <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', marginTop: 4 }}>
                <CheckCircle2 size={36} color="#10b981" />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e293b', marginTop: 10 }}>Tout est en règle !</Text>
                <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 4 }}>
                  Aucun impayé trouvé pour {monthLabel}.
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
                        padding: 14,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        shadowColor: '#000',
                        shadowOpacity: 0.02,
                        shadowRadius: 5,
                        elevation: 1,
                      }}
                    >
                      {/* Top Row: Avatar + Name + Tags + Net Due Amount */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 8 }}>
                          {/* Role Icon */}
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

                          {/* Info */}
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>
                              {item.name}
                            </Text>

                            {/* Tags row */}
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 3 }}>
                              {isStudent && (
                                <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#0055d4' }}>{item.className}</Text>
                                </View>
                              )}

                              {isTeacher && (
                                <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#0055d4' }}>ENSEIGNANTS</Text>
                                </View>
                              )}

                              {isStaff && (
                                <View style={{ backgroundColor: '#f5f3ff', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#7c3aed' }}>PERSONNEL</Text>
                                </View>
                              )}

                              {/* Advance badge */}
                              {Boolean(item.advanceAmount && item.advanceAmount > 0) && (
                                <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#d97706' }}>
                                    Avance: {item.advanceAmount} DT
                                  </Text>
                                </View>
                              )}

                              {/* Missed hours deduction badge */}
                              {Boolean(item.missedHours && item.missedHours > 0) && (
                                <View style={{ backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#dc2626' }}>
                                    {item.missedHours}h abs. (-{item.deduction || 0} DT)
                                  </Text>
                                </View>
                              )}

                              {isStudent && item.parentName && (
                                <Text style={{ fontSize: 11, color: '#64748b' }}>
                                  • {item.parentName}
                                </Text>
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
                            }}
                          >
                            {item.dueAmount} DT
                          </Text>
                          {isStudent && item.status === 'PARTIAL' && (
                            <Text style={{ fontSize: 10, fontWeight: '600', color: '#f59e0b', marginTop: 1 }}>
                              Acompte: {item.paidAmount} DT
                            </Text>
                          )}
                          {!isStudent && item.dueAmount === 0 && (
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#10b981', marginTop: 1 }}>
                              Soldé
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* Bottom Action Shortcuts */}
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                        {/* 1. Call Button */}
                        <TouchableOpacity
                          onPress={() => handleCall(isStudent ? item.parentPhone : item.phone, item.name)}
                          style={{
                            flex: 1,
                            backgroundColor: '#f1f5f9',
                            borderRadius: 9,
                            paddingVertical: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 5,
                          }}
                        >
                          <Phone size={13} color="#334155" />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>Appeler</Text>
                        </TouchableOpacity>

                        {/* 2. WhatsApp Button (Students only) */}
                        {isStudent && (
                          <TouchableOpacity
                            onPress={() => handleWhatsAppStudent(item.parentPhone, item.name, item.dueAmount)}
                            style={{
                              flex: 1,
                              backgroundColor: '#ecfdf5',
                              borderRadius: 9,
                              paddingVertical: 8,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 5,
                            }}
                          >
                            <MessageCircle size={13} color="#10b981" />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#047857' }}>WhatsApp</Text>
                          </TouchableOpacity>
                        )}

                        {/* 3. Action Pay / Collect Button */}
                        <TouchableOpacity
                          onPress={() => openPayModal(item)}
                          style={{
                            flex: 1.1,
                            backgroundColor: isStudent ? '#059669' : '#0f172a',
                            borderRadius: 9,
                            paddingVertical: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 5,
                          }}
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
