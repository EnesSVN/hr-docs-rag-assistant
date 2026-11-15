import { pluralize } from "./format";
import { createLogger } from "./logger";
import { createRateLimiter, type RateLimiter } from "./rate-limit";
import { clientKey } from "./request-limits";

const log = createLogger("limits");

// Requests per client per minute. "ask" costs a model call and "upload" costs embedding work
// on this machine, so they are the tightest.
export const POLICIES = {
  ask: { limit: 15, windowMs: 60_000 },
  upload: { limit: 10, windowMs: 60_000 },
  general: { limit: 60, windowMs: 60_000 },
} as const;

export type PolicyName = keyof typeof POLICIES;

// The biggest request body each route accepts, in bytes.
export const MAX_BODY_BYTES = {
  ask: 8_000, // a question is at most 1000 characters
  upload: 1_100_000, // the file limit is 1 MB, plus room for the form fields
} as const;

// Kept on globalThis: in a production build every route can get its own copy of this module,
// and each copy would count separately (like the database pool in db.ts).
const store = globalThis as unknown as { rateLimiters?: Partial<Record<PolicyName, RateLimiter>> };

function limiterFor(policy: PolicyName): RateLimiter {
  store.rateLimiters ??= {};
  return (store.rateLimiters[policy] ??= createRateLimiter(POLICIES[policy]));
}

// Returns a 429 response when this client has asked too often, otherwise null.
export function checkRateLimit(policy: PolicyName, request: Request): Response | null {
  const result = limiterFor(policy).check(clientKey(request.headers));
  if (result.allowed) return null;

  // Only the policy is logged, not who it was: an address is personal data we do not need.
  log.warn({ policy }, "rate limit reached");
  return Response.json(
    { error: `Too many requests. Try again in ${pluralize(result.retryAfterSeconds, "second")}.` },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
  );
}

// For tests: start with empty counters.
export function resetRateLimits() {
  store.rateLimiters = {};
}
