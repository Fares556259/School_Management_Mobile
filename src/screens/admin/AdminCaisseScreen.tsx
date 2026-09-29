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
  Modal,
  Image,
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
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { adminService, authStorage } from '../../services/api';

interface Transaction {
  id: string;
  type: 'IN' | 'OUT';
  title: string;
  category: string;
  amount: number;
  img?: string | null;
  createdAt: string;
}

interface CaisseSummary {
  todayIncome: number;
  todayExpense: number;
  todayNet: number;
  monthIncome: number;
  monthExpense: number;
}

interface CustomFeedback {
  visible: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
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

  // Dynamic Categories from Server
  const [incomeCategories, setIncomeCategories] = useState<string[]>([
    'Inscription',
    'Cantine',
    'Transport',
    'Activités',
    'Donation',
    'Événement',
    'Autre',
  ]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([
    'Fournitures',
    'Carburant',
    'Maintenance',
    'Énergie & Factures',
    'Transport',
    'Loyer',
    'Salaires',
    'Divers',
  ]);

  // Print & Share loading
  const [printing, setPrinting] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Custom Feedback Modal (Replaces all generic OS Alert.alert!)
  const [feedback, setFeedback] = useState<CustomFeedback | null>(null);

  // Custom Photo Picker Modal (Replaces generic ActionSheet Alert!)
  const [showPhotoPicker, setShowPhotoPicker] = useState<{
    visible: boolean;
    onSelected: (uri: string) => void;
  } | null>(null);

  // Full-Screen Image Preview Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // ── MODAL 1: ENCAISSER RECETTE STATE (PURE DIRECT RECEIPT) ────────────────
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [collectTitle, setCollectTitle] = useState('');
  const [collectAmount, setCollectAmount] = useState('');
  const [collectCategory, setCollectCategory] = useState('Inscription');
  const [collectMethod, setCollectMethod] = useState<'Espèces' | 'Chèque' | 'Virement'>('Espèces');
  const [collectImageUri, setCollectImageUri] = useState<string | null>(null);
  const [showNewIncomeCategoryInput, setShowNewIncomeCategoryInput] = useState(false);
  const [newIncomeCategoryText, setNewIncomeCategoryText] = useState('');
  const [submittingCollect, setSubmittingCollect] = useState(false);
  const [collectError, setCollectError] = useState('');

  // ── MODAL 2: DÉPENSER STATE ────────────────────────────────────────────────
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Fournitures');
  const [expenseImageUri, setExpenseImageUri] = useState<string | null>(null);
  const [showNewExpenseCategoryInput, setShowNewExpenseCategoryInput] = useState(false);
  const [newExpenseCategoryText, setNewExpenseCategoryText] = useState('');
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [expenseError, setExpenseError] = useState('');

  // ── DATA FETCHING ──────────────────────────────────────────────────────────
  const loadCaisseData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await adminService.fetchCaisse();
      if (data && data.success) {
        setSummary(data.summary || { todayIncome: 0, todayExpense: 0, todayNet: 0, monthIncome: 0, monthExpense: 0 });
        setTransactions(data.todayTransactions || []);
        if (data.monthLabel) setMonthLabel(data.monthLabel);
        if (Array.isArray(data.incomeCategories) && data.incomeCategories.length > 0) {
          // Exclude 'Scolarité' / 'Tuition' from general caisse receipts since it lives in Dashboard
          const filtered = data.incomeCategories.filter((c: string) => !['scolarité', 'scolarite', 'tuition'].includes(c.toLowerCase()));
          setIncomeCategories(filtered);
          if (filtered.length > 0) setCollectCategory(filtered[0]);
        }
        if (Array.isArray(data.expenseCategories) && data.expenseCategories.length > 0) {
          setExpenseCategories(data.expenseCategories);
        }
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

  // ── PHOTO PICKER HELPERS ───────────────────────────────────────────────────
  const openGallery = async (onSelected: (uri: string) => void) => {
    setShowPhotoPicker(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setFeedback({
          visible: true,
          type: 'error',
          title: 'Permission requise',
          message: "L'accès à la galerie photo est nécessaire pour joindre un reçu.",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onSelected(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Pick gallery error:', err);
    }
  };

  const openCamera = async (onSelected: (uri: string) => void) => {
    setShowPhotoPicker(null);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setFeedback({
          visible: true,
          type: 'error',
          title: 'Permission requise',
          message: "L'accès à la caméra est nécessaire pour photographier le reçu.",
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onSelected(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Take camera error:', err);
    }
  };

  const triggerPhotoPicker = (onSelected: (uri: string) => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPhotoPicker({ visible: true, onSelected });
  };

  // ── SUBMIT ENCAISSEMENT RECETTE ────────────────────────────────────────────
  const handleConfirmCollect = async () => {
    setCollectError('');
    if (!collectTitle.trim()) {
      setCollectError('Veuillez indiquer le libellé de la recette.');
      return;
    }

    const amt = parseFloat(collectAmount);
    if (isNaN(amt) || amt <= 0) {
      setCollectError('Veuillez saisir un montant positif valide.');
      return;
    }

    setSubmittingCollect(true);
    try {
      let uploadedImgUrl: string | null = null;
      if (collectImageUri) {
        uploadedImgUrl = await adminService.uploadFile(collectImageUri, 'receipt');
      }

      const res = await adminService.recordIncome({
        title: collectTitle.trim(),
        amount: amt,
        category: collectCategory,
        paymentMethod: collectMethod,
        img: uploadedImgUrl,
      });

      if (res && res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowCollectModal(false);
        setCollectTitle('');
        setCollectAmount('');
        setCollectImageUri(null);
        setShowNewIncomeCategoryInput(false);
        setNewIncomeCategoryText('');

        // Custom clean feedback popup
        setFeedback({
          visible: true,
          type: 'success',
          title: 'Recette Encaissée',
          message: `✓ ${amt} DT encaissés avec succès pour "${collectTitle}".`,
        });
        loadCaisseData(true);
      } else {
        throw new Error(res?.error || "Échec de l'enregistrement");
      }
    } catch (err: any) {
      setFeedback({
        visible: true,
        type: 'error',
        title: 'Erreur',
        message: err.message || 'Une erreur est survenue lors de l’encaissement.',
      });
    } finally {
      setSubmittingCollect(false);
    }
  };

  // ── SUBMIT DÉPENSE ─────────────────────────────────────────────────────────
  const handleConfirmExpense = async () => {
    setExpenseError('');
    if (!expenseTitle.trim()) {
      setExpenseError('Veuillez indiquer le motif de la dépense.');
      return;
    }
    const amt = parseFloat(expenseAmount);
    if (isNaN(amt) || amt <= 0) {
      setExpenseError('Veuillez saisir un montant valide.');
      return;
    }

    setSubmittingExpense(true);
    try {
      let uploadedImgUrl: string | null = null;
      if (expenseImageUri) {
        uploadedImgUrl = await adminService.uploadFile(expenseImageUri, 'expense');
      }

      const res = await adminService.recordExpense({
        title: expenseTitle.trim(),
        amount: amt,
        category: expenseCategory,
        img: uploadedImgUrl,
      });

      if (res && res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowExpenseModal(false);
        setExpenseTitle('');
        setExpenseAmount('');
        setExpenseImageUri(null);
        setShowNewExpenseCategoryInput(false);
        setNewExpenseCategoryText('');

        // Custom clean feedback popup
        setFeedback({
          visible: true,
          type: 'success',
          title: 'Dépense Enregistrée',
          message: `✓ ${amt} DT décaissés pour "${expenseTitle}".`,
        });
        loadCaisseData(true);
      } else {
        throw new Error(res?.error || "Échec de l'enregistrement");
      }
    } catch (err: any) {
      setFeedback({
        visible: true,
        type: 'error',
        title: 'Erreur',
        message: err.message || 'Une erreur est survenue lors de la dépense.',
      });
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
      setFeedback({
        visible: true,
        type: 'error',
        title: "Erreur d'impression",
        message: "Impossible d'ouvrir le module d'impression : " + (err.message || ''),
      });
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
        setFeedback({
          visible: true,
          type: 'success',
          title: 'Document enregistré',
          message: `Le bordereau PDF a été enregistré avec succès : ${filename}`,
        });
      }
    } catch (err: any) {
      console.error('[AdminCaisseScreen] Share error:', err);
      setFeedback({
        visible: true,
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de télécharger le bordereau : ' + (err.message || 'Erreur inconnue'),
      });
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
            {/* Quick Hnia Pill */}
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

        {/* ── 2. ACTIONS DU JOUR (MATCHING MODERN LUXURY UI) ───────────────── */}
        <View style={{ marginTop: 18 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
            Actions Rapides du Jour
          </Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {/* Card 1: Encaisser */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCollectError('');
                setShowCollectModal(true);
              }}
              activeOpacity={0.85}
              style={{
                flex: 1,
                backgroundColor: '#ffffff',
                borderRadius: 18,
                paddingVertical: 14,
                paddingHorizontal: 10,
                borderWidth: 1.2,
                borderColor: '#bbf7d0',
                alignItems: 'center',
                shadowColor: '#10b981',
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Plus size={22} color="#059669" strokeWidth={2.5} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>Encaisser</Text>
              <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Recette / Frais</Text>
            </TouchableOpacity>

            {/* Card 2: Dépense */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setExpenseError('');
                setShowExpenseModal(true);
              }}
              activeOpacity={0.85}
              style={{
                flex: 1,
                backgroundColor: '#ffffff',
                borderRadius: 18,
                paddingVertical: 14,
                paddingHorizontal: 10,
                borderWidth: 1.2,
                borderColor: '#fecaca',
                alignItems: 'center',
                shadowColor: '#ef4444',
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Minus size={22} color="#dc2626" strokeWidth={2.5} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>Dépense</Text>
              <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Sortie de caisse</Text>
            </TouchableOpacity>

            {/* Card 3: Hnia IA (LUXURY SOFT-BLUE CARD) */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('Hnia');
              }}
              activeOpacity={0.85}
              style={{
                flex: 1,
                backgroundColor: '#ffffff',
                borderRadius: 18,
                paddingVertical: 14,
                paddingHorizontal: 10,
                borderWidth: 1.2,
                borderColor: '#bfdbfe',
                alignItems: 'center',
                shadowColor: '#0055d4',
                shadowOpacity: 0.08,
                shadowRadius: 6,
                elevation: 2,
                position: 'relative',
              }}
            >
              <View style={{ position: 'absolute', top: 7, right: 7, backgroundColor: '#eff6ff', paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 6, borderWidth: 1, borderColor: '#dbeafe' }}>
                <Text style={{ fontSize: 8.5, fontWeight: '900', color: '#0055d4' }}>IA</Text>
              </View>

              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Bot size={22} color="#0055d4" strokeWidth={2.2} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>Hnia IA</Text>
              <Text style={{ fontSize: 11, color: '#0055d4', fontWeight: '600', marginTop: 2 }}>Vocal / Dictée</Text>
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
                          {tx.img ? (
                            <TouchableOpacity
                              onPress={() => setPreviewImage(tx.img || null)}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 6 }}
                            >
                              <ImageIcon size={10} color="#0055d4" />
                              <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#0055d4' }}>Reçu</Text>
                            </TouchableOpacity>
                          ) : null}
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

      {/* ── MODAL 1: ENCAISSER UNE RECETTE (PURE, CLEAN, NO SCOLARITÉ ELEVE) ──── */}
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
            paddingHorizontal: 16,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 420,
              maxHeight: '90%',
              backgroundColor: '#ffffff',
              borderRadius: 24,
              padding: 22,
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 18,
              elevation: 6,
            }}
          >
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View>
                <Text style={{ fontSize: 19, fontWeight: '900', color: '#0f172a' }}>
                  Encaisser une Recette
                </Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                  Entrée de fonds dans la caisse aujourd'hui
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCollectModal(false)}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              {/* Inline Error if any */}
              {Boolean(collectError) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fef2f2', padding: 10, borderRadius: 10, marginBottom: 12 }}>
                  <AlertCircle size={15} color="#dc2626" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#dc2626' }}>{collectError}</Text>
                </View>
              )}

              {/* Motif / Libellé de la recette */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 5 }}>
                  Motif / Libellé de la recette
                </Text>
                <TextInput
                  value={collectTitle}
                  onChangeText={(t) => {
                    setCollectTitle(t);
                    if (collectError) setCollectError('');
                  }}
                  placeholder="Ex: Frais d'inscription, Cantine, Vente manuels, Don..."
                  placeholderTextColor="#94a3b8"
                  style={{
                    backgroundColor: '#ffffff',
                    borderWidth: 1.5,
                    borderColor: '#cbd5e1',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#0f172a',
                  }}
                />
              </View>

              {/* Amount Field */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 5 }}>
                  Montant encaissé (DT)
                </Text>
                <TextInput
                  value={collectAmount}
                  onChangeText={(t) => {
                    setCollectAmount(t);
                    if (collectError) setCollectError('');
                  }}
                  keyboardType="numeric"
                  placeholder="Ex: 150"
                  placeholderTextColor="#94a3b8"
                  style={{
                    backgroundColor: '#ffffff',
                    borderWidth: 1.5,
                    borderColor: '#cbd5e1',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 18,
                    fontWeight: '800',
                    color: '#0f172a',
                  }}
                />
              </View>

              {/* Mode de règlement */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 5 }}>
                  Mode de règlement
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
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
              </View>

              {/* Catégories de recette + Bouton Créer */}
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                    Catégorie de recette
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowNewIncomeCategoryInput(!showNewIncomeCategoryInput)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
                  >
                    <Plus size={13} color="#0055d4" />
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#0055d4' }}>
                      {showNewIncomeCategoryInput ? 'Fermer' : '+ Nouvelle'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {showNewIncomeCategoryInput && (
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                    <TextInput
                      value={newIncomeCategoryText}
                      onChangeText={setNewIncomeCategoryText}
                      placeholder="Nom de la nouvelle catégorie..."
                      placeholderTextColor="#94a3b8"
                      style={{
                        flex: 1,
                        backgroundColor: '#f8fafc',
                        borderWidth: 1,
                        borderColor: '#0055d4',
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        fontSize: 13,
                        color: '#0f172a',
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => {
                        const trimmed = newIncomeCategoryText.trim();
                        if (trimmed) {
                          if (!incomeCategories.includes(trimmed)) {
                            setIncomeCategories([trimmed, ...incomeCategories]);
                          }
                          setCollectCategory(trimmed);
                          setNewIncomeCategoryText('');
                          setShowNewIncomeCategoryInput(false);
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }
                      }}
                      style={{ backgroundColor: '#0055d4', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' }}
                    >
                      <Check size={16} color="#fff" strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {incomeCategories.map((cat) => {
                    const isSelected = collectCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setCollectCategory(cat);
                        }}
                        style={{
                          paddingVertical: 6,
                          paddingHorizontal: 11,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: isSelected ? '#059669' : '#e2e8f0',
                          backgroundColor: isSelected ? '#f0fdf4' : '#ffffff',
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSelected ? '800' : '600', color: isSelected ? '#059669' : '#475569' }}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Justificatif / Reçu (Photo) */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                  Justificatif / Reçu (Photo)
                </Text>

                {collectImageUri ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f8fafc', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
                    <Image source={{ uri: collectImageUri }} style={{ width: 44, height: 44, borderRadius: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>Justificatif joint</Text>
                      <Text style={{ fontSize: 10.5, color: '#64748b' }}>Photo prête à être enregistrée</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setCollectImageUri(null)}
                      style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <X size={14} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => triggerPhotoPicker(setCollectImageUri)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      borderWidth: 1.2,
                      borderColor: '#cbd5e1',
                      borderStyle: 'dashed',
                      borderRadius: 12,
                      paddingVertical: 11,
                      backgroundColor: '#f8fafc',
                    }}
                  >
                    <Camera size={16} color="#0055d4" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#0055d4' }}>
                      Prendre ou choisir une photo du reçu
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Action Buttons */}
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
            </ScrollView>
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
            paddingHorizontal: 16,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 420,
              maxHeight: '90%',
              backgroundColor: '#ffffff',
              borderRadius: 24,
              padding: 22,
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 18,
              elevation: 6,
            }}
          >
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View>
                <Text style={{ fontSize: 19, fontWeight: '900', color: '#0f172a' }}>
                  Enregistrer une Dépense
                </Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
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

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              {/* Inline Error if any */}
              {Boolean(expenseError) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fef2f2', padding: 10, borderRadius: 10, marginBottom: 12 }}>
                  <AlertCircle size={15} color="#dc2626" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#dc2626' }}>{expenseError}</Text>
                </View>
              )}

              {/* Motif */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 5 }}>
                  Motif de la dépense
                </Text>
                <TextInput
                  value={expenseTitle}
                  onChangeText={(t) => {
                    setExpenseTitle(t);
                    if (expenseError) setExpenseError('');
                  }}
                  placeholder="Ex: Achat ramettes papier, Plomberie, Carburant..."
                  placeholderTextColor="#94a3b8"
                  style={{
                    backgroundColor: '#ffffff',
                    borderWidth: 1.5,
                    borderColor: '#cbd5e1',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#0f172a',
                  }}
                />
              </View>

              {/* Montant */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 5 }}>
                  Montant décaissé (DT)
                </Text>
                <TextInput
                  value={expenseAmount}
                  onChangeText={(t) => {
                    setExpenseAmount(t);
                    if (expenseError) setExpenseError('');
                  }}
                  keyboardType="numeric"
                  placeholder="Ex: 85"
                  placeholderTextColor="#94a3b8"
                  style={{
                    backgroundColor: '#ffffff',
                    borderWidth: 1.5,
                    borderColor: '#cbd5e1',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 18,
                    fontWeight: '800',
                    color: '#0f172a',
                  }}
                />
              </View>

              {/* Catégories de dépense + Bouton Créer */}
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                    Catégorie de dépense
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowNewExpenseCategoryInput(!showNewExpenseCategoryInput)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
                  >
                    <Plus size={13} color="#dc2626" />
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#dc2626' }}>
                      {showNewExpenseCategoryInput ? 'Fermer' : '+ Nouvelle'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {showNewExpenseCategoryInput && (
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                    <TextInput
                      value={newExpenseCategoryText}
                      onChangeText={setNewExpenseCategoryText}
                      placeholder="Nom de la nouvelle catégorie..."
                      placeholderTextColor="#94a3b8"
                      style={{
                        flex: 1,
                        backgroundColor: '#f8fafc',
                        borderWidth: 1,
                        borderColor: '#dc2626',
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        fontSize: 13,
                        color: '#0f172a',
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => {
                        const trimmed = newExpenseCategoryText.trim();
                        if (trimmed) {
                          if (!expenseCategories.includes(trimmed)) {
                            setExpenseCategories([trimmed, ...expenseCategories]);
                          }
                          setExpenseCategory(trimmed);
                          setNewExpenseCategoryText('');
                          setShowNewExpenseCategoryInput(false);
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }
                      }}
                      style={{ backgroundColor: '#dc2626', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' }}
                    >
                      <Check size={16} color="#fff" strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {expenseCategories.map((cat) => {
                    const isSelected = expenseCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setExpenseCategory(cat);
                        }}
                        style={{
                          paddingVertical: 6,
                          paddingHorizontal: 11,
                          borderRadius: 12,
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
              </View>

              {/* Justificatif / Facture (Photo) */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                  Facture / Ticket (Photo)
                </Text>

                {expenseImageUri ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f8fafc', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
                    <Image source={{ uri: expenseImageUri }} style={{ width: 44, height: 44, borderRadius: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>Facture jointe</Text>
                      <Text style={{ fontSize: 10.5, color: '#64748b' }}>Photo prête à être enregistrée</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setExpenseImageUri(null)}
                      style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <X size={14} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => triggerPhotoPicker(setExpenseImageUri)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      borderWidth: 1.2,
                      borderColor: '#cbd5e1',
                      borderStyle: 'dashed',
                      borderRadius: 12,
                      paddingVertical: 11,
                      backgroundColor: '#f8fafc',
                    }}
                  >
                    <Camera size={16} color="#dc2626" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#dc2626' }}>
                      Photographier la facture ou le ticket
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Action Buttons */}
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
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── CUSTOM PHOTO PICKER MODAL (NO GENERIC ALERT DIALOG!) ──────────── */}
      <Modal
        visible={Boolean(showPhotoPicker)}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPhotoPicker(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              paddingTop: 18,
              paddingBottom: Math.max(insets.bottom, 24),
              paddingHorizontal: 20,
            }}
          >
            {/* Top Indicator */}
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 14 }} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>Joindre un Justificatif</Text>
                <Text style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>Prenez une photo ou importez depuis vos photos</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowPhotoPicker(null)}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Option 1: Caméra */}
            <TouchableOpacity
              onPress={() => showPhotoPicker && openCamera(showPhotoPicker.onSelected)}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                padding: 14,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                marginBottom: 10,
              }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Camera size={22} color="#0055d4" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>Prendre une photo</Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>Photographier le ticket avec la caméra</Text>
              </View>
              <ChevronRight size={18} color="#94a3b8" />
            </TouchableOpacity>

            {/* Option 2: Galerie */}
            <TouchableOpacity
              onPress={() => showPhotoPicker && openGallery(showPhotoPicker.onSelected)}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                padding: 14,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                marginBottom: 14,
              }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <ImageIcon size={22} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>Choisir dans la galerie</Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>Importer une image existante</Text>
              </View>
              <ChevronRight size={18} color="#94a3b8" />
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => setShowPhotoPicker(null)}
              style={{ paddingVertical: 13, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748b' }}>Annuler</Text>
            </TouchableOpacity>
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
                backgroundColor: feedback?.type === 'success' ? '#0f172a' : '#dc2626',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#ffffff' }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── FULLSCREEN IMAGE PREVIEW MODAL ──────────────────────────────────── */}
      <Modal
        visible={Boolean(previewImage)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <TouchableOpacity
            onPress={() => setPreviewImage(null)}
            style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={20} color="#ffffff" />
          </TouchableOpacity>
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={{ width: '100%', height: '80%', borderRadius: 12 }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}
