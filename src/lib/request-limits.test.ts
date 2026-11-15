import { describe, expect, it } from "vitest";
import { clientKey, rejectOversizedBody } from "./request-limits";

const withHeaders = (headers: Record<string, string>) => new Headers(headers);
const requestWithLength = (value?: string) =>
  new Request("http://localhost/x", { method: "POST", headers: value === undefined ? {} : { "content-length": value } });

describe("clientKey", () => {
  it("uses the first address of x-forwarded-for (the real client behind a proxy)", () => {
    expect(clientKey(withHeaders({ "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2" }))).toBe("203.0.113.7");
  });

  it("trims spaces", () => {
    expect(clientKey(withHeaders({ "x-forwarded-for": "  203.0.113.7  " }))).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip, then to 'unknown'", () => {
    expect(clientKey(withHeaders({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientKey(withHeaders({}))).toBe("unknown");
  });

  it("ignores an empty first entry of x-forwarded-for", () => {
    expect(clientKey(withHeaders({ "x-forwarded-for": " , 10.0.0.1" }))).toBe("unknown");
  });

  it("never returns a huge key, because the header is written by the client", () => {
    expect(clientKey(withHeaders({ "x-forwarded-for": "a".repeat(5000) }))).toHaveLength(64);
  });
});

describe("rejectOversizedBody", () => {
  it("lets a body of the allowed size through", async () => {
    expect(rejectOversizedBody(requestWithLength("1000"), 1000)).toBeNull();
    expect(rejectOversizedBody(requestWithLength("0"), 1000)).toBeNull();
  });

  it("answers 413 for a body that is too big", async () => {
    const response = rejectOversizedBody(requestWithLength("1001"), 1000);

    expect(response?.status).toBe(413);
    expect(await response?.json()).toEqual({ error: "request is too large" });
  });

  it("answers 411 when the length is not stated, because it cannot be checked", () => {
    expect(rejectOversizedBody(requestWithLength(), 1000)?.status).toBe(411);
  });

  it.each(["abc", "-5", "1.5", "1e3", "0x10", ""])("answers 400 for the invalid length %j", (value) => {
    expect(rejectOversizedBody(requestWithLength(value), 1000)?.status).toBe(400);
  });
});
