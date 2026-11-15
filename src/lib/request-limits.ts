const MAX_KEY_LENGTH = 64;

// Who is asking. Behind a proxy or load balancer the first "x-forwarded-for" entry is the
// real client. Without such a proxy a client can write this header itself, so this is a
// convenience for a demo, not a defence against someone who wants to cheat.
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = forwarded || headers.get("x-real-ip")?.trim() || "unknown";
  // A header is attacker-controlled text: never let it be huge.
  return key.slice(0, MAX_KEY_LENGTH);
}

// Refuses a request whose body is too big before the body is read, so a huge upload does not
// fill the memory. It trusts "content-length", which the server checks against the real body.
// Returns a response to send back, or null when the size is fine.
export function rejectOversizedBody(request: Request, maxBytes: number): Response | null {
  const header = request.headers.get("content-length");
  if (header === null) {
    return Response.json({ error: "content-length is required" }, { status: 411 });
  }
  // Only digits count. (Number("") is 0 and Number("1e3") is 1000, which would slip through.)
  if (!/^\d+$/.test(header.trim())) {
    return Response.json({ error: "invalid content-length" }, { status: 400 });
  }
  if (Number(header) > maxBytes) {
    return Response.json({ error: "request is too large" }, { status: 413 });
  }
  return null;
}
