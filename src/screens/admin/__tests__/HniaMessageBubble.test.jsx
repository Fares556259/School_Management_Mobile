import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import HniaMessageBubble from '../components/HniaMessageBubble';
import { tryParseCaisseWidget, tryParseUnpaidWidget, tryParseReceiptWidget } from '../HniaWidgets';
jest.mock('../../../components/PrivacyControls', () => ({ ReportAIResponse: () => null }));
jest.mock('../HniaWidgets', () => ({
  ActionCardWidget: () => null, CaisseCardWidget: () => null, UnpaidTuitionWidget: () => null, PdfReceiptWidget: () => null, FinanceSummaryWidget: () => null, StudentProfileWidget: () => null, AttendanceSummaryWidget: () => null,
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
