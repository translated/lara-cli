/**
 * Deterministic reproduction of the UTF-8 streaming bug in `@translated/lara`.
 *
 * The SDK reads the `/translate` streaming response with:
 *
 *     res.on('data', chunk => { buffer += chunk.toString(); ... })
 *
 * (`node_modules/@translated/lara/lib/net/lara/node-client.js:172`)
 *
 * `chunk.toString()` decodes each TCP chunk as UTF-8 independently. When a
 * multi-byte character is split across two chunks, each orphaned byte becomes
 * a U+FFFD replacement character. This is observable in the wild as `тез��`
 * (Bulgarian "these" — the final `и` truncated) or similar in Cyrillic /
 * Greek / CJK / Arabic translations.
 *
 * This test drives the SDK against a local HTTP server that writes the
 * response in two flushes, with the byte boundary deliberately placed
 * between the two UTF-8 bytes of `и` (`0xD0 0xB8`). The first assertion
 * proves the bug exists; the second shows that `node:string_decoder`
 * decodes the same wire bytes cleanly — i.e. the SDK's one-line fix.
 *
 * NOTE: this test depends on observable behaviour of an upstream package.
 * If `@translated/lara` is patched to use `StringDecoder` (or `TextDecoder`
 * with `stream: true`), the first assertion will fail — which is the
 * desired outcome; delete this file at that point.
 */

import { describe, it, expect } from 'vitest';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { StringDecoder } from 'node:string_decoder';
import { Translator, AuthToken } from '@translated/lara';

// Build a structurally-valid, non-expired JWT so the SDK's auth bypass kicks
// in (`client.js` short-circuits when an AuthToken is provided). Only the
// `exp` claim in the payload is inspected.
function makeFakeJwt(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })
  ).toString('base64url');
  return `${header}.${payload}.signature-not-checked`;
}

describe('@translated/lara: UTF-8 streaming response bug', () => {
  it('produces U+FFFD when a multi-byte char straddles a TCP chunk boundary', async () => {
    // The wire payload Lara would emit for a Bulgarian translation. The
    // streaming endpoint sends NDJSON; each line is a JSON object whose `data`
    // becomes the partial result.
    const responseText =
      JSON.stringify({
        status: 200,
        data: {
          content_type: 'text/plain',
          source_language: 'en',
          translation: [{ text: 'тези изменения', translatable: true }],
        },
      }) + '\n';

    const responseBytes = Buffer.from(responseText, 'utf8');

    // Locate the `и` inside `изменения` and find the byte index that sits
    // between its two UTF-8 bytes (0xD0 0xB8). Splitting the stream here is
    // what triggers the bug.
    const izmIndex = responseText.indexOf('изменения');
    const iCharIndex = izmIndex; // first char of 'изменения' is 'и'
    const bytesUpToI = Buffer.from(responseText.slice(0, iCharIndex + 1), 'utf8');
    const splitAt = bytesUpToI.length - 1; // between the two bytes of 'и'

    const chunkA = responseBytes.subarray(0, splitAt);
    const chunkB = responseBytes.subarray(splitAt);

    // Tiny HTTP server that flushes the response in two writes around the
    // mid-character byte. `setNoDelay` + a setTimeout between writes ensures
    // they arrive as separate `data` events on the client side.
    const server = createServer((_req, res) => {
      res.socket?.setNoDelay(true);
      res.writeHead(200, { 'content-type': 'application/x-ndjson' });
      res.write(chunkA);
      setTimeout(() => {
        res.write(chunkB);
        res.end();
      }, 20);
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;

    try {
      const translator = new Translator(new AuthToken(makeFakeJwt(), ''), {
        serverUrl: `http://127.0.0.1:${port}`,
      });

      const result = await translator.translate(
        [{ text: 'these changes', translatable: true }],
        'en',
        'bg'
      );

      const translatedText = (result.translation as Array<{ text: string }>)[0]!.text;

      // ─── Bug demonstration ─────────────────────────────────────────────
      // What we shipped on the wire: 'тези изменения'
      // What the SDK reports back:   'тези <U+FFFD><U+FFFD>зменения'
      expect(translatedText).toContain('�');
      expect(translatedText).not.toContain('изменения');
      // Prefix and suffix are intact — only the chars at the boundary are lost.
      expect(translatedText).toContain('тези');
      expect(translatedText).toContain('зменения');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('StringDecoder decodes the same chunk-split bytes correctly (the fix)', () => {
    // Same wire payload, same chunk boundary — but decoded with
    // `node:string_decoder`, which buffers incomplete UTF-8 sequences
    // across chunk boundaries. This is the one-line fix the SDK needs.
    const payload = JSON.stringify({ data: { translation: [{ text: 'тези изменения' }] } }) + '\n';
    const bytes = Buffer.from(payload, 'utf8');
    const izmIndex = payload.indexOf('изменения');
    const splitAt = Buffer.from(payload.slice(0, izmIndex + 1), 'utf8').length - 1;

    const decoder = new StringDecoder('utf8');
    const safe =
      decoder.write(bytes.subarray(0, splitAt)) +
      decoder.write(bytes.subarray(splitAt)) +
      decoder.end();

    expect(safe).not.toContain('�');
    expect(safe).toContain('тези изменения');
  });
});
