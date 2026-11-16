import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

async function headersOfAllPages() {
  const rules = await nextConfig.headers!();
  const all = rules.find((rule) => rule.source === "/(.*)");
  expect(all, "a rule for every path").toBeDefined();
  return Object.fromEntries(all!.headers.map((header) => [header.key, header.value]));
}

describe("security headers (next.config.ts)", () => {
  it("applies to every path, including the API", async () => {
    const rules = await nextConfig.headers!();

    expect(rules.map((rule) => rule.source)).toEqual(["/(.*)"]);
  });

  it("forbids showing the app inside another page (clickjacking)", async () => {
    const headers = await headersOfAllPages();

    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["X-Frame-Options"]).toBe("DENY");
  });

  it("has a strict base policy: same origin only, no plugins, no base tag tricks, forms to ourselves", async () => {
    const policy = (await headersOfAllPages())["Content-Security-Policy"];

    for (const rule of ["default-src 'self'", "connect-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'"]) {
      expect(policy).toContain(rule);
    }
  });

  it("does not allow eval or other websites' scripts in production", async () => {
    const policy = (await headersOfAllPages())["Content-Security-Policy"];
    const scriptRule = policy.split("; ").find((rule) => rule.startsWith("script-src"))!;

    expect(scriptRule).not.toContain("unsafe-eval");
    expect(scriptRule).not.toMatch(/https?:/);
    expect(policy).not.toContain("ws:");
  });

  it("states that inline scripts are allowed (the known price of not using nonces)", async () => {
    const policy = (await headersOfAllPages())["Content-Security-Policy"];

    expect(policy).toContain("script-src 'self' 'unsafe-inline'");
  });

  it("stops browsers from guessing file types, limits the referrer and turns off device features", async () => {
    const headers = await headersOfAllPages();

    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
    expect(headers["Permissions-Policy"]).toContain("microphone=()");
    expect(headers["Cross-Origin-Opener-Policy"]).toBe("same-origin");
  });

  it("does not announce the framework", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
