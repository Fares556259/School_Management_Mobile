import { PrivacyControls } from '../../components/PrivacyControls';
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Settings,
  LogOut,
  User,
  HelpCircle,
  RefreshCw,
  Building2,
  Sparkles,
  Bot,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  MessageCircle,
  CheckCircle2,
  ExternalLink,
  Globe,
  Check,
} from 'lucide-react-native';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store/useAppStore';
import { useLanguage, Language } from '../../context/LanguageContext';

export default function AdminMoreScreen({ onSignOut }: { onSignOut?: () => void }) {
  const userName = useAppStore((s) => s.userName) || 'Direction';
  const schoolName = useAppStore((s) => s.schoolName) || 'SnapSchool';
  const { t, language, setLanguage, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatusText, setUpdateStatusText] = useState<string | null>(null);
  const [langModalVisible, setLangModalVisible] = useState(false);

  const appVersion = Constants.expoConfig?.version || '1.0.3';

  const handleCheckUpdate = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCheckingUpdate(true);
    setUpdateStatusText(null);
    try {
      if (__DEV__) {
        Alert.alert(
          language === 'ar' ? 'وضع التطوير' : 'Mode Développement',
          language === 'ar'
            ? 'المزامنة والتحديثات اللاسلكية مفعلة فقط في النسخة المجمعة.'
            : 'Les mises à jour OTA sont actives uniquement sur les versions installées.'
        );
        return;
      }
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        setUpdateStatusText(language === 'ar' ? 'جارٍ التحميل...' : 'Téléchargement...');
        await Updates.fetchUpdateAsync();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          language === 'ar' ? 'التحديث جاهز! 🎉' : 'Mise à jour prête ! 🎉',
          language === 'ar'
            ? 'تم تنزيل آخر إصدار من SnapSchool. أعد تشغيل التطبيق لتطبيقه فوراً.'
            : 'La toute dernière version de SnapSchool a été téléchargée. Redémarrez pour appliquer immédiatement.',
          [
            { text: t.adminCancel, style: 'cancel' },
            {
              text: language === 'ar' ? 'إعادة التشغيل الآن' : 'Redémarrer maintenant',
              style: 'default',
              onPress: () => Updates.reloadAsync(),
            },
          ]
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setUpdateStatusText(t.adminUpToDate);
        Alert.alert(
          language === 'ar' ? 'التطبيق محدث' : 'Application à jour',
          language === 'ar'
            ? `أنت تستخدم بالفعل أحدث إصدار (${appVersion}).`
            : `Vous disposez déjà de la dernière version (${appVersion}).`
        );
      }
    } catch (err: any) {
      setUpdateStatusText(t.adminUpToDate);
      Alert.alert(
        language === 'ar' ? 'اكتمل الفحص' : 'Vérification terminée',
        language === 'ar'
          ? 'تطبيقك متزامن مع أحدث نسخة متاحة.'
          : 'Votre application est synchronisée avec la version courante.'
      );
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleOpenHelp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      language === 'ar' ? 'المساعدة والدعم' : 'Aide & Support SnapSchool',
      language === 'ar'
        ? 'هل تحتاج إلى مساعدة لمؤسستك؟ فريق الدعم وهنيّة في خدمتك.'
        : 'Besoin d’assistance pour votre établissement ? Notre équipe support est à votre disposition.',
      [
        { text: t.adminCancel, style: 'cancel' },
        {
          text: language === 'ar' ? 'سؤال هنيّة الذكية' : 'Poser une question à Hnia',
          onPress: () => navigation.navigate('Hnia'),
        },
      ]
    );
  };

  const initials = userName
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'AD';

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc', paddingTop: topPadding }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" translucent={Platform.OS === 'android'} />

      {/* Top Header Bar */}
      <View style={[styles.topHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={styles.screenTitle}>{t.adminSettingsTitle}</Text>
        <View style={[styles.headerRoleBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <ShieldCheck size={13} color="#0055d4" />
          <Text style={styles.headerRoleText}>{t.adminHeaderRole}</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. PROFILE HERO CARD ────────────────────────────────────────────── */}
        <View style={[styles.profileCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{initials}</Text>
            <View style={styles.onlineBadge} />
          </View>
          <View style={{ flex: 1, marginLeft: isRTL ? 0 : 14, marginRight: isRTL ? 14 : 0, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={[styles.profileName, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
              {userName}
            </Text>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginTop: 3 }}>
              <Building2 size={13} color="#0055d4" />
              <Text
                style={[
                  styles.profileSchool,
                  {
                    marginLeft: isRTL ? 0 : 5,
                    marginRight: isRTL ? 5 : 0,
                    textAlign: isRTL ? 'right' : 'left',
                  },
                ]}
                numberOfLines={1}
              >
                {schoolName}
              </Text>
            </View>
          </View>
          <View style={styles.profilePill}>
            <Text style={styles.profilePillText}>{t.adminActiveStatus}</Text>
          </View>
        </View>

        {/* ── 2. GROUP 1: ÉTABLISSEMENT & SYSTÈME ─────────────────────────────── */}
        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left', marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 }]}>
          {t.adminSectionSystem}
        </Text>
        <View style={styles.groupedCard}>
          {/* Vérifier les mises à jour */}
          <TouchableOpacity
            style={[styles.rowItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            activeOpacity={0.7}
            onPress={handleCheckUpdate}
            disabled={checkingUpdate}
          >
            <View style={[styles.iconBox, { backgroundColor: '#eff6ff' }]}>
              {checkingUpdate ? (
                <ActivityIndicator size="small" color="#0055d4" />
              ) : (
                <RefreshCw size={19} color="#0055d4" />
              )}
            </View>
            <View style={[styles.rowContent, { marginLeft: isRTL ? 0 : 14, marginRight: isRTL ? 14 : 0, alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.rowLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t.adminAppUpdates}</Text>
              <Text style={[styles.rowSub, { textAlign: isRTL ? 'right' : 'left' }]}>
                {checkingUpdate
                  ? t.adminCheckingVersion
                  : updateStatusText || `${t.adminInstalledVersion} v${appVersion}`}
              </Text>
            </View>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
              <View style={styles.versionPill}>
                <Text style={styles.versionPillText}>v{appVersion}</Text>
              </View>
              {isRTL ? <ChevronLeft size={16} color="#94a3b8" /> : <ChevronRight size={16} color="#94a3b8" />}
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, isRTL ? { marginRight: 68, marginLeft: 0 } : {}]} />

          {/* Sélecteur de langue */}
          <TouchableOpacity
            style={[styles.rowItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setLangModalVisible(true);
            }}
          >
            <View style={[styles.iconBox, { backgroundColor: '#f0f4ff' }]}>
              <Globe size={19} color="#0055d4" />
            </View>
            <View style={[styles.rowContent, { marginLeft: isRTL ? 0 : 14, marginRight: isRTL ? 14 : 0, alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.rowLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t.adminAppLanguage}</Text>
              <Text style={[styles.rowSub, { textAlign: isRTL ? 'right' : 'left' }]}>
                {language === 'ar' ? 'العربية (تونس) 🇹🇳' : language === 'fr' ? 'Français 🇫🇷' : 'English 🇬🇧'}
              </Text>
            </View>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.versionPill, { backgroundColor: '#eff6ff' }]}>
                <Text style={[styles.versionPillText, { color: '#0055d4', fontWeight: '800' }]}>
                  {language.toUpperCase()}
                </Text>
              </View>
              {isRTL ? <ChevronLeft size={16} color="#94a3b8" /> : <ChevronRight size={16} color="#94a3b8" />}
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, isRTL ? { marginRight: 68, marginLeft: 0 } : {}]} />

          {/* Assistant Hnia IA */}
          <TouchableOpacity
            style={[styles.rowItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Hnia')}
          >
            <View style={[styles.iconBox, { backgroundColor: '#f0fdf4' }]}>
              <Bot size={19} color="#16a34a" />
            </View>
            <View style={[styles.rowContent, { marginLeft: isRTL ? 0 : 14, marginRight: isRTL ? 14 : 0, alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.rowLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t.adminHniaAssistant}</Text>
              <Text style={[styles.rowSub, { textAlign: isRTL ? 'right' : 'left' }]}>{t.adminHniaSub}</Text>
            </View>
            {isRTL ? <ChevronLeft size={16} color="#94a3b8" /> : <ChevronRight size={16} color="#94a3b8" />}
          </TouchableOpacity>

          <View style={[styles.divider, isRTL ? { marginRight: 68, marginLeft: 0 } : {}]} />

          {/* Profil */}
          <TouchableOpacity
            style={[styles.rowItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            activeOpacity={0.7}
            onPress={() => {
              Alert.alert(
                t.adminDirectionProfile,
                language === 'ar'
                  ? `متصل بصفتك ${userName} لإدارة ${schoolName}.`
                  : `Connecté en tant que ${userName} pour l'établissement ${schoolName}.`
              );
            }}
          >
            <View style={[styles.iconBox, { backgroundColor: '#faf5ff' }]}>
              <User size={19} color="#9333ea" />
            </View>
            <View style={[styles.rowContent, { marginLeft: isRTL ? 0 : 14, marginRight: isRTL ? 14 : 0, alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.rowLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t.adminDirectionProfile}</Text>
              <Text style={[styles.rowSub, { textAlign: isRTL ? 'right' : 'left' }]}>{t.adminDirectionProfileSub}</Text>
            </View>
            {isRTL ? <ChevronLeft size={16} color="#94a3b8" /> : <ChevronRight size={16} color="#94a3b8" />}
          </TouchableOpacity>
        </View>

        {/* ── 3. GROUP 2: ASSISTANCE & DOCUMENTATION ──────────────────────────── */}
        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left', marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 }]}>
          {t.adminSectionAssistance}
        </Text>
        <View style={styles.groupedCard}>
          <TouchableOpacity
            style={[styles.rowItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            activeOpacity={0.7}
            onPress={handleOpenHelp}
          >
            <View style={[styles.iconBox, { backgroundColor: '#fffbeb' }]}>
              <HelpCircle size={19} color="#d97706" />
            </View>
            <View style={[styles.rowContent, { marginLeft: isRTL ? 0 : 14, marginRight: isRTL ? 14 : 0, alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.rowLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t.adminHelpGuide}</Text>
              <Text style={[styles.rowSub, { textAlign: isRTL ? 'right' : 'left' }]}>{t.adminHelpGuideSub}</Text>
            </View>
            {isRTL ? <ChevronLeft size={16} color="#94a3b8" /> : <ChevronRight size={16} color="#94a3b8" />}
          </TouchableOpacity>

          <View style={[styles.divider, isRTL ? { marginRight: 68, marginLeft: 0 } : {}]} />

          <TouchableOpacity
            style={[styles.rowItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            activeOpacity={0.7}
            onPress={() => {
              Linking.openURL('https://snapschool.tn').catch(() => null);
            }}
          >
            <View style={[styles.iconBox, { backgroundColor: '#f1f5f9' }]}>
              <ExternalLink size={19} color="#475569" />
            </View>
            <View style={[styles.rowContent, { marginLeft: isRTL ? 0 : 14, marginRight: isRTL ? 14 : 0, alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.rowLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{t.adminWebPortal}</Text>
              <Text style={[styles.rowSub, { textAlign: isRTL ? 'right' : 'left' }]}>{t.adminWebPortalSub}</Text>
            </View>
            {isRTL ? <ChevronLeft size={16} color="#94a3b8" /> : <ChevronRight size={16} color="#94a3b8" />}
          </TouchableOpacity>
        </View>

        <PrivacyControls admin />
        {/* ── 4. GROUP 3: SESSION ─────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left', marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 }]}>
          {t.adminSectionSession}
        </Text>
        <View style={styles.groupedCard}>
          {onSignOut && (
            <TouchableOpacity
              style={[styles.rowItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              activeOpacity={0.7}
              onPress={() => {
                Alert.alert(
                  t.adminSignOutTitle,
                  t.adminSignOutConfirm,
                  [
                    { text: t.adminCancel, style: 'cancel' },
                    {
                      text: t.adminConfirmSignOut,
                      style: 'destructive',
                      onPress: onSignOut,
                    },
                  ]
                );
              }}
            >
              <View style={[styles.iconBox, { backgroundColor: '#fef2f2' }]}>
                <LogOut size={19} color="#ef4444" />
              </View>
              <View style={[styles.rowContent, { marginLeft: isRTL ? 0 : 14, marginRight: isRTL ? 14 : 0, alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.rowLabel, { color: '#ef4444', textAlign: isRTL ? 'right' : 'left' }]}>{t.adminSignOutTitle}</Text>
                <Text style={[styles.rowSub, { textAlign: isRTL ? 'right' : 'left' }]}>{t.adminSignOutSub}</Text>
              </View>
              {isRTL ? <ChevronLeft size={16} color="#fca5a5" /> : <ChevronRight size={16} color="#fca5a5" />}
            </TouchableOpacity>
          )}
        </View>

        {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.footerVersion}>
            SnapSchool Executive Mobile • v{appVersion} {Updates.channel ? `(${Updates.channel})` : ''}
          </Text>
          <Text style={styles.footerCopyright}>
            {t.adminFooterSystem}
          </Text>
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal visible={langModalVisible} transparent animationType="fade" onRequestClose={() => setLangModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
          <View style={{ width: '100%', maxWidth: 360, backgroundColor: 'white', borderRadius: 28, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', textAlign: 'center', marginBottom: 20 }}>
              {t.selectLanguageTitle}
            </Text>
            
            {[
              { code: 'ar', label: 'العربية (تونس)', flag: '🇹🇳' },
              { code: 'fr', label: 'Français', flag: '🇫🇷' },
              { code: 'en', label: 'English', flag: '🇬🇧' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.code}
                onPress={async () => {
                  Haptics.selectionAsync();
                  await setLanguage(opt.code as Language);
                  setLangModalVisible(false);
                }}
                activeOpacity={0.7}
                style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 16,
                  backgroundColor: language === opt.code ? '#eff6ff' : '#f8fafc',
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: language === opt.code ? '#93c5fd' : '#f1f5f9',
                }}
              >
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: 20 }}>{opt.flag}</Text>
                  <Text style={{ fontSize: 15, fontWeight: language === opt.code ? '800' : '600', color: language === opt.code ? '#0072e6' : '#334155' }}>
                    {opt.label}
                  </Text>
                </View>
                {language === opt.code && <Check size={20} color="#0072e6" strokeWidth={3} />}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={() => setLangModalVisible(false)}
              style={{ marginTop: 10, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#94a3b8' }}>{t.adminCancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  headerRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  headerRoleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0055d4',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0055d4',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  profileAvatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  profileSchool: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 5,
  },
  profilePill: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  profilePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 6,
  },
  groupedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
    marginLeft: 14,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  rowSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  versionPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  versionPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#f1f5f9',
    marginLeft: 68,
  },
  footer: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  footerVersion: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94a3b8',
  },
  footerCopyright: {
    fontSize: 11,
    color: '#cbd5e1',
    marginTop: 3,
  },
});
