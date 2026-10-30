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
  act(() => button('Annuler cette dépense…').props.onPress());
  expect(undo).toHaveBeenCalledWith(23); expect(confirm).not.toHaveBeenCalled(); expect(cancel).not.toHaveBeenCalled();
});
it.each(['EXECUTED', 'REJECTED', 'FAILED', 'EXPIRED', 'EXECUTING'])('hides action buttons for %s cards', async status => { await render({ ...card, status }); expect(button('Confirmer')).toBeUndefined(); expect(button('Annuler')).toBeUndefined(); expect(confirm).not.toHaveBeenCalled(); });
it('editing does not execute, rejects negative amounts and preserves decimal commas', async () => {
  await render(); act(() => button('Modifier').props.onPress()); expect(confirm).not.toHaveBeenCalled();
  const amount = renderer.root.findAllByType(TextInput)[0];
  act(() => amount.props.onChangeText('-7')); act(() => button('Confirmer (-7 DT)').props.onPress());
  expect(confirm).not.toHaveBeenCalled(); expect(Alert.alert).toHaveBeenCalled();
  act(() => amount.props.onChangeText('7,50')); act(() => button('Confirmer (7,50 DT)').props.onPress());
  expect(confirm).toHaveBeenCalledWith('proposal-a', expect.objectContaining({ amount: 7.5 }));
});
it('keeps the parent beneficiary key when editing a family payment', async () => {
  await render({ ...card, toolName: 'record_parent_payment', actionType: 'payment', arguments: { amount: 100, parentNameOrId: 'Amel Ben Ali' } });
  act(() => button('Modifier').props.onPress());
  act(() => renderer.root.findAllByType(TextInput).find(node => node.props.placeholder === 'Nom complet').props.onChangeText('Sonia Trabelsi'));
  act(() => button('Confirmer (100 DT)').props.onPress());
  expect(confirm).toHaveBeenCalledWith('proposal-a', expect.objectContaining({ parentNameOrId: 'Sonia Trabelsi' }));
  expect(confirm.mock.calls[0][1].studentNameOrId).toBeUndefined();
});
