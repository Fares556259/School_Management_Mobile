import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  ActivityIndicator,
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
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { adminService, authStorage } from '../../services/api';

// ============================================================================
// Types
// ============================================================================

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

export function UnpaidTuitionWidget({ data }: { data: UnpaidTuitionWidgetData }) {
  const students = data.students || [];
  const [expanded, setExpanded] = useState(false);
  const visibleStudents = expanded ? students : students.slice(0, 4);

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
          <Text style={unpaidStyles.countText}>{students.length} élève(s)</Text>
        </View>
      </View>

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

      {/* Show more toggle if list is long */}
      {students.length > 4 && (
        <TouchableOpacity
          activeOpacity={0.8}
          style={unpaidStyles.toggleBtn}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={unpaidStyles.toggleBtnText}>
            {expanded ? 'Voir moins' : `Voir les ${students.length - 4} autre(s) élève(s)`}
          </Text>
        </TouchableOpacity>
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
  toggleBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 6,
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
