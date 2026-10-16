import React, { useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { parentAccessText } from '../../content/parentAccess';
import { useLanguage } from '../../context/LanguageContext';
import { parentService } from '../../services/api';
import { AccessButton, AccessField, RelationshipPicker, accessStyles as s } from './AccessControls';

export function ChildAccessRequestForm({ onSent }: { onSent: () => void }) {
  const { language, isRTL } = useLanguage(); const c = parentAccessText[language];
  const [identifier, setIdentifier] = useState(''); const [relation, setRelation] = useState('guardian');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async () => {
    if (!identifier.trim() || busy) return;
    Keyboard.dismiss(); setBusy(true); setError('');
    try {
      const result = await parentService.linkStudent(identifier.trim(), relation);
      if (result?.success) onSent(); else setError(result?.code === 'STUDENT_NOT_FOUND' ? c.lookupError : c.submitError);
    } catch { setError(c.networkError); } finally { setBusy(false); }
  };
  return <View style={s.card}><Text style={[s.heading, { textAlign: isRTL ? 'right' : 'left' }]}>{c.requestAccess}</Text>
    <AccessField label={c.studentId} hint={c.studentHint} value={identifier} onChangeText={setIdentifier} autoCapitalize="characters" autoCorrect={false} maxLength={80} />
    <RelationshipPicker value={relation} onChange={setRelation} copy={c} />
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <AccessButton label={c.submit} onPress={() => void submit()} loading={busy} disabled={!identifier.trim()} icon={<ShieldCheck size={18} color="#FFFFFF" />} />
    <Text style={[s.small, { textAlign: isRTL ? 'right' : 'left' }]}>{c.privacy}</Text>
  </View>;
}
