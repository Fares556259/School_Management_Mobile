import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguage, Language } from '../../context/LanguageContext';

const options: { id: Language; label: string; name: string }[] = [
  { id: 'ar', label: 'عربي', name: 'العربية' },
  { id: 'fr', label: 'FR', name: 'Français' },
  { id: 'en', label: 'EN', name: 'English' },
];

export function AuthLanguageSwitch() {
  const { language, setLanguage, isRTL } = useLanguage();
  return (
    <View style={[styles.pill, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {options.map(({ id, label, name }) => (
        <TouchableOpacity
          key={id}
          onPress={() => setLanguage(id)}
          activeOpacity={0.75}
          accessibilityRole="radio"
          accessibilityLabel={name}
          accessibilityState={{ checked: language === id }}
          style={[styles.option, language === id && styles.selected]}
        >
          <Text style={[styles.label, language === id && styles.selectedLabel]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { padding: 3, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)', flexShrink: 0 },
  option: { minWidth: 34, minHeight: 40, paddingHorizontal: 5, borderRadius: 999, justifyContent: 'center', alignItems: 'center' },
  selected: { backgroundColor: '#0055D4' },
  label: { fontSize: 11, fontWeight: '600', color: '#475569' },
  selectedLabel: { color: '#FFFFFF' },
});
