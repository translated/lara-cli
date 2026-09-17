import fs from 'fs';
import {
  Credentials,
  LaraApiError,
  TranslateOptions,
  Translator,
  Memory,
  MemoryImport,
  GlossaryImport,
  GlossaryFileFormat,
} from '@translated/lara';
import { Messages } from '#messages/messages.js';
import { applyLaraClientHeaders, internalLaraClient } from '#utils/laraHeaders.js';
import { isQuotaError } from '#utils/error.js';
import * as metrics from '#modules/metrics/metrics.js';

export type GlossaryTerm = { language: string; value: string };

// Hard cap on every API request. Without it a hung connection freezes the CLI
// forever (the SDK has no default timeout). A slow-but-healthy request finishes
// well within this; a stalled one fails fast so retries/fallback can proceed.
const REQUEST_TIMEOUT_MS = 30_000;

// Account-level failures that affect EVERY request: bad credentials (401),
// payment required (402), forbidden (403), and "plan out of characters" (quota,
// which the API sends as a normal error whose message mentions "quota", not a
// dedicated status code). These must not be retried or swallowed into the
// per-item fallback — they abort the run with a clear message instead of
// silently keeping every string as source.
export function isFatalApiError(error: unknown): boolean {
  if (
    error instanceof LaraApiError &&
    (error.statusCode === 401 || error.statusCode === 402 || error.statusCode === 403)
  ) {
    return true;
  }
  return isQuotaError(error);
}

// The Glossary interface is defined by the SDK but not re-exported from the
// package root, so derive it from the typed client method instead.
type Glossary = Awaited<ReturnType<Translator['glossaries']['create']>>;

export type TextBlock = {
  text: string;
  translatable: boolean;
  // Set by translateBatchWithFallback when a block could not be translated (batch
  // and per-item both failed). The block keeps its source text; the caller keeps
  // the original value and reports it instead of aborting the whole file.
  translationFailed?: boolean;
};

export class TranslationService {
  private static instance: TranslationService;

  private readonly client: Translator;

  private constructor() {
    const keyId = process.env.LARA_ACCESS_KEY_ID!;
    const keySecret = process.env.LARA_ACCESS_KEY_SECRET!;

    if (!keyId || !keySecret) {
      throw new Error(Messages.errors.envVarsNotSet);
    }

    this.client = new Translator(new Credentials(keyId, keySecret), {
      // Maps to the node client's hard request timeout (req.destroy), which is
      // the client-side socket timeout that actually prevents a frozen CLI.
      connectionTimeoutMs: REQUEST_TIMEOUT_MS,
      // Points the SDK at a non-production Lara deployment (staging, a
      // self-hosted instance, or the e2e harness). Unset in normal use.
      ...(process.env.LARA_SERVER_URL ? { serverUrl: process.env.LARA_SERVER_URL } : {}),
    });
    applyLaraClientHeaders(this.client);
    // Lets the metrics module read the Lara account id off the JWT the SDK
    // already holds, instead of signing a second /v2/auth call of its own.
    metrics.trackLaraClient(internalLaraClient(this.client));
  }

  /**
   * Cheapest authenticated call there is. Used by `init` to turn a key the user
   * just typed into a real yes/no answer — the CLI has no login step, so an API
   * response is the only proof credentials are good.
   */
  public async validateCredentials(): Promise<void> {
    await this.reporting(this.client.getLanguages());
  }

  /**
   * Hands every real API answer to metrics and gets out of the way — what a
   * given status means is decided there. Wraps the memory and glossary calls
   * too, which authenticate but never translate.
   */
  private async reporting<T>(call: Promise<T>): Promise<T> {
    try {
      const result = await call;
      metrics.recordApiAnswer();
      return result;
    } catch (error) {
      metrics.recordApiAnswer(error);
      throw error;
    }
  }

