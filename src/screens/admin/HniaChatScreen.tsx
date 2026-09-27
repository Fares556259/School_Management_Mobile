import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { Bot } from 'lucide-react-native';

export default function HniaChatScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#e0edff', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Bot size={40} color="#0055d4" />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#1a1a2e' }}>Hnia IA 🤖</Text>
        <Text style={{ fontSize: 15, color: '#6b7280', marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
          Votre assistante intelligente pour gérer l'école.
          Chat vocal, images, et gestion complète.
        </Text>
        <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 20 }}>Coming soon...</Text>
      </View>
    </SafeAreaView>
  );
}
