import 'server-only';

export class CheckoutRequestError extends Error {
  constructor(message: string, readonly status: 400 | 413) { super(message); }
}

export async function readCheckoutRequestText(request: Request, maxBytes: number): Promise<string> {
  const length = request.headers.get('content-length');
  if (length && /^\d+$/.test(length) && Number(length) > maxBytes) {
    throw new CheckoutRequestError('Request too large.', 413);
  }
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0, text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) throw new CheckoutRequestError('Request too large.', 413);
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    if (error instanceof CheckoutRequestError) throw error;
    throw new CheckoutRequestError('Invalid request body.', 400);
  } finally {
    reader.releaseLock();
  }
}

export function parseCheckoutRequestJson(raw: string): unknown {
  try { return JSON.parse(raw); }
  catch { throw new CheckoutRequestError('Invalid JSON request.', 400); }
}
