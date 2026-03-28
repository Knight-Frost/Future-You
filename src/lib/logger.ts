/**
 * Structured logger — emits single-line JSON to stdout/stderr.
 *
 * Each log entry is a self-contained JSON object with:
 *   level, context (which API route/module), message, timestamp
 *   and an optional `data` field for any extra context.
 *
 * In production, pipe stdout to a log aggregator (Datadog, Supabase Logs, etc.)
 * and filter/alert on `"level":"error"` entries.
 *
 * Intentionally never logs request bodies or user PII — callers must strip
 * sensitive fields before passing data here.
 */

type Level = 'info' | 'warn' | 'error';

function emit(level: Level, context: string, message: string, data?: unknown): void {
  const entry: Record<string, unknown> = {
    level,
    context,
    message,
    timestamp: new Date().toISOString(),
  };

  if (data !== undefined) {
    // Normalise Error objects so they serialise properly
    if (data instanceof Error) {
      entry.error = { message: data.message, name: data.name };
      if (process.env.NODE_ENV !== 'production') {
        entry.stack = data.stack;
      }
    } else {
      entry.data = data;
    }
  }

  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info:  (context: string, message: string, data?: unknown) => emit('info',  context, message, data),
  warn:  (context: string, message: string, data?: unknown) => emit('warn',  context, message, data),
  error: (context: string, message: string, data?: unknown) => emit('error', context, message, data),
};
