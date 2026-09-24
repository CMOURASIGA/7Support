type LogContext = Record<string, unknown>;

function write(level: "info" | "warn" | "error", operation: string, context: LogContext = {}) {
  const entry = { timestamp: new Date().toISOString(), level, operation, ...context };
  console[level](JSON.stringify(entry));
}

export const logger = {
  info: (operation: string, context?: LogContext) => write("info", operation, context),
  warn: (operation: string, context?: LogContext) => write("warn", operation, context),
  error: (operation: string, context?: LogContext) => write("error", operation, context),
};
