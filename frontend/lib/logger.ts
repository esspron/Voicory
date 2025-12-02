/**
 * Centralized logging utility for the Voicory Dashboard.
 * Provides structured logging with different levels and conditional output.
 *
 * In production, only warnings and errors are logged.
 * In development, all levels are logged for debugging.
 *
 * @module lib/logger
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  /** Additional context data to include */
  context?: Record<string, unknown>;
  /** Override default level visibility */
  force?: boolean;
}

const isDevelopment = import.meta.env.DEV;
const isTest = import.meta.env.MODE === 'test';

/**
 * Determines if a log level should be output based on environment.
 */
const shouldLog = (level: LogLevel, force?: boolean): boolean => {
  if (force) return true;
  if (isTest) return false;
  if (isDevelopment) return true;

  // In production, only warn and error
  return level === 'warn' || level === 'error';
};

/**
 * Formats a log message with timestamp and level.
 */
const formatMessage = (level: LogLevel, message: string): string => {
  const timestamp = new Date().toISOString();
  const emoji = {
    debug: '🔍',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
  }[level];

  return `${emoji} [${timestamp}] [${level.toUpperCase()}] ${message}`;
};

/**
 * Application logger with structured output.
 *
 * @example
 * ```tsx
 * // Debug (dev only)
 * logger.debug('Fetching assistants', { userId });
 *
 * // Info (dev only)
 * logger.info('Assistant created successfully');
 *
 * // Warning (always logged)
 * logger.warn('API rate limit approaching', { remaining: 10 });
 *
 * // Error (always logged)
 * logger.error('Failed to create assistant', { error: err.message });
 * ```
 */
export const logger = {
  /**
   * Debug level - for detailed debugging information.
   * Only logged in development mode.
   */
  debug: (message: string, options?: LogOptions) => {
    if (shouldLog('debug', options?.force)) {
      console.debug(formatMessage('debug', message), options?.context ?? '');
    }
  },

  /**
   * Info level - for general information.
   * Only logged in development mode.
   */
  info: (message: string, options?: LogOptions) => {
    if (shouldLog('info', options?.force)) {
      console.info(formatMessage('info', message), options?.context ?? '');
    }
  },

  /**
   * Warn level - for warnings that don't break functionality.
   * Always logged in all environments.
   */
  warn: (message: string, options?: LogOptions) => {
    if (shouldLog('warn', options?.force)) {
      console.warn(formatMessage('warn', message), options?.context ?? '');
    }
  },

  /**
   * Error level - for errors that need attention.
   * Always logged in all environments.
   */
  error: (message: string, options?: LogOptions) => {
    if (shouldLog('error', options?.force)) {
      console.error(formatMessage('error', message), options?.context ?? '');
    }
  },

  /**
   * Group related logs together.
   * Useful for complex operations with multiple log statements.
   */
  group: (label: string, fn: () => void) => {
    if (isDevelopment) {
      console.group(label);
      fn();
      console.groupEnd();
    } else {
      fn();
    }
  },

  /**
   * Log a table of data (dev only).
   */
  table: (data: unknown[], options?: LogOptions) => {
    if (shouldLog('debug', options?.force)) {
      console.table(data);
    }
  },

  /**
   * Time an operation (dev only).
   */
  time: (label: string) => {
    if (isDevelopment) {
      console.time(label);
    }
  },

  timeEnd: (label: string) => {
    if (isDevelopment) {
      console.timeEnd(label);
    }
  },
};

export default logger;
