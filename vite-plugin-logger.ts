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
        // 处理日志 API 请求
        if (req.url === '/api/log' && req.method === 'POST') {
          let body = '';

          req.on('data', (chunk) => {
            body += chunk.toString();
          });

          req.on('end', () => {
            try {
              const logData: LogData = JSON.parse(body);
              writeLog(logData);

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (error) {
              console.error('Failed to write log:', error);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: String(error) }));
            }
          });
        } else if (req.url === '/api/log/clear' && req.method === 'POST') {
          // 清空日志文件
          try {
            ensureLogDir();
            fs.writeFileSync(logFilePath, '', 'utf-8');

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (error) {
            console.error('Failed to clear log:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: String(error) }));
          }
        } else {
          next();
        }
      });

      console.log('\n✅ Logger plugin enabled - logs will be written to logs/console.log\n');
    },
  };
}
