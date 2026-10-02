import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import {
  Wallet,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  MessageCircle,
  Phone,
  FileText,
  Download,
  Share2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Printer,
  Check,
  X,
  Clock,
  User,
  GraduationCap,
  Calendar,
  Users,
  Bell,
  Building2,
  Pencil,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { adminService, authStorage } from '../../services/api';

// ============================================================================
// Types
// ============================================================================

export interface ActionCardField {
  label: string;
  value: string;
  icon?: string;
}

export interface ActionCardData {
  toolCallId: string;
  toolName: string;
  actionTitle: string;
  actionType?: 'expense' | 'payment' | 'student' | 'class' | 'attendance' | 'announcement' | 'generic';
  confirmText: string;
  fields?: ActionCardField[];
  status?: 'PENDING' | 'EXECUTING' | 'EXECUTED' | 'REJECTED';
  reference?: string;
  resultMessage?: string;
  arguments?: Record<string, any>;
}

export interface FinanceSummaryData {
  period: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  trendPercent?: number;
  paymentsCount?: number;
  unpaidTuition?: number;
  unpaidStudentsCount?: number;
  comparisonText?: string;
}

export interface StudentProfileData {
  id: string;
  name: string;
  className: string;
  levelName?: string;
  parentName?: string;
  parentPhone?: string | null;
  attendanceRate?: string;
  paymentStatus?: string;
  tuitionFee?: number;
  averageGrade?: number;
  photoUrl?: string | null;
}

export interface AttendanceSummaryData {
  date: string;
  className: string;
  attendanceRate: string;
  totalEnrolled?: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  absentStudents?: Array<{
    name: string;
    class?: string;
    parentPhone?: string | null;
  }>;
}

export interface CaisseWidgetData {
  date?: string;
  totalIncomes: number;
  totalExpenses: number;
  netCashBalance: number;
  paymentsCount?: number;
  expensesCount?: number;
}

export interface UnpaidStudentItem {
  studentId: string;
  studentName: string;
  className: string;
  dueAmount: number;
  parentName?: string;
  parentPhone?: string | null;
  feePeriod?: string;
  status?: string;
}

export interface UnpaidTuitionWidgetData {
  totalOutstanding?: number;
  unpaidCount?: number;
  students: UnpaidStudentItem[];
}

export interface PdfReceiptWidgetData {
  receiptNumber?: string;
  studentName: string;
  studentClass?: string;
  periodFrench?: string;
  amountPaid: number;
  remainingDue?: number;
  pdfUrl?: string;
  pdfBase64?: string;
  schoolName?: string;
  paymentDate?: string;
  filename?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function cleanPhoneNumber(phone?: string | null): string | null {
  if (!phone) return null;
  let digits = phone.replace(/[^0-9+]/g, '');
  if (/^[2459]\d{7}$/.test(digits)) {
    return `216${digits}`;
  }
  if (digits.startsWith('00216')) {
    return digits.slice(2);
  }
  if (digits.startsWith('+')) {
    return digits.slice(1);
  }
  return digits.length >= 8 ? digits : null;
}

function handleWhatsAppReminder(student: UnpaidStudentItem) {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const cleanPhone = cleanPhoneNumber(student.parentPhone);
  if (!cleanPhone) {
    Alert.alert('Numéro manquant', `Aucun numéro de téléphone enregistré pour le parent de ${student.studentName}.`);
    return;
  }

  const periodText = student.feePeriod ? ` pour le mois de ${student.feePeriod}` : '';
  const message = `Bonjour,\nNous vous rappelons que le règlement des frais de scolarité de ${student.studentName}${periodText} est en attente (Reste dû : ${student.dueAmount} DT).\nMerci de bien vouloir régulariser la situation auprès du secrétariat.\nBien cordialement,\nLa Direction`;

  const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
  const fallbackUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

  Linking.canOpenURL(url)
    .then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(fallbackUrl);
      }
    })
    .catch(() => {
      Linking.openURL(fallbackUrl);
    });
}

function handlePhoneCall(student: UnpaidStudentItem) {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const cleanPhone = cleanPhoneNumber(student.parentPhone);
  if (!cleanPhone) {
    Alert.alert('Numéro manquant', `Aucun numéro de téléphone enregistré pour le parent de ${student.studentName}.`);
    return;
  }
  const url = `tel:${cleanPhone}`;
  Linking.openURL(url).catch(() => {
    Alert.alert('Erreur', 'Impossible de lancer l\'appel téléphonique.');
  });
}

// ============================================================================
// 1. CaisseCardWidget (Clean Minimal Apple Theme + Bordereau PDF)
// ============================================================================

export function CaisseCardWidget({
  data,
  onOpenCaisse,
}: {
  data: CaisseWidgetData;
  onOpenCaisse?: () => void;
}) {
  const [downloadingBordereau, setDownloadingBordereau] = useState(false);
  const [printing, setPrinting] = useState(false);
  const incomes = Math.max(0, data.totalIncomes || 0);
  const expenses = Math.max(0, data.totalExpenses || 0);

  const handlePrintBordereau = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPrinting(true);
    try {
      const token = await authStorage.getToken();
      const dateParam = data.date ? `&date=${encodeURIComponent(data.date)}` : '';
      const printUrl = `https://www.snapschool.academy/api/mobile/admin/caisse/print?token=${encodeURIComponent(token || '')}${dateParam}`;

      await WebBrowser.openBrowserAsync(printUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        toolbarColor: '#0f172a',
        controlsColor: '#ffffff',
      });
    } catch (err: any) {
      console.error('[CaisseCardWidget] Print error:', err);
      Alert.alert('Erreur', "Impossible d'ouvrir le module d'impression : " + (err.message || ''));
    } finally {
      setPrinting(false);
    }
  };

  const handleDownloadBordereau = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDownloadingBordereau(true);

    try {
      const res = await adminService.fetchCaissePdf(data.date);
      if (!res || !res.success) {
        throw new Error(res?.error || 'Échec de génération du bordereau de caisse');
      }

      const filename =
        res.filename ||
        `Bordereau_Caisse_${(data.date || 'Jour').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
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
          dialogTitle: `Bordereau de Caisse - ${data.date || "Aujourd'hui"}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Bordereau enregistré', `Le document PDF a été enregistré avec succès : ${filename}`);
      }
    } catch (err: any) {
      console.error('[CaisseCardWidget] Download bordereau error:', err);
      Alert.alert('Erreur', 'Impossible de télécharger le bordereau : ' + (err.message || 'Erreur inconnue'));
    } finally {
      setDownloadingBordereau(false);
    }
  };

  const isNetPositive = data.netCashBalance >= 0;

  return (
    <View style={caisseStyles.card}>
      {/* Header: Clean Wallet icon + Title + Date */}
      <View style={caisseStyles.headerRow}>
        <View style={caisseStyles.headerLeft}>
          <View style={caisseStyles.iconCircle}>
            <Wallet size={15} color="#059669" />
          </View>
          <Text style={caisseStyles.headerTitle}>Point de caisse</Text>
        </View>
        <Text style={caisseStyles.headerDate}>{data.date || "Aujourd'hui"}</Text>
      </View>

      {/* Hero: Bold Net Cash Balance */}
      <View style={caisseStyles.heroSection}>
        <Text style={caisseStyles.heroLabel}>SOLDE NET EN CAISSE</Text>
        <Text style={[caisseStyles.heroAmount, { color: isNetPositive ? '#059669' : '#dc2626' }]}>
          {isNetPositive ? '+ ' : ''}
          {data.netCashBalance.toLocaleString('fr-FR')} DT
        </Text>
      </View>

      {/* Minimal Inflows & Outflows stats row */}
      <View style={caisseStyles.statsRow}>
        <View style={caisseStyles.statCol}>
          <Text style={caisseStyles.statLabel}>Recettes</Text>
          <Text style={caisseStyles.incomeVal}>
            + {incomes.toLocaleString('fr-FR')} DT
          </Text>
          {Boolean(data.paymentsCount) && (
            <Text style={caisseStyles.statSub}>
              {data.paymentsCount} encaissement{data.paymentsCount! > 1 ? 's' : ''}
            </Text>
          )}
        </View>

        <View style={caisseStyles.statDivider} />

        <View style={caisseStyles.statCol}>
          <Text style={caisseStyles.statLabel}>Dépenses</Text>
          <Text style={caisseStyles.expenseVal}>
            - {expenses.toLocaleString('fr-FR')} DT
          </Text>
          {Boolean(data.expensesCount) && (
            <Text style={caisseStyles.statSub}>
              {data.expensesCount} sortie{data.expensesCount! > 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>

      {/* Primary Action: Direct 1-Tap Print Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={caisseStyles.printMainBtn}
        onPress={handlePrintBordereau}
        disabled={printing}
      >
        {printing ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <>
            <Printer size={15} color="#ffffff" strokeWidth={2.2} />
            <Text style={caisseStyles.printMainBtnText}>Imprimer le Bordereau</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Secondary Actions: Partager PDF & Voir la Caisse */}
      <View style={caisseStyles.actionRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[caisseStyles.secondaryBtn, downloadingBordereau && { opacity: 0.6 }]}
          onPress={handleDownloadBordereau}
          disabled={downloadingBordereau}
        >
          {downloadingBordereau ? (
            <ActivityIndicator size="small" color="#0f172a" />
          ) : (
            <>
              <Share2 size={13} color="#0f172a" />
              <Text style={caisseStyles.secondaryBtnText}>Partager PDF</Text>
            </>
          )}
        </TouchableOpacity>

        {onOpenCaisse && (
          <TouchableOpacity
            activeOpacity={0.8}
            style={caisseStyles.secondaryBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onOpenCaisse();
            }}
          >
            <Text style={caisseStyles.secondaryBtnText}>Voir la Caisse</Text>
            <ArrowRight size={12} color="#0f172a" strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const caisseStyles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  headerDate: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 12,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.6,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  heroAmount: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 2,
  },
  incomeVal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#059669',
  },
  expenseVal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#dc2626',
  },
  statSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e2e8f0',
  },
  printMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 11,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  printMainBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
});

