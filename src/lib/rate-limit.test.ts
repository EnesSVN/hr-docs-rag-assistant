import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

// A clock the test controls.
function clock(start = 1_000_000) {
  let time = start;
  return { now: () => time, advance: (ms: number) => (time += ms) };
}

describe("createRateLimiter", () => {
  it("allows requests up to the limit and counts down what is left", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: clock().now });

    expect(limiter.check("a")).toEqual({ allowed: true, remaining: 2, retryAfterSeconds: 0 });
    expect(limiter.check("a").remaining).toBe(1);
    expect(limiter.check("a").remaining).toBe(0);
  });

  it("blocks the request after the limit and says how long to wait", () => {
    const time = clock();
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, now: time.now });
    limiter.check("a");
    time.advance(10_000);
    limiter.check("a");
    time.advance(5_000);

    // The oldest request was 15 s ago, so a place frees up in 45 s.
    expect(limiter.check("a")).toEqual({ allowed: false, remaining: 0, retryAfterSeconds: 45 });
  });

  it("rounds the waiting time up, never down to 0", () => {
    const time = clock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, now: time.now });
    limiter.check("a");
    time.advance(999);

    expect(limiter.check("a").retryAfterSeconds).toBe(1);
  });

  it("lets requests through again as old ones leave the window (sliding, not a fixed block)", () => {
    const time = clock();
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, now: time.now });
    limiter.check("a"); // t = 0
    time.advance(30_000);
    limiter.check("a"); // t = 30 s
    expect(limiter.check("a").allowed).toBe(false);

    time.advance(30_001); // the first request is now 60.001 s old, the second 30 s old

    expect(limiter.check("a")).toMatchObject({ allowed: true, remaining: 0 });
    expect(limiter.check("a").allowed).toBe(false);
  });

  it("has no gap at the edge of a window that would allow double the limit", () => {
    const time = clock();
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000, now: time.now });
    time.advance(59_000);
    limiter.check("a");
    limiter.check("a"); // two requests just before a "minute boundary"
    time.advance(2_000); // and the next minute starts

    expect(limiter.check("a").allowed).toBe(false);
  });

  it("does not count blocked requests, so they do not make the wait longer", () => {
    const time = clock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: time.now });
    limiter.check("a"); // t = 0: the only request that counts
    time.advance(30_000);
    for (let i = 0; i < 20; i++) limiter.check("a"); // t = 30 s: all blocked
    time.advance(30_001); // t = 60.001 s: the first request has left the window

    // If the blocked requests at 30 s had been recorded, this would still be blocked.
    expect(limiter.check("a").allowed).toBe(true);
  });

  it("keeps clients apart", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now: clock().now });
    limiter.check("a");

    expect(limiter.check("a").allowed).toBe(false);
    expect(limiter.check("b").allowed).toBe(true);
  });

  describe("memory", () => {
    it("forgets clients whose requests have all left the window", () => {
      const time = clock();
      const limiter = createRateLimiter({ limit: 5, windowMs: 1_000, maxKeys: 3, now: time.now });
      for (const key of ["a", "b", "c"]) limiter.check(key);
      time.advance(2_000);

      limiter.check("d");

      expect(limiter.size()).toBeLessThanOrEqual(3);
      expect(limiter.size()).toBe(1);
    });

    it("never remembers more clients than the maximum, even when all of them are active", () => {
      const limiter = createRateLimiter({ limit: 5, windowMs: 60_000, maxKeys: 3, now: clock().now });

      for (let i = 0; i < 50; i++) limiter.check(`client-${i}`);

      expect(limiter.size()).toBeLessThanOrEqual(3);
    });
  });

  it.each([
    { limit: 0, windowMs: 1000 },
    { limit: 1.5, windowMs: 1000 },
    { limit: 1, windowMs: 0 },
    { limit: 1, windowMs: -5 },
    { limit: 1, windowMs: Number.NaN },
    { limit: 1, windowMs: 1000, maxKeys: 0 },
  ])("rejects the settings %j", (options) => {
    expect(() => createRateLimiter(options)).toThrow();
  });
});
