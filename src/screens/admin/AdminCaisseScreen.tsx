import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
  StatusBar,
  Linking,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  HandCoins,
  Receipt,
  Search,
  Phone,
  MessageCircle,
  Plus,
  X,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  Filter,
  Check,
  Building,
  RefreshCw,
} from 'lucide-react-native';
import { adminService } from '../../services/api';
import { StatusToast, ToastConfig } from '../../components/StatusToast';

interface Transaction {
  id: string;
  type: 'IN' | 'OUT';
  title: string;
  category: string;
  amount: number;
  createdAt: string;
}

interface UnpaidStudent {
  id: string;
  name: string;
  className: string;
  parentName: string;
  parentPhone: string;
  fullFee: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
}

interface CaisseSummary {
  todayIncome: number;
  todayExpense: number;
  todayNet: number;
  monthIncome: number;
  monthExpense: number;
  unpaidCount: number;
  unpaidTotal: number;
}

export default function AdminCaisseScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0);

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
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unpaidStudents, setUnpaidStudents] = useState<UnpaidStudent[]>([]);
  const [monthLabel, setMonthLabel] = useState('Ce mois');

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'movements' | 'unpaid'>('movements');

  // Filter in unpaid tab
  const [unpaidSearch, setUnpaidSearch] = useState('');

  // Toast
  const [toast, setToast] = useState<ToastConfig>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  // ── QUICK PAY MODAL STATE ──────────────────────────────────────────────────
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<UnpaidStudent | null>(null);
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'Espèces' | 'Chèque' | 'Virement'>('Espèces');
  const [submittingPay, setSubmittingPay] = useState(false);

  // ── QUICK EXPENSE MODAL STATE ──────────────────────────────────────────────
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Divers');
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // ── DATA FETCHING ──────────────────────────────────────────────────────────
  const loadCaisseData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await adminService.fetchCaisse();
      if (data && data.success) {
        setSummary(data.summary);
        setTransactions(data.todayTransactions || []);
        setUnpaidStudents(data.unpaidStudents || []);
        if (data.monthLabel) setMonthLabel(data.monthLabel);
      }
    } catch (err: any) {
      console.error('Failed to load caisse data:', err);
      setToast({
        visible: true,
        type: 'error',
        title: 'Erreur réseau',
        message: 'Impossible de synchroniser la caisse.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCaisseData();
  }, [loadCaisseData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCaisseData(true);
  };

  // ── FILTERED UNPAID STUDENTS ───────────────────────────────────────────────
  const filteredUnpaid = useMemo(() => {
    if (!unpaidSearch.trim()) return unpaidStudents;
    const q = unpaidSearch.toLowerCase();
    return unpaidStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q) ||
        s.parentName.toLowerCase().includes(q)
    );
  }, [unpaidStudents, unpaidSearch]);

  // ── SEARCH STUDENTS FOR QUICK PAY ──────────────────────────────────────────
  useEffect(() => {
    if (!searchStudentQuery || searchStudentQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingStudents(true);
      try {
        const res = await adminService.searchStudentsForCaisse(searchStudentQuery.trim());
        if (res?.success) {
          setSearchResults(res.students || []);
        }
      } catch (err) {
        console.error('Student search error:', err);
      } finally {
        setSearchingStudents(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchStudentQuery]);

  // ── OPEN QUICK PAY FOR A SPECIFIC STUDENT ──────────────────────────────────
  const handleOpenPayForStudent = (student: UnpaidStudent) => {
    setSelectedStudent(student);
    setPayAmount(student.dueAmount.toString());
    setPayMethod('Espèces');
    setPayModalVisible(true);
  };

  // ── SUBMIT QUICK PAY ───────────────────────────────────────────────────────
  const handleConfirmPayment = async () => {
    const student = selectedStudent;
    if (!student) {
      Alert.alert('Attention', 'Veuillez sélectionner un élève.');
      return;
    }
    const amountNum = parseFloat(payAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Montant invalide', 'Veuillez saisir un montant positif.');
      return;
    }

    setSubmittingPay(true);
    try {
      const res = await adminService.collectStudentPayment({
        studentId: student.id,
        amount: amountNum,
        paymentMethod: payMethod,
      });

      if (res?.success) {
        setPayModalVisible(false);
        setSelectedStudent(null);
        setPayAmount('');
        setToast({
          visible: true,
          type: 'success',
          title: 'Encaissement validé !',
          message: `${amountNum} DT enregistrés pour ${student.name}`,
        });
        loadCaisseData(true);
      } else {
        Alert.alert('Erreur', res?.error || "Échec de l'encaissement.");
      }
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Erreur de connexion.');
    } finally {
      setSubmittingPay(false);
    }
  };

  // ── SUBMIT QUICK EXPENSE ───────────────────────────────────────────────────
  const handleConfirmExpense = async () => {
    if (!expenseTitle.trim()) {
      Alert.alert('Attention', 'Veuillez indiquer le libellé de la dépense.');
      return;
    }
    const amountNum = parseFloat(expenseAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Montant invalide', 'Veuillez indiquer un montant positif.');
      return;
    }

    setSubmittingExpense(true);
    try {
      const res = await adminService.recordExpense({
        title: expenseTitle.trim(),
        amount: amountNum,
        category: expenseCategory,
      });

      if (res?.success) {
        setExpenseModalVisible(false);
        setExpenseTitle('');
        setExpenseAmount('');
        setToast({
          visible: true,
          type: 'success',
          title: 'Dépense enregistrée',
          message: `-${amountNum} DT sortis de caisse (${expenseCategory}).`,
        });
        loadCaisseData(true);
      } else {
        Alert.alert('Erreur', res?.error || 'Échec de la dépense.');
      }
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Erreur de connexion.');
    } finally {
      setSubmittingExpense(false);
    }
  };

  // ── WHATSAPP & PHONE SHORTCUTS ─────────────────────────────────────────────
  const handleCallParent = (phone: string, studentName: string) => {
    if (!phone) {
      Alert.alert('Numéro manquant', `Aucun numéro de téléphone pour ${studentName}.`);
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsAppParent = (phone: string, studentName: string, dueAmount: number) => {
    if (!phone) {
      Alert.alert('Numéro manquant', `Aucun numéro de téléphone pour ${studentName}.`);
      return;
    }
    // Clean phone number: remove non-digits
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    // If Tunisian 8 digits without country code, add 216
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
          <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '500', marginTop: 2 }}>{monthLabel} • Suivi en direct</Text>
        </View>
        <TouchableOpacity
          onPress={onRefresh}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 }}
        >
          <RefreshCw size={18} color="#0055d4" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0055d4']} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. HERO CASH BALANCE CARD ────────────────────────────────────── */}
        <View
          style={{
            marginTop: 12,
            backgroundColor: '#0f172a',
            borderRadius: 20,
            padding: 22,
            shadowColor: '#0f172a',
            shadowOpacity: 0.15,
            shadowRadius: 15,
            shadowOffset: { width: 0, height: 6 },
            elevation: 4,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet size={18} color="#38bdf8" />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Solde Net du Jour
              </Text>
            </View>
            <View style={{ backgroundColor: summary.todayNet >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: summary.todayNet >= 0 ? '#34d399' : '#f87171' }}>
                {summary.todayNet >= 0 ? '+ Aujourd\'hui' : '- Aujourd\'hui'}
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 36, fontWeight: '900', color: '#fff', marginTop: 14, letterSpacing: -0.5 }}>
            {summary.todayNet >= 0 ? `+${summary.todayNet.toLocaleString()} DT` : `${summary.todayNet.toLocaleString()} DT`}
          </Text>

          {/* Inflow vs Outflow Split */}
          <View style={{ flexDirection: 'row', marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(16,185,129,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowDownLeft size={18} color="#10b981" />
              </View>
              <View>
                <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '500' }}>Recettes</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#34d399' }}>+{summary.todayIncome.toLocaleString()} DT</Text>
              </View>
            </View>

            <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 8 }} />

            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 8 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(239,68,68,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowUpRight size={18} color="#ef4444" />
              </View>
              <View>
                <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '500' }}>Dépenses</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#f87171' }}>-{summary.todayExpense.toLocaleString()} DT</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── 2. FAST ACTION BUTTONS ────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
          {/* Quick Pay */}
          <TouchableOpacity
            onPress={() => {
              setSelectedStudent(null);
              setSearchStudentQuery('');
              setPayAmount('');
              setPayMethod('Espèces');
              setPayModalVisible(true);
            }}
            style={{
              flex: 1,
              backgroundColor: '#0055d4',
              borderRadius: 16,
              paddingVertical: 14,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              shadowColor: '#0055d4',
              shadowOpacity: 0.25,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 3,
            }}
          >
            <HandCoins size={20} color="#fff" />
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Encaisser</Text>
          </TouchableOpacity>

          {/* Quick Expense */}
          <TouchableOpacity
            onPress={() => {
              setExpenseTitle('');
              setExpenseAmount('');
              setExpenseCategory('Divers');
              setExpenseModalVisible(true);
            }}
            style={{
              flex: 1,
              backgroundColor: '#fff',
              borderWidth: 1.5,
              borderColor: '#fecaca',
              borderRadius: 16,
              paddingVertical: 14,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              shadowColor: '#000',
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <Receipt size={20} color="#ef4444" />
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#ef4444' }}>Dépense</Text>
          </TouchableOpacity>
        </View>

        {/* ── 3. SEGMENTED TABS ────────────────────────────────────────────── */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#e2e8f0',
            borderRadius: 12,
            padding: 4,
            marginTop: 22,
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
              Mouvements ({transactions.length})
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
                Impayés ({unpaidStudents.length})
              </Text>
              {unpaidStudents.length > 0 && (
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
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e293b' }}>Aucun mouvement aujourd'hui</Text>
                <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 6, lineHeight: 18 }}>
                  Utilisez les boutons "Encaisser" ou "Dépense" ci-dessus pour enregistrer vos premiers flux du jour.
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

        {/* ── 5. TAB CONTENT: UNPAID FEES ──────────────────────────────────── */}
        {activeTab === 'unpaid' && (
          <View style={{ marginTop: 16 }}>
            {/* Search Input */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#fff',
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                marginBottom: 12,
              }}
            >
              <Search size={18} color="#94a3b8" />
              <TextInput
                value={unpaidSearch}
                onChangeText={setUnpaidSearch}
                placeholder="Chercher un élève, parent, classe..."
                placeholderTextColor="#94a3b8"
                style={{ flex: 1, marginLeft: 8, fontSize: 14, color: '#1e293b' }}
              />
              {unpaidSearch ? (
                <TouchableOpacity onPress={() => setUnpaidSearch('')}>
                  <X size={16} color="#94a3b8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Total to recover banner */}
            <View
              style={{
                backgroundColor: '#fef2f2',
                borderRadius: 12,
                padding: 12,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#fecaca',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#991b1b' }}>
                {unpaidStudents.length} élèves en attente
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#dc2626' }}>
                {summary.unpaidTotal.toLocaleString()} DT à recouvrer
              </Text>
            </View>

            {/* Students List */}
            {filteredUnpaid.length === 0 ? (
              <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', marginTop: 8 }}>
                <CheckCircle2 size={36} color="#10b981" />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e293b', marginTop: 10 }}>Tout est à jour !</Text>
                <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 4 }}>
                  Aucun impayé trouvé pour ce filtre.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {filteredUnpaid.map((student) => {
                  const isPartial = student.status === 'PARTIAL';

                  return (
                    <View
                      key={student.id}
                      style={{
                        backgroundColor: '#fff',
                        borderRadius: 16,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        shadowColor: '#000',
                        shadowOpacity: 0.03,
                        shadowRadius: 6,
                        elevation: 1,
                      }}
                    >
                      {/* Top Row: Name, Class, and Due Badge */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>{student.name}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#0055d4' }}>{student.className}</Text>
                            </View>
                            <Text style={{ fontSize: 12, color: '#64748b' }}>• {student.parentName}</Text>
                          </View>
                        </View>

                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 17, fontWeight: '900', color: '#dc2626' }}>
                            {student.dueAmount} DT
                          </Text>
                          {isPartial && (
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#f59e0b', marginTop: 2 }}>
                              (Acompte : {student.paidAmount} DT)
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* Action Row: Call, WhatsApp, Quick Pay */}
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                        {/* Call Button */}
                        <TouchableOpacity
                          onPress={() => handleCallParent(student.parentPhone, student.name)}
                          style={{
                            flex: 1,
                            backgroundColor: '#f1f5f9',
                            borderRadius: 10,
                            paddingVertical: 9,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                          }}
                        >
                          <Phone size={15} color="#334155" />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>Appeler</Text>
                        </TouchableOpacity>

                        {/* WhatsApp Button */}
                        <TouchableOpacity
                          onPress={() => handleWhatsAppParent(student.parentPhone, student.name, student.dueAmount)}
                          style={{
                            flex: 1,
                            backgroundColor: '#ecfdf5',
                            borderRadius: 10,
                            paddingVertical: 9,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                          }}
                        >
                          <MessageCircle size={15} color="#10b981" />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#047857' }}>WhatsApp</Text>
                        </TouchableOpacity>

                        {/* Instant Collect Button */}
                        <TouchableOpacity
                          onPress={() => handleOpenPayForStudent(student)}
                          style={{
                            flex: 1.2,
                            backgroundColor: '#0055d4',
                            borderRadius: 10,
                            paddingVertical: 9,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 5,
                          }}
                        >
                          <HandCoins size={15} color="#fff" />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Encaisser</Text>
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

      {/* ── MODAL 1: ENCAISSEMENT EXPRESS (QUICK PAY) ────────────────────────── */}
      <Modal visible={payModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        >
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, maxHeight: '85%' }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
                  <HandCoins size={20} color="#0055d4" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>Encaissement Express</Text>
              </View>
              <TouchableOpacity onPress={() => setPayModalVisible(false)} style={{ padding: 4 }}>
                <X size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* If no student pre-selected: search bar */}
              {!selectedStudent ? (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Sélectionner un élève</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
                    <Search size={18} color="#94a3b8" />
                    <TextInput
                      value={searchStudentQuery}
                      onChangeText={setSearchStudentQuery}
                      placeholder="Tapez le nom de l'élève..."
                      placeholderTextColor="#94a3b8"
                      style={{ flex: 1, marginLeft: 8, fontSize: 14, color: '#0f172a' }}
                    />
                  </View>

                  {searchingStudents && <ActivityIndicator size="small" color="#0055d4" style={{ marginTop: 8 }} />}

                  {/* Search results list */}
                  {searchResults.length > 0 && (
                    <View style={{ backgroundColor: '#f8fafc', borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: '#e2e8f0', maxHeight: 180 }}>
                      <ScrollView nestedScrollEnabled>
                        {searchResults.map((s) => (
                          <TouchableOpacity
                            key={s.id}
                            onPress={() => {
                              setSelectedStudent(s);
                              setPayAmount(s.dueAmount.toString());
                              setSearchResults([]);
                              setSearchStudentQuery('');
                            }}
                            style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                          >
                            <View>
                              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b' }}>{s.name}</Text>
                              <Text style={{ fontSize: 12, color: '#64748b' }}>{s.className} • Dû : {s.dueAmount} DT</Text>
                            </View>
                            <View style={{ backgroundColor: '#0055d4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>Choisir</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              ) : (
                /* Selected Student Card */
                <View style={{ backgroundColor: '#eff6ff', borderRadius: 14, padding: 14, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#bfdbfe' }}>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#0055d4' }}>{selectedStudent.name}</Text>
                    <Text style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{selectedStudent.className} • Reste dû : {selectedStudent.dueAmount} DT</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedStudent(null)} style={{ backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#dc2626' }}>Changer</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Amount Input */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Montant à encaisser (DT)</Text>
                <TextInput
                  value={payAmount}
                  onChangeText={setPayAmount}
                  placeholder="Ex: 250"
                  keyboardType="numeric"
                  style={{
                    backgroundColor: '#f8fafc',
                    borderWidth: 1.5,
                    borderColor: '#cbd5e1',
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 22,
                    fontWeight: '800',
                    color: '#0f172a',
                  }}
                />

                {/* Quick amount chips */}
                {selectedStudent && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    {[50, 100, 150].map((amt) => (
                      <TouchableOpacity
                        key={amt}
                        onPress={() => setPayAmount(amt.toString())}
                        style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>+{amt} DT</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      onPress={() => setPayAmount(selectedStudent.dueAmount.toString())}
                      style={{ backgroundColor: '#ecfdf5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#a7f3d0' }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#059669' }}>Totalité ({selectedStudent.dueAmount} DT)</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Payment Method Selector */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Mode de règlement</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {(['Espèces', 'Chèque', 'Virement'] as const).map((method) => {
                    const isSelected = payMethod === method;
                    return (
                      <TouchableOpacity
                        key={method}
                        onPress={() => setPayMethod(method)}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 10,
                          alignItems: 'center',
                          backgroundColor: isSelected ? '#0055d4' : '#f1f5f9',
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? '#fff' : '#475569' }}>
                          {method}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Confirm CTA */}
              <TouchableOpacity
                onPress={handleConfirmPayment}
                disabled={submittingPay || !selectedStudent || !payAmount}
                style={{
                  backgroundColor: submittingPay || !selectedStudent || !payAmount ? '#94a3b8' : '#10b981',
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  marginBottom: 10,
                  shadowColor: '#10b981',
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                {submittingPay ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <CheckCircle2 size={20} color="#fff" />
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>
                      Valider l'encaissement ({payAmount ? `${payAmount} DT` : ''})
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL 2: NOUVELLE DÉPENSE (QUICK EXPENSE) ────────────────────────── */}
      <Modal visible={expenseModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        >
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' }}>
                  <Receipt size={20} color="#ef4444" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>Nouvelle Dépense</Text>
              </View>
              <TouchableOpacity onPress={() => setExpenseModalVisible(false)} style={{ padding: 4 }}>
                <X size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Title */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Motif / Libellé</Text>
              <TextInput
                value={expenseTitle}
                onChangeText={setExpenseTitle}
                placeholder="Ex: Fournitures bureau, Plombier, Carburant..."
                placeholderTextColor="#94a3b8"
                style={{
                  backgroundColor: '#f8fafc',
                  borderWidth: 1,
                  borderColor: '#cbd5e1',
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: '#0f172a',
                }}
              />
            </View>

            {/* Amount */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 }}>Montant sorti (DT)</Text>
              <TextInput
                value={expenseAmount}
                onChangeText={setExpenseAmount}
                placeholder="Ex: 45"
                keyboardType="numeric"
                style={{
                  backgroundColor: '#f8fafc',
                  borderWidth: 1.5,
                  borderColor: '#cbd5e1',
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  fontSize: 20,
                  fontWeight: '800',
                  color: '#ef4444',
                }}
              />
            </View>

            {/* Category Chips */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 }}>Catégorie</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {['Fournitures', 'Maintenance', 'Transport', 'Avance', 'Divers'].map((cat) => {
                  const isSelected = expenseCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setExpenseCategory(cat)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 7,
                        borderRadius: 10,
                        backgroundColor: isSelected ? '#ef4444' : '#f1f5f9',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? '#fff' : '#475569' }}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Confirm Expense CTA */}
            <TouchableOpacity
              onPress={handleConfirmExpense}
              disabled={submittingExpense || !expenseTitle || !expenseAmount}
              style={{
                backgroundColor: submittingExpense || !expenseTitle || !expenseAmount ? '#94a3b8' : '#ef4444',
                borderRadius: 16,
                paddingVertical: 15,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
            >
              {submittingExpense ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Check size={18} color="#fff" />
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>Valider la dépense</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Toast Notification */}
      <StatusToast
        visible={toast.visible}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onDismiss={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}