// ============================================================================
// 2. UnpaidTuitionWidget (Relance Impayés avec 1-Tap WhatsApp & Appel)
// ============================================================================

export function UnpaidTuitionWidget({
  data,
  onSendBatchReminder,
}: {
  data: UnpaidTuitionWidgetData;
  onSendBatchReminder?: (students: UnpaidStudentItem[]) => void;
}) {
  const students = data.students || [];
  const totalCount = data.unpaidCount || students.length;
  const [visibleCount, setVisibleCount] = useState(5);
  const visibleStudents = students.slice(0, visibleCount);
  const hasMore = visibleCount < students.length;

  return (
    <View style={unpaidStyles.card}>
      {/* Header */}
      <View style={unpaidStyles.headerRow}>
        <View style={unpaidStyles.titleRow}>
          <View style={unpaidStyles.iconBadge}>
            <AlertCircle size={16} color="#d97706" />
          </View>
          <View>
            <Text style={unpaidStyles.title}>Relance des Impayés</Text>
            <Text style={unpaidStyles.subtitle}>
              {data.totalOutstanding ? `Total dû : ${data.totalOutstanding.toLocaleString('fr-FR')} DT` : 'Paiements en attente'}
            </Text>
          </View>
        </View>
        <View style={unpaidStyles.countBadge}>
          <Text style={unpaidStyles.countText}>{totalCount} élève(s)</Text>
        </View>
      </View>

      {/* Batch Reminder Button */}
      {students.length > 0 && onSendBatchReminder && (
        <TouchableOpacity
          activeOpacity={0.85}
          style={unpaidStyles.batchReminderBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onSendBatchReminder(students);
          }}
        >
          <Bell size={13} color="#ffffff" strokeWidth={2.4} />
          <Text style={unpaidStyles.batchReminderBtnText}>
            Envoyer un rappel général ({totalCount} parents)
          </Text>
        </TouchableOpacity>
      )}

      {/* Student Rows */}
      <View style={unpaidStyles.listContainer}>
        {visibleStudents.map((item, idx) => {
          const initials = item.studentName
            .split(' ')
            .map((w) => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          const hasPhone = Boolean(cleanPhoneNumber(item.parentPhone));

          return (
            <View key={item.studentId || idx} style={unpaidStyles.studentRow}>
              {/* Top: Name, Class, Due Amount */}
              <View style={unpaidStyles.studentInfoRow}>
                <View style={unpaidStyles.avatarBadge}>
                  <Text style={unpaidStyles.avatarText}>{initials || 'ÉL'}</Text>
                </View>
                <View style={unpaidStyles.studentDetails}>
                  <Text style={unpaidStyles.studentName} numberOfLines={1}>
                    {item.studentName}
                  </Text>
                  <Text style={unpaidStyles.studentClass}>
                    {item.className || 'Sans classe'}
                    {item.parentName && item.parentName !== 'Non renseigné' ? ` • ${item.parentName}` : ''}
                  </Text>
                </View>
                <View style={unpaidStyles.dueBadge}>
                  <Text style={unpaidStyles.dueAmountText}>{item.dueAmount} DT</Text>
                </View>
              </View>

              {/* Bottom: Action Buttons (WhatsApp + Call) */}
              <View style={unpaidStyles.actionRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[unpaidStyles.actionBtn, unpaidStyles.whatsappBtn, !hasPhone && unpaidStyles.disabledBtn]}
                  onPress={() => handleWhatsAppReminder(item)}
                  disabled={!hasPhone}
                >
                  <MessageCircle size={13} color={hasPhone ? '#ffffff' : '#94a3b8'} strokeWidth={2.2} />
                  <Text style={[unpaidStyles.actionBtnText, hasPhone ? unpaidStyles.whatsappText : unpaidStyles.disabledText]}>
                    WhatsApp
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[unpaidStyles.actionBtn, unpaidStyles.callBtn, !hasPhone && unpaidStyles.disabledBtn]}
                  onPress={() => handlePhoneCall(item)}
                  disabled={!hasPhone}
                >
                  <Phone size={13} color={hasPhone ? '#1d4ed8' : '#94a3b8'} strokeWidth={2.2} />
                  <Text style={[unpaidStyles.actionBtnText, hasPhone ? unpaidStyles.callText : unpaidStyles.disabledText]}>
                    Appeler
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      {/* Show more / show less pagination controls */}
      {students.length > 5 && (
        <View style={unpaidStyles.toggleRow}>
          {hasMore ? (
            <>
              <TouchableOpacity
                activeOpacity={0.8}
                style={unpaidStyles.toggleBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setVisibleCount((prev) => Math.min(prev + 15, students.length));
                }}
              >
                <Text style={unpaidStyles.toggleBtnText}>
                  Voir plus (+{Math.min(15, students.length - visibleCount)})
                </Text>
              </TouchableOpacity>

              {students.length - visibleCount > 15 && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[unpaidStyles.toggleBtn, unpaidStyles.toggleAllBtn]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setVisibleCount(students.length);
                  }}
                >
                  <Text style={[unpaidStyles.toggleBtnText, { color: '#0055d4' }]}>
                    Tout afficher ({students.length})
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : null}

          {visibleCount > 5 && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[unpaidStyles.toggleBtn, unpaidStyles.toggleLessBtn]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setVisibleCount(5);
              }}
            >
              <Text style={[unpaidStyles.toggleBtnText, { color: '#64748b' }]}>
                Voir moins
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const unpaidStyles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 11,
    color: '#b45309',
    fontWeight: '600',
    marginTop: 1,
  },
  countBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
  },
  batchReminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    gap: 6,
    marginBottom: 12,
  },
  batchReminderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  listContainer: {
    gap: 8,
  },
  studentRow: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  studentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3730a3',
  },
  studentDetails: {
    flex: 1,
    marginRight: 8,
  },
  studentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  studentClass: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  dueBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  dueAmountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#b91c1c',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 5,
  },
  whatsappBtn: {
    backgroundColor: '#25D366',
  },
  whatsappText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  callBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  callText: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  disabledBtn: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  disabledText: {
    color: '#94a3b8',
    fontWeight: '500',
  },
  actionBtnText: {
    fontSize: 11,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  toggleBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  toggleAllBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  toggleLessBtn: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
});

