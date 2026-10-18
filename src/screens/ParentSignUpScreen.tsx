import React, { useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, GraduationCap, Plus, ShieldCheck, Trash2 } from 'lucide-react-native';
import { AuthLanguageSwitch } from '../components/auth/AuthLanguageSwitch';
import { AccessButton, AccessField, RelationshipPicker, accessStyles as s } from '../components/auth/AccessControls';
import { useLanguage } from '../context/LanguageContext';
import { parentAccessText } from '../content/parentAccess';
import { authService } from '../services/api';
import { useHardwareBack } from '../hooks/useHardwareBack';

export const ParentSignUpScreen = ({ initialPhone = '', onBack, onSignUpSuccess }: { initialPhone?: string; onBack: () => void; onSignUpSuccess: () => void }) => {
  const { language, isRTL } = useLanguage(); const c = parentAccessText[language];
  const text = { textAlign: isRTL ? 'right' as const : 'left' as const };
  const row = { flexDirection: isRTL ? 'row-reverse' as const : 'row' as const };
  const scroll = useRef<ScrollView>(null);
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [children, setChildren] = useState<{ identifier: string; claimToken: string; reference: string; schoolName: string }[]>([]);
  const [firstName, setFirstName] = useState(''); const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState(initialPhone); const [address, setAddress] = useState('');
  const [relation, setRelation] = useState('guardian');
  const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const goStep = (next: number) => { Keyboard.dismiss(); setError(''); setStep(next); scroll.current?.scrollTo({ y: 0, animated: false }); };
  const back = () => { if (busy) return; if (step > 1) goStep(step - 1); else onBack(); };
  useHardwareBack(back);
  const add = async () => {
    const id = identifier.trim(); if (!id || busy) return;
    if (children.some(child => child.identifier === id)) { setError(c.duplicate); return; }
    setBusy(true); setError(''); Keyboard.dismiss();
    try {
      const response = await authService.verifyStudent(id);
      if (response.success && response.claimToken && response.student) {
        setChildren(prev => [...prev, { ...response.student!, identifier: id, claimToken: response.claimToken! }]); setIdentifier('');
      } else setError(c.lookupError);
    } catch { setError(c.networkError); } finally { setBusy(false); }
  };
  const next = async () => {
    if (busy) return;
    if (step === 1) { if (children.length) goStep(2); else setError(c.missing); return; }
    if (step === 2) {
      if (!firstName.trim() || !lastName.trim() || !phone.trim()) { setError(c.missing); return; }
      if (!/^[0-9]{8,15}$/.test(phone.replace(/[\s()+.\-]/g, ''))) { setError(c.invalidPhone); return; }
      goStep(3); return;
    }
    if (password.length < 8 || password !== confirmation) { setError(c.passwordError); return; }
    Keyboard.dismiss(); setBusy(true); setError('');
    try {
      const result = await authService.signUpParent({ claimTokens: children.map(child => child.claimToken), parentName: firstName.trim(), parentSurname: lastName.trim(), phone: phone.trim(), password, relation, address: address.trim() || undefined, locale: language });
      if (result.success) onSignUpSuccess(); else setError(result.error || c.submitError);
    } catch { setError(c.networkError); } finally { setBusy(false); }
  };
  return <SafeAreaView style={s.screen}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[row, { justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 }]}>
        <TouchableOpacity onPress={back} disabled={busy} accessibilityRole="button" accessibilityLabel={c.back} style={{ height: 44, width: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: '#E1E7EF', backgroundColor: '#FFFFFF' }}>{isRTL ? <ArrowRight size={21} color="#142238" /> : <ArrowLeft size={21} color="#142238" />}</TouchableOpacity><AuthLanguageSwitch />
      </View>
      <ScrollView ref={scroll} contentContainerStyle={s.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ gap: 8 }}><Text style={[s.eyebrow, text]}>{c.eyebrow}</Text><Text style={[s.title, text]}>{c.signup}</Text><Text style={[s.body, text]}>{c.intro}</Text></View>
        <View style={[row, { gap: 7 }]}>{[c.childStep, c.parentStep, c.passwordStep].map((label, index) => <View key={label} style={{ flex: 1, gap: 7 }}><View style={{ height: 4, borderRadius: 4, backgroundColor: step >= index + 1 ? '#086CE0' : '#DDE6F0' }} /><Text style={{ color: step === index + 1 ? '#175CA7' : '#7B8799', fontSize: 11, lineHeight: 18, textAlign: 'center', fontWeight: step === index + 1 ? '800' : '500' }}>{index + 1}. {label}</Text></View>)}</View>
        {step === 1 && <>
          <View style={s.card}><View style={[row, { alignItems: 'center', gap: 10 }]}><GraduationCap size={23} color="#086CE0" /><Text style={[s.heading, text]}>{c.childStep}</Text></View>
            {children.map(child => <View key={child.identifier} style={[row, { gap: 10, padding: 14, borderRadius: 15, backgroundColor: '#EDF5FF', alignItems: 'center' }]}><Check size={18} color="#0F8868" /><View style={{ flex: 1 }}><Text style={[s.heading, text, { fontSize: 14 }]}>{child.reference}</Text><Text style={[s.small, text]}>{child.schoolName}</Text></View><TouchableOpacity onPress={() => setChildren(prev => prev.filter(item => item.identifier !== child.identifier))} accessibilityLabel={`${c.remove} ${child.reference}`} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}><Trash2 size={18} color="#708197" /></TouchableOpacity></View>)}
            {children.length < 8 && <><AccessField label={c.studentId} hint={c.studentHint} value={identifier} onChangeText={setIdentifier} autoCorrect={false} autoCapitalize="characters" maxLength={80} returnKeyType="done" onSubmitEditing={() => void add()} /><AccessButton label={children.length ? c.addAnother : c.add} secondary onPress={() => void add()} loading={busy} disabled={!identifier.trim()} icon={<Plus size={18} color="#175CA7" />} /></>}
          </View>
          <View style={[row, { gap: 9, paddingHorizontal: 5 }]}><ShieldCheck size={18} color="#637189" /><Text style={[s.small, text, { flex: 1 }]}>{c.privacy}</Text></View>
        </>}
        {step === 2 && <View style={s.card}><Text style={[s.heading, text]}>{c.parentStep}</Text>
          <AccessField label={c.firstName} value={firstName} onChangeText={setFirstName} autoComplete="given-name" maxLength={80} />
          <AccessField label={c.lastName} value={lastName} onChangeText={setLastName} autoComplete="family-name" maxLength={80} />
          <AccessField label={c.phone} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" maxLength={22} hint={c.phoneHint} />
          <RelationshipPicker value={relation} onChange={setRelation} copy={c} />
          <AccessField label={c.address} value={address} onChangeText={setAddress} maxLength={200} />
        </View>}
        {step === 3 && <><View style={s.card}><View style={[row, { gap: 10, alignItems: 'center' }]}><ShieldCheck size={23} color="#086CE0" /><Text style={[s.heading, text]}>{c.passwordStep}</Text></View>
          <AccessField label={c.password} value={password} onChangeText={setPassword} secureTextEntry={!visible} autoComplete="new-password" autoCorrect={false} autoCapitalize="none" maxLength={128} hint={c.passwordHint} trailing={<TouchableOpacity accessibilityLabel={visible ? c.hidePassword : c.showPassword} onPress={() => setVisible(v => !v)} style={{ minWidth: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>{visible ? <EyeOff size={19} color="#637189" /> : <Eye size={19} color="#637189" />}</TouchableOpacity>} />
          <AccessField label={c.confirmPassword} value={confirmation} onChangeText={setConfirmation} secureTextEntry={!visible} autoCorrect={false} autoCapitalize="none" maxLength={128} returnKeyType="done" onSubmitEditing={() => void next()} />
        </View><View style={[s.card, { backgroundColor: '#EDF5FF', borderColor: '#D4E5FA' }]}><Text style={[s.heading, text, { fontSize: 15 }]}>{firstName} {lastName}</Text><Text style={[s.body, text]}>{phone}</Text>{children.map(child => <Text key={child.identifier} style={[s.small, text]}>{child.reference} · {child.schoolName}</Text>)}<Text style={[s.small, text]}>{c.security}</Text></View></>}
        {!!error && <Text accessibilityRole="alert" style={[s.error, text]}>{error}</Text>}
      </ScrollView>
      <View style={s.footer}><AccessButton label={step === 3 ? c.submit : c.next} onPress={() => void next()} disabled={step === 1 && !children.length} loading={busy && step === 3} icon={step === 3 ? <ShieldCheck size={19} color="#FFFFFF" /> : undefined} /></View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
};
