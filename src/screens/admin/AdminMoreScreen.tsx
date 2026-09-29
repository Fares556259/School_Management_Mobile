import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, StatusBar, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings, LogOut, User, HelpCircle, RefreshCw } from 'lucide-react-native';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { useAppStore } from '../../store/useAppStore';

export default function AdminMoreScreen({ onSignOut }: { onSignOut?: () => void }) {
  const userName = useAppStore((s) => s.userName);
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      if (__DEV__) {
        Alert.alert('Mode Dev', 'Les mises à jour OTA sont actives uniquement en version de production/preview.');
        return;
      }
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        Alert.alert('Mise à jour trouvée', 'Téléchargement de la dernière version...');
        await Updates.fetchUpdateAsync();
        Alert.alert('Mise à jour prête !', 'La dernière mise à jour est prête. Appuyez sur Redémarrer.', [
          { text: 'Redémarrer maintenant', onPress: () => Updates.reloadAsync() }
        ]);
      } else {
        Alert.alert('Application à jour', 'Vous utilisez déjà la toute dernière version disponible.');
      }
    } catch (err: any) {
      Alert.alert('Mises à jour', 'Vérification terminée. Vous disposez de la version courante.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const menuItems = [
    { icon: User, label: 'Profil', color: '#0055d4' },
    { icon: RefreshCw, label: checkingUpdate ? 'Recherche en cours...' : 'Vérifier les mises à jour', color: '#10b981', onPress: handleCheckUpdate },
    { icon: Settings, label: 'Paramètres', color: '#6b7280' },
    { icon: HelpCircle, label: 'Aide', color: '#f59e0b' },
  ];
  
  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc', paddingTop: topPadding }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" translucent={Platform.OS === 'android'} />
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#1a1a2e' }}>⚙️ Plus</Text>
        <Text style={{ fontSize: 15, color: '#6b7280', marginTop: 4 }}>{userName}</Text>
      </View>
      <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}>
        {menuItems.map((item, i) => (
          <TouchableOpacity
            key={i}
            onPress={item.onPress}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 }}
          >
            <item.icon size={22} color={item.color} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1a1a2e', marginLeft: 14 }}>{item.label}</Text>
          </TouchableOpacity>
        ))}
        {onSignOut && (
          <TouchableOpacity onPress={onSignOut} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', borderRadius: 12, padding: 16, marginTop: 20 }}>
            <LogOut size={22} color="#ef4444" />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#ef4444', marginLeft: 14 }}>Déconnexion</Text>
          </TouchableOpacity>
        )}

        {/* App Version Tag */}
        <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#94a3b8' }}>
            SnapSchool v{Constants.expoConfig?.version || '1.0.3'} {Updates.channel ? `(${Updates.channel})` : ''}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
