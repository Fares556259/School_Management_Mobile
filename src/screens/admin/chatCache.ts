import type { ChatMessage } from './components/HniaMessageBubble';
let current: { owner: string; messages: ChatMessage[]; conversationId?: string } | undefined;

/** Discard the previous administrator's in-memory history when accounts change. */
export function getAccountChatCache(owner: string) {
  if (!current || current.owner !== owner) current = { owner, messages: [] };
  return current;
}
export const chatStorageKeys = (owner: string) => ({
  messages: `@hnia_chat_messages_v4:${owner}`,
  conversation: `@hnia_chat_conv_id_v4:${owner}`,
});
