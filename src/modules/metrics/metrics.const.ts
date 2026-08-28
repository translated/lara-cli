/**
 * Channel name this CLI reports as. Metrics keys are issued per channel: a key
 * for `cli` sending an event that declares another channel is rejected with 403.
 */
export const METRICS_CHANNEL = 'cli';

// TODO(before release): replace the placeholders below with the production
// values, or (preferred) keep them as-is and let CI substitute them — see
// scripts/bake-metrics-key.mjs and the "Bake metrics key" step in
// .github/workflows/publish.yml. A value still in `__NAME__` form is treated as
// absent at runtime, so a local build simply has telemetry switched off.
export const BAKED_METRICS_URL: string = '__METRICS_URL__';
export const BAKED_METRICS_API_KEY: string = '__METRICS_API_KEY__';

/**
 * The two steps of the ingestion contract. The channel key buys a short-lived
 * token from the first endpoint; only the token is ever accepted by the second.
 */
export const TOKEN_PATH = '/auth/issue-token';
export const INGEST_PATH = '/metrics/ingest-events';

/** Name of the queue file inside the state directory. */
export const QUEUE_FILE = 'metrics-queue.jsonl';

/** One UUID per installation, persisted: a fresh one per run breaks rate limiting. */
export const INSTALLATION_FILE = 'installation-id';

/** Cache of the resolved Lara account id, one file per access key id. */
export const ACCOUNT_FILE_PREFIX = 'account-';

/**
 * Earliest time the token endpoint will hand out another token. It answers one
 * request per installation every few seconds and tells us how long to wait; a
 * timestamp on disk is what carries that answer to the next CLI process. It is
 * a clock reading, not a credential — the token itself never leaves memory.
 */
export const TOKEN_COOLDOWN_FILE = 'token-cooldown';

/** Re-issue a token this long before it actually expires. */
export const TOKEN_MARGIN_MS = 60_000;

/** A machine offline for a month must not grow the queue forever. */
export const MAX_QUEUE = 1_000;

/**
 * Total budget for a flush — both requests share it, and the flush runs on the
 * user's path. A backend that does not answer within this costs nothing but the
 * events staying queued for the next run.
 */
export const FLUSH_TIMEOUT_MS = 2_000;

/** The backend rejects values past this rather than letting them wrap in storage. */
export const MAX_UINT32 = 4_294_967_295;
