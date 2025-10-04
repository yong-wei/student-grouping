#!/usr/bin/env node

/**
 * 查看日志文件
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logFilePath = path.resolve(__dirname, '../logs/console.log');

try {
  if (fs.existsSync(logFilePath)) {
    const content = fs.readFileSync(logFilePath, 'utf-8');

    if (content.trim().length === 0) {
      console.log('📝 日志文件为空');
    } else {
      console.log('📄 日志内容:\n');
      console.log(content);

      const lines = content.split('\n').filter(line => line.trim().length > 0);
      console.log(`\n总计 ${lines.length} 行日志`);
    }
  } else {
    console.log('⚠️  日志文件不存在');
  }
} catch (error) {
  console.error('❌ 读取日志文件失败:', error);
  process.exit(1);
}
