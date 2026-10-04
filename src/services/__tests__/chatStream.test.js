const { requestChatStream } = require('../chatStream');
let xhr, originalXHR, callbacks, controller, current, unauthorized;
class FakeXHR {
  status = 200;
  responseText = '';
  headers = {};
  open = jest.fn();
  setRequestHeader = (key, value) => { this.headers[key] = value; };
  send = jest.fn();
  abort = jest.fn(() => this.onabort?.());
  constructor() { xhr = this; }
  chunk(text) { this.responseText += text; this.onprogress?.(); }
  load(text = '') { this.responseText += text; this.onload?.(); }
}
const frame = (event, data) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
const start = () => requestChatStream({ url: 'https://example.com/chat', headers: { Authorization: 'Bearer test' }, data: { message: 'test' }, callbacks, signal: controller.signal, isCurrent: () => current, onUnauthorized: unauthorized });
beforeEach(() => {
  jest.useFakeTimers();
  originalXHR = global.XMLHttpRequest;
  global.XMLHttpRequest = FakeXHR;
  xhr = undefined;
  callbacks = { onToken: jest.fn(), onDone: jest.fn(), onError: jest.fn(), onStatus: jest.fn() };
  controller = new AbortController();
  current = true;
  unauthorized = jest.fn();
});
afterEach(() => { global.XMLHttpRequest = originalXHR; jest.useRealTimers(); jest.restoreAllMocks(); });

it('parses split CRLF frames and completes once with cleaned timers/listeners', async () => {
  const remove = jest.spyOn(controller.signal, 'removeEventListener');
  const pending = start();
  const text = (frame('token', { delta: 'Bonjour' }) + frame('done', { success: true, message: 'Bonjour' })).replace(/\n/g, '\r\n');
  for (const character of text) xhr.chunk(character);
  expect(await pending).toEqual({ success: true, message: 'Bonjour' });
  expect(callbacks.onToken).toHaveBeenCalledWith('Bonjour');
  expect(callbacks.onDone).toHaveBeenCalledTimes(1);
  expect(callbacks.onError).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
  expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
  controller.abort();
  expect(callbacks.onDone).toHaveBeenCalledTimes(1);
});
it('consumes proxy-buffered SSE on load, including a final frame without newline', async () => {
  const pending = start();
  xhr.load(frame('token', { delta: 'Hi' }) + frame('done', { success: true }).trimEnd());
  expect((await pending).success).toBe(true);
  expect(callbacks.onToken).toHaveBeenCalledWith('Hi');
  expect(callbacks.onDone).toHaveBeenCalledTimes(1);
});
it.each(['error', 'done'])('treats a failed %s event as failure, never success', async event => {
  const pending = start();
  xhr.chunk(frame(event, { success: false, error: 'Failed' }));
  expect(await pending).toEqual({ success: false, error: 'Failed' });
  expect(callbacks.onDone).not.toHaveBeenCalled();
  expect(callbacks.onError).toHaveBeenCalledTimes(1);
});
it('rejects a disconnected partial answer and does not resend the action', async () => {
  const pending = start();
  xhr.chunk(frame('token', { delta: 'Partial' }));
  xhr.load();
  expect((await pending).success).toBe(false);
  expect(callbacks.onDone).not.toHaveBeenCalled();
  expect(xhr.send).toHaveBeenCalledTimes(1);
});
it('times out even when no first byte arrives', async () => {
  const pending = start();
  jest.advanceTimersByTime(30000);
  expect((await pending).success).toBe(false);
  expect(xhr.abort).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});
it('does not send an already cancelled request and quietly stops an active one', async () => {
  controller.abort();
  expect(await start()).toEqual({ aborted: true });
  expect(xhr).toBeUndefined();
  controller = new AbortController();
  const pending = start();
  controller.abort();
  expect(await pending).toEqual({ aborted: true });
  expect(callbacks.onError).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});
it('discards old-account responses, including delayed unauthorized failures', async () => {
  const pending = start();
  current = false;
  xhr.status = 401;
  xhr.load('Unauthorized');
  expect(await pending).toEqual({ aborted: true });
  expect(unauthorized).not.toHaveBeenCalled();
  expect(callbacks.onDone).not.toHaveBeenCalled();
  expect(callbacks.onError).not.toHaveBeenCalled();
});
it('handles current-account 401 and ordinary JSON responses', async () => {
  let pending = start();
  xhr.status = 401;
  xhr.load();
  expect((await pending).success).toBe(false);
  expect(unauthorized).toHaveBeenCalledTimes(1);
  pending = start();
  xhr.load(JSON.stringify({ success: true, message: 'Done' }));
  expect((await pending).message).toBe('Done');
});
it('settles malformed data and throwing callbacks without leaking timers', async () => {
  const pending = start();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  callbacks.onError.mockImplementation(() => { throw new Error('UI failed'); });
  xhr.chunk('event: done\ndata: {bad}\n\n');
  expect((await pending).success).toBe(false);
  expect(jest.getTimerCount()).toBe(0);
});
