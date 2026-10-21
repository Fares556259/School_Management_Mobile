const { getAccountChatCache, chatStorageKeys } = require('../chatCache');
it('isolates cached messages and conversation IDs when administrators switch accounts', () => {
  const first = getAccountChatCache('admin-a');
  first.messages = [{ id: 'private', content: 'school-a data' }]; first.conversationId = 'conversation-a';
  expect(getAccountChatCache('admin-a')).toBe(first);
  const second = getAccountChatCache('admin-b');
  expect(second.messages).toEqual([]); expect(second.conversationId).toBeUndefined();
  expect(chatStorageKeys('admin-a').messages).not.toEqual(chatStorageKeys('admin-b').messages);
  expect(chatStorageKeys('admin-a').conversation).not.toEqual(chatStorageKeys('admin-b').conversation);
  expect(getAccountChatCache('admin-a').messages).toEqual([]);
});
