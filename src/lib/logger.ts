/**
 * Centralized structured error logger.
 * Writes JSON to stderr (captured by Vercel logs / any log aggregator).
 * Drop-in: captureError(context, error) in any catch block.
 */

export function captureError(
  context: string,
  error: unknown,
  metadata?: Record<string, unknown>
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const entry = {
    level: "error",
    context,
    message: err.message,
    stack: err.stack,
    metadata,
    timestamp: new Date().toISOString(),
  };
  // console.error goes to stderr; Vercel captures it in the Functions log tab.
  console.error(JSON.stringify(entry));
}

export function captureInfo(
  context: string,
  message: string,
  metadata?: Record<string, unknown>
): void {
  console.log(
    JSON.stringify({ level: "info", context, message, metadata, timestamp: new Date().toISOString() })
  );
}
