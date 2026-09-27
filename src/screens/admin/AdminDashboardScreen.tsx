import React from 'react';
import { View, Text, ScrollView, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard } from 'lucide-react-native';

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0);

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc', paddingTop: topPadding }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" translucent={Platform.OS === 'android'} />
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#1a1a2e' }}>📊 Dashboard</Text>
        <Text style={{ fontSize: 15, color: '#6b7280', marginTop: 4 }}>Vue d'ensemble de votre école</Text>
      </View>
      <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', justifyContent: 'center', minHeight: 200, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}>
          <LayoutDashboard size={48} color="#0055d4" />
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1a1a2e', marginTop: 16 }}>Bientôt disponible</Text>
          <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8, textAlign: 'center' }}>Le tableau de bord exécutif arrive très bientôt.</Text>
        </View>
      </ScrollView>
    </View>
  );
}
