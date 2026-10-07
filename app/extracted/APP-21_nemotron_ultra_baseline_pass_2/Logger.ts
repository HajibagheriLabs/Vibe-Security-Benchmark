type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

class Logger {
  private static readonly IS_DEV = __DEV__;
  private static readonly LOG_PREFIX = '[Auth]';

  private static formatMessage(level: LogLevel, message: string, data?: unknown): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message: `${this.LOG_PREFIX} ${message}`,
      data,
    };
  }

  private static log(level: LogLevel, message: string, data?: unknown): void {
    if (!this.IS_DEV && level === 'debug') return;

    const entry = this.formatMessage(level, message, data);
    
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    console[consoleMethod](`[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`, entry.data ?? '');
  }

  static debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  static info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  static warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  static error(message: string, error?: unknown): void {
    const errorData = error instanceof Error 
      ? { message: error.message, stack: error.stack, name: error.name }
      : error;
    this.log('error', message, errorData);
  }
}

export { Logger };