  public static getInstance(): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService();
    }

    return TranslationService.instance;
  }

  public async translate(
    textBlocks: TextBlock[],
    sourceLocale: string,
    targetLocale: string,
    options: TranslateOptions
  ): Promise<TextBlock[]> {
    const maxRetries = 5;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        // A real API answer is the only proof the credentials are good: the CLI
        // has no login step, so reporting() turns the answer into an auth event.
        const response = await this.reporting(
          this.client.translate(textBlocks, sourceLocale, targetLocale, options)
        );
        metrics.recordTranslated(textBlocks.reduce((total, block) => total + block.text.length, 0));
        return response.translation;
      } catch (error) {
        // Only what escapes this loop is reported: an error the next attempt
        // recovers from never reached the user, and recording it would pin the
        // run's errorType on a failure that did not happen.

        // Retrying an auth/quota failure is pointless — surface it immediately.
        if (isFatalApiError(error)) {
          metrics.recordError(error);
          throw error;
        }

        attempt++;

        if (attempt >= maxRetries) {
          metrics.recordError(error);
          throw error;
        }

        // Wait 200ms before retrying
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error(Messages.errors.maxRetriesExceeded);
  }

  /**
   * Translate a batch of text blocks with a single API call; if the batch
   * call fails after retries, fall back to translating each block individually
   * so one bad item does not block the rest of the batch.
   */
  public async translateBatchWithFallback(
    textBlocks: TextBlock[],
    sourceLocale: string,
    targetLocale: string,
    options: TranslateOptions
  ): Promise<TextBlock[]> {
    if (textBlocks.length === 0) {
      return [];
    }

    try {
      const result = await this.translate(textBlocks, sourceLocale, targetLocale, options);
      if (result.length === textBlocks.length && result.every((block) => block !== undefined)) {
        return result;
      }
    } catch (error) {
      // Account-level failures abort the whole run with a clear message; do not
      // fall back to per-item (every item would fail the same way).
      if (isFatalApiError(error)) {
        throw error;
      }
      // Otherwise fall through to per-item translation below.
    }

    // Per-item fallback. A single block that cannot be translated (e.g. a bare
    // URL the API returns empty for) must NOT abort the batch: keep its source
    // text and mark it so the caller can preserve the original and report it.
    //
    // But when the API is down / every request times out, translating each of
    // the (up to batchSize) blocks one by one would take minutes and look like a
    // hang. So stop calling after a short run of consecutive failures and keep
    // the source text for the rest.
    const MAX_CONSECUTIVE_FAILURES = 3;
    let consecutiveFailures = 0;
    const results: TextBlock[] = [];

    for (const block of textBlocks) {
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        results.push({ ...block, translationFailed: true });
        continue;
      }
      try {
        const single = await this.translate([block], sourceLocale, targetLocale, options);
        const translated = single[0];
        if (!translated) {
          throw new Error(Messages.errors.emptyTranslationResult(block.text));
        }
        results.push(translated);
        consecutiveFailures = 0;
      } catch (error) {
        if (isFatalApiError(error)) {
          throw error;
        }
        results.push({ ...block, translationFailed: true });
        consecutiveFailures++;
      }
    }

    return results;
  }

  public async getTranslationMemories(): Promise<Memory[]> {
    return this.reporting(this.client.memories.list());
  }

  public async createMemory(name: string): Promise<Memory> {
    return this.reporting(this.client.memories.create(name));
  }

  public async updateMemory(id: string, name: string): Promise<Memory> {
    return this.reporting(this.client.memories.update(id, name));
  }

  public async deleteMemory(id: string): Promise<Memory> {
    return this.reporting(this.client.memories.delete(id));
  }

  public async addMemoryTranslation(
    id: string,
    source: string,
    target: string,
    sentence: string,
    translation: string
  ): Promise<MemoryImport> {
    return this.reporting(
      this.client.memories.addTranslation(id, source, target, sentence, translation)
    );
  }

  public async deleteMemoryTranslation(
    id: string,
    source: string,
    target: string,
    sentence: string,
    translation?: string
  ): Promise<MemoryImport> {
    return this.reporting(
      this.client.memories.deleteTranslation(id, source, target, sentence, translation)
    );
  }

  public async importMemoryTmx(
    id: string,
    filePath: string,
    gzip?: boolean
  ): Promise<MemoryImport> {
    return this.reporting(this.client.memories.importTmx(id, fs.createReadStream(filePath), gzip));
  }

  public async getGlossaries(): Promise<Glossary[]> {
    return this.reporting(this.client.glossaries.list());
  }

  public async createGlossary(name: string): Promise<Glossary> {
    return this.reporting(this.client.glossaries.create(name));
  }

  public async updateGlossary(id: string, name: string): Promise<Glossary> {
    return this.reporting(this.client.glossaries.update(id, name));
  }

  public async deleteGlossary(id: string): Promise<Glossary> {
    return this.reporting(this.client.glossaries.delete(id));
  }

  public async addGlossaryEntry(id: string, terms: GlossaryTerm[]): Promise<GlossaryImport> {
    return this.reporting(this.client.glossaries.addOrReplaceEntry(id, terms));
  }

  public async deleteGlossaryEntry(id: string, term: GlossaryTerm): Promise<GlossaryImport> {
    return this.reporting(this.client.glossaries.deleteEntry(id, term));
  }

  public async importGlossaryCsv(
    id: string,
    filePath: string,
    contentType: GlossaryFileFormat = 'csv/table-uni',
    gzip?: boolean
  ): Promise<GlossaryImport> {
    return this.reporting(
      this.client.glossaries.importCsv(id, fs.createReadStream(filePath), contentType, gzip)
    );
  }
}
