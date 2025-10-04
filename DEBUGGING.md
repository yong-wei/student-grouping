# 调试功能说明

## 概述

为了更好地诊断和解决应用中的问题，已添加以下调试功能：

## 1. 日志系统 (`src/utils/logger.ts`)

自动拦截所有 `console.log`、`console.warn`、`console.error` 和 `console.info` 调用。

### 功能
- ✅ 自动捕获所有控制台输出
- ✅ 保存日志到 localStorage（最多 1000 条）
- ✅ 支持下载日志到本地文件
- ✅ 包含时间戳和日志级别
- ✅ 自动保存错误堆栈信息

### 使用方法

日志系统在应用启动时自动初始化（`main.tsx`），无需手动操作。

## 2. 调试面板 (`src/components/DebugPanel.tsx`)

浮动的调试面板，显示实时日志信息。

### 功能
- ✅ **仅在开发模式显示**（生产环境自动隐藏）
- ✅ 实时显示日志（每秒刷新）
- ✅ 显示错误和警告数量徽章
- ✅ 支持展开/折叠
- ✅ 支持下载日志到 `console.log` 文件
- ✅ 支持清空日志

### 位置
右下角浮动面板

### 操作
- **展开**：点击"展开"按钮查看详细日志
- **下载日志**：点击"下载日志"按钮保存到本地 `console.log` 文件
- **清空日志**：点击"清空"按钮清除所有日志记录
- **隐藏面板**：点击右上角 × 关闭面板

## 3. 错误边界 (`src/components/ErrorBoundary.tsx`)

捕获 React 组件树中的错误并友好显示。

### 功能
- ✅ 捕获子组件中的 JavaScript 错误
- ✅ 自动记录错误到日志系统
- ✅ 显示友好的错误页面
- ✅ 开发模式下显示详细错误堆栈
- ✅ 提供"刷新页面"和"返回首页"按钮

## 4. Excel 解析修复

修复了学号和姓名显示为 `undefined` 的问题。

### 改进
- ✅ 增强的类型安全处理
- ✅ 数字类型自动转字符串
- ✅ 空值和 undefined 的安全处理
- ✅ 更好的默认值处理

## 常见问题

### Q: 如何导出控制台日志？

A: 有两种方法：
1. 点击调试面板中的"下载日志"按钮
2. 在浏览器控制台执行：
   ```javascript
   import { logger } from './src/utils/logger';
   logger.downloadLogs('console.log');
   ```

### Q: 日志存储在哪里？

A: 日志保存在浏览器的 localStorage 中，键名为 `app_console_logs`，最多保存 1000 条最新日志。

### Q: 生产环境会显示调试面板吗？

A: 不会。调试面板仅在开发模式（`import.meta.env.DEV`）下显示。

### Q: 如何清除所有日志？

A: 点击调试面板中的"清空"按钮，或在浏览器控制台执行：
```javascript
localStorage.removeItem('app_console_logs');
```

### Q: 学号显示为 undefined 怎么办？

A: 已在本次更新中修复。请确保：
1. Excel 文件包含"学号"列
2. 学号字段有值（数字或字符串格式均可）
3. 刷新页面重新上传 Excel 文件

## 技术细节

### 日志格式
```typescript
interface LogEntry {
  timestamp: string;      // ISO 8601 格式
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;        // 格式化后的消息
  stack?: string;         // 错误堆栈（仅错误级别）
}
```

### 导出日志格式
```
[2025-10-02T07:30:15.123Z] [ERROR] 解析 Excel 文件失败: TypeError: Cannot read property 'name' of undefined
Error stack trace...

[2025-10-02T07:30:20.456Z] [WARN] 警告信息
```

## 更新日志

### 2025-10-02
- ✅ 添加日志捕获服务
- ✅ 添加调试面板组件
- ✅ 添加错误边界组件
- ✅ 修复 Excel 解析中的类型转换问题
- ✅ 所有测试通过（13/13）
- ✅ ESLint 检查通过（0 errors）
