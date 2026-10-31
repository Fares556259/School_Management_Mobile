import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Alert, Text, TextInput, TouchableOpacity } from 'react-native';
import { ActionCardWidget } from '../HniaWidgets';
jest.mock('../../../services/api', () => ({ adminService: {}, authStorage: {} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 24, left: 0, right: 0 }) }));
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(), selectionAsync: jest.fn(), ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' } }));
let renderer;
const card = { toolCallId: 'proposal-a', toolName: 'add_expense', actionType: 'expense', actionTitle: 'Ajouter une dépense', confirmText: 'Confirmer ?', status: 'PENDING', arguments: { amount: 7.5, title: 'Paper', category: 'Fournitures' }, fields: [{ label: 'Montant', value: '7.5 DT' }] };
let confirm, cancel;
const button = label => renderer.root.findAllByType(TouchableOpacity).find(node => node.findAllByType(Text).some(text => text.props.children === label));
beforeEach(() => { confirm = jest.fn(); cancel = jest.fn(); jest.spyOn(Alert, 'alert').mockImplementation(() => {}); });
afterEach(() => { act(() => renderer?.unmount()); jest.restoreAllMocks(); });
const render = async (value = card, extra = {}) => { await act(async () => { renderer = TestRenderer.create(<ActionCardWidget card={value} onConfirm={confirm} onCancel={cancel} {...extra} />); }); };
it('shows the review and confirm/cancel buttons before calling any action', async () => {
  await render(); expect(confirm).not.toHaveBeenCalled(); expect(cancel).not.toHaveBeenCalled();
  expect(button('Confirmer')).toBeDefined(); expect(button('Annuler')).toBeDefined();
  act(() => button('Confirmer').props.onPress()); expect(confirm).toHaveBeenCalledTimes(1); expect(confirm).toHaveBeenCalledWith('proposal-a', undefined);
});
it('cancels without calling confirmation', async () => { await render(); act(() => button('Annuler').props.onPress()); expect(cancel).toHaveBeenCalledWith('proposal-a'); expect(confirm).not.toHaveBeenCalled(); });
it('undo on a receipt only requests a new proposal; it never executes or confirms the reversal', async () => {
  const undo = jest.fn();
  await render({ ...card, status: 'EXECUTED', undoExpenseId: 23 }, { onRequestUndo: undo });
  expect(undo).not.toHaveBeenCalled();
  act(() => button('Préparer l’annulation').props.onPress());
  expect(undo).toHaveBeenCalledWith(23); expect(confirm).not.toHaveBeenCalled(); expect(cancel).not.toHaveBeenCalled();
});
it('renders a clean structured receipt without raw markdown or internal references', async () => {
  await render({ ...card, status: 'EXECUTED', reference: 'ACT-internal-secret', resultMessage: '✅ **Dépense Enregistrée** ...', completedAt: '2026-10-30T08:41:55.000Z', fields: [
    { label: 'Montant', value: '7.5 DT' }, { label: 'Catégorie', value: 'Fournitures' }, { label: 'Description', value: 'Paper' },
  ] });
  const text = renderer.root.findAllByType(Text).map(node => String(node.props.children)).join(' ');
  expect(text).toContain('Dépense enregistrée'); expect(text).toContain('7.5 DT'); expect(text).toContain('Fournitures');
  expect(text).not.toContain('**'); expect(text).not.toContain('ACT-internal-secret');
});
it('shows cancellation as a neutral final outcome with the cancelled context', async () => {
  await render({ ...card, status: 'REJECTED', fields: [{ label: 'Montant', value: '7.5 DT' }, { label: 'Catégorie', value: 'Fournitures' }] });
  const text = renderer.root.findAllByType(Text).map(node => String(node.props.children)).join(' ');
  expect(text).toContain('Action annulée'); expect(text).toContain('Aucune donnée n’a été modifiée.'); expect(text).toContain('7.5 DT');
});
it.each(['EXECUTED', 'REJECTED', 'FAILED', 'EXPIRED', 'EXECUTING'])('hides action buttons for %s cards', async status => { await render({ ...card, status }); expect(button('Confirmer')).toBeUndefined(); expect(button('Annuler')).toBeUndefined(); expect(confirm).not.toHaveBeenCalled(); });
it('editing does not execute, rejects negative amounts and preserves decimal commas', async () => {
  await render(); act(() => button('Modifier').props.onPress()); expect(confirm).not.toHaveBeenCalled();
  const amount = renderer.root.findAllByType(TextInput)[0];
  act(() => amount.props.onChangeText('-7')); act(() => button('Vérifier les modifications').props.onPress());
  expect(confirm).not.toHaveBeenCalled(); expect(Alert.alert).toHaveBeenCalled();
  act(() => amount.props.onChangeText('7,50')); act(() => button('Vérifier les modifications').props.onPress());
  expect(confirm).toHaveBeenCalledWith('proposal-a', expect.objectContaining({ amount: 7.5 }));
});
it('keeps the parent beneficiary key when editing a family payment', async () => {
  await render({ ...card, toolName: 'record_parent_payment', actionType: 'payment', arguments: { amount: 100, parentNameOrId: 'Amel Ben Ali' } });
  act(() => button('Modifier').props.onPress());
  act(() => renderer.root.findAllByType(TextInput).find(node => node.props.placeholder === 'Nom complet').props.onChangeText('Sonia Trabelsi'));
  act(() => button('Vérifier les modifications').props.onPress());
  expect(confirm).toHaveBeenCalledWith('proposal-a', expect.objectContaining({ parentNameOrId: 'Sonia Trabelsi' }));
  expect(confirm.mock.calls[0][1].studentNameOrId).toBeUndefined();
});
it('shows the payment card with a required amount and preserves the exact recipient when editing only the amount', async () => {
  await render({ ...card, toolName: 'record_payment', actionType: 'payment', arguments: { studentNameOrId: 'student-exact-id', month: 10, year: 2026 }, fields: [{ label: 'Montant', value: 'À préciser' }, { label: 'Bénéficiaire', value: 'Fares fares · 1A' }] });
  expect(button('Confirmer').props.disabled).toBe(true); expect(button('Modifier')).toBeDefined(); expect(confirm).not.toHaveBeenCalled();
  act(() => button('Modifier').props.onPress());
  expect(renderer.root.findAllByType(TextInput).find(node => node.props.placeholder === 'Nom complet').props.value).toBe('Fares fares · 1A');
  act(() => renderer.root.findAllByType(TextInput)[0].props.onChangeText('45'));
  act(() => button('Vérifier les modifications').props.onPress());
  expect(confirm).toHaveBeenCalledWith('proposal-a', { amount: 45 });
});
it('uses formal Arabic on the payment card', async () => {
  await render({ ...card, toolName: 'record_payment', actionType: 'payment', arguments: { studentNameOrId: 'id' }, fields: [{ label: 'Montant', value: 'À préciser' }] }, { language: 'ar' });
  const text = renderer.root.findAllByType(Text).map(node => String(node.props.children)).join(' ');
  expect(text).toContain('تسجيل دفعة'); expect(text).toContain('لن تُنفَّذ التغييرات قبل تأكيدكم.');
  expect(text).not.toMatch(/خلاص|يستنى|توا/);
});
