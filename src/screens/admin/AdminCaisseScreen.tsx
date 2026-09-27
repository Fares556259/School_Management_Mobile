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
} from 'lucide-react-native';
import { adminService } from '../../services/api';

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
  const navigation = useNavigation<any>();
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

  // ── WHATSAPP & PHONE SHORTCUTS ─────────────────────────────────────────────
  const handleCallParent = (phone: string, studentName: string) => {
    if (!phone) {
      Alert.alert('Numéro manquant', `Aucun numéro de téléphone enregistré pour ${studentName}.`);
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsAppParent = (phone: string, studentName: string, dueAmount: number) => {
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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0055d4']} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. HERO CASH BALANCE CARD (INFORMATIVE) ───────────────────────── */}
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

                      {/* Action Row: Direct Contact Shortcuts */}
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                        {/* Call Button */}
                        <TouchableOpacity
                          onPress={() => handleCallParent(student.parentPhone, student.name)}
                          style={{
                            flex: 1,
                            backgroundColor: '#f1f5f9',
                            borderRadius: 10,
                            paddingVertical: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                          }}
                        >
                          <Phone size={15} color="#334155" />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>Appeler</Text>
                        </TouchableOpacity>

                        {/* WhatsApp Button */}
                        <TouchableOpacity
                          onPress={() => handleWhatsAppParent(student.parentPhone, student.name, student.dueAmount)}
                          style={{
                            flex: 1,
                            backgroundColor: '#ecfdf5',
                            borderRadius: 10,
                            paddingVertical: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                          }}
                        >
                          <MessageCircle size={15} color="#10b981" />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#047857' }}>WhatsApp</Text>
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
    </View>
  );
}
