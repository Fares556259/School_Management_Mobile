import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Minus,
  RefreshCw,
  Bot,
  Printer,
  Share2,
  Clock,
  Check,
  X,
  CreditCard,
  HandCoins,
  Search,
  Sparkles,
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

interface CaisseSummary {
  todayIncome: number;
  todayExpense: number;
  todayNet: number;
  monthIncome: number;
  monthExpense: number;
}

export default function AdminCaisseScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<CaisseSummary>({
    todayIncome: 0,
    todayExpense: 0,
    todayNet: 0,
    monthIncome: 0,
    monthExpense: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthLabel, setMonthLabel] = useState('Ce mois');

  // Print & Share
  const [printing, setPrinting] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Quick Action Modal 1: Encaisser (Student tuition or General income)
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState<'Espèces' | 'Chèque' | 'Virement'>('Espèces');
  const [submittingCollect, setSubmittingCollect] = useState(false);

  // Quick Action Modal 2: Dépense (Record expense)
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Fournitures');
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // ── DATA FETCHING ──────────────────────────────────────────────────────────
  const loadCaisseData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await adminService.fetchCaisse();
      if (data && data.success) {
        setSummary(data.summary || { todayIncome: 0, todayExpense: 0, todayNet: 0, monthIncome: 0, monthExpense: 0 });
        setTransactions(data.todayTransactions || []);
        if (data.monthLabel) setMonthLabel(data.monthLabel);
      }
    } catch (err: any) {
      console.error('Failed to load caisse data:', err);
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

  // ── STUDENT SEARCH FOR QUICK COLLECTION ────────────────────────────────────
  const handleStudentSearch = async (text: string) => {
    setStudentSearch(text);
    if (text.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchingStudents(true);
    try {
      const res = await adminService.searchStudentsForCaisse(text.trim());
      if (res && res.success && res.students) {
        setSearchResults(res.students);
      }
    } catch (err) {
      console.error('Search students error:', err);
    } finally {
      setSearchingStudents(false);
    }
  };

  const handleSelectStudent = (student: any) => {
    setSelectedStudent(student);
    setCollectAmount(student.dueAmount > 0 ? student.dueAmount.toString() : '450');
    setSearchResults([]);
  };

  const handleConfirmCollect = async () => {
    if (!selectedStudent) {
      Alert.alert('Élève requis', 'Veuillez rechercher et sélectionner un élève.');
      return;
    }
    const amt = parseFloat(collectAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Montant invalide', 'Veuillez saisir un montant positif valide.');
      return;
    }

    setSubmittingCollect(true);
    try {
      const res = await adminService.collectStudentPayment({
        studentId: selectedStudent.id,
        amount: amt,
        paymentMethod: collectMethod,
      });

      if (res && res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Encaissement réussi', `✓ ${amt} DT encaissés pour ${selectedStudent.name}.`);
        setShowCollectModal(false);
        setSelectedStudent(null);
        setStudentSearch('');
        setCollectAmount('');
        loadCaisseData(true);
      } else {
        throw new Error(res?.error || "Échec de l'encaissement");
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Une erreur est survenue.');
    } finally {
      setSubmittingCollect(false);
    }
  };

  // ── QUICK EXPENSE ──────────────────────────────────────────────────────────
  const handleConfirmExpense = async () => {
    if (!expenseTitle.trim()) {
      Alert.alert('Motif requis', 'Veuillez indiquer le motif de la dépense.');
      return;
    }
    const amt = parseFloat(expenseAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Montant invalide', 'Veuillez saisir un montant valide.');
      return;
    }

    setSubmittingExpense(true);
    try {
      const res = await adminService.recordExpense({
        title: expenseTitle.trim(),
        amount: amt,
        category: expenseCategory,
      });

      if (res && res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Dépense enregistrée', `✓ ${amt} DT décaissés pour "${expenseTitle}".`);
        setShowExpenseModal(false);
        setExpenseTitle('');
        setExpenseAmount('');
        loadCaisseData(true);
      } else {
        throw new Error(res?.error || "Échec de l'enregistrement");
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Une erreur est survenue.');
    } finally {
      setSubmittingExpense(false);
    }
  };

  // ── PRINT & SHARE BORDEREAU ────────────────────────────────────────────────
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

  const todayDateStr = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc', paddingTop: topPadding }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" translucent={Platform.OS === 'android'} />

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 26, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 }}>
              Caisse du Jour
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748b', marginTop: 2, textTransform: 'capitalize' }}>
              {todayDateStr}
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
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#bfdbfe',
              }}
            >
              <Bot size={15} color="#0055d4" />
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0055d4' }}>Hnia</Text>
            </TouchableOpacity>

            {/* Refresh Button */}
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
              <RefreshCw size={15} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0055d4']} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. HERO BALANCE CARD (SOLDE DU JOUR) ─────────────────────────── */}
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 20,
            padding: 18,
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
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet size={14} color="#059669" />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Solde Net Caisse
              </Text>
            </View>
            <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#475569' }}>Aujourd'hui</Text>
            </View>
          </View>

          {/* Big Hero Amount */}
          <View style={{ marginVertical: 10 }}>
            <Text
              style={{
                fontSize: 34,
                fontWeight: '900',
                color: summary.todayNet >= 0 ? '#059669' : '#dc2626',
                letterSpacing: -0.8,
              }}
            >
              {summary.todayNet >= 0 ? `+${summary.todayNet.toLocaleString()} DT` : `${summary.todayNet.toLocaleString()} DT`}
            </Text>
          </View>

          {/* Inflow / Outflow Split */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, gap: 6 }}>
              <ArrowDownLeft size={14} color="#059669" />
              <Text style={{ fontSize: 12, color: '#166534', fontWeight: '600' }}>Recettes</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#15803d', marginLeft: 'auto' }}>
                +{summary.todayIncome.toLocaleString()} DT
              </Text>
            </View>

            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, gap: 6 }}>
              <ArrowUpRight size={14} color="#dc2626" />
              <Text style={{ fontSize: 12, color: '#991b1b', fontWeight: '600' }}>Dépenses</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#b91c1c', marginLeft: 'auto' }}>
                -{summary.todayExpense.toLocaleString()} DT
              </Text>
            </View>
          </View>

          {/* A4 Print & PDF Share */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={handlePrintBordereau}
              disabled={printing}
              activeOpacity={0.8}
              style={{
                flex: 1,
                backgroundColor: '#059669',
                borderRadius: 12,
                paddingVertical: 10,
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
                  <Printer size={14} color="#ffffff" strokeWidth={2.2} />
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#ffffff' }}>
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
                borderRadius: 12,
                paddingVertical: 10,
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
                  <Share2 size={14} color="#0f172a" />
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0f172a' }}>
                    Partager PDF
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 2. ACTIONS DU JOUR (QUICK ACTIONS) ───────────────────────────── */}
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
            Actions Rapides du Jour
          </Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {/* Action 1: Encaisser */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowCollectModal(true);
              }}
              activeOpacity={0.85}
              style={{
                flex: 1,
                backgroundColor: '#ffffff',
                borderRadius: 16,
                paddingVertical: 14,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: '#bbf7d0',
                alignItems: 'center',
                shadowColor: '#10b981',
                shadowOpacity: 0.08,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Plus size={20} color="#059669" strokeWidth={2.5} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>Encaisser</Text>
              <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Recette / Frais</Text>
            </TouchableOpacity>

            {/* Action 2: Dépense */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowExpenseModal(true);
              }}
              activeOpacity={0.85}
              style={{
                flex: 1,
                backgroundColor: '#ffffff',
                borderRadius: 16,
                paddingVertical: 14,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: '#fecaca',
                alignItems: 'center',
                shadowColor: '#ef4444',
                shadowOpacity: 0.08,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Minus size={20} color="#dc2626" strokeWidth={2.5} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>Dépense</Text>
              <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Sortie de caisse</Text>
            </TouchableOpacity>

            {/* Action 3: Hnia Vocale */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('Hnia');
              }}
              activeOpacity={0.85}
              style={{
                flex: 1,
                backgroundColor: '#0f172a',
                borderRadius: 16,
                paddingVertical: 14,
                paddingHorizontal: 12,
                alignItems: 'center',
                shadowColor: '#0f172a',
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Bot size={20} color="#60a5fa" strokeWidth={2.2} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff' }}>Hnia IA</Text>
              <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Vocal / Dictée</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 3. JOURNAL DES FLUX DU JOUR ──────────────────────────────────── */}
        <View style={{ marginTop: 22 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Clock size={16} color="#0055d4" />
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>
                Opérations du Jour
              </Text>
            </View>
            <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#0055d4' }}>
                {transactions.length} mouvement{transactions.length > 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#0055d4" />
              <Text style={{ fontSize: 13, color: '#64748b', marginTop: 12 }}>Chargement des flux...</Text>
            </View>
          ) : transactions.length === 0 ? (
            <View
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 18,
                padding: 32,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#e2e8f0',
              }}
            >
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Wallet size={26} color="#94a3b8" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b' }}>
                Aucun mouvement aujourd'hui
              </Text>
              <Text style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 6, lineHeight: 19 }}>
                Votre caisse est équilibrée. Utilisez les boutons ci-dessus ou demandez à Hnia pour enregistrer une opération.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 9 }}>
              {transactions.map((tx) => {
                const isIncome = tx.type === 'IN';
                const timeStr = new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <View
                    key={tx.id}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: 16,
                      padding: 14,
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 8 }}>
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
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#1e293b' }} numberOfLines={1}>
                          {tx.title}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                          <Text style={{ fontSize: 11, color: '#94a3b8' }}>{timeStr}</Text>
                          <Text style={{ fontSize: 11, color: '#cbd5e1' }}>•</Text>
                          <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 6 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#475569' }}>{tx.category}</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    <Text style={{ fontSize: 16, fontWeight: '900', color: isIncome ? '#10b981' : '#ef4444' }}>
                      {isIncome ? `+${tx.amount} DT` : `-${tx.amount} DT`}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── MODAL 1: ENCAISSER UNE RECETTE / SCOLARITÉ ────────────────────────── */}
      <Modal
        visible={showCollectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCollectModal(false)}
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
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>
                  Encaisser une Scolarité
                </Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  Enregistrement direct en caisse aujourd'hui
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCollectModal(false)}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Student Search */}
            {!selectedStudent ? (
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                  Rechercher un élève
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#f8fafc',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    borderWidth: 1,
                    borderColor: '#cbd5e1',
                  }}
                >
                  <Search size={16} color="#94a3b8" />
                  <TextInput
                    value={studentSearch}
                    onChangeText={handleStudentSearch}
                    placeholder="Nom ou prénom de l'élève..."
                    placeholderTextColor="#94a3b8"
                    style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14, color: '#0f172a' }}
                  />
                  {searchingStudents && <ActivityIndicator size="small" color="#0055d4" />}
                </View>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <View style={{ maxHeight: 180, marginTop: 6, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
                    <ScrollView nestedScrollEnabled>
                      {searchResults.map((st) => (
                        <TouchableOpacity
                          key={st.id}
                          onPress={() => handleSelectStudent(st)}
                          style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <View>
                            <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0f172a' }}>{st.name}</Text>
                            <Text style={{ fontSize: 11, color: '#64748b' }}>{st.className} • Reste : {st.dueAmount} DT</Text>
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#059669' }}>Sélectionner</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            ) : (
              <View style={{ backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#bbf7d0' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#166534' }}>{selectedStudent.name}</Text>
                  <TouchableOpacity onPress={() => setSelectedStudent(null)}>
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#dc2626' }}>Changer</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 12, color: '#15803d', marginTop: 2 }}>
                  {selectedStudent.className} • Reste dû : {selectedStudent.dueAmount} DT
                </Text>
              </View>
            )}

            {/* Amount Field */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
              Montant reçu (DT)
            </Text>
            <TextInput
              value={collectAmount}
              onChangeText={setCollectAmount}
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

            {/* Mode de règlement */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
              Mode de règlement
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {(['Espèces', 'Chèque', 'Virement'] as const).map((method) => {
                const isSelected = collectMethod === method;
                return (
                  <TouchableOpacity
                    key={method}
                    onPress={() => setCollectMethod(method)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: isSelected ? '#059669' : '#e2e8f0',
                      backgroundColor: isSelected ? '#f0fdf4' : '#ffffff',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: isSelected ? '800' : '600', color: isSelected ? '#059669' : '#475569' }}>
                      {method}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowCollectModal(false)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748b' }}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmCollect}
                disabled={submittingCollect}
                style={{
                  flex: 1.4,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: '#059669',
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {submittingCollect ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Check size={16} color="#ffffff" strokeWidth={2.5} />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff' }}>Encaisser</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 2: ENREGISTRER UNE DÉPENSE ──────────────────────────────────── */}
      <Modal
        visible={showExpenseModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExpenseModal(false)}
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
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>
                  Enregistrer une Dépense
                </Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  Sortie de caisse physique aujourd'hui
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowExpenseModal(false)}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Motif */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
              Motif de la dépense
            </Text>
            <TextInput
              value={expenseTitle}
              onChangeText={setExpenseTitle}
              placeholder="Ex: Achat papier ramettes, Réparation plomberie..."
              placeholderTextColor="#94a3b8"
              style={{
                backgroundColor: '#ffffff',
                borderWidth: 1.5,
                borderColor: '#cbd5e1',
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: 14,
                fontWeight: '600',
                color: '#0f172a',
                marginBottom: 14,
              }}
            />

            {/* Montant */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
              Montant décaissé (DT)
            </Text>
            <TextInput
              value={expenseAmount}
              onChangeText={setExpenseAmount}
              keyboardType="numeric"
              placeholder="Ex: 85"
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

            {/* Catégories */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
              Catégorie
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
              {['Fournitures', 'Maintenance', 'Transport', 'Énergie', 'Divers'].map((cat) => {
                const isSelected = expenseCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setExpenseCategory(cat)}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: isSelected ? '#dc2626' : '#e2e8f0',
                      backgroundColor: isSelected ? '#fef2f2' : '#ffffff',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: isSelected ? '800' : '600', color: isSelected ? '#dc2626' : '#475569' }}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setShowExpenseModal(false)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748b' }}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmExpense}
                disabled={submittingExpense}
                style={{
                  flex: 1.4,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: '#dc2626',
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {submittingExpense ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Check size={16} color="#ffffff" strokeWidth={2.5} />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff' }}>Décaisser</Text>
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
