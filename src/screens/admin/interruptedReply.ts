import type { ChatMessage } from './components/HniaMessageBubble';
/** Replace this request's unverified fragment, keeping one clear reply in the conversation. */
export function replaceInterruptedReply(messages: ChatMessage[], replyId: string, content: string): ChatMessage[] {
  const replacement: ChatMessage = { id: replyId, role: 'assistant', content, isStreaming: false, widget: null, pendingConfirmation: null, createdAt: new Date().toISOString() };
  return messages.some(message => message.id === replyId)
    ? messages.map(message => message.id === replyId ? replacement : message)
    : [...messages, replacement];
}
