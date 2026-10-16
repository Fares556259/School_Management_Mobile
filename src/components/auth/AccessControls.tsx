import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';

export const accessStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F8FC' },
  page: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, gap: 18 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#E1E7EF', padding: 20, gap: 16 },
  title: { fontSize: 26, lineHeight: 35, fontWeight: '800', color: '#142238' },
  heading: { fontSize: 17, lineHeight: 25, fontWeight: '800', color: '#142238' },
  body: { fontSize: 14, lineHeight: 23, color: '#637189' },
  small: { fontSize: 12, lineHeight: 19, color: '#637189' },
  eyebrow: { fontSize: 11, lineHeight: 18, fontWeight: '800', letterSpacing: 1.1, color: '#0B63CE' },
  error: { padding: 14, borderRadius: 14, backgroundColor: '#FFF1F0', color: '#A53030', fontSize: 13, lineHeight: 21 },
  footer: { backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, borderTopWidth: 1, borderColor: '#E1E7EF' },
});
export function AccessButton({ label, onPress, loading = false, disabled = false, secondary = false, icon }: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean; secondary?: boolean; icon?: React.ReactNode }) {
  const { isRTL } = useLanguage();
  return <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: disabled || loading, busy: loading }} onPress={onPress} disabled={disabled || loading} activeOpacity={0.8} style={{ minHeight: 54, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: secondary ? '#EDF4FD' : disabled ? '#ADC3DF' : '#086CE0', flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
    {loading ? <ActivityIndicator color={secondary ? '#0B63CE' : '#FFFFFF'} /> : icon}
    <Text style={{ color: secondary ? '#175CA7' : '#FFFFFF', fontSize: 15, lineHeight: 22, fontWeight: '800', textAlign: 'center', flexShrink: 1 }}>{label}</Text>
  </TouchableOpacity>;
}
export function AccessField({ label, hint, trailing, ...props }: TextInputProps & { label: string; hint?: string; trailing?: React.ReactNode }) {
  const { isRTL } = useLanguage();
  return <View style={{ gap: 8 }}><Text style={{ fontSize: 13, fontWeight: '700', color: '#42536A', textAlign: isRTL ? 'right' : 'left' }}>{label}</Text>
    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', borderWidth: 1, borderColor: '#D8E2EE', borderRadius: 15, backgroundColor: '#FFFFFF', alignItems: 'center', paddingHorizontal: 14 }}>
      <TextInput {...props} accessibilityLabel={label} placeholderTextColor="#9AA7B7" style={[{ flex: 1, minHeight: 54, paddingVertical: 13, color: '#142238', fontSize: 16, textAlign: isRTL ? 'right' : 'left' }, props.style]} />{trailing}
    </View>{hint && <Text style={[accessStyles.small, { textAlign: isRTL ? 'right' : 'left' }]}>{hint}</Text>}
  </View>;
}
export function RelationshipPicker({ value, onChange, copy }: { value: string; onChange: (value: string) => void; copy: { relation: string; father: string; mother: string; guardian: string } }) {
  const { isRTL } = useLanguage();
  return <View style={{ gap: 9 }}><Text style={{ color: '#42536A', fontSize: 13, fontWeight: '700', textAlign: isRTL ? 'right' : 'left' }}>{copy.relation}</Text><View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
    {(['father', 'mother', 'guardian'] as const).map(key => <TouchableOpacity key={key} accessibilityRole="radio" accessibilityState={{ checked: value === key }} onPress={() => onChange(key)} style={{ minHeight: 44, paddingHorizontal: 13, paddingVertical: 11, borderRadius: 13, borderWidth: 1, borderColor: value === key ? '#438DE7' : '#E1E7EF', backgroundColor: value === key ? '#EDF5FF' : '#FFFFFF', justifyContent: 'center' }}><Text style={{ fontSize: 13, color: value === key ? '#165CA9' : '#637189', fontWeight: '700' }}>{copy[key]}</Text></TouchableOpacity>)}
  </View></View>;
}
