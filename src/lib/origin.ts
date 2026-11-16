// A web page on another site can make the visitor's browser send a "simple" POST (for example a
// form upload, or text/plain with JSON inside) to our API without asking first. Browsers always
// write the page's address in the "Origin" header of such requests and a page cannot change it.
// So: when "Origin" is present and is not our own address, refuse. Requests without "Origin"
// (curl, scripts, same-site navigation) are not the browser attack this guards against.
export function rejectCrossOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (origin === null) return null;

  let originHost: string;
  try {
    originHost = new URL(origin).host; // "Origin: null" (sandboxed pages) throws here
  } catch {
    return refused();
  }

  // Our own address as the server sees it; behind a proxy the original host is forwarded.
  const ours = new Set<string>([new URL(request.url).host]);
  const forwarded = request.headers.get("x-forwarded-host");
  if (forwarded) ours.add(forwarded);

  return ours.has(originHost) ? null : refused();
}

function refused(): Response {
  return Response.json({ error: "cross-origin request refused" }, { status: 403 });
}
