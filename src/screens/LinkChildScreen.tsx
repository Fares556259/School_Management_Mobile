import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Hash, ShieldCheck, UserPlus } from 'lucide-react-native';
import { useFonts } from 'expo-font';
import { parentService } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { useLanguage } from '../context/LanguageContext';

export const LinkChildScreen = ({ navigation }: any) => {
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const { setChildren, setSelectedChildId } = useAppStore();
  const { t, isRTL } = useLanguage();
  const [arabicFontLoaded] = useFonts({
    NotoSansArabic: require('../../assets/fonts/NotoSansArabic.ttf'),
  });
  const arabicText = isRTL && arabicFontLoaded
    ? { fontFamily: 'NotoSansArabic', fontWeight: 'normal' as const, letterSpacing: 0 }
    : undefined;

  const localizedFailure = (code?: string) => {
    if (code === 'STUDENT_NOT_FOUND' || code === 'STUDENT_NUMBER_NOT_UNIQUE') return t.linkStudentNotFound;
    if (code === 'STUDENT_ALREADY_LINKED') return t.linkStudentAlreadyLinked;
    return t.linkStudentGenericError;
  };

  const finishSuccessfulLink = async (student: any) => {
    const children = await parentService.fetchChildren();
    setChildren(children);
    if (student?.id) setSelectedChildId(student.id);
    navigation.goBack();
  };

  const handleLink = async () => {
    const normalizedId = studentId.trim();
    if (!normalizedId) {
      Alert.alert(t.linkStudentMissingTitle, t.linkStudentMissingMessage);
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    try {
      const response = await parentService.linkStudent(normalizedId);
      if (response?.success && response.student) {
        const studentName = `${response.student.name || ''} ${response.student.surname || ''}`.trim();
        Alert.alert(
          t.linkStudentSuccessTitle,
          studentName ? `${studentName} — ${t.linkStudentSuccessMessage}` : t.linkStudentSuccessMessage,
          [{ text: t.done, onPress: () => void finishSuccessfulLink(response.student) }],
        );
        return;
      }
      Alert.alert(t.linkStudentFailedTitle, localizedFailure(response?.code));
    } catch {
      Alert.alert(t.linkStudentFailedTitle, t.linkStudentGenericError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F6F8FB' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 28 }}
          >
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', paddingVertical: 12 }}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                hitSlop={8}
                style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E3E9F0', alignItems: 'center', justifyContent: 'center' }}
              >
                {isRTL ? <ChevronRight size={23} color="#172033" strokeWidth={2.5} /> : <ChevronLeft size={23} color="#172033" strokeWidth={2.5} />}
              </TouchableOpacity>
              <Text style={[{ flex: 1, marginHorizontal: 13, fontSize: 22, fontWeight: '900', color: '#172033', textAlign: isRTL ? 'right' : 'left' }, arabicText]}>
                {t.linkStudentTitle}
              </Text>
            </View>

            <View style={{ backgroundColor: '#EAF3FF', borderRadius: 22, padding: 18, marginTop: 10, borderWidth: 1, borderColor: '#D7E9FC' }}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                  <UserPlus size={22} color="#0B63CE" strokeWidth={2.3} />
                </View>
                <View style={{ flex: 1, marginLeft: isRTL ? 0 : 13, marginRight: isRTL ? 13 : 0, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text style={[{ fontSize: 16, fontWeight: '900', color: '#174A80', textAlign: isRTL ? 'right' : 'left' }, arabicText]}>{t.linkStudentIntroTitle}</Text>
                  <Text style={[{ marginTop: 5, fontSize: 13, lineHeight: 20, fontWeight: '600', color: '#52708F', textAlign: isRTL ? 'right' : 'left' }, arabicText]}>{t.linkStudentIntro}</Text>
                </View>
              </View>
            </View>

            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: 18, marginTop: 18, borderWidth: 1, borderColor: '#E3E9F0', shadowColor: '#172033', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.04, shadowRadius: 14, elevation: 1 }}>
              <Text style={[{ fontSize: 12, fontWeight: '800', color: '#475467', marginBottom: 9, textAlign: isRTL ? 'right' : 'left' }, arabicText]}>{t.studentNumberLabel}</Text>
              <View style={{ minHeight: 60, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', borderRadius: 17, paddingHorizontal: 15, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: studentId ? '#8ABCEF' : '#DFE6EE' }}>
                <Hash size={21} color="#0B63CE" strokeWidth={2.4} />
                <TextInput
                  style={[{ flex: 1, marginLeft: isRTL ? 0 : 11, marginRight: isRTL ? 11 : 0, fontSize: 17, color: '#172033', fontWeight: '700', textAlign: isRTL ? 'right' : 'left', paddingVertical: 0 }, arabicText]}
                  placeholder={t.studentNumberPlaceholder}
                  placeholderTextColor="#98A2B3"
                  value={studentId}
                  onChangeText={setStudentId}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={() => void handleLink()}
                />
              </View>
              <Text style={[{ marginTop: 10, fontSize: 12, lineHeight: 18, color: '#667085', textAlign: isRTL ? 'right' : 'left' }, arabicText]}>{t.studentNumberHelper}</Text>

              <TouchableOpacity
                onPress={handleLink}
                disabled={loading || !studentId.trim()}
                activeOpacity={0.82}
                style={{ minHeight: 56, marginTop: 18, borderRadius: 17, backgroundColor: loading || !studentId.trim() ? '#9FC5EE' : '#0B6FE8', flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }}
              >
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <ShieldCheck size={21} color="#FFFFFF" strokeWidth={2.4} />}
                <Text style={[{ color: '#FFFFFF', fontSize: 16, fontWeight: '900' }, arabicText]}>{t.linkStudentAction}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 18, paddingHorizontal: 12, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
              <ShieldCheck size={17} color="#7B8794" style={{ marginTop: 1 }} />
              <Text style={[{ flex: 1, marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0, fontSize: 11, lineHeight: 17, color: '#7B8794', textAlign: isRTL ? 'right' : 'left' }, arabicText]}>{t.linkStudentSecurity}</Text>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
