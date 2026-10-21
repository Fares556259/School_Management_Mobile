const { replaceInterruptedReply } = require('../interruptedReply');
it('replaces an unverified partial Ey with one failure, removing incomplete widgets', () => {
  const messages = [{ id: 'old', role: 'assistant', content: 'Previous answer' }, { id: 'reply', role: 'assistant', content: 'Ey', isStreaming: true, widget: { type: 'student_card', data: {} } }];
  const next = replaceInterruptedReply(messages, 'reply', 'Not verified');
  expect(next).toHaveLength(2);
  expect(next[0]).toEqual(messages[0]);
  expect(next[1]).toMatchObject({ content: 'Not verified', isStreaming: false, widget: null });
  expect(next.some(message => message.content === 'Ey')).toBe(false);
});
it('adds a single failure when the stream never started, and stays idempotent', () => {
  const first = replaceInterruptedReply([], 'reply', 'Network error');
  expect(replaceInterruptedReply(first, 'reply', 'Network error')).toHaveLength(1);
});
