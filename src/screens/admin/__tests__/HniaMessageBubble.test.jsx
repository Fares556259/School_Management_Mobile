import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import HniaMessageBubble from '../components/HniaMessageBubble';
import { ActionCardWidget, tryParseCaisseWidget, tryParseUnpaidWidget, tryParseReceiptWidget } from '../HniaWidgets';
import { Text } from 'react-native';
jest.mock('../../../components/PrivacyControls', () => ({ ReportAIResponse: () => null }));
jest.mock('../HniaWidgets', () => ({
  ActionCardWidget: jest.fn(() => null), CaisseCardWidget: () => null, UnpaidTuitionWidget: () => null, PdfReceiptWidget: () => null, FinanceSummaryWidget: () => null, StudentProfileWidget: () => null, AttendanceSummaryWidget: () => null,
  tryParseCaisseWidget: jest.fn(() => null), tryParseUnpaidWidget: jest.fn(() => null), tryParseReceiptWidget: jest.fn(() => null),
}));
it('uses the verified widget without parsing the same text into duplicate legacy cards', async () => {
  let renderer;
  await act(async () => { renderer = TestRenderer.create(<HniaMessageBubble message={{ id: 'result', role: 'assistant', content: 'Impayés : Ahmed 100 DT', widget: { type: 'school_records', data: { kind: 'get_payments', title: 'Impayés', total: 1, rows: [{ key: '1', title: 'Ahmed', amount: 100 }] } } }} onPreviewImage={jest.fn()} onCopyText={jest.fn()} isCopied={false} onConfirmAction={jest.fn()} onCancelAction={jest.fn()} isActionExecuting={false} onSelectSuggestion={jest.fn()} />); });
  expect(tryParseCaisseWidget).not.toHaveBeenCalled();
  expect(tryParseUnpaidWidget).not.toHaveBeenCalled();
  expect(tryParseReceiptWidget).not.toHaveBeenCalled();
  act(() => renderer.unmount());
});
it('hides the old generated internal undo prompt and routes new requests as structured selections', async () => {
  let renderer; const reverse = jest.fn(); const suggestion = jest.fn();
  const props = { onPreviewImage: jest.fn(), onCopyText: jest.fn(), isCopied: false, onConfirmAction: jest.fn(), onCancelAction: jest.fn(), isActionExecuting: false, onSelectSuggestion: suggestion, onPrepareExpenseReversal: reverse };
  await act(async () => { renderer = TestRenderer.create(<HniaMessageBubble {...props} message={{ id: 'legacy', role: 'user', content: 'Prépare une carte de confirmation pour annuler la dépense dont l’identifiant exact est 407. Utilise void_expense avec expenseId: 407.' }} />); });
  const text = renderer.root.findAllByType(Text).map(node => String(node.props.children)).join(' ');
  expect(text).toContain('Préparer l’annulation de cette dépense'); expect(text).not.toMatch(/void_expense|expenseId|407/);
  ActionCardWidget.mockClear();
  await act(async () => { renderer.update(<HniaMessageBubble {...props} message={{ id: 'receipt', role: 'assistant', content: 'Dépense enregistrée', pendingConfirmation: { toolCallId: 'proposal', toolName: 'add_expense', status: 'EXECUTED', undoExpenseId: 407 } }} />); });
  ActionCardWidget.mock.calls[0][0].onRequestUndo(407);
  expect(reverse).toHaveBeenCalledWith(407); expect(suggestion).not.toHaveBeenCalled();
  act(() => renderer.unmount());
});
