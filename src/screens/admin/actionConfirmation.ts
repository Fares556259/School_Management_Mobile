export type DecisionStatus = 'PENDING' | 'EXECUTING' | 'EXECUTED' | 'REJECTED' | 'FAILED' | 'EXPIRED';
const statuses = new Set<DecisionStatus>(['PENDING', 'EXECUTING', 'EXECUTED', 'REJECTED', 'FAILED', 'EXPIRED']);

/** A decision always targets a server proposal. Never translate it into another chat command. */
export async function submitActionDecision(
  request: (id: string, action: 'confirm' | 'cancel', edits?: Record<string, any>) => Promise<any>,
  id: string,
  action: 'confirm' | 'cancel',
  edits?: Record<string, any>,
) {
  if (!id || /^(fallback_|parsed_)/.test(id)) throw new Error('Cette proposition doit être actualisée avant confirmation.');
  const result = await request(id, action, edits);
  const status = result?.actionStatus || result?.actionResult?.status;
  if (!statuses.has(status)) throw new Error(result?.message || 'Décision non vérifiée. Actualisez la discussion avant de réessayer.');
  return { ...result, actionStatus: status as DecisionStatus };
}

export function applyActionDecision<T extends { pendingConfirmation?: any; widget?: any }>(
  messages: T[], id: string, result: any, edits?: Record<string, any>,
): T[] {
  const update = (card: any): any => {
    if (Array.isArray(card)) return card.map(update);
    if (!card || card.toolCallId !== id) return card;
    return {
      ...card, status: result.actionStatus,
      arguments: edits ? { ...(card.arguments || {}), ...edits } : card.arguments,
      reference: result.actionResult?.reference,
      // Terminal cards render trusted structured fields. Do not expose the
      // tool's Markdown result body as receipt copy.
      resultMessage: undefined,
      completedAt: result.actionResult?.timestamp,
      undoExpenseId: result.undoExpenseId,
    };
  };
  return messages.map(message => ({
    ...message,
    pendingConfirmation: update(message.pendingConfirmation),
    widget: message.widget?.type === 'action_card' ? { ...message.widget, data: update(message.widget.data) } : message.widget,
  }));
}
