import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import * as Notifications from 'expo-notifications';
import { ActivityIndicator, Alert, AppState, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ParentApprovalScreen } from '../ParentApprovalScreen';
import { authService, authStorage, parentService } from '../../services/api';
import { notificationService } from '../../services/notificationService';

let mockLanguage = 'fr';
jest.mock('../../context/LanguageContext', () => ({ useLanguage: () => ({ language: mockLanguage, isRTL: mockLanguage === 'ar' }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View }));
jest.mock('../../components/auth/AuthLanguageSwitch', () => ({ AuthLanguageSwitch: () => null }));
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ granted: false }),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));
jest.mock('../../services/api', () => ({
  authService: { registerPushToken: jest.fn() }, authStorage: { getUserId: jest.fn().mockResolvedValue('parent-a') },
  parentService: { fetchAccessStatus: jest.fn(), fetchChildren: jest.fn().mockResolvedValue([]), cancelAccessRequest: jest.fn(), linkStudent: jest.fn() },
}));
jest.mock('../../services/notificationService', () => ({ notificationService: { getPushToken: jest.fn(), initChannels: jest.fn().mockResolvedValue(undefined), isEnabled: jest.fn().mockResolvedValue(true), setEnabled: jest.fn().mockResolvedValue(undefined) } }));
let renderer;
const pending = () => ({ accessStatus: 'PENDING', schoolName: 'School', name: 'Amel', phone: '20123456', requests: [
  { id: 'request-a', reference: '••••1234', status: 'PENDING', reason: null, relation: 'mother', createdAt: '2026-10-16T08:00:00Z' },
] });
const labels = () => renderer.root.findAllByType(Text).map(n => n.props.children).flat().filter(v => typeof v === 'string');
const button = label => renderer.root.findAllByType(TouchableOpacity).find(node => node.findAllByType(Text).some(text => text.props.children === label));
const refresh = () => renderer.root.findByType(ScrollView).props.refreshControl.props.onRefresh();
beforeEach(() => {
  mockLanguage = 'fr'; jest.useFakeTimers();
  Notifications.getPermissionsAsync.mockResolvedValue({ granted: false });
  notificationService.isEnabled.mockResolvedValue(true);
  parentService.fetchAccessStatus.mockResolvedValue(pending());
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => { act(() => renderer?.unmount()); jest.clearAllTimers(); jest.useRealTimers(); jest.restoreAllMocks(); jest.clearAllMocks(); });

it('keeps the parent waiting and opens access only after a server approval', async () => {
  const onActivated = jest.fn().mockResolvedValue(undefined);
  await act(async () => { renderer = TestRenderer.create(<ParentApprovalScreen onActivated={onActivated} />); });
  expect(labels()).toContain('Votre demande est à l’école');
  expect(labels()).toContain('••••1234');
  expect(onActivated).not.toHaveBeenCalled();
  parentService.fetchAccessStatus.mockResolvedValue({ ...pending(), accessStatus: 'ACTIVE' });
  await act(async () => { await refresh(); });
  expect(onActivated).toHaveBeenCalledTimes(1);
});
it('preserves a saved request on network failure and offers a retry', async () => {
  parentService.fetchAccessStatus.mockResolvedValue(null);
  await act(async () => { renderer = TestRenderer.create(<ParentApprovalScreen />); });
  expect(labels().some(text => text.includes('Votre demande est enregistrée'))).toBe(true);
  parentService.fetchAccessStatus.mockResolvedValue(pending());
  await act(async () => { await refresh(); });
  expect(labels()).toContain('••••1234');
});
it('registers activation alerts only after the parent chooses notifications', async () => {
  notificationService.getPushToken.mockResolvedValue('ExponentPushToken[test]');
  authService.registerPushToken.mockResolvedValue({ success: true });
  await act(async () => { renderer = TestRenderer.create(<ParentApprovalScreen />); });
  expect(notificationService.getPushToken).not.toHaveBeenCalled();
  await act(async () => { await button('M’avertir de l’activation').props.onPress(); });
  expect(authService.registerPushToken).toHaveBeenCalledWith('parent-a', 'ExponentPushToken[test]');
  expect(labels()).toContain('Alertes d’activation activées');
});
it('shows an Arabic rejection reason and a way to correct the request', async () => {
  mockLanguage = 'ar';
  parentService.fetchAccessStatus.mockResolvedValue({ ...pending(), accessStatus: 'REJECTED', requests: [{ ...pending().requests[0], status: 'REJECTED', reason: 'يرجى الاتصال بالإدارة' }] });
  await act(async () => { renderer = TestRenderer.create(<ParentApprovalScreen />); });
  expect(labels()).toContain('يرجى الاتصال بالإدارة'); expect(button('إرسال طلب مصحّح')).toBeDefined();
});
it('requires explicit confirmation to cancel a pending request', async () => {
  parentService.cancelAccessRequest.mockResolvedValue({ success: true });
  await act(async () => { renderer = TestRenderer.create(<ParentApprovalScreen />); });
  act(() => button('Annuler la demande').props.onPress());
  expect(parentService.cancelAccessRequest).not.toHaveBeenCalled();
  const actions = Alert.alert.mock.calls[0][2];
  await act(async () => { await actions[1].onPress(); });
  expect(parentService.cancelAccessRequest).toHaveBeenCalledWith('request-a');
});

it('registers a waiting parent automatically when Android permission is already allowed', async () => {
  Notifications.getPermissionsAsync.mockResolvedValue({ granted: true });
  notificationService.getPushToken.mockResolvedValue('ExponentPushToken[test]');
  authService.registerPushToken.mockResolvedValue({ success: true });
  await act(async () => { renderer = TestRenderer.create(<ParentApprovalScreen />); });
  expect(authService.registerPushToken).toHaveBeenCalledWith('parent-a', 'ExponentPushToken[test]');
  expect(notificationService.initChannels).toHaveBeenCalled();
  expect(labels()).toContain('Alertes d’activation activées');
});
it('does not claim alerts are enabled when permission exists but server registration fails', async () => {
  Notifications.getPermissionsAsync.mockResolvedValue({ granted: true });
  notificationService.getPushToken.mockResolvedValue('ExponentPushToken[test]');
  authService.registerPushToken.mockResolvedValue({ success: false });
  await act(async () => { renderer = TestRenderer.create(<ParentApprovalScreen />); });
  expect(labels()).not.toContain('Alertes d’activation activées');
  expect(button('M’avertir de l’activation')).toBeDefined();
});
it('registers after returning from Android settings and respects the app opt-out', async () => {
  Notifications.getPermissionsAsync.mockResolvedValue({ granted: true });
  notificationService.isEnabled.mockResolvedValue(false);
  const listener = jest.spyOn(AppState, 'addEventListener');
  notificationService.getPushToken.mockResolvedValue('ExponentPushToken[test]');
  authService.registerPushToken.mockResolvedValue({ success: true });
  await act(async () => { renderer = TestRenderer.create(<ParentApprovalScreen />); });
  expect(authService.registerPushToken).not.toHaveBeenCalled();
  notificationService.isEnabled.mockResolvedValue(true);
  const foreground = listener.mock.calls.find(([event]) => event === 'change')[1];
  await act(async () => { foreground('active'); });
  expect(authService.registerPushToken).toHaveBeenCalledWith('parent-a', 'ExponentPushToken[test]');
  expect(labels()).toContain('Alertes d’activation activées');
  expect(renderer.root.findByType(ScrollView).props.refreshControl.props.refreshing).toBe(false);
});

it('opens a focused, simplified status page for one pending child', async () => {
  parentService.fetchAccessStatus.mockResolvedValue({
    ...pending(),
    accessStatus: 'ACTIVE',
    requests: [
      { ...pending().requests[0], id: 'approved-a', reference: '••••1111', status: 'APPROVED' },
      { ...pending().requests[0], id: 'pending-b', reference: '••••2222', status: 'PENDING' },
    ],
  });
  const navigation = { goBack: jest.fn() };
  await act(async () => { renderer = TestRenderer.create(<ParentApprovalScreen navigation={navigation} route={{ params: { requestId: 'pending-b' } }} />); });
  expect(labels()).toContain('Accès en cours de vérification');
  expect(labels()).toContain('••••2222');
  expect(labels()).not.toContain('••••1111');
  expect(button('Vérifier le statut')).toBeUndefined();
  expect(button('Ajouter un autre enfant')).toBeUndefined();
  expect(renderer.root.findAllByType(ActivityIndicator)).toHaveLength(0);
});
