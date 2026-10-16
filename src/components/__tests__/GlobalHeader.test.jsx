import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity, View } from 'react-native';
import { GlobalHeader } from '../GlobalHeader';
import { useAppStore } from '../../store/useAppStore';

const mockRequestRefetch = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({}),
  useQuery: jest.fn((options) => options.queryKey[0] === 'parentAccess'
    ? { data: {
        accessStatus: 'ACTIVE', name: 'Parent', surname: 'Test', address: '', phone: '20123456', schoolName: 'SnapSchool',
        requests: [
          { id: 'approved-a', reference: '••••1111', status: 'APPROVED', reason: null, relation: 'father', createdAt: '2026-10-16T08:00:00Z', reviewedAt: '2026-10-16T09:00:00Z' },
          { id: 'pending-b', reference: '••••2222', status: 'PENDING', reason: null, relation: 'father', createdAt: '2026-10-16T08:00:00Z', reviewedAt: null },
          { id: 'rejected-c', reference: '••••3333', status: 'REJECTED', reason: 'Contact school', relation: 'father', createdAt: '2026-10-16T08:00:00Z', reviewedAt: '2026-10-16T09:00:00Z' },
        ],
      }, refetch: mockRequestRefetch }
    : { data: 0 }),
}));
jest.mock('../../context/LanguageContext', () => ({ useLanguage: () => ({ language: 'fr', isRTL: false, t: {
  switchChild: 'Changer d’élève', childPickerTitle: 'Mes enfants', childPickerSubtitle: 'Choisissez le profil à consulter', noClassAssigned: 'Classe non attribuée', linkChild: 'Lier un autre enfant',
} }) }));
jest.mock('../../services/api', () => ({
  authStorage: { getUserId: jest.fn() }, parentService: { fetchAccessStatus: jest.fn() }, studentService: { fetchUnreadNotificationCount: jest.fn() },
}));
jest.mock('../../services/childDataSync', () => ({ prefetchChildHome: jest.fn(() => Promise.resolve()), prefetchChildTabs: jest.fn(() => Promise.resolve()) }));
jest.mock('../../services/sessionHydration', () => ({ savePreferredChildId: jest.fn() }));
jest.mock('expo-image', () => ({ Image: (props) => {
  const MockView = require('react-native').View;
  return require('react').createElement(MockView, props);
} }));

const textLabels = (renderer) => renderer.root.findAllByType(Text).map(node => node.props.children).flat(Infinity).filter(value => typeof value === 'string');

beforeEach(() => {
  jest.useFakeTimers();
  mockRequestRefetch.mockClear();
  useAppStore.setState({
    userRole: 'parent', userId: 'parent-a', userName: 'Parent Test', userAvatarUrl: null,
    children: [{ id: 'child-a', name: 'Approved Child', class: '2A', avatarUrl: null }],
    selectedChildId: 'child-a', unreadNotificationsCount: 0, studentStatuses: {},
  });
});
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

it('shows approved, pending and rejected family statuses and opens the selected request', () => {
  const navigation = { navigate: jest.fn() };
  let renderer;
  act(() => { renderer = TestRenderer.create(<GlobalHeader navigation={navigation} />); });
  const switcher = renderer.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel === 'Changer d’élève');
  act(() => switcher.props.onPress());

  const labels = textLabels(renderer);
  expect(labels).toContain('Approuvée');
  expect(labels).toContain('En attente d’approbation');
  expect(labels).toContain('Non approuvée');
  expect(labels).toContain('••••2222');
  expect(labels).not.toContain('••••1111');

  const pending = renderer.root.findAllByType(TouchableOpacity).find(node => node.props.accessibilityLabel?.includes('••••2222'));
  act(() => pending.props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith('ParentRequests', {
    requestId: 'pending-b',
    requestPreview: { id: 'pending-b', reference: '••••2222', status: 'PENDING', reason: null, relation: 'father', createdAt: '2026-10-16T08:00:00Z', reviewedAt: null },
    schoolName: 'SnapSchool',
    accessStatus: 'ACTIVE',
  });
  expect(mockRequestRefetch).toHaveBeenCalled();
});
