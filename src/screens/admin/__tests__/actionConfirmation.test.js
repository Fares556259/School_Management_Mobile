const { submitActionDecision, applyActionDecision } = require('../actionConfirmation');

it('requires a server proposal instead of sending a textual confirmation', async () => {
  const request = jest.fn();
  for (const id of ['', 'fallback_1', 'parsed_2']) await expect(submitActionDecision(request, id, 'confirm')).rejects.toThrow('actualisée');
  expect(request).not.toHaveBeenCalled();
});
it('never retries or invents another action after a network failure', async () => {
  const request = jest.fn().mockRejectedValue(new Error('Lost connection'));
  await expect(submitActionDecision(request, 'id', 'confirm')).rejects.toThrow('Lost connection');
  expect(request).toHaveBeenCalledTimes(1);
});
it('sends the reviewed fingerprint and replaces edited cards only with the server proposal', async () => {
  const proposal = { toolCallId: 'target', status: 'PENDING', arguments: { amount: 7.5 }, reviewFingerprint: 'new-review' };
  const request = jest.fn().mockResolvedValue({ actionStatus: 'PENDING', reviewRequired: true, proposal });
  const result = await submitActionDecision(request, 'target', 'confirm', { amount: '7,50' }, 'old-review');
  expect(request).toHaveBeenCalledWith('target', 'confirm', { amount: '7,50' }, 'old-review');
  const messages = [{ pendingConfirmation: { toolCallId: 'target', arguments: { amount: 10 } } }];
  expect(applyActionDecision(messages, 'target', result, { amount: 100 })[0].pendingConfirmation).toEqual(proposal);
  expect(applyActionDecision(messages, 'target', { actionStatus: 'PENDING' }, { amount: 100 })[0].pendingConfirmation.arguments.amount).toBe(10);
});
it('refuses a success response without a verified action status', async () => {
  const request = jest.fn().mockResolvedValue({ success: true, message: 'Already processing' });
  await expect(submitActionDecision(request, 'id', 'confirm')).rejects.toThrow('Already processing');
});
it.each(['EXECUTED', 'REJECTED', 'EXECUTING', 'FAILED', 'EXPIRED'])('uses server %s status without inferring it from the button', async status => {
  const result = await submitActionDecision(jest.fn().mockResolvedValue({ success: false, actionStatus: status }), 'target', 'confirm');
  const target = { toolCallId: 'target', status: 'PENDING' };
  const other = { toolCallId: 'other', status: 'PENDING' };
  const messages = [{ pendingConfirmation: [target, other], widget: { type: 'action_card', data: [target, other] } }];
  const next = applyActionDecision(messages, 'target', result);
  expect(next[0].pendingConfirmation[0].status).toBe(status);
  expect(next[0].widget.data[0].status).toBe(status);
  expect(next[0].pendingConfirmation[1]).toEqual(other);
  expect(messages[0].pendingConfirmation[0].status).toBe('PENDING');
});
