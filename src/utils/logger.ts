/* eslint-disable no-console */
// ============================================================================
// Logger Configuration
// ============================================================================

export interface LogContext {
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

// ============================================================================
// Logger Class
// ============================================================================

class Logger {
  private context: LogContext = {};
  private readonly service = 'user-service';
  private readonly environment = process.env.STAGE ?? 'unknown';

  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  clearContext(): void {
    this.context = {};
  }

  private formatMessage(level: LogLevel, message: string, data?: Record<string, unknown>): string {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.service,
      environment: this.environment,
      ...this.context,
      ...data,
    };

    return JSON.stringify(entry);
  }

  debug(message: string, data?: Record<string, unknown>): void {
    if (process.env.LOG_LEVEL === 'debug') {
      console.debug(this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: Record<string, unknown>): void {
    console.info(this.formatMessage('info', message, data));
  }

  warn(message: string, data?: Record<string, unknown>): void {
    console.warn(this.formatMessage('warn', message, data));
  }

  error(message: string, error?: unknown, data?: Record<string, unknown>): void {
    const errorData: Record<string, unknown> = { ...data };

    if (error instanceof Error) {
      errorData.errorName = error.name;
      errorData.errorMessage = error.message;
      errorData.errorStack = error.stack;
    } else if (error !== undefined) {
      errorData.error = error;
    }

    console.error(this.formatMessage('error', message, errorData));
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const logger = new Logger();

// ============================================================================
// Request Context Helper
// ============================================================================

export function withRequestContext<T>(
  requestId: string,
  userId: string | undefined,
  fn: () => T
): T {
  logger.setContext({ requestId, userId });
  try {
    return fn();
  } finally {
    logger.clearContext();
  }
}

export async function withRequestContextAsync<T>(
  requestId: string,
  userId: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  logger.setContext({ requestId, userId });
  try {
    return await fn();
  } finally {
    logger.clearContext();
  }
}
