#!/usr/bin/env node

/**
 * 清空日志文件
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logFilePath = path.resolve(__dirname, '../logs/console.log');

try {
  if (fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, '', 'utf-8');
    console.log('✅ 日志文件已清空: logs/console.log');
  } else {
    console.log('⚠️  日志文件不存在');
  }
} catch (error) {
  console.error('❌ 清空日志文件失败:', error);
  process.exit(1);
}
