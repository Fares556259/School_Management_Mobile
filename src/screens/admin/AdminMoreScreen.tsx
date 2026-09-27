import React from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Settings, LogOut, User, HelpCircle } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';

export default function AdminMoreScreen({ onSignOut }: { onSignOut?: () => void }) {
  const userName = useAppStore((s) => s.userName);
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#1a1a2e' }}>⚙️ Plus</Text>
        <Text style={{ fontSize: 15, color: '#6b7280', marginTop: 4 }}>{userName}</Text>
      </View>
      <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}>
        {[{ icon: User, label: 'Profil', color: '#0055d4' }, { icon: Settings, label: 'Paramètres', color: '#6b7280' }, { icon: HelpCircle, label: 'Aide', color: '#f59e0b' }].map((item, i) => (
          <TouchableOpacity key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 }}>
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
      </ScrollView>
    </SafeAreaView>
  );
}
