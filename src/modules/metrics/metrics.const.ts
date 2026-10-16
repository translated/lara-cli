/**
 * Channel name this CLI reports as. Metrics keys are issued per channel: a key
 * for `cli` sending an event that declares another channel is rejected with 403.
 */
export const METRICS_CHANNEL = 'cli';

// Substituted at publish time from the repository variable METRICS_URL and the
// secret METRICS_API_KEY — see scripts/bake-metrics-key.mjs and the "Bake
// metrics key" step in .github/workflows/publish.yml, which fails the release
// rather than shipping these as they are. A value still in `__NAME__` form is
// treated as absent at runtime, so a local build has telemetry switched off.
export const BAKED_METRICS_URL: string = '__METRICS_URL__';
export const BAKED_METRICS_API_KEY: string = '__METRICS_API_KEY__';

/**
 * The two steps of the ingestion contract. The channel key buys a short-lived
 * token from the first endpoint; only the token is ever accepted by the second.
 */
export const TOKEN_PATH = '/auth/issue-token';
export const INGEST_PATH = '/metrics/ingest-events';

/** Legacy queue filename and prefix for immutable queue segments. */
export const QUEUE_FILE = 'metrics-queue.jsonl';

/** Shared by flushers; writers keep publishing while another process sends. */
export const FLUSH_LOCK_FILE = 'metrics-flush.lock';

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
 * The backend rejects a timestamp more than 30 days old, and it rejects the
 * batch it sits in as a whole — so one event left over from a long-offline
 * machine would take every fresh event with it. Dropped a day early, so an
 * event cannot age past the bound between being read and being received.
 */
export const MAX_EVENT_AGE_MS = 29 * 24 * 60 * 60 * 1_000;

/**
 * The other end of the same rule: the backend rejects a timestamp more than an
 * hour in the future, and a machine whose clock runs ahead would otherwise
 * queue events that poison every batch they ride in. Half the bound, so the
 * flight time cannot push a borderline event past it.
 */
export const MAX_EVENT_FUTURE_MS = 30 * 60 * 1_000;

/**
 * Total budget for a flush — both requests share it, and the flush runs on the
 * user's path. A backend that does not answer within this costs nothing but the
 * events staying queued for the next run.
 */
export const FLUSH_TIMEOUT_MS = 2_000;

/** The backend rejects values past this rather than letting them wrap in storage. */
export const MAX_UINT32 = 4_294_967_295;

/**
 * Environment variables that mean "this is a build, not a person". A pipeline
 * that translates on every push would otherwise read as a very busy user, and
 * the funnel we care about is the human one.
 */
export const CI_ENV_VARS = [
  'CI',
  'CONTINUOUS_INTEGRATION',
  'GITHUB_ACTIONS',
  'GITLAB_CI',
  'CIRCLECI',
  'BUILDKITE',
  'JENKINS_URL',
  'TEAMCITY_VERSION',
  'TF_BUILD',
  'BITBUCKET_BUILD_NUMBER',
] as const;

/**
 * Every command the CLI can run, as the metrics vocabulary names it: the
 * commander path and nothing the user typed after it. Reported as
 * `metadata.command`, so a dashboard can tell `memory list` from `translate`
 * without ever seeing an id, a name or a file.
 */
export type CommandId =
  | 'translate'
  | 'init'
  | 'memory'
  | 'memory list'
  | 'memory create'
  | 'memory update'
  | 'memory delete'
  | 'memory add-translation'
  | 'memory delete-translation'
  | 'memory import-tmx'
  | 'glossary'
  | 'glossary list'
  | 'glossary create'
  | 'glossary update'
  | 'glossary delete'
  | 'glossary add-entry'
  | 'glossary delete-entry'
  | 'glossary import-csv';

/**
 * Which capability each command family exercises, in the same words the MCP
 * channel uses so the two can be read side by side. Keyed by the root command,
 * so a new subcommand inherits it. `translate` is the one command that
 * overrides this at runtime: it reports `text` or `document` depending on the
 * mode the user reached for.
 */
export const COMMAND_FEATURES: Record<string, string> = {
  translate: 'document',
  init: 'setup',
  memory: 'resource_management',
  glossary: 'resource_management',
};