// ============================================================================
// 3. PdfReceiptWidget (Téléchargement et Partage de Reçu Officiel)
// ============================================================================

export function PdfReceiptWidget({ data }: { data: PdfReceiptWidgetData }) {
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);

  const handlePrint = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (data.pdfUrl) {
      setPrinting(true);
      try {
        await WebBrowser.openBrowserAsync(data.pdfUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
          toolbarColor: '#0f172a',
          controlsColor: '#ffffff',
        });
      } catch (err: any) {
        console.error('[PdfReceiptWidget] Print error:', err);
        Alert.alert('Erreur', "Impossible d'ouvrir le document : " + (err.message || ''));
      } finally {
        setPrinting(false);
      }
    } else {
      handleDownload();
    }
  };

  const handleDownload = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDownloading(true);

    try {
      const filename = data.filename || `Recu_${(data.receiptNumber || 'Paiement').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      const localUri = `${FileSystem.documentDirectory}${filename}`;

      if (data.pdfBase64) {
        await FileSystem.writeAsStringAsync(localUri, data.pdfBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else if (data.pdfUrl) {
        const downloadRes = await FileSystem.downloadAsync(data.pdfUrl, localUri);
        if (downloadRes.status !== 200) {
          throw new Error('Échec du téléchargement du document');
        }
      } else {
        throw new Error('Contenu PDF non disponible');
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Reçu officiel - ${data.studentName}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Reçu enregistré', `Le document PDF a été enregistré avec succès : ${filename}`);
      }
    } catch (err: any) {
      console.error('[PdfReceiptWidget] Download error:', err);
      Alert.alert('Erreur', 'Impossible de télécharger le reçu : ' + (err.message || 'Erreur inconnue'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={receiptStyles.card}>
      {/* Header */}
      <View style={receiptStyles.headerRow}>
        <View style={receiptStyles.titleRow}>
          <View style={receiptStyles.iconBadge}>
            <FileText size={16} color="#0284c7" />
          </View>
          <View>
            <Text style={receiptStyles.title}>Reçu Officiel de Paiement</Text>
            <Text style={receiptStyles.receiptNumber}>{data.receiptNumber || 'N° REC-2026'}</Text>
          </View>
        </View>
        <View style={receiptStyles.certifiedBadge}>
          <CheckCircle2 size={12} color="#059669" />
          <Text style={receiptStyles.certifiedText}>Certifié</Text>
        </View>
      </View>

      {/* Inner Document Preview Sheet */}
      <View style={receiptStyles.sheet}>
        <View style={receiptStyles.sheetRow}>
          <Text style={receiptStyles.sheetLabel}>Élève :</Text>
          <Text style={receiptStyles.sheetValueBold}>{data.studentName}</Text>
        </View>

        {data.studentClass && (
          <View style={receiptStyles.sheetRow}>
            <Text style={receiptStyles.sheetLabel}>Classe :</Text>
            <Text style={receiptStyles.sheetValue}>{data.studentClass}</Text>
          </View>
        )}

        <View style={receiptStyles.sheetRow}>
          <Text style={receiptStyles.sheetLabel}>Période :</Text>
          <Text style={receiptStyles.sheetValue}>{data.periodFrench || 'Mois en cours'}</Text>
        </View>

        <View style={receiptStyles.sheetDivider} />

        <View style={receiptStyles.sheetRow}>
          <Text style={receiptStyles.sheetLabel}>Montant Encaissé :</Text>
          <Text style={receiptStyles.amountPaid}>{data.amountPaid} DT</Text>
        </View>

        <View style={receiptStyles.sheetRow}>
          <Text style={receiptStyles.sheetLabel}>État :</Text>
          <Text style={data.remainingDue === 0 ? receiptStyles.statusPaid : receiptStyles.statusPartial}>
            {data.remainingDue === 0 ? '🟢 Soldé intégralement' : `⏳ Reste dû : ${data.remainingDue} DT`}
          </Text>
        </View>
      </View>

      {/* Action Buttons: Imprimer & Partager */}
      <View style={receiptStyles.actionRow}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={receiptStyles.printBtn}
          onPress={handlePrint}
          disabled={printing}
        >
          {printing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Printer size={14} color="#ffffff" strokeWidth={2.2} />
              <Text style={receiptStyles.printBtnText}>Imprimer</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[receiptStyles.shareBtn, downloading && receiptStyles.downloadBtnDisabled]}
          onPress={handleDownload}
          disabled={downloading}
        >
          {downloading ? (
            <ActivityIndicator size="small" color="#0f172a" />
          ) : (
            <>
              <Share2 size={13} color="#0f172a" />
              <Text style={receiptStyles.shareBtnText}>Partager PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const receiptStyles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  receiptNumber: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    fontFamily: 'monospace',
    marginTop: 1,
  },
  certifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  certifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  sheet: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 5,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  sheetValue: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '500',
  },
  sheetValueBold: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '700',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  amountPaid: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  statusPaid: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  statusPartial: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d97706',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  printBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    gap: 6,
  },
  printBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    gap: 6,
  },
  shareBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  downloadBtnDisabled: {
    opacity: 0.6,
  },
});

// ============================================================================
// Fallback Parsers (Extract widgets from raw assistant text if widget not present)
// ============================================================================

export function tryParseCaisseWidget(text: string): CaisseWidgetData | null {
  if (!text) return null;
  const isCaisse =
    /caisse/i.test(text) &&
    (/recette/i.test(text) || /encaissement/i.test(text) || /entrée/i.test(text)) &&
    (/dépense/i.test(text) || /sortie/i.test(text));

  if (!isCaisse) return null;

  // Extract Incomes
  const incMatch = text.match(/(?:recettes?|encaissements?|entrées?)[^:\d]*[:\s]+(?:\+?\s*)?([\d\s]+)\s*DT/i);
  // Extract Expenses
  const expMatch = text.match(/(?:dépenses?|sorties?)[^:\d]*[:\s]+(?:-?\s*)?([\d\s]+)\s*DT/i);
  // Extract Net Balance
  const netMatch = text.match(/(?:solde(?:\s+net)?(?:\s+physique)?)[^:\d]*[:\s]+(?:\+?\s*)?([-+]?[\d\s]+)\s*DT/i);

  if (!incMatch && !expMatch && !netMatch) return null;

  const totalIncomes = incMatch ? parseFloat(incMatch[1].replace(/\s+/g, '')) || 0 : 0;
  const totalExpenses = expMatch ? parseFloat(expMatch[1].replace(/\s+/g, '')) || 0 : 0;
  const netCashBalance = netMatch ? parseFloat(netMatch[1].replace(/\s+/g, '')) || (totalIncomes - totalExpenses) : (totalIncomes - totalExpenses);

  return {
    date: 'Aujourd\'hui',
    totalIncomes,
    totalExpenses,
    netCashBalance,
  };
}

export function tryParseUnpaidWidget(text: string): UnpaidTuitionWidgetData | null {
  if (!text) return null;
  const isUnpaid =
    (/impayé/i.test(text) || /non payé/i.test(text) || /reliquat/i.test(text) || /retard de paiement/i.test(text)) &&
    (/\d+\s*DT/i.test(text));

  if (!isUnpaid) return null;

  const lines = text.split('\n');
  const students: UnpaidStudentItem[] = [];

  for (const line of lines) {
    const studentMatch = line.match(/^[•\-\*\d\.]+\s*([A-ZÀ-Ÿa-zà-ÿ\s'-]+?)(?:\s*\(([^)]+)\))?\s*[:\-–]\s*(?:reste\s*dû\s*[:\s]*)?(\d+)\s*DT/i);
    if (studentMatch) {
      const name = studentMatch[1].trim();
      if (name.length > 2 && !name.toLowerCase().includes('total') && !name.toLowerCase().includes('somme')) {
        const className = studentMatch[2]?.trim() || 'Élève';
        const dueAmount = parseInt(studentMatch[3], 10) || 0;

        const phoneMatch = line.match(/(?:\+216|\b)([2459]\d{7})\b/);
        const parentPhone = phoneMatch ? phoneMatch[1] : null;

        students.push({
          studentId: `parsed_${students.length}_${Date.now()}`,
          studentName: name,
          className,
          dueAmount,
          parentPhone,
        });
      }
    }
  }

  if (students.length === 0) return null;

  const totalOutstanding = students.reduce((acc, s) => acc + s.dueAmount, 0);

  return {
    totalOutstanding,
    unpaidCount: students.length,
    students,
  };
}

export function tryParseReceiptWidget(text: string): PdfReceiptWidgetData | null {
  if (!text) return null;
  const isReceipt =
    (/reçu officiel/i.test(text) || /quittance/i.test(text)) &&
    (/élève/i.test(text) || /etablissement/i.test(text) || /montant/i.test(text));

  if (!isReceipt) return null;

  const nameMatch = text.match(/(?:élève|étudiant)\s*:\s*\*?([A-ZÀ-Ÿa-zà-ÿ\s'-]+?)\*?(?:\s*\(|$|\n)/i);
  const classMatch = text.match(/(?:classe)\s*:\s*`?([^`\n]+)`?/i);
  const amountMatch = text.match(/(?:montant)\s*:\s*`?(\d+)\s*DT`?/i);
  const periodMatch = text.match(/(?:période|mois)\s*:\s*`?([^`\n]+)`?/i);
  const recNumberMatch = text.match(/(?:n°\s*|recu\s*n°\s*|référence\s*:\s*)(REC-[\w-]+)/i);

  if (!nameMatch) return null;

  return {
    receiptNumber: recNumberMatch ? recNumberMatch[1] : undefined,
    studentName: nameMatch[1].trim(),
    studentClass: classMatch ? classMatch[1].trim() : undefined,
    periodFrench: periodMatch ? periodMatch[1].trim() : undefined,
    amountPaid: amountMatch ? parseInt(amountMatch[1], 10) : 450,
    remainingDue: 0,
    paymentDate: 'Aujourd\'hui',
  };
}

export function tryParseActionCardWidget(
  text: string,
  defaultToolCallId?: string
): ActionCardData | null {
  if (!text) return null;

  // Check if text represents a confirmation request, executed success, or cancellation
  const hasConfirmPrompt =
    /confirmer/i.test(text) ||
    /souhaitez-vous confirmer/i.test(text) ||
    /veuillez (?:vérifier et )?confirmer/i.test(text) ||
    /❓/i.test(text);

  const isExecuted =
    /action.*exécutée avec succès/i.test(text) ||
    /dépense ajoutée/i.test(text) ||
    /paiement enregistré/i.test(text) ||
    /élève inscrit/i.test(text) ||
    /classe créée/i.test(text) ||
    /✅.*(?:confirmé|enregistré|exécuté)/i.test(text);

  const isRejected =
    /action annulée/i.test(text) ||
    /❌.*annulé/i.test(text);

  if (!hasConfirmPrompt && !isExecuted && !isRejected) return null;

  const toolCallId = defaultToolCallId || `parsed_action_${Date.now()}`;

  const status: ActionCardData['status'] = isRejected
    ? 'REJECTED'
    : isExecuted
    ? 'EXECUTED'
    : 'PENDING';

  const isExpense = /dépense/i.test(text);
  const isPayment = /paiement/i.test(text) || /encaissement/i.test(text) || /encaisser/i.test(text);
  const isStudent = /élève/i.test(text) || /inscrire/i.test(text) || /inscription/i.test(text);
  const isClass = /classe/i.test(text) || /créer.*classe/i.test(text);

  let actionType: ActionCardData['actionType'] = 'generic';
  let actionTitle = 'Action à confirmer';
  let toolName = 'generic_action';

  if (isExpense) {
    actionType = 'expense';
    actionTitle = 'Ajouter une dépense';
    toolName = 'add_expense';
  } else if (isPayment) {
    actionType = 'payment';
    actionTitle = 'Encaisser un paiement';
    toolName = 'record_payment';
  } else if (isStudent) {
    actionType = 'student';
    actionTitle = 'Inscrire un nouvel élève';
    toolName = 'create_student';
  } else if (isClass) {
    actionType = 'class';
    actionTitle = 'Créer une nouvelle classe';
    toolName = 'create_class';
  }

  // Extract structured fields from text
  const fields: ActionCardField[] = [];

  // Montant
  const amountMatch =
    text.match(/(?:montant)\s*[:\s]+\*?`?([0-9.,\s]+(?:\s*DT)?)/i) ||
    text.match(/💰\s*\*?`?([0-9.,\s]+(?:\s*DT)?)/i) ||
    text.match(/\b(\d+(?:[.,]\d+)?\s*DT)\b/i);
  if (amountMatch) {
    const rawAmt = amountMatch[1].replace(/DT/i, '').trim();
    fields.push({ label: 'Montant', value: `${rawAmt} DT` });
  }

  // Intitulé / Titre / Description
  const titleMatch =
    text.match(/(?:intitulé|titre|description)\s*[:\s]+\*?`?([^\n*`]+)`?\*?/i) ||
    text.match(/🏷\uFE0F?\s*\*?`?([^\n*`]+)`?\*?/iu);
  if (titleMatch) {
    fields.push({ label: 'Description', value: titleMatch[1].replace(/[\uFE00-\uFE0F]/g, '').trim() });
  }

  // Catégorie
  const catMatch =
    text.match(/(?:catégorie)\s*[:\s]+\*?`?([^\n*`([<]+)/i) ||
    text.match(/📂\s*\*?`?([^\n*`([<]+)/iu);
  if (catMatch) {
    fields.push({ label: 'Catégorie', value: catMatch[1].replace(/[\uFE00-\uFE0F]/g, '').trim() });
  }

  // Date
  const dateMatch =
    text.match(/(?:date)\s*[:\s]+\*?`?([0-9/.\-\s\w]+)`?\*?/i) ||
    text.match(/📅\s*\*?`?([0-9/.\-\s\w]+)`?\*?/iu);
  if (dateMatch) {
    fields.push({ label: 'Date', value: dateMatch[1].replace(/[\uFE00-\uFE0F]/g, '').trim() });
  }

  // Élève / Bénéficiaire / Nom
  const nameMatch =
    text.match(/(?:nom|prénom|élève|bénéficiaire)\s*[:\s]+\*?`?([^\n*`]+)`?\*?/i) ||
    text.match(/👨‍🎓\s*\*?`?([^\n*`]+)`?\*?/iu);
  if (nameMatch && !isExpense) {
    fields.push({ label: 'Nom & Prénom', value: nameMatch[1].replace(/[\uFE00-\uFE0F]/g, '').trim() });
  }

  // Classe
  const classMatch = text.match(/(?:classe)\s*[:\s]+\*?`?([^\n*`]+)`?\*?/i);
  if (classMatch && !isExpense) {
    fields.push({ label: 'Classe', value: classMatch[1].replace(/[\uFE00-\uFE0F]/g, '').trim() });
  }

  // If no fields could be extracted and not already executed/rejected, do not falsely parse
  if (fields.length === 0 && !isExecuted && !isRejected) {
    return null;
  }

  return {
    toolCallId,
    toolName,
    actionTitle,
    actionType,
    confirmText: 'Confirmer l\'enregistrement de cette action ?',
    status,
    fields,
  };
}

// ============================================================================
// 4. ActionCardWidget (SnapSchool-Native Interactive Action Execution Card)
// ============================================================================

export function ActionCardWidget({
  card: rawCard,
  onConfirm,
  onCancel,
  isExecuting,
}: {
  card: any;
  onConfirm: (toolCallId: string, updatedArgs?: Record<string, any>) => void;
  onCancel: (toolCallId: string) => void;
  isExecuting?: boolean;
}) {
  const card: ActionCardData = Array.isArray(rawCard) ? rawCard[0] : rawCard;
  if (!card) return null;

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [localOverrides, setLocalOverrides] = useState<Record<string, any> | null>(null);

  const getInitialAmount = () => {
    if (localOverrides?.amount !== undefined) return String(localOverrides.amount);
    if (card.arguments?.amount !== undefined) return String(card.arguments.amount);
    const f = card.fields?.find((x: ActionCardField) => x.label.toLowerCase().includes('montant'));
    if (f) return f.value.replace(/[^0-9.]/g, '');
    return '';
  };

  const getInitialTitle = () => {
    if (localOverrides?.title) return String(localOverrides.title);
    if (card.arguments?.title) return String(card.arguments.title);
    if (card.arguments?.description) return String(card.arguments.description);
    const f = card.fields?.find(
      (x: ActionCardField) =>
        x.label.toLowerCase().includes('description') ||
        x.label.toLowerCase().includes('intitulé') ||
        x.label.toLowerCase().includes('titre')
    );
    if (f) return f.value;
    return '';
  };

  const getInitialCategory = () => {
    if (localOverrides?.category) return String(localOverrides.category);
    if (card.arguments?.category) return String(card.arguments.category);
    const f = card.fields?.find((x: ActionCardField) => x.label.toLowerCase().includes('catégorie'));
    if (f) return f.value;
    return '';
  };

  const getInitialBeneficiary = () => {
    if (localOverrides?.studentNameOrId) return String(localOverrides.studentNameOrId);
    if (card.arguments?.studentNameOrId) return String(card.arguments.studentNameOrId);
    if (card.arguments?.studentName) return String(card.arguments.studentName);
    if (card.arguments?.parentNameOrId) return String(card.arguments.parentNameOrId);
    const f = card.fields?.find(
      (x: ActionCardField) =>
        x.label.toLowerCase().includes('bénéficiaire') ||
        x.label.toLowerCase().includes('élève') ||
        x.label.toLowerCase().includes('nom')
    );
    if (f) return f.value;
    return '';
  };

  const [editAmount, setEditAmount] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editBeneficiary, setEditBeneficiary] = useState('');

  const openEditModal = () => {
    setEditAmount(getInitialAmount());
    setEditTitle(getInitialTitle());
    setEditCategory(getInitialCategory());
    setEditBeneficiary(getInitialBeneficiary());
    setIsEditModalVisible(true);
  };

  const handleSaveAndConfirm = (directConfirm: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated: Record<string, any> = {};

    if (editAmount.trim()) {
      const parsed = parseFloat(editAmount.replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed)) updated.amount = parsed;
    }
    if (editTitle.trim()) {
      updated.title = editTitle.trim();
      updated.description = editTitle.trim();
    }
    if (editCategory.trim()) {
      updated.category = editCategory.trim();
    }
    if (editBeneficiary.trim()) {
      if (card.toolName === 'record_payment' || card.actionType === 'payment') {
        updated.studentNameOrId = editBeneficiary.trim();
      } else {
        updated.name = editBeneficiary.trim();
      }
    }

    setLocalOverrides(updated);
    setIsEditModalVisible(false);

    if (directConfirm) {
      onConfirm(card.toolCallId, updated);
    }
  };

  const getActionIcon = () => {
    switch (card.actionType) {
      case 'expense':
        return <Wallet size={16} color="#059669" />;
      case 'payment':
        return <FileText size={16} color="#0284c7" />;
      case 'student':
        return <GraduationCap size={16} color="#7c3aed" />;
      case 'class':
        return <Building2 size={16} color="#ea580c" />;
      case 'attendance':
        return <Users size={16} color="#0284c7" />;
      case 'announcement':
        return <Bell size={16} color="#d97706" />;
      default:
        return <Sparkles size={16} color="#0055d4" />;
    }
  };

  const getActionThemeColor = () => {
    switch (card.actionType) {
      case 'expense':
        return '#059669';
      case 'payment':
        return '#0284c7';
      case 'student':
        return '#7c3aed';
      case 'class':
        return '#ea580c';
      case 'attendance':
        return '#0284c7';
      case 'announcement':
        return '#d97706';
      default:
        return '#0055d4';
    }
  };

  // 1. EXECUTED State -> Clean Verified Result Card
  if (card.status === 'EXECUTED') {
    const summary =
      card.resultMessage ||
      card.fields?.map((f) => f.value).slice(0, 2).join(' • ') ||
      'Enregistré dans SnapSchool';

    return (
      <View style={actionStyles.executedCard}>
        <View style={actionStyles.executedHeader}>
          <View style={actionStyles.executedCheckCircle}>
            <Check size={14} color="#059669" strokeWidth={2.6} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={actionStyles.executedTitle}>
              {card.actionTitle
                ? card.actionTitle.replace(/^(Ajouter|Créer|Encaisser|Marquer)\s*/i, '') + ' enregistré(e)'
                : 'Action exécutée avec succès'}
            </Text>
            <Text style={actionStyles.executedSummary} numberOfLines={2}>
              {summary}
            </Text>
          </View>
        </View>
        {Boolean(card.reference) && (
          <View style={actionStyles.executedFooter}>
            <Text style={actionStyles.referenceLabel}>Référence :</Text>
            <Text style={actionStyles.referenceCode}>{card.reference}</Text>
          </View>
        )}
      </View>
    );
  }

  // 2. REJECTED State -> Simple Cancel notice
  if (card.status === 'REJECTED') {
    return (
      <View style={actionStyles.rejectedCard}>
        <X size={15} color="#dc2626" />
        <Text style={actionStyles.rejectedText}>Action annulée par l'administrateur</Text>
      </View>
    );
  }

  // 3. EXECUTING State (In-flight steps visualization)
  if (isExecuting || card.status === 'EXECUTING') {
    return (
      <View style={actionStyles.executingCard}>
        <View style={actionStyles.executingHeader}>
          <ActivityIndicator size="small" color="#0055d4" />
          <Text style={actionStyles.executingTitle}>Je m'en occupe...</Text>
        </View>
        <View style={actionStyles.stepRow}>
          <CheckCircle2 size={13} color="#059669" />
          <Text style={actionStyles.stepSuccessText}>Vérification des autorisations & données</Text>
        </View>
        <View style={actionStyles.stepRow}>
          <ActivityIndicator size="small" color="#0055d4" style={{ transform: [{ scale: 0.7 }] }} />
          <Text style={actionStyles.stepActiveText}>Enregistrement dans le système...</Text>
        </View>
      </View>
    );
  }

  // 4. PENDING State -> Clean Interactive Action Card with review fields
  let fields: ActionCardField[] = card.fields && card.fields.length > 0 ? [...card.fields] : [];
  if (fields.length === 0 && card.arguments) {
    const args = card.arguments;
    if (card.toolName === 'add_expense' || card.actionType === 'expense') {
      if (args.amount !== undefined) fields.push({ label: 'Montant', value: `${args.amount} DT` });
      if (args.title || args.description) fields.push({ label: 'Description', value: String(args.title || args.description) });
      if (args.category) fields.push({ label: 'Catégorie', value: String(args.category) });
      if (args.date) fields.push({ label: 'Date', value: String(args.date) });
    } else if (card.toolName === 'record_payment' || card.toolName === 'record_parent_payment' || card.actionType === 'payment') {
      if (args.amount !== undefined) fields.push({ label: 'Montant', value: `${args.amount} DT` });
      if (args.studentNameOrId || args.parentNameOrId) fields.push({ label: 'Bénéficiaire', value: String(args.studentNameOrId || args.parentNameOrId) });
      if (args.feePeriod) fields.push({ label: 'Période', value: String(args.feePeriod) });
      if (args.paymentMethod) fields.push({ label: 'Règlement', value: String(args.paymentMethod) });
    } else {
      Object.entries(args)
        .filter(([k]) => !k.startsWith('_') && k !== 'schoolId' && k !== 'adminId')
        .forEach(([k, v]) => {
          fields.push({
            label: k.charAt(0).toUpperCase() + k.slice(1),
            value: String(v) + (k.toLowerCase().includes('amount') ? ' DT' : ''),
          });
        });
    }
  }

  // Apply localOverrides to fields if any were saved
  if (localOverrides) {
    if (localOverrides.amount !== undefined) {
      const idx = fields.findIndex((f) => f.label.toLowerCase().includes('montant'));
      if (idx >= 0) fields[idx] = { ...fields[idx], value: `${localOverrides.amount} DT` };
      else fields.unshift({ label: 'Montant', value: `${localOverrides.amount} DT` });
    }
    if (localOverrides.title) {
      const idx = fields.findIndex(
        (f) =>
          f.label.toLowerCase().includes('description') ||
          f.label.toLowerCase().includes('intitulé') ||
          f.label.toLowerCase().includes('titre')
      );
      if (idx >= 0) fields[idx] = { ...fields[idx], value: localOverrides.title };
      else fields.push({ label: 'Description', value: localOverrides.title });
    }
    if (localOverrides.category) {
      const idx = fields.findIndex((f) => f.label.toLowerCase().includes('catégorie'));
      if (idx >= 0) fields[idx] = { ...fields[idx], value: localOverrides.category };
      else fields.push({ label: 'Catégorie', value: localOverrides.category });
    }
    if (localOverrides.studentNameOrId || localOverrides.name) {
      const val = localOverrides.studentNameOrId || localOverrides.name;
      const idx = fields.findIndex(
        (f) =>
          f.label.toLowerCase().includes('bénéficiaire') ||
          f.label.toLowerCase().includes('élève') ||
          f.label.toLowerCase().includes('nom')
      );
      if (idx >= 0) fields[idx] = { ...fields[idx], value: val };
    }
  }

  const displayTitle =
    card.actionTitle && card.actionTitle !== 'Action en attente'
      ? card.actionTitle
      : card.toolName === 'add_expense' || card.actionType === 'expense'
      ? 'Ajouter une dépense'
      : card.toolName === 'record_payment' || card.actionType === 'payment'
      ? 'Encaisser un paiement'
      : card.toolName === 'create_student' || card.actionType === 'student'
      ? 'Inscrire un élève'
      : 'Action à vérifier';

  return (
    <View style={actionStyles.card}>
      {/* Header */}
      <View style={actionStyles.headerRow}>
        <View style={actionStyles.headerTitleRow}>
          <View style={[actionStyles.iconBox, { backgroundColor: `${getActionThemeColor()}15` }]}>
            {getActionIcon()}
          </View>
          <Text style={actionStyles.headerTitle}>{displayTitle}</Text>
        </View>
        <View style={actionStyles.pendingBadge}>
          <Text style={actionStyles.pendingBadgeText}>À vérifier</Text>
        </View>
      </View>

      {/* Fields Table */}
      {fields.length > 0 ? (
        <View style={actionStyles.tableContainer}>
          {fields.map((f, i) => (
            <View key={i} style={[actionStyles.fieldRow, i > 0 && actionStyles.fieldRowBorder]}>
              <Text style={actionStyles.fieldLabel}>{f.label}</Text>
              <Text style={actionStyles.fieldValue}>{f.value}</Text>
            </View>
          ))}
        </View>
      ) : card.confirmText ? (
        <View style={actionStyles.fallbackBox}>
          <Text style={actionStyles.fallbackText}>{card.confirmText}</Text>
        </View>
      ) : (
        <View style={actionStyles.fallbackBox}>
          <Text style={actionStyles.fallbackText}>Veuillez vérifier et confirmer cette action.</Text>
        </View>
      )}

      {/* Action Buttons: Annuler | Modifier | Confirmer */}
      <View style={actionStyles.buttonsRow}>
        <TouchableOpacity
          activeOpacity={0.75}
          style={actionStyles.cancelBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onCancel(card.toolCallId);
          }}
        >
          <X size={14} color="#64748b" />
          <Text style={actionStyles.cancelBtnText}>Annuler</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.75}
          style={actionStyles.editBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            openEditModal();
          }}
        >
          <Pencil size={13} color="#0055d4" />
          <Text style={actionStyles.editBtnText}>Modifier</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[actionStyles.confirmBtn, { backgroundColor: getActionThemeColor() }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onConfirm(card.toolCallId, localOverrides || undefined);
          }}
        >
          <Check size={15} color="#ffffff" strokeWidth={2.4} />
          <Text style={actionStyles.confirmBtnText}>Confirmer</Text>
        </TouchableOpacity>
      </View>

      {/* Modal d'édition directe */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={actionStyles.modalOverlay}
        >
          <Pressable
            style={actionStyles.modalDismissArea}
            onPress={() => setIsEditModalVisible(false)}
          />
          <View style={actionStyles.modalSheet}>
            {/* Modal Header */}
            <View style={actionStyles.modalHeader}>
              <View style={actionStyles.modalHeaderIconWrap}>
                <Pencil size={18} color="#0055d4" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={actionStyles.modalTitle}>Modifier l'action</Text>
                <Text style={actionStyles.modalSubtitle}>
                  Ajustez les informations en 1 seconde avant de valider
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(false)}
                style={actionStyles.modalCloseBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={actionStyles.modalScroll}
            >
              {/* Montant */}
              <View style={actionStyles.inputBlock}>
                <Text style={actionStyles.inputLabel}>Montant</Text>
                <View style={actionStyles.amountInputRow}>
                  <TextInput
                    style={actionStyles.amountTextInput}
                    value={editAmount}
                    onChangeText={setEditAmount}
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />
                  <View style={actionStyles.currencyBadge}>
                    <Text style={actionStyles.currencyBadgeText}>DT</Text>
                  </View>
                </View>
              </View>

              {/* Titre / Description */}
              <View style={actionStyles.inputBlock}>
                <Text style={actionStyles.inputLabel}>
                  {card.actionType === 'expense' ? 'Intitulé / Justification' : 'Description'}
                </Text>
                <TextInput
                  style={actionStyles.standardTextInput}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder={card.actionType === 'expense' ? 'Ex: Matériel de bureau, Pain, Facture...' : 'Description'}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Catégorie pour dépenses */}
              {(card.actionType === 'expense' || Boolean(getInitialCategory()) || card.toolName === 'add_expense') && (
                <View style={actionStyles.inputBlock}>
                  <Text style={actionStyles.inputLabel}>Catégorie</Text>
                  <TextInput
                    style={actionStyles.standardTextInput}
                    value={editCategory}
                    onChangeText={setEditCategory}
                    placeholder="Ex: Fournitures, Cantine, Transport..."
                    placeholderTextColor="#94a3b8"
                  />
                  {/* Category Chips */}
                  <View style={actionStyles.categoryChipsRow}>
                    {['Fournitures', 'Cantine', 'Transport', 'Maintenance', 'Factures'].map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          actionStyles.categoryChip,
                          editCategory.toLowerCase() === cat.toLowerCase() && actionStyles.categoryChipActive,
                        ]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setEditCategory(cat);
                        }}
                      >
                        <Text
                          style={[
                            actionStyles.categoryChipText,
                            editCategory.toLowerCase() === cat.toLowerCase() && actionStyles.categoryChipTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Bénéficiaire pour paiement ou élève */}
              {(card.actionType === 'payment' || card.actionType === 'student' || Boolean(getInitialBeneficiary())) && (
                <View style={actionStyles.inputBlock}>
                  <Text style={actionStyles.inputLabel}>Élève / Bénéficiaire</Text>
                  <TextInput
                    style={actionStyles.standardTextInput}
                    value={editBeneficiary}
                    onChangeText={setEditBeneficiary}
                    placeholder="Nom complet"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              )}
            </ScrollView>

            {/* Modal Footer Buttons */}
            <View style={actionStyles.modalActionsRow}>
              <TouchableOpacity
                style={actionStyles.modalCancelButton}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={actionStyles.modalCancelButtonText}>Fermer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={[actionStyles.modalSaveButton, { backgroundColor: getActionThemeColor() }]}
                onPress={() => handleSaveAndConfirm(true)}
              >
                <Check size={16} color="#ffffff" strokeWidth={2.4} />
                <Text style={actionStyles.modalSaveButtonText}>
                  {editAmount.trim() ? `Confirmer (${editAmount} DT)` : 'Confirmer l\'action'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ============================================================================
// 5. FinanceSummaryWidget (Revenus & Résumé Financier)
// ============================================================================

export function FinanceSummaryWidget({
  data,
  onViewCaisse,
}: {
  data: FinanceSummaryData;
  onViewCaisse?: () => void;
}) {
  const isPositive = (data.trendPercent ?? 0) >= 0;

  return (
    <View style={financeStyles.card}>
      {/* Header */}
      <View style={financeStyles.headerRow}>
        <View style={financeStyles.headerLeft}>
          <View style={financeStyles.iconBadge}>
            <Wallet size={15} color="#059669" />
          </View>
          <Text style={financeStyles.headerTitle}>Revenus — {data.period}</Text>
        </View>
        {data.trendPercent !== undefined && (
          <View style={[financeStyles.trendBadge, { backgroundColor: isPositive ? '#ecfdf5' : '#fef2f2' }]}>
            {isPositive ? (
              <TrendingUp size={12} color="#059669" />
            ) : (
              <TrendingDown size={12} color="#dc2626" />
            )}
            <Text style={[financeStyles.trendText, { color: isPositive ? '#059669' : '#dc2626' }]}>
              {isPositive ? '+' : ''}{data.trendPercent}%
            </Text>
          </View>
        )}
      </View>

      {/* Hero Big Amount */}
      <View style={financeStyles.heroSection}>
        <Text style={financeStyles.heroAmount}>{data.totalRevenue.toLocaleString('fr-FR')} DT</Text>
        <Text style={financeStyles.heroSubtitle}>
          {data.comparisonText ? `Chiffre d'affaires (${data.comparisonText})` : 'Total des recettes encaissées'}
        </Text>
      </View>

      {/* Stats Breakdown */}
      <View style={financeStyles.statsGrid}>
        <View style={financeStyles.statBox}>
          <Text style={financeStyles.statLabel}>Recettes</Text>
          <Text style={financeStyles.statValGreen}>+{data.totalRevenue.toLocaleString('fr-FR')} DT</Text>
        </View>
        <View style={financeStyles.statDivider} />
        <View style={financeStyles.statBox}>
          <Text style={financeStyles.statLabel}>Dépenses</Text>
          <Text style={financeStyles.statValRed}>-{data.totalExpenses.toLocaleString('fr-FR')} DT</Text>
        </View>
        <View style={financeStyles.statDivider} />
        <View style={financeStyles.statBox}>
          <Text style={financeStyles.statLabel}>Résultat net</Text>
          <Text style={financeStyles.statValNet}>+{data.netProfit.toLocaleString('fr-FR')} DT</Text>
        </View>
      </View>

      {/* Footer / CTA */}
      {onViewCaisse && (
        <TouchableOpacity
          activeOpacity={0.8}
          style={financeStyles.ctaBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onViewCaisse();
          }}
        >
          <Text style={financeStyles.ctaBtnText}>Consulter la caisse détaillée</Text>
          <ArrowRight size={13} color="#0f172a" />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// 6. StudentProfileWidget (Fiche Élève Complète avec Contacts & Actions)
// ============================================================================

export function StudentProfileWidget({
  student,
  onWhatsApp,
  onCall,
}: {
  student: StudentProfileData;
  onWhatsApp?: (student: StudentProfileData) => void;
  onCall?: (student: StudentProfileData) => void;
}) {
  const initials = student.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const cleanPhone = cleanPhoneNumber(student.parentPhone);

  const handleWA = () => {
    if (onWhatsApp) {
      onWhatsApp(student);
      return;
    }
    if (!cleanPhone) {
      Alert.alert('Numéro manquant', `Aucun numéro de téléphone pour ${student.name}.`);
      return;
    }
    const msg = `Bonjour,\nConcernant l'élève ${student.name} (${student.className}) :\n`;
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`);
  };

  const handlePhone = () => {
    if (onCall) {
      onCall(student);
      return;
    }
    if (!cleanPhone) {
      Alert.alert('Numéro manquant', `Aucun numéro de téléphone pour ${student.name}.`);
      return;
    }
    Linking.openURL(`tel:${cleanPhone}`);
  };

  return (
    <View style={studentStyles.card}>
      {/* Top: Avatar, Name, Class & Level badges */}
      <View style={studentStyles.headerRow}>
        <View style={studentStyles.avatarBox}>
          <Text style={studentStyles.avatarText}>{initials || 'ÉL'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={studentStyles.studentName}>{student.name}</Text>
          <View style={studentStyles.badgeRow}>
            <View style={studentStyles.classBadge}>
              <Text style={studentStyles.classBadgeText}>{student.className}</Text>
            </View>
            {Boolean(student.levelName) && (
              <View style={studentStyles.levelBadge}>
                <Text style={studentStyles.levelBadgeText}>{student.levelName}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Stats Row */}
      <View style={studentStyles.statsRow}>
        <View style={studentStyles.statPill}>
          <Text style={studentStyles.statLabel}>Présence</Text>
          <Text style={studentStyles.statValue}>{student.attendanceRate || '100%'}</Text>
        </View>
        <View style={studentStyles.statPill}>
          <Text style={studentStyles.statLabel}>Paiement</Text>
          <Text
            style={[
              studentStyles.statValue,
              { color: student.paymentStatus === 'PAID' ? '#059669' : '#dc2626' },
            ]}
          >
            {student.paymentStatus === 'PAID' ? 'À jour ✅' : 'Solde dû ⏳'}
          </Text>
        </View>
        {student.averageGrade !== undefined && (
          <View style={studentStyles.statPill}>
            <Text style={studentStyles.statLabel}>Moyenne</Text>
            <Text style={studentStyles.statValue}>{student.averageGrade}/20</Text>
          </View>
        )}
      </View>

      {/* Parent Contact Box */}
      <View style={studentStyles.parentBox}>
        <Text style={studentStyles.parentName}>👤 Parent : {student.parentName || 'Non renseigné'}</Text>
        <Text style={studentStyles.parentPhone}>
          📞 {cleanPhone ? `+${cleanPhone}` : 'Téléphone non renseigné'}
        </Text>
      </View>

      {/* Actions: WhatsApp & Appeler */}
      <View style={studentStyles.actionRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[studentStyles.actionBtn, studentStyles.waBtn, !cleanPhone && studentStyles.btnDisabled]}
          onPress={handleWA}
          disabled={!cleanPhone}
        >
          <MessageCircle size={14} color="#ffffff" strokeWidth={2.2} />
          <Text style={studentStyles.waBtnText}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[studentStyles.actionBtn, studentStyles.callBtn, !cleanPhone && studentStyles.btnDisabled]}
          onPress={handlePhone}
          disabled={!cleanPhone}
        >
          <Phone size={14} color="#1d4ed8" strokeWidth={2.2} />
          <Text style={studentStyles.callBtnText}>Appeler</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// 7. AttendanceSummaryWidget (Jauge & Suivi des Présences / Absences)
// ============================================================================

export function AttendanceSummaryWidget({
  data,
  onNotifyParents,
}: {
  data: AttendanceSummaryData;
  onNotifyParents?: () => void;
}) {
  const rateNum = parseInt(data.attendanceRate, 10) || 100;
  const isHighAttendance = rateNum >= 90;
  const isMidAttendance = rateNum >= 75 && rateNum < 90;
  const barColor = isHighAttendance ? '#059669' : isMidAttendance ? '#d97706' : '#dc2626';

  return (
    <View style={attendanceStyles.card}>
      {/* Header */}
      <View style={attendanceStyles.headerRow}>
        <View style={attendanceStyles.headerLeft}>
          <View style={attendanceStyles.iconBadge}>
            <Users size={15} color="#0284c7" />
          </View>
          <Text style={attendanceStyles.headerTitle}>Présences — {data.className}</Text>
        </View>
        <Text style={attendanceStyles.headerDate}>{data.date}</Text>
      </View>

      {/* Big Gauge Bar */}
      <View style={attendanceStyles.gaugeContainer}>
        <View style={attendanceStyles.gaugeTextRow}>
          <Text style={attendanceStyles.gaugeLabel}>Taux d'assiduité</Text>
          <Text style={[attendanceStyles.gaugeValue, { color: barColor }]}>
            {data.attendanceRate}
          </Text>
        </View>
        <View style={attendanceStyles.progressBarBg}>
          <View
            style={[
              attendanceStyles.progressBarFill,
              { width: `${Math.min(100, Math.max(0, rateNum))}%`, backgroundColor: barColor },
            ]}
          />
        </View>
      </View>

      {/* Counts Row */}
      <View style={attendanceStyles.countsRow}>
        <View style={attendanceStyles.countBox}>
          <Text style={attendanceStyles.countLabel}>Présents</Text>
          <Text style={attendanceStyles.presentVal}>{data.presentCount}</Text>
        </View>
        <View style={attendanceStyles.statDivider} />
        <View style={attendanceStyles.countBox}>
          <Text style={attendanceStyles.countLabel}>Absents</Text>
          <Text style={attendanceStyles.absentVal}>{data.absentCount}</Text>
        </View>
        <View style={attendanceStyles.statDivider} />
        <View style={attendanceStyles.countBox}>
          <Text style={attendanceStyles.countLabel}>Retards</Text>
          <Text style={attendanceStyles.lateVal}>{data.lateCount}</Text>
        </View>
      </View>

      {/* Absent students preview */}
      {data.absentStudents && data.absentStudents.length > 0 && (
        <View style={attendanceStyles.absentsList}>
          <Text style={attendanceStyles.absentsTitle}>Élèves absents :</Text>
          {data.absentStudents.slice(0, 3).map((st, i) => (
            <Text key={i} style={attendanceStyles.absentItem}>
              • {st.name} {st.class ? `(${st.class})` : ''}
            </Text>
          ))}
          {data.absentStudents.length > 3 && (
            <Text style={attendanceStyles.moreText}>
              ... et {data.absentStudents.length - 3} autre(s) élève(s)
            </Text>
          )}
        </View>
      )}

      {/* Notify Parents Button */}
      {data.absentCount > 0 && onNotifyParents && (
        <TouchableOpacity
          activeOpacity={0.85}
          style={attendanceStyles.notifyBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onNotifyParents();
          }}
        >
          <Bell size={13} color="#ffffff" strokeWidth={2.4} />
          <Text style={attendanceStyles.notifyBtnText}>
            Alerter les parents des {data.absentCount} absent(s)
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const actionStyles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
    textTransform: 'uppercase',
  },
  tableContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  fieldRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  fieldLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  fieldValue: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '700',
    maxWidth: '60%',
    textAlign: 'right',
  },
  fallbackBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  fallbackText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 5,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 5,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0055d4',
  },
  confirmBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 5,
    shadowColor: '#0055d4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  confirmBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 14,
  },
  modalHeaderIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  modalScroll: {
    maxHeight: 340,
  },
  inputBlock: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  amountTextInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    paddingVertical: 10,
  },
  currencyBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currencyBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
  },
  standardTextInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  categoryChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  categoryChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  categoryChipTextActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  modalCancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 12,
  },
  modalCancelButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  modalSaveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
    shadowColor: '#0055d4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  modalSaveButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  executedCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  executedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  executedCheckCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  executedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
  },
  executedSummary: {
    fontSize: 12,
    color: '#15803d',
    marginTop: 2,
  },
  executedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#dcfce7',
  },
  referenceLabel: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
  },
  referenceCode: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803d',
    fontFamily: 'monospace',
  },
  rejectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  rejectedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
  },
  executingCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    gap: 6,
  },
  executingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  executingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepSuccessText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  stepActiveText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1d4ed8',
  },
});

const financeStyles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 10,
  },
  heroAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  statValGreen: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  statValRed: {
    fontSize: 13,
    fontWeight: '800',
    color: '#dc2626',
  },
  statValNet: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#e2e8f0',
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 8,
    gap: 6,
  },
  ctaBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
});

const studentStyles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4338ca',
  },
  studentName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  classBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  classBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  levelBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
    gap: 8,
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  parentBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    gap: 4,
  },
  parentName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  parentPhone: {
    fontSize: 12,
    color: '#475569',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    gap: 6,
  },
  waBtn: {
    backgroundColor: '#25D366',
  },
  waBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  callBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  btnDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    opacity: 0.6,
  },
});

const attendanceStyles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerDate: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  gaugeContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  gaugeTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  gaugeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  gaugeValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  countsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  countBox: {
    flex: 1,
    alignItems: 'center',
  },
  countLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 2,
  },
  presentVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  absentVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#dc2626',
  },
  lateVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#d97706',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },
  absentsList: {
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    gap: 3,
  },
  absentsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 2,
  },
  absentItem: {
    fontSize: 11,
    color: '#991b1b',
  },
  moreText: {
    fontSize: 10,
    color: '#b91c1c',
    fontStyle: 'italic',
    marginTop: 2,
  },
  notifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0055d4',
    borderRadius: 10,
    paddingVertical: 9,
    gap: 6,
  },
  notifyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
