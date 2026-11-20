import type { Instrumentation } from "next";

/**
 * Every uncaught server error, as one structured log line (searchable in the host's logs).
 * Set ERROR_WEBHOOK_URL to also post it to a Slack/Discord-style webhook.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const e = error as Error & { digest?: string };
  const entry = { level: "error", message: e.message, digest: e.digest, path: request.path, method: request.method, route: context.routePath, kind: context.routeType };
  console.error(JSON.stringify(entry), e.stack);
  const hook = process.env.ERROR_WEBHOOK_URL;
  if (!hook) return;
  try {
    await fetch(hook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: `Unfold error on ${entry.method} ${entry.path}: ${entry.message}${entry.digest ? ` (digest ${entry.digest})` : ""}`, content: `Unfold error on ${entry.method} ${entry.path}: ${entry.message}` }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {}
};
