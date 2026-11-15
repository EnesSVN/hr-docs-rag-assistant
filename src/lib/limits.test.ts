import { beforeEach, describe, expect, it } from "vitest";
import { MAX_BODY_BYTES, POLICIES, checkRateLimit, resetRateLimits } from "./limits";

const from = (ip: string) => new Request("http://localhost/api/x", { headers: { "x-forwarded-for": ip } });

describe("checkRateLimit", () => {
  beforeEach(() => resetRateLimits());

  it("lets requests through up to the limit of the policy", () => {
    for (let i = 0; i < POLICIES.ask.limit; i++) {
      expect(checkRateLimit("ask", from("203.0.113.1"))).toBeNull();
    }
  });

  it("answers 429 after the limit, with a Retry-After header and a readable message", async () => {
    for (let i = 0; i < POLICIES.ask.limit; i++) checkRateLimit("ask", from("203.0.113.1"));

    const response = checkRateLimit("ask", from("203.0.113.1"));

    expect(response?.status).toBe(429);
    const wait = Number(response?.headers.get("Retry-After"));
    expect(wait).toBeGreaterThanOrEqual(1);
    expect(wait).toBeLessThanOrEqual(60);
    expect((await response?.json()).error).toMatch(/^Too many requests\. Try again in \d+ seconds?\.$/);
  });

  it("counts each client on its own", () => {
    for (let i = 0; i < POLICIES.ask.limit; i++) checkRateLimit("ask", from("203.0.113.1"));

    expect(checkRateLimit("ask", from("203.0.113.1"))?.status).toBe(429);
    expect(checkRateLimit("ask", from("203.0.113.2"))).toBeNull();
  });

  it("counts each policy on its own", () => {
    for (let i = 0; i < POLICIES.upload.limit; i++) checkRateLimit("upload", from("203.0.113.1"));

    expect(checkRateLimit("upload", from("203.0.113.1"))?.status).toBe(429);
    expect(checkRateLimit("ask", from("203.0.113.1"))).toBeNull();
  });

  it("does not leak who was limited into the response", async () => {
    for (let i = 0; i < POLICIES.upload.limit; i++) checkRateLimit("upload", from("203.0.113.99"));

    const body = JSON.stringify(await checkRateLimit("upload", from("203.0.113.99"))?.json());

    expect(body).not.toContain("203.0.113.99");
  });

  it("is stricter for the costly actions than for the rest", () => {
    expect(POLICIES.ask.limit).toBeLessThan(POLICIES.general.limit);
    expect(POLICIES.upload.limit).toBeLessThan(POLICIES.general.limit);
  });

  it("allows an upload body to hold a 1 MB file, but not much more", () => {
    expect(MAX_BODY_BYTES.upload).toBeGreaterThan(1_000_000);
    expect(MAX_BODY_BYTES.upload).toBeLessThan(2_000_000);
  });
});
