const isDev = process.env.NODE_ENV !== 'production';

interface Logger {
  error(context: string, message: string, data?: unknown): void;
  warn(context: string, message: string, data?: unknown): void;
  info(context: string, message: string, data?: unknown): void;
  debug(context: string, message: string, data?: unknown): void;
}

function createLogger(): Logger {
  const noop = () => {};

  if (!isDev) {
    return { error: noop, warn: noop, info: noop, debug: noop };
  }

  return {
    error(context: string, message: string, data?: unknown) {
      console.error(`[${context}] ${message}`, data !== undefined ? data : '');
    },
    warn(context: string, message: string, data?: unknown) {
      console.warn(`[${context}] ${message}`, data !== undefined ? data : '');
    },
    info(context: string, message: string, data?: unknown) {
      console.info(`[${context}] ${message}`, data !== undefined ? data : '');
    },
    debug(context: string, message: string, data?: unknown) {
      console.debug(`[${context}] ${message}`, data !== undefined ? data : '');
    },
  };
}

export const logger = createLogger();
