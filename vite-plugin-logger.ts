// @ts-nocheck
import type { Plugin, ViteDevServer } from 'vite';
import fs from 'fs';
import path from 'path';

interface LogData {
  timestamp: string;
  level: string;
  message: string;
  stack?: string;
}

/**
 * Vite 插件：提供日志写入 API
 * 在开发服务器中添加 /api/log 端点，接收前端日志并写入文件
 */
export function loggerPlugin(): Plugin {
  const logFilePath = path.resolve(process.cwd(), 'logs/console.log');

  // 确保 logs 目录存在
  const ensureLogDir = () => {
    const logDir = path.dirname(logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  };

  // 写入日志到文件
  const writeLog = (logData: LogData) => {
    ensureLogDir();

    let logLine = `[${logData.timestamp}] [${logData.level.toUpperCase()}] ${logData.message}\n`;
    if (logData.stack) {
      logLine += `${logData.stack}\n`;
    }

    fs.appendFileSync(logFilePath, logLine, 'utf-8');
  };

  return {
    name: 'vite-plugin-logger',
    apply: 'serve', // 仅在开发模式下启用

    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const request = req as unknown as {
          url?: string;
          method?: string;
          on: (event: 'data' | 'end', listener: (chunk?: unknown) => void) => void;
        };
        const response = res as unknown as {
          writeHead: (statusCode: number, headers?: Record<string, string>) => void;
          end: (data?: string) => void;
        };

        if (request.url === '/api/log' && request.method === 'POST') {
          let body = '';

          request.on('data', (chunk) => {
            body += String(chunk ?? '');
          });

          request.on('end', () => {
            try {
              const logData: LogData = JSON.parse(body);
              writeLog(logData);

              response.writeHead(200, { 'Content-Type': 'application/json' });
              response.end(JSON.stringify({ success: true }));
            } catch (error) {
              console.error('Failed to write log:', error);
              response.writeHead(500, { 'Content-Type': 'application/json' });
              response.end(JSON.stringify({ success: false, error: String(error) }));
            }
          });

          return;
        }

        if (request.url === '/api/log/clear' && request.method === 'POST') {
          try {
            ensureLogDir();
            fs.writeFileSync(logFilePath, '', 'utf-8');

            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ success: true }));
          } catch (error) {
            console.error('Failed to clear log:', error);
            response.writeHead(500, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ success: false, error: String(error) }));
          }

          return;
        }

        next();
      });
      console.log('\n✅ Logger plugin enabled - logs will be written to logs/console.log\n');
    },
  };
}
