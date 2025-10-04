/**
 * 日志服务
 * 拦截 console 方法并将日志保存到 localStorage
 */

export interface LogEntry {
  timestamp: string;
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  stack?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private storageKey = 'app_console_logs';
  private originalConsole: {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
    info: typeof console.info;
  };
  private pendingLogs: LogEntry[] = [];
  private flushTimer: number | null = null;
  private flushInterval = 1000; // 每秒批量发送一次

  constructor() {
    this.originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
    };

    // 从 localStorage 加载已有日志
    this.loadLogs();
  }

  /**
   * 初始化日志拦截
   */
  init() {
    this.interceptConsole();
  }

  /**
   * 拦截 console 方法
   */
  private interceptConsole() {
    console.log = (...args: unknown[]) => {
      this.addLog('log', args);
      this.originalConsole.log(...args);
    };

    console.warn = (...args: unknown[]) => {
      this.addLog('warn', args);
      this.originalConsole.warn(...args);
    };

    console.error = (...args: unknown[]) => {
      this.addLog('error', args);
      this.originalConsole.error(...args);
    };

    console.info = (...args: unknown[]) => {
      this.addLog('info', args);
      this.originalConsole.info(...args);
    };
  }

  /**
   * 添加日志条目
   */
  private addLog(level: LogEntry['level'], args: unknown[]) {
    const message = args
      .map((arg) => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(' ');

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    // 如果是错误，尝试获取堆栈
    if (level === 'error' && args[0] instanceof Error) {
      entry.stack = args[0].stack;
    }

    this.logs.push(entry);

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // 保存到 localStorage
    this.saveLogs();

    // 在开发模式下发送到服务器
    if (import.meta.env.DEV) {
      this.pendingLogs.push(entry);
      this.scheduleFlush();
    }
  }

  /**
   * 从 localStorage 加载日志
   */
  private loadLogs() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      this.originalConsole.error('Failed to load logs from localStorage:', error);
    }
  }

  /**
   * 保存日志到 localStorage
   */
  private saveLogs() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
    } catch (error) {
      this.originalConsole.error('Failed to save logs to localStorage:', error);
    }
  }

  /**
   * 获取所有日志
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * 清空日志
   */
  clearLogs() {
    this.logs = [];
    localStorage.removeItem(this.storageKey);
  }

  /**
   * 下载日志到文件
   */
  downloadLogs(filename = 'console.log') {
    const logText = this.logs
      .map((entry) => {
        let line = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;
        if (entry.stack) {
          line += `\n${entry.stack}`;
        }
        return line;
      })
      .join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 格式化日志为字符串
   */
  formatLogs(): string {
    return this.logs
      .map((entry) => {
        let line = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;
        if (entry.stack) {
          line += `\n${entry.stack}`;
        }
        return line;
      })
      .join('\n');
  }

  /**
   * 调度批量发送
   */
  private scheduleFlush() {
    if (this.flushTimer !== null) return;

    this.flushTimer = window.setTimeout(() => {
      this.flushToServer();
      this.flushTimer = null;
    }, this.flushInterval);
  }

  /**
   * 批量发送日志到服务器
   */
  private async flushToServer() {
    if (this.pendingLogs.length === 0) return;

    const logsToSend = [...this.pendingLogs];
    this.pendingLogs = [];

    try {
      for (const log of logsToSend) {
        await fetch('/api/log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(log),
        });
      }
    } catch {
      // 静默失败，避免无限循环
      // 在生产环境或服务器不可用时不影响应用运行
    }
  }

  /**
   * 清空服务器日志文件
   */
  async clearServerLogs(): Promise<boolean> {
    try {
      const response = await fetch('/api/log/clear', {
        method: 'POST',
      });
      const result = await response.json();
      return result.success;
    } catch (error) {
      this.originalConsole.error('Failed to clear server logs:', error);
      return false;
    }
  }
}

// 导出单例实例
export const logger = new Logger();

// 自动初始化（在 main.tsx 中调用）
export function initLogger() {
  logger.init();
}
