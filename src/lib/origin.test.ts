import { describe, expect, it } from "vitest";
import { rejectCrossOrigin } from "./origin";

const post = (headers: Record<string, string>, url = "http://localhost:3000/api/ask") => new Request(url, { method: "POST", headers });

describe("rejectCrossOrigin", () => {
  it("lets a request from our own page through", () => {
    expect(rejectCrossOrigin(post({ origin: "http://localhost:3000" }))).toBeNull();
  });

  it("lets a request without Origin through (curl, scripts, tests)", () => {
    expect(rejectCrossOrigin(post({}))).toBeNull();
  });

  it("refuses a request that comes from a page on another site", async () => {
    const response = rejectCrossOrigin(post({ origin: "https://evil.example" }));

    expect(response?.status).toBe(403);
    expect(await response?.json()).toEqual({ error: "cross-origin request refused" });
  });

  it("refuses another port on the same name, because that is another origin", () => {
    expect(rejectCrossOrigin(post({ origin: "http://localhost:4000" }))?.status).toBe(403);
  });

  it("compares host and port only, not the scheme (an https page on the same host:port is accepted)", () => {
    expect(rejectCrossOrigin(post({ origin: "https://localhost:3000" }))).toBeNull();
  });

  it("refuses a look-alike host", () => {
    expect(rejectCrossOrigin(post({ origin: "http://localhost:3000.evil.example" }))?.status).toBe(403);
    expect(rejectCrossOrigin(post({ origin: "http://evil.example/localhost:3000" }))?.status).toBe(403);
  });

  it("refuses 'Origin: null' (sandboxed pages) and values that are not addresses", () => {
    expect(rejectCrossOrigin(post({ origin: "null" }))?.status).toBe(403);
    expect(rejectCrossOrigin(post({ origin: "not a url" }))?.status).toBe(403);
  });

  it("accepts the forwarded host behind a proxy", () => {
    const request = post({ origin: "https://hr.example.com", "x-forwarded-host": "hr.example.com" }, "http://internal:3000/api/ask");

    expect(rejectCrossOrigin(request)).toBeNull();
  });

  it("still refuses another site behind a proxy", () => {
    const request = post({ origin: "https://evil.example", "x-forwarded-host": "hr.example.com" }, "http://internal:3000/api/ask");

    expect(rejectCrossOrigin(request)?.status).toBe(403);
  });
});
