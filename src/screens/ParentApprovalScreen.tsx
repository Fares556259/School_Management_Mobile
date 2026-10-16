import { PrivacyControls } from '../components/PrivacyControls';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Linking, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { ArrowLeft, ArrowRight, BellRing, CheckCircle2, ChevronLeft, ChevronRight, Clock3, LogOut, ShieldCheck } from 'lucide-react-native';
import { AccessButton, AccessField, accessStyles as s } from '../components/auth/AccessControls';
import { ChildAccessRequestForm } from '../components/auth/ChildAccessRequestForm';
import { AuthLanguageSwitch } from '../components/auth/AuthLanguageSwitch';
import { parentAccessText } from '../content/parentAccess';
import { useLanguage } from '../context/LanguageContext';
import { authService, authStorage, parentService, ParentAccessSnapshot } from '../services/api';
import { notificationService } from '../services/notificationService';
import { useAppStore } from '../store/useAppStore';

export function ParentApprovalScreen({ onActivated, onSignOut, navigation, route }: { onActivated?: () => Promise<void>; onSignOut?: () => void; navigation?: any; route?: any }) {
  const { language, isRTL } = useLanguage(); const c = parentAccessText[language];
  const [snapshot, setSnapshot] = useState<ParentAccessSnapshot | null>(null);
  const [loading, setLoading] = useState(false); const [offline, setOffline] = useState(false);
  const [notify, setNotify] = useState<'unknown' | 'enabled' | 'denied'>('unknown');
  const [notifyError, setNotifyError] = useState(false);
  const [notifying, setNotifying] = useState(false); const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<{ name: string; surname: string; phone: string; address: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false); const [profileError, setProfileError] = useState('');
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
      setSnapshot(next); setOffline(false);
      if (next.accessStatus === 'ACTIVE') {
        if (activated.current) await activated.current();
        else if (navigation) {
          try {
            const approvedChildren = await parentService.fetchChildren();
            if (mounted.current && approvedChildren.length) {
              const app = useAppStore.getState();
              app.setChildren(approvedChildren);
              if (!app.selectedChildId || !approvedChildren.some(child => child.id === app.selectedChildId)) app.setSelectedChildId(approvedChildren[0].id);
            }
          } catch { /* The request status is still valid; family data can refresh later. */ }
        }
      }
    } catch { if (mounted.current) setOffline(true); }
    finally { inflight.current = false; if (mounted.current) setLoading(false); }
  }, [navigation]);
  const enableNotifications = useCallback(async (requestPermission = true) => {
    if (notificationInFlight.current) return;
    notificationInFlight.current = true;
    try {
      const permissions = await Notifications.getPermissionsAsync();
      if (!requestPermission && (!permissions.granted || !(await notificationService.isEnabled()))) {
        if (mounted.current) setNotify('unknown');
        return;
      }
      if (mounted.current) { if (requestPermission) setNotifying(true); setNotifyError(false); }
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
  const focusedRequest = snapshot?.requests.find(request => request.id === route?.params?.requestId);
  const focusedPending = focusedRequest?.status === 'PENDING';
  const focusedRejected = focusedRequest?.status === 'REJECTED' || focusedRequest?.status === 'REVOKED';
  const title = focusedPending ? c.childPendingTitle : focusedRejected ? c.childRejectedTitle : active ? c.activeTitle : rejected ? c.rejectedTitle : snapshot ? c.pendingTitle : c.checkingTitle;
  const body = focusedPending ? c.childPendingBody : focusedRejected ? c.childRejectedBody : active ? c.activeBody : rejected ? c.rejectedBody : snapshot ? c.pendingBody : c.checkingBody;
  const visibleRequests = focusedRequest ? [focusedRequest] : snapshot?.requests || [];
  const hasPendingRequest = !!snapshot?.requests.some(request => request.status === 'PENDING');
  const requestColors = (requestStatus: string) => requestStatus === 'APPROVED'
    ? { background: '#F5FBF8', border: '#C8E9DD', badge: '#E4F6EF', text: '#118465' }
    : requestStatus === 'PENDING'
      ? { background: '#FFFCF5', border: '#F2D79B', badge: '#FFF2D6', text: '#8A5B12' }
      : requestStatus === 'REJECTED' || requestStatus === 'REVOKED'
        ? { background: '#FFF8F6', border: '#F2C5BA', badge: '#FFE8E2', text: '#B6472C' }
        : { background: '#FFFFFF', border: '#E1E7EF', badge: '#F1F4F8', text: '#637189' };
  return <SafeAreaView style={s.screen}>
    <ScrollView contentContainerStyle={[s.page, { gap: 16 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={!!snapshot && loading} onRefresh={() => void load()} tintColor="#086CE0" />}>
      <View style={[row, { alignItems: 'center', justifyContent: 'space-between' }]}>
        {navigation ? <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel={c.back} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>{isRTL ? <ArrowRight color="#142238" size={22} /> : <ArrowLeft color="#142238" size={22} />}</TouchableOpacity> : <Text style={{ color: '#0B63CE', fontSize: 19, fontWeight: '900' }}>SnapSchool</Text>}
        {!navigation && <AuthLanguageSwitch />}
      </View>
      <View style={{ paddingTop: navigation ? 2 : 8, gap: 9 }}>
        <View style={{ height: 56, width: 56, borderRadius: 19, backgroundColor: focusedRejected || rejected ? '#FFF0ED' : focusedPending ? '#FFF5E4' : active ? '#E4F6EF' : '#E6F0FE', alignItems: 'center', justifyContent: 'center', alignSelf: isRTL ? 'flex-end' : 'flex-start' }}>{focusedRejected || rejected ? <ShieldCheck size={27} color="#BF684D" /> : active && !focusedPending ? <CheckCircle2 size={27} color="#118465" /> : <Clock3 size={27} color={focusedPending ? '#95651C' : '#0B63CE'} />}</View>
        {!!snapshot?.schoolName && <Text style={[s.eyebrow, text]}>{snapshot.schoolName}</Text>}
        <Text style={[s.title, text, { fontSize: 25, lineHeight: 32 }]}>{title}</Text><Text style={[s.body, text]}>{body}</Text>
      </View>
      {offline && <Text accessibilityRole="alert" style={[s.error, text]}>{c.offline}</Text>}
      {!snapshot && loading && <ActivityIndicator color="#086CE0" />}
      {snapshot && hasPendingRequest && <TouchableOpacity
        disabled={notify === 'enabled' || notifying}
        onPress={() => { if (notify === 'denied') void Linking.openSettings(); else void enableNotifications(); }}
        accessibilityRole={notify === 'enabled' ? 'text' : 'button'}
        style={[row, { minHeight: 58, alignItems: 'center', gap: 11, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 12, backgroundColor: '#EDF5FF', borderWidth: 1, borderColor: '#D8E7FA' }]}
      >
        <BellRing size={20} color="#0B63CE" />
        <View style={{ flex: 1 }}><Text style={[s.heading, text, { fontSize: 14, lineHeight: 20 }]}>{notify === 'enabled' ? c.notificationsOn : c.notifyTitle}</Text>{notifyError && <Text accessibilityRole="alert" style={[s.small, text, { color: '#A53030' }]}>{c.networkError}</Text>}</View>
        {notify !== 'enabled' && <View style={{ flexDirection: row.flexDirection, alignItems: 'center', gap: 5 }}><Text style={{ color: '#175CA7', fontSize: 12, fontWeight: '800' }}>{notifying ? '…' : notify === 'denied' ? c.openSettings : c.notify}</Text>{isRTL ? <ChevronLeft size={17} color="#175CA7" /> : <ChevronRight size={17} color="#175CA7" />}</View>}
      </TouchableOpacity>}
      {visibleRequests.map(request => {
        const colors = requestColors(request.status);
        return <View key={request.id} style={[s.card, { padding: 17, gap: 11, backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={[row, { alignItems: 'center', justifyContent: 'space-between', gap: 8 }]}><Text style={{ fontSize: 16, color: '#142238', fontWeight: '800' }}>{c.requestChild} {request.reference}</Text><View style={{ borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: colors.badge, flexShrink: 1 }}><Text style={{ fontSize: 11, fontWeight: '800', color: colors.text }}>{labels[request.status]}</Text></View></View>
        {!!request.reason && <View style={{ borderRadius: 12, padding: 12, backgroundColor: '#FFF7F3', gap: 5 }}><Text style={[s.small, text, { fontWeight: '800', color: '#99573D' }]}>{c.schoolReason}</Text><Text style={[s.body, text]}>{request.reason}</Text></View>}
        {request.status === 'PENDING' && <TouchableOpacity disabled={!!cancelling} onPress={() => cancelRequest(request.id)} accessibilityRole="button" style={{ minHeight: 40, justifyContent: 'center', alignSelf: isRTL ? 'flex-end' : 'flex-start', opacity: cancelling ? 0.6 : 1 }}><Text style={[s.small, { fontWeight: '700', color: '#637189' }]}>{cancelling === request.id ? '…' : c.cancelRequest}</Text></TouchableOpacity>}
      </View>})}
      {snapshot && !snapshot.requests.length && <View style={s.card}><Text style={[s.heading, text]}>{c.noRequests}</Text><Text style={[s.body, text]}>{c.noRequestsBody}</Text></View>}
      {snapshot && !focusedRequest && !active && !profileForm && <TouchableOpacity onPress={() => { setProfileError(''); setProfileForm({ name: snapshot.name, surname: snapshot.surname || '', phone: snapshot.phone, address: snapshot.address || '' }); }} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={[s.body, { textAlign: 'center', color: '#175CA7', fontWeight: '700' }]}>{c.editInfo}</Text></TouchableOpacity>}
      {profileForm && <View style={s.card}><Text style={[s.heading, text]}>{c.editInfo}</Text>
        <AccessField label={c.firstName} value={profileForm.name} onChangeText={name => setProfileForm(prev => prev && { ...prev, name })} maxLength={80} />
        <AccessField label={c.lastName} value={profileForm.surname} onChangeText={surname => setProfileForm(prev => prev && { ...prev, surname })} maxLength={80} />
        <AccessField label={c.phone} value={profileForm.phone} onChangeText={phone => setProfileForm(prev => prev && { ...prev, phone })} keyboardType="phone-pad" maxLength={22} hint={c.phoneHint} />
        <AccessField label={c.address} value={profileForm.address} onChangeText={address => setProfileForm(prev => prev && { ...prev, address })} maxLength={200} />
        {!!profileError && <Text accessibilityRole="alert" style={s.error}>{profileError}</Text>}
        <AccessButton label={c.saveInfo} loading={savingProfile} disabled={!profileForm.name.trim() || !profileForm.surname.trim() || !profileForm.phone.trim()} onPress={() => void saveProfile()} />
        <AccessButton label={c.back} secondary disabled={savingProfile} onPress={() => setProfileForm(null)} />
      </View>}
      {!!snapshot && !focusedRequest && !editing && <AccessButton label={rejected ? c.correct : c.addAnother} secondary onPress={() => setEditing(true)} />}
      {editing && <><ChildAccessRequestForm onSent={() => { setEditing(false); void load(); }} /><TouchableOpacity onPress={() => setEditing(false)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={[s.body, { textAlign: 'center' }]}>{c.back}</Text></TouchableOpacity></>}
      {!navigation && <PrivacyControls />}
      {onSignOut && <TouchableOpacity onPress={onSignOut} accessibilityRole="button" style={[row, { gap: 8, alignItems: 'center', justifyContent: 'center', minHeight: 48 }]}><LogOut size={17} color="#637189" /><Text style={[s.body, { fontWeight: '600' }]}>{c.signOut}</Text></TouchableOpacity>}
    </ScrollView>
  </SafeAreaView>;
}
