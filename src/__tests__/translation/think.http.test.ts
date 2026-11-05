import { createServer } from 'node:http';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { TranslationService } from '../../modules/translation/translation.service.js';
import * as metrics from '../../modules/metrics/metrics.js';

let server: ReturnType<typeof createServer>;
let bodies: any[];
let fallback: boolean;
let failBatch: boolean;
let service: TranslationService;
beforeEach(async () => {
  bodies = [];
  fallback = false;
  failBatch = false;
  vi.stubEnv('DO_NOT_TRACK', '1');
  vi.stubEnv('LARA_ACCESS_KEY_ID', 'test');
  vi.stubEnv('LARA_ACCESS_KEY_SECRET', 'test');
  server = createServer(async (req, res) => {
    let data = '';
    for await (const chunk of req) data += chunk;
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/v2/auth') {
      const token = `x.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString('base64url')}.x`;
      res.end(JSON.stringify({ token }));
      return;
    }
    const body = JSON.parse(data);
    bodies.push(body);
    if (failBatch && body.q.length > 1) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: { type: 'ServerError', message: 'batch failed' } }));
      return;
    }
    res.end(
      JSON.stringify({
        translation: body.q,
        ...(fallback
          ? {
              warnings: {
                reasoning: { applied: false, error: { status_code: 503, message: 'unavailable' } },
              },
            }
          : {}),
      }) + '\n'
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  vi.stubEnv('LARA_SERVER_URL', `http://127.0.0.1:${(server.address() as { port: number }).port}`);
  (TranslationService as any).instance = undefined;
  service = TranslationService.getInstance();
});
afterEach(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  (TranslationService as any).instance = undefined;
});
const blocks = [{ text: 'Hello', translatable: true }];
it.each(['low', 'medium', 'high'] as const)('sends %s through the real SDK', async (level) => {
  await service.translate(blocks, 'en', 'it', { reasoning: true, reasoningEffort: level });
  expect(bodies[0]).toMatchObject({ reasoning: true, effort: level });
});
it('defaults to high, keeps Base unchanged, and configures connection deadlines', async () => {
  const create = vi.spyOn(service as any, 'createClient');
  await service.translate(blocks, 'en', 'it', { reasoning: true });
  expect(create).toHaveBeenCalledWith(300_000);
  expect((service as any).thinkClient.client.timeout).toBe(300_000);
  expect((service as any).client.client.timeout).toBe(30_000);
  expect(bodies[0].effort).toBe('high');
  await service.translate(blocks, 'en', 'it', {});
  expect(bodies[1]).not.toHaveProperty('effort');
});
it('rejects effort without Think before HTTP', async () => {
  await expect(service.translate(blocks, 'en', 'it', { reasoningEffort: 'low' })).rejects.toThrow();
  expect(bodies).toHaveLength(0);
});
it('keeps translation and reports fallback without logging content', async () => {
  fallback = true;
  const warning = vi.spyOn(console, 'error').mockImplementation(() => {});
  const context = vi.spyOn(metrics, 'setContext');
  expect(await service.translate(blocks, 'en', 'it', { reasoning: true })).toEqual(blocks);
  expect(warning).toHaveBeenCalledWith(expect.stringContaining('not applied'));
  expect(context).toHaveBeenCalledWith({ reasoningFallback: true });
});
it('retains effort across batch retries and per-item fallback', async () => {
  failBatch = true;
  const result = await service.translateBatchWithFallback([...blocks, ...blocks], 'en', 'it', {
    reasoning: true,
    reasoningEffort: 'medium',
  });
  expect(result).toHaveLength(2);
  expect(bodies).toHaveLength(7);
  expect(bodies.every((body) => body.reasoning === true && body.effort === 'medium')).toBe(true);
});
