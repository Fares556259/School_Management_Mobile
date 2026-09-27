import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
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
} from 'lucide-react-native';
import { adminService } from '../../services/api';

interface DashboardData {
  adminName: string;
  schoolName: string;
  monthLabel: string;
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

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await adminService.fetchDashboard();
      if (res && res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard(true);
  };

  const todayDateStr = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc', paddingTop: topPadding }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" translucent={Platform.OS === 'android'} />

      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600', textTransform: 'capitalize' }}>
            {todayDateStr}
          </Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#0f172a', marginTop: 2 }}>
            Bonjour, {data?.adminName || 'Direction'} 👋
          </Text>
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
        {loading && !data ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#0055d4" />
            <Text style={{ fontSize: 14, color: '#64748b', marginTop: 14, fontWeight: '500' }}>
              Chargement des indicateurs...
            </Text>
          </View>
        ) : (
          <>
            {/* ── 1. OPERATIONS 4-GRID (MATCHING WEB OperationsSnapshot) ───── */}
            <View style={{ marginTop: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  Effectif de l'école • {data?.schoolName || 'SnapSchool'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                {/* Students */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#fff',
                    borderRadius: 16,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: '#f1f5f9',
                    shadowColor: '#000',
                    shadowOpacity: 0.03,
                    shadowRadius: 6,
                    elevation: 1,
                  }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' }}>
                    <GraduationCap size={20} color="#ea580c" />
                  </View>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: '#0f172a', marginTop: 10 }}>
                    {data?.operations.students.toLocaleString() || 0}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600', marginTop: 2 }}>
                    Élèves
                  </Text>
                </View>

                {/* Teachers */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#fff',
                    borderRadius: 16,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: '#f1f5f9',
                    shadowColor: '#000',
                    shadowOpacity: 0.03,
                    shadowRadius: 6,
                    elevation: 1,
                  }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={20} color="#059669" />
                  </View>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: '#0f172a', marginTop: 10 }}>
                    {data?.operations.teachers.toLocaleString() || 0}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600', marginTop: 2 }}>
                    Enseignants
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                {/* Staff */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#fff',
                    borderRadius: 16,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: '#f1f5f9',
                    shadowColor: '#000',
                    shadowOpacity: 0.03,
                    shadowRadius: 6,
                    elevation: 1,
                  }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#fdf4ff', alignItems: 'center', justifyContent: 'center' }}>
                    <UserCheck size={20} color="#c026d3" />
                  </View>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: '#0f172a', marginTop: 10 }}>
                    {data?.operations.staff.toLocaleString() || 0}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600', marginTop: 2 }}>
                    Personnel
                  </Text>
                </View>

                {/* Classes */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#fff',
                    borderRadius: 16,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: '#f1f5f9',
                    shadowColor: '#000',
                    shadowOpacity: 0.03,
                    shadowRadius: 6,
                    elevation: 1,
                  }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#fef9c3', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={20} color="#ca8a04" />
                  </View>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: '#0f172a', marginTop: 10 }}>
                    {data?.operations.classes.toLocaleString() || 0}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600', marginTop: 2 }}>
                    Classes
                  </Text>
                </View>
              </View>
            </View>

            {/* ── 2. FINANCIAL PROGRESS PULSE (MATCHING WEB FinancialKpiSection) ── */}
            <View
              style={{
                marginTop: 18,
                backgroundColor: '#fff',
                borderRadius: 20,
                padding: 18,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                shadowColor: '#000',
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={18} color="#0055d4" />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>
                    Scolarités • {data?.financialPulse.monthLabel || 'Ce mois'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Caisse')}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0055d4' }}>Voir Caisse</Text>
                  <ArrowRight size={14} color="#0055d4" />
                </TouchableOpacity>
              </View>

              {/* Amount collected vs expected */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 14 }}>
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#0055d4' }}>
                  {data?.financialPulse.collectedTuition.toLocaleString() || 0} DT
                </Text>
                <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>
                  sur {data?.financialPulse.expectedTuition.toLocaleString() || 0} DT
                </Text>
              </View>

              {/* Progress Bar */}
              <View style={{ height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, marginTop: 10, overflow: 'hidden' }}>
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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#10b981' }}>
                  {data?.financialPulse.collectionRate || 0}% recouvré
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#dc2626' }}>
                  Reste : {data?.financialPulse.remainingToCollect.toLocaleString() || 0} DT
                </Text>
              </View>
            </View>

            {/* ── 3. ATTENDANCE PULSE TODAY ───────────────────────────────── */}
            <View
              style={{
                marginTop: 18,
                backgroundColor: '#fff',
                borderRadius: 20,
                padding: 18,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                shadowColor: '#000',
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={18} color="#10b981" />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>
                    Présence du jour
                  </Text>
                </View>
                <View style={{ backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#059669' }}>
                    {data?.attendanceToday.attendanceRate || 98}% de présence
                  </Text>
                </View>
              </View>

              {/* Absences summary */}
              <View style={{ marginTop: 12, padding: 12, backgroundColor: '#f8fafc', borderRadius: 12 }}>
                <Text style={{ fontSize: 13, color: '#334155', fontWeight: '600' }}>
                  {data?.attendanceToday.absentCount === 0
                    ? "✨ Aucune absence signalée pour le moment ce matin."
                    : `⚠️ ${data?.attendanceToday.absentCount} absence(s) signalée(s) aujourd'hui.`}
                </Text>

                {/* Preview of absentees */}
                {data?.attendanceToday.recentAbsentees && data.attendanceToday.recentAbsentees.length > 0 && (
                  <View style={{ marginTop: 8, gap: 6 }}>
                    {data.attendanceToday.recentAbsentees.map((a) => (
                      <View key={a.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e293b' }}>
                          • {a.studentName}
                        </Text>
                        <View style={{ backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#dc2626' }}>{a.className}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* ── 4. HNIA CO-PILOT CARD ────────────────────────────────────── */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Hnia')}
              activeOpacity={0.9}
              style={{
                marginTop: 18,
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
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#1e3a8a', alignItems: 'center', justifyContent: 'center' }}>
                    <Bot size={24} color="#60a5fa" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>
                      Hnia IA • Assistante Direction
                    </Text>
                    <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
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
    </View>
  );
}
