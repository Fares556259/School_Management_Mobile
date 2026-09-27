import React from 'react';
import { View, Text, SafeAreaView, ScrollView } from 'react-native';
import { Wallet } from 'lucide-react-native';

export default function AdminCaisseScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#1a1a2e' }}>💰 Caisse</Text>
        <Text style={{ fontSize: 15, color: '#6b7280', marginTop: 4 }}>Recettes et dépenses du jour</Text>
      </View>
      <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', justifyContent: 'center', minHeight: 200, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}>
          <Wallet size={48} color="#10b981" />
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1a1a2e', marginTop: 16 }}>Bientôt disponible</Text>
          <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8, textAlign: 'center' }}>La gestion de caisse arrive très bientôt.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
