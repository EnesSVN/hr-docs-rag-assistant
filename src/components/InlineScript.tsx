// Runs a small script while the browser reads the HTML, before the first paint.
// React warns when it renders a <script> on the client, because the browser would never
// run it there anyway. So on the server the type is "text/javascript" (the browser runs
// it once while parsing) and on the client it becomes "text/plain" (inert, no warning).
// suppressHydrationWarning covers that one intended difference.
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
