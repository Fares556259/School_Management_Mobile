export type ChatStreamCallbacks = {
  onStatus?: (status: { step: string; tool?: string }) => void;
  onTranscription?: (transcription: string) => void;
  onToken?: (delta: string) => void;
  onWidget?: (widget: any) => void;
  onConfirmation?: (pendingConfirmation: any) => void;
  onDone?: (result: any) => void;
  onError?: (error: any) => void;
};

type StreamOptions = {
  url: string;
  headers: Record<string, string>;
  data: object;
  callbacks: ChatStreamCallbacks;
  signal?: AbortSignal;
  isCurrent: () => boolean;
  onUnauthorized: () => void;
};

/** One request, never retried: chat can perform actions, so replaying it is unsafe. */
export function requestChatStream({ url, headers, data, callbacks, signal, isCurrent, onUnauthorized }: StreamOptions): Promise<any> {
  if (signal?.aborted || !isCurrent()) return Promise.resolve({ aborted: true });
  return new Promise(resolve => {
    const xhr = new XMLHttpRequest();
    let settled = false;
    let seen = 0;
    let buffer = '';
    let event = 'message';
    let dataLines: string[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    const notify = (callback: ((value: any) => void) | undefined, value: any) => {
      // A rendering callback must not prevent request cleanup or resolution.
      try { callback?.(value); } catch { console.warn('[Chat stream] Callback failed'); }
    };
    const finish = (result: any, stop = false) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      xhr.onprogress = xhr.onload = xhr.onerror = xhr.ontimeout = xhr.onabort = null;
      if (stop) xhr.abort();
      resolve(result);
    };
    const cancel = () => finish({ aborted: true }, true);
    const active = () => {
      if (settled) return false;
      if (signal?.aborted || !isCurrent()) { cancel(); return false; }
      return true;
    };
    const fail = (error: string) => {
      if (!active()) return;
      finish({ success: false, error }, true);
      notify(callbacks.onError, new Error(error));
    };
    const resetTimeout = () => {
      clearTimeout(timer);
      timer = setTimeout(() => fail('Aucune réponse reçue depuis 30 secondes.'), 30000);
    };
    const complete = (result: any) => {
      if (!active()) return;
      if (!result || typeof result !== 'object' || result.success !== true) {
        fail(typeof result?.error === 'string' ? result.error : 'La réponse n’a pas pu être terminée.');
        return;
      }
      finish(result, true);
      notify(callbacks.onDone, result);
    };
    const dispatch = () => {
      const text = dataLines.join('\n');
      const name = event;
      dataLines = [];
      event = 'message';
      if (!text || !active()) return;
      let parsed: any;
      try { parsed = JSON.parse(text); }
      catch { fail('Réponse illisible. Veuillez réessayer.'); return; }
      if (!parsed || typeof parsed !== 'object') { fail('Réponse illisible. Veuillez réessayer.'); return; }
      if (name === 'done') complete(parsed);
      else if (name === 'error') fail(typeof parsed.error === 'string' ? parsed.error : 'La réponse a été interrompue.');
      else if (name === 'status') notify(callbacks.onStatus, parsed);
      else if (name === 'transcription') notify(callbacks.onTranscription, parsed.transcription || '');
      else if (name === 'token') notify(callbacks.onToken, parsed.delta || '');
      else if (name === 'widget') notify(callbacks.onWidget, parsed.widget);
      else if (name === 'confirmation') notify(callbacks.onConfirmation, parsed.pendingConfirmation);
    };
    const line = (raw: string) => {
      const value = raw.replace(/\r$/, '');
      if (value === '') dispatch();
      else if (value.startsWith('event:')) event = value.slice(6).trim();
      else if (value.startsWith('data:')) dataLines.push(value.slice(5).replace(/^ /, ''));
    };
    const consume = (end = false) => {
      buffer += xhr.responseText.slice(seen);
      seen = xhr.responseText.length;
      let index: number;
      while (active() && (index = buffer.indexOf('\n')) >= 0) {
        const current = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        line(current);
      }
      // Some proxies deliver the final frame only with onload, without a trailing newline.
      if (end && active()) { if (buffer) line(buffer); buffer = ''; dispatch(); }
    };
    signal?.addEventListener('abort', cancel);
    if (!active()) return;
    try {
      xhr.open('POST', url, true);
      Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
      xhr.onprogress = () => {
        if (!active()) return;
        resetTimeout();
        if (xhr.status >= 200 && xhr.status < 300) consume();
      };
      xhr.onload = () => {
        if (!active()) return;
        if (xhr.status < 200 || xhr.status >= 300) {
          const status = xhr.status;
          fail(`HTTP ${status}`);
          if (status === 401 && isCurrent()) onUnauthorized();
          return;
        }
        // The endpoint may return ordinary JSON instead of SSE for immediate results.
        if (xhr.responseText.trimStart().startsWith('{')) {
          try { complete(JSON.parse(xhr.responseText)); }
          catch { fail('Réponse illisible. Veuillez réessayer.'); }
          return;
        }
        consume(true);
        if (active()) fail('La réponse a été interrompue avant sa fin.');
      };
      xhr.onerror = () => fail('Erreur réseau. Vérifiez votre connexion.');
      xhr.ontimeout = () => fail('La requête a expiré. Veuillez réessayer.');
      xhr.onabort = cancel;
      xhr.timeout = 90000;
      resetTimeout();
      xhr.send(JSON.stringify({ ...data, stream: true }));
    } catch { fail('Impossible de démarrer la requête.'); }
  });
}
