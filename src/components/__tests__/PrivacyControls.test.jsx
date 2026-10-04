import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Alert, TouchableOpacity } from 'react-native';
import { PrivacyControls, ReportAIResponse } from '../PrivacyControls';
import { privacyService } from '../../services/api';

jest.mock('../../context/LanguageContext', () => ({ useLanguage: () => ({ language: 'fr' }) }));
jest.mock('../../services/api', () => ({ privacyService: { submit: jest.fn() } }));
let renderer;
beforeEach(() => {
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  privacyService.submit.mockResolvedValue({ success: true, reference: 42 });
});
afterEach(() => { act(() => renderer?.unmount()); jest.restoreAllMocks(); jest.clearAllMocks(); });

it('submits a deletion request only after explicit confirmation', async () => {
  await act(async () => { renderer = TestRenderer.create(<PrivacyControls />); });
  act(() => renderer.root.findAllByType(TouchableOpacity)[1].props.onPress());
  expect(privacyService.submit).not.toHaveBeenCalled();
  const choices = Alert.alert.mock.calls[0][2];
  expect(choices[0].style).toBe('cancel');
  await act(async () => { await choices[1].onPress(); });
  expect(privacyService.submit).toHaveBeenCalledWith('ACCOUNT_DELETION');
  expect(Alert.alert.mock.calls[1][1]).toContain('42');
});

it('offers public web deletion access without submitting while signed out', async () => {
  await act(async () => { renderer = TestRenderer.create(<PrivacyControls signedIn={false} />); });
  expect(renderer.root.findAllByType(TouchableOpacity)).toHaveLength(2);
  expect(privacyService.submit).not.toHaveBeenCalled();
});

it('reports only the selected AI response after confirmation and respects the size limit', async () => {
  await act(async () => { renderer = TestRenderer.create(<ReportAIResponse content={'x'.repeat(4500)} />); });
  act(() => renderer.root.findByType(TouchableOpacity).props.onPress());
  expect(privacyService.submit).not.toHaveBeenCalled();
  const choices = Alert.alert.mock.calls[0][2];
  await act(async () => { await choices[1].onPress(); });
  expect(privacyService.submit).toHaveBeenCalledWith('AI_REPORT','x'.repeat(4000));
});
