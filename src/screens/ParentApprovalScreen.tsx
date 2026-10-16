import { PrivacyControls } from '../components/PrivacyControls';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Linking, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { ArrowLeft, ArrowRight, BellRing, Check, CheckCircle2, Clock3, LogOut, RefreshCw, ShieldCheck, X } from 'lucide-react-native';
import { AccessButton, AccessField, accessStyles as s } from '../components/auth/AccessControls';
import { ChildAccessRequestForm } from '../components/auth/ChildAccessRequestForm';
import { AuthLanguageSwitch } from '../components/auth/AuthLanguageSwitch';
import { parentAccessText } from '../content/parentAccess';
import { useLanguage } from '../context/LanguageContext';
import { authService, authStorage, parentService, ParentAccessSnapshot } from '../services/api';
import { notificationService } from '../services/notificationService';

export function ParentApprovalScreen({ onActivated, onSignOut, navigation }: { onActivated?: () => Promise<void>; onSignOut?: () => void; navigation?: any }) {
  const { language, isRTL } = useLanguage(); const c = parentAccessText[language];
  const [snapshot, setSnapshot] = useState<ParentAccessSnapshot | null>(null);
  const [loading, setLoading] = useState(false); const [offline, setOffline] = useState(false);
  const [notify, setNotify] = useState<'unknown' | 'enabled' | 'denied'>('unknown');
  const [notifyError, setNotifyError] = useState(false);
  const [notifying, setNotifying] = useState(false); const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<{ name: string; surname: string; phone: string; address: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false); const [profileError, setProfileError] = useState('');
  const [checked, setChecked] = useState(false);
  const notificationInFlight = useRef(false);
  const mounted = useRef(true); const inflight = useRef(false); const activated = useRef(onActivated); activated.current = onActivated;
  const text = { textAlign: isRTL ? 'right' as const : 'left' as const }; const row = { flexDirection: isRTL ? 'row-reverse' as const : 'row' as const };
  const load = useCallback(async (quiet = false) => {
    if (inflight.current) return;
    inflight.current = true; if (!quiet) setLoading(true);
    try {
      const next = await parentService.fetchAccessStatus();
      if (!mounted.current) return;
      if (!next) { setOffline(true); return; }
      setSnapshot(next); setOffline(false); setChecked(true);
      if (next.accessStatus === 'ACTIVE' && activated.current) await activated.current();
    } catch { if (mounted.current) setOffline(true); }
    finally { inflight.current = false; if (mounted.current) setLoading(false); }
  }, []);
  const enableNotifications = useCallback(async (requestPermission = true) => {
    if (notificationInFlight.current) return;
    notificationInFlight.current = true;
    try {
      const permissions = await Notifications.getPermissionsAsync();
      if (!requestPermission && (!permissions.granted || !(await notificationService.isEnabled()))) {
        if (mounted.current) setNotify('unknown');
        return;
      }
      if (mounted.current) { setNotifying(true); setNotifyError(false); }
      // Channels must exist before Android grants permission or receives a push.
      await notificationService.initChannels();
      const token = await notificationService.getPushToken(); const uid = await authStorage.getUserId();
      const result = token && uid ? await authService.registerPushToken(uid, token) : null;
      const currentPermissions = await Notifications.getPermissionsAsync();
      if (result?.success && requestPermission) await notificationService.setEnabled(true);
      if (mounted.current) {
        setNotify(result?.success ? 'enabled' : currentPermissions.granted ? 'unknown' : 'denied');
        setNotifyError(!result?.success && currentPermissions.granted);
      }
    } catch { if (mounted.current) { setNotify('unknown'); setNotifyError(true); } }
    finally { notificationInFlight.current = false; if (mounted.current) setNotifying(false); }
  }, []);
  useEffect(() => {
    mounted.current = true; void load(); void enableNotifications(false);
    const timer = setInterval(() => { if (AppState.currentState === 'active') void load(true); }, 20_000);
    const app = AppState.addEventListener('change', state => {
      if (state === 'active') { void load(); void enableNotifications(false); }
    });
    const push = Notifications.addNotificationReceivedListener(event => { if (event.request.content.data?.type === 'PARENT_ACCESS') void load(true); });
    return () => { mounted.current = false; clearInterval(timer); app.remove(); push.remove(); };
  }, [load, enableNotifications]);
  const saveProfile = async () => {
    if (!profileForm || savingProfile) return;
    setSavingProfile(true); setProfileError('');
    try {
      const result = await parentService.updatePendingProfile(profileForm);
      if (result?.success) { setProfileForm(null); await load(); } else setProfileError(c.updateFailed);
    } catch { setProfileError(c.updateFailed); } finally { if (mounted.current) setSavingProfile(false); }
  };
  const cancelRequest = (id: string) => Alert.alert(c.cancelTitle, c.cancelBody, [
    { text: c.keep, style: 'cancel' },
    { text: c.confirmCancel, style: 'destructive', onPress: async () => {
      setCancelling(id);
      try { const result = await parentService.cancelAccessRequest(id); if (!result?.success) setOffline(true); else await load(); }
      finally { if (mounted.current) setCancelling(null); }
    } },
  ]);
  const status = snapshot?.accessStatus;
  const rejected = status === 'REJECTED'; const active = status === 'ACTIVE';
  const labels: Record<string, string> = { PENDING: c.pending, APPROVED: c.approved, REJECTED: c.rejected, CANCELLED: c.cancelled, REVOKED: c.revoked };
  const title = active ? c.activeTitle : rejected ? c.rejectedTitle : snapshot ? c.pendingTitle : c.checkingTitle;
  const body = active ? c.activeBody : rejected ? c.rejectedBody : snapshot ? c.pendingBody : c.checkingBody;
  return <SafeAreaView style={s.screen}>
    <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor="#086CE0" />}>
      <View style={[row, { alignItems: 'center', justifyContent: 'space-between' }]}>
        {navigation ? <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel={c.back} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>{isRTL ? <ArrowRight color="#142238" size={22} /> : <ArrowLeft color="#142238" size={22} />}</TouchableOpacity> : <Text style={{ color: '#0B63CE', fontSize: 19, fontWeight: '900' }}>SnapSchool</Text>}
        <AuthLanguageSwitch />
      </View>
      <View style={{ paddingTop: 12, gap: 12 }}>
        <View style={{ height: 68, width: 68, borderRadius: 23, backgroundColor: rejected ? '#FFF0ED' : active ? '#E4F6EF' : '#E6F0FE', alignItems: 'center', justifyContent: 'center', alignSelf: isRTL ? 'flex-end' : 'flex-start' }}>{rejected ? <ShieldCheck size={32} color="#BF684D" /> : active ? <CheckCircle2 size={32} color="#118465" /> : <Clock3 size={32} color="#0B63CE" />}</View>
        {!!snapshot?.schoolName && <Text style={[s.eyebrow, text]}>{snapshot.schoolName}</Text>}
        <Text style={[s.title, text]}>{title}</Text><Text style={[s.body, text]}>{body}</Text>
      </View>
      {offline && <Text accessibilityRole="alert" style={[s.error, text]}>{c.offline}</Text>}
      {!snapshot && loading && <ActivityIndicator color="#086CE0" />}
      {snapshot && !active && !rejected && snapshot.requests.some(r => r.status === 'PENDING') && <View style={s.card}>{[c.received, c.review, c.ready].map((label, index) => <View key={label} style={[row, { alignItems: 'center', gap: 12 }]}><View style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: index === 0 ? '#E4F6EF' : index === 1 ? '#E6F0FE' : '#F1F4F8', justifyContent: 'center', alignItems: 'center' }}>{index === 0 ? <Check size={16} color="#118465" /> : <Text style={{ color: index === 1 ? '#0B63CE' : '#9AA7B7', fontWeight: '800', fontSize: 12 }}>{index + 1}</Text>}</View><Text style={[s.body, text, { flex: 1, color: index === 1 ? '#175CA7' : '#637189', fontWeight: index === 1 ? '700' : '500' }]}>{label}</Text></View>)}</View>}
      {snapshot && <View style={[s.card, { backgroundColor: '#EDF5FF', borderColor: '#D8E7FA' }]}><View style={[row, { gap: 10, alignItems: 'center' }]}><BellRing size={21} color="#0B63CE" /><Text style={[s.heading, text, { flex: 1, fontSize: 15 }]}>{notify === 'enabled' ? c.notificationsOn : c.notifyTitle}</Text></View><Text style={[s.small, text]}>{notify === 'denied' ? c.notificationsOff : c.notifyBody}</Text>{notifyError && <Text accessibilityRole="alert" style={[s.small, text, { color: '#A53030' }]}>{c.networkError}</Text>}{notify !== 'enabled' && <AccessButton label={notify === 'denied' ? c.openSettings : c.notify} secondary loading={notifying} onPress={() => { if (notify === 'denied') void Linking.openSettings(); else void enableNotifications(); }} />}</View>}
      {snapshot?.requests.map(request => <View key={request.id} style={[s.card, { padding: 17, gap: 10 }]}>
        <View style={[row, { alignItems: 'center', justifyContent: 'space-between', gap: 8 }]}><Text style={{ fontSize: 16, color: '#142238', fontWeight: '800' }}>{request.reference}</Text><View style={{ borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: request.status === 'APPROVED' ? '#E4F6EF' : request.status === 'PENDING' ? '#FFF5E4' : '#F1F4F8', flexShrink: 1 }}><Text style={{ fontSize: 11, fontWeight: '800', color: request.status === 'APPROVED' ? '#118465' : request.status === 'PENDING' ? '#95651C' : '#637189' }}>{labels[request.status]}</Text></View></View>
        <Text style={[s.small, text]}>{c.received} · {new Date(request.createdAt).toLocaleDateString(language === 'ar' ? 'ar-TN' : language)}</Text>
        {!!request.reason && <View style={{ borderRadius: 12, padding: 12, backgroundColor: '#FFF7F3', gap: 5 }}><Text style={[s.small, text, { fontWeight: '800', color: '#99573D' }]}>{c.schoolReason}</Text><Text style={[s.body, text]}>{request.reason}</Text></View>}
        {request.status === 'PENDING' && <TouchableOpacity disabled={!!cancelling} onPress={() => cancelRequest(request.id)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', alignSelf: isRTL ? 'flex-end' : 'flex-start' }}>{cancelling === request.id ? <ActivityIndicator color="#637189" /> : <Text style={[s.small, { fontWeight: '700' }]}>{c.cancelRequest}</Text>}</TouchableOpacity>}
      </View>)}
      {snapshot && !snapshot.requests.length && <View style={s.card}><Text style={[s.heading, text]}>{c.noRequests}</Text><Text style={[s.body, text]}>{c.noRequestsBody}</Text></View>}

      {snapshot && !active && <View style={[row, { gap: 9, paddingHorizontal: 5 }]}><ShieldCheck size={18} color="#637189" /><Text style={[s.small, text, { flex: 1 }]}>{c.credentials}</Text></View>}
      <AccessButton label={c.refresh} onPress={() => void load()} loading={loading} secondary icon={<RefreshCw size={18} color="#175CA7" />} />
      {checked && !offline && <Text accessibilityLiveRegion="polite" style={[s.small, { textAlign: 'center' }]}>{c.updated}</Text>}
      {snapshot && !active && !profileForm && <AccessButton label={c.editInfo} secondary onPress={() => { setProfileError(''); setProfileForm({ name: snapshot.name, surname: snapshot.surname || '', phone: snapshot.phone, address: snapshot.address || '' }); }} />}
      {profileForm && <View style={s.card}><Text style={[s.heading, text]}>{c.editInfo}</Text>
        <AccessField label={c.firstName} value={profileForm.name} onChangeText={name => setProfileForm(prev => prev && { ...prev, name })} maxLength={80} />
        <AccessField label={c.lastName} value={profileForm.surname} onChangeText={surname => setProfileForm(prev => prev && { ...prev, surname })} maxLength={80} />
        <AccessField label={c.phone} value={profileForm.phone} onChangeText={phone => setProfileForm(prev => prev && { ...prev, phone })} keyboardType="phone-pad" maxLength={22} hint={c.phoneHint} />
        <AccessField label={c.address} value={profileForm.address} onChangeText={address => setProfileForm(prev => prev && { ...prev, address })} maxLength={200} />
        {!!profileError && <Text accessibilityRole="alert" style={s.error}>{profileError}</Text>}
        <AccessButton label={c.saveInfo} loading={savingProfile} disabled={!profileForm.name.trim() || !profileForm.surname.trim() || !profileForm.phone.trim()} onPress={() => void saveProfile()} />
        <AccessButton label={c.back} secondary disabled={savingProfile} onPress={() => setProfileForm(null)} />
      </View>}
      {!!snapshot && !editing && <AccessButton label={rejected ? c.correct : c.addAnother} secondary onPress={() => setEditing(true)} />}
      {editing && <><ChildAccessRequestForm onSent={() => { setEditing(false); void load(); }} /><TouchableOpacity onPress={() => setEditing(false)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={[s.body, { textAlign: 'center' }]}>{c.back}</Text></TouchableOpacity></>}
      {active && navigation && <AccessButton label={c.continueApp} onPress={() => navigation.popToTop()} />}
      {!navigation && <PrivacyControls />}
      {onSignOut && <TouchableOpacity onPress={onSignOut} accessibilityRole="button" style={[row, { gap: 8, alignItems: 'center', justifyContent: 'center', minHeight: 48 }]}><LogOut size={17} color="#637189" /><Text style={[s.body, { fontWeight: '600' }]}>{c.signOut}</Text></TouchableOpacity>}
    </ScrollView>
  </SafeAreaView>;
}
