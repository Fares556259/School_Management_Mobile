import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { ChildAccessRequestForm } from '../components/auth/ChildAccessRequestForm';
import { accessStyles as s } from '../components/auth/AccessControls';
import { parentAccessText } from '../content/parentAccess';
import { useLanguage } from '../context/LanguageContext';

export const LinkChildScreen = ({ navigation }: any) => {
  const { language, isRTL } = useLanguage(); const c = parentAccessText[language];
  return <SafeAreaView style={s.screen}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12 }}><TouchableOpacity accessibilityLabel={c.back} onPress={() => navigation.goBack()} style={{ height: 44, width: 44, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>{isRTL ? <ArrowRight size={22} color="#142238" /> : <ArrowLeft size={22} color="#142238" />}</TouchableOpacity><Text style={[s.title, { flex: 1, fontSize: 23, textAlign: isRTL ? 'right' : 'left' }]}>{c.addAnother}</Text></View>
    <ChildAccessRequestForm onSent={() => navigation.replace('ParentRequests')} />
  </ScrollView></SafeAreaView>;
};
