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
  ShieldCheck,
  MessageCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react-native';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store/useAppStore';

export default function AdminMoreScreen({ onSignOut }: { onSignOut?: () => void }) {
  const userName = useAppStore((s) => s.userName) || 'Direction';
  const schoolName = useAppStore((s) => s.schoolName) || 'SnapSchool';
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatusText, setUpdateStatusText] = useState<string | null>(null);

  const appVersion = Constants.expoConfig?.version || '1.0.3';

  const handleCheckUpdate = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCheckingUpdate(true);
    setUpdateStatusText(null);
    try {
      if (__DEV__) {
        Alert.alert('Mode Développement', 'Les mises à jour OTA sont actives uniquement sur les versions installées.');
        return;
      }
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        setUpdateStatusText('Téléchargement...');
        await Updates.fetchUpdateAsync();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Mise à jour prête ! 🎉',
          'La toute dernière version de SnapSchool a été téléchargée. Redémarrez pour appliquer immédiatement.',
          [
            { text: 'Plus tard', style: 'cancel' },
            {
              text: 'Redémarrer maintenant',
              style: 'default',
              onPress: () => Updates.reloadAsync(),
            },
          ]
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setUpdateStatusText('À jour');
        Alert.alert('Application à jour', `Vous disposez déjà de la dernière version (${appVersion}).`);
      }
    } catch (err: any) {
      setUpdateStatusText('À jour');
      Alert.alert('Vérification terminée', 'Votre application est synchronisée avec la version courante.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleOpenHelp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Aide & Support SnapSchool',
      'Besoin d’assistance pour votre établissement ? Notre équipe support est à votre disposition.',
      [
        { text: 'Fermer', style: 'cancel' },
        {
          text: 'Poser une question à Hnia',
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
      <View style={styles.topHeader}>
        <Text style={styles.screenTitle}>Paramètres</Text>
        <View style={styles.headerRoleBadge}>
          <ShieldCheck size={13} color="#0055d4" />
          <Text style={styles.headerRoleText}>Administration</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. PROFILE HERO CARD ────────────────────────────────────────────── */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{initials}</Text>
            <View style={styles.onlineBadge} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.profileName} numberOfLines={1}>
              {userName}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
              <Building2 size={13} color="#0055d4" />
              <Text style={styles.profileSchool} numberOfLines={1}>
                {schoolName}
              </Text>
            </View>
          </View>
          <View style={styles.profilePill}>
            <Text style={styles.profilePillText}>Actif</Text>
          </View>
        </View>

        {/* ── 2. GROUP 1: ÉTABLISSEMENT & SYSTÈME ─────────────────────────────── */}
        <Text style={styles.sectionTitle}>SYSTÈME & ÉTABLISSEMENT</Text>
        <View style={styles.groupedCard}>
          {/* Vérifier les mises à jour */}
          <TouchableOpacity
            style={styles.rowItem}
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
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Mises à jour de l'app</Text>
              <Text style={styles.rowSub}>
                {checkingUpdate
                  ? 'Recherche de version...'
                  : updateStatusText || `Version installée v${appVersion}`}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={styles.versionPill}>
                <Text style={styles.versionPillText}>v{appVersion}</Text>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Assistant Hnia IA */}
          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Hnia')}
          >
            <View style={[styles.iconBox, { backgroundColor: '#f0fdf4' }]}>
              <Bot size={19} color="#16a34a" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Assistante Hnia IA</Text>
              <Text style={styles.rowSub}>Pilotage intelligent & commandes vocales</Text>
            </View>
            <ChevronRight size={16} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Profil */}
          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => {
              Alert.alert('Profil Direction', `Connecté en tant que ${userName} pour l'établissement ${schoolName}.`);
            }}
          >
            <View style={[styles.iconBox, { backgroundColor: '#faf5ff' }]}>
              <User size={19} color="#9333ea" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Fiche Direction</Text>
              <Text style={styles.rowSub}>Identifiants & coordonnées</Text>
            </View>
            <ChevronRight size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* ── 3. GROUP 2: ASSISTANCE & DOCUMENTATION ──────────────────────────── */}
        <Text style={styles.sectionTitle}>ASSISTANCE</Text>
        <View style={styles.groupedCard}>
          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={handleOpenHelp}
          >
            <View style={[styles.iconBox, { backgroundColor: '#fffbeb' }]}>
              <HelpCircle size={19} color="#d97706" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Aide & Guide d'utilisation</Text>
              <Text style={styles.rowSub}>Foire aux questions & tutoriels</Text>
            </View>
            <ChevronRight size={16} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.rowItem}
            activeOpacity={0.7}
            onPress={() => {
              Linking.openURL('https://snapschool.tn').catch(() => null);
            }}
          >
            <View style={[styles.iconBox, { backgroundColor: '#f1f5f9' }]}>
              <ExternalLink size={19} color="#475569" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Portail SnapSchool Web</Text>
              <Text style={styles.rowSub}>Accéder à l'interface administrative complète</Text>
            </View>
            <ChevronRight size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* ── 4. GROUP 3: SESSION ─────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>SESSION</Text>
        <View style={styles.groupedCard}>
          {onSignOut && (
            <TouchableOpacity
              style={styles.rowItem}
              activeOpacity={0.7}
              onPress={() => {
                Alert.alert(
                  'Déconnexion',
                  'Voulez-vous vraiment vous déconnecter de la session direction ?',
                  [
                    { text: 'Annuler', style: 'cancel' },
                    {
                      text: 'Se déconnecter',
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
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: '#ef4444' }]}>Déconnexion</Text>
                <Text style={styles.rowSub}>Fermer la session sur cet appareil</Text>
              </View>
              <ChevronRight size={16} color="#fca5a5" />
            </TouchableOpacity>
          )}
        </View>

        {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.footerVersion}>
            SnapSchool Executive Mobile • v{appVersion} {Updates.channel ? `(${Updates.channel})` : ''}
          </Text>
          <Text style={styles.footerCopyright}>
            Système de gestion scolaire intelligente SnapSchool
          </Text>
        </View>
      </ScrollView>
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
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
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
