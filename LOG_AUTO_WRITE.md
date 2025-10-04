# 控制台日志自动写入功能

## ✅ 功能已实现

所有控制台输出（`console.log`, `console.warn`, `console.error`, `console.info`）将自动写入到 `logs/console.log` 文件。

## 工作原理

### 架构
```
浏览器前端 → 日志拦截 → 批量发送 → Vite 开发服务器 → 追加写入文件
```

### 组件

1. **日志拦截器** (`src/utils/logger.ts`)
   - 拦截所有 console 方法
   - 收集日志到队列
   - 每秒批量发送到服务器

2. **Vite 插件** (`vite-plugin-logger.ts`)
   - 提供 `/api/log` API 端点
   - 接收日志并追加写入到 `logs/console.log`
   - 提供 `/api/log/clear` 清空日志

3. **日志管理脚本**
   - `npm run logs:view` - 查看日志
   - `npm run logs:clear` - 清空日志

## 使用方法

### 1. 启动开发服务器
```bash
npm run dev
```

看到这个提示说明日志功能已启用：
```
✅ Logger plugin enabled - logs will be written to logs/console.log
```

### 2. 访问应用
在浏览器中打开 http://localhost:5174/

所有控制台输出会自动写入 `logs/console.log`

### 3. 查看日志
```bash
npm run logs:view
```

或直接查看文件：
```bash
cat logs/console.log
tail -f logs/console.log  # 实时监控
```

### 4. 清空日志
```bash
npm run logs:clear
```

## 日志格式

```
[2025-10-02T08:07:15.123Z] [INFO] 应用已启动
[2025-10-02T08:07:20.456Z] [WARN] 某个警告信息
[2025-10-02T08:07:25.789Z] [ERROR] 错误信息
Error stack trace...
```

## 特性

- ✅ **自动写入**: 无需手动操作，所有日志自动保存
- ✅ **批量发送**: 每秒批量发送，避免频繁 I/O
- ✅ **追加模式**: 不覆盖已有日志，始终追加
- ✅ **仅开发模式**: 生产环境自动禁用
- ✅ **静默失败**: 服务器不可用时不影响应用运行
- ✅ **时间戳**: 每条日志都有精确的时间戳
- ✅ **日志级别**: 区分 LOG/WARN/ERROR/INFO
- ✅ **错误堆栈**: 错误日志包含完整堆栈信息

## 开发调试

### 实时监控日志
```bash
# 终端 1
npm run dev

# 终端 2
tail -f logs/console.log
```

### 测试日志写入
在浏览器控制台输入：
```javascript
console.log('测试日志');
console.warn('测试警告');
console.error('测试错误');
```

1秒后检查 `logs/console.log`，应该能看到这些日志。

### 调试面板
右下角的调试面板可以：
- 查看实时日志
- 下载日志到本地
- 清空浏览器缓存的日志

## 技术细节

### API 端点

#### POST /api/log
写入日志

**请求体**:
```json
{
  "timestamp": "2025-10-02T08:07:15.123Z",
  "level": "log",
  "message": "日志内容",
  "stack": "可选的错误堆栈"
}
```

**响应**:
```json
{
  "success": true
}
```

#### POST /api/log/clear
清空日志文件

**响应**:
```json
{
  "success": true
}
```

### 防抖机制

日志不是立即发送的，而是收集到队列中，每秒批量发送一次：
- 减少网络请求
- 减少文件 I/O
- 提高性能

### 错误处理

如果服务器写入失败：
- 不会影响应用运行
- 不会在控制台显示错误（避免无限循环）
- 日志仍然保存在 localStorage 中
- 可以通过调试面板下载

## 限制

1. **仅开发模式**
   - 生产环境自动禁用
   - 构建后的应用不会写入日志

2. **文件大小**
   - 没有自动轮转
   - 建议定期清空：`npm run logs:clear`

3. **浏览器环境**
   - 需要运行 Vite 开发服务器
   - 不支持纯静态文件打开

## 常见问题

### Q: 为什么日志文件是空的？

A: 可能的原因：
1. 还没有访问应用（在浏览器中打开 http://localhost:5174/）
2. 应用还没有输出任何日志
3. 等待批量发送（最多1秒延迟）

### Q: 如何实时查看日志？

A: 使用 `tail -f logs/console.log` 命令

### Q: 生产环境能用吗？

A: 不能。这个功能仅在开发模式下启用，生产环境会自动禁用。

### Q: 会影响性能吗？

A: 影响极小：
- 批量发送（每秒一次）
- 异步写入
- 静默失败

### Q: 日志文件会无限增长吗？

A: 是的，建议：
- 开发时定期运行 `npm run logs:clear`
- 或者手动删除 `logs/console.log`

## 示例

### 完整工作流程

```bash
# 1. 清空旧日志
npm run logs:clear

# 2. 启动服务器
npm run dev

# 3. 在浏览器中打开 http://localhost:5174/
# 4. 进行一些操作（上传 Excel、分组等）

# 5. 查看日志
npm run logs:view

# 6. 或实时监控
tail -f logs/console.log
```

### 输出示例

```
[2025-10-02T08:10:15.123Z] [INFO] React 应用已挂载
[2025-10-02T08:10:16.456Z] [LOG] 初始化 Zustand store
[2025-10-02T08:10:20.789Z] [LOG] 上传 Excel 文件: 302728255LS.xlsx
[2025-10-02T08:10:21.012Z] [LOG] 解析到 45 个学生记录
[2025-10-02T08:10:25.345Z] [WARN] Warning: [antd: compatible] antd v5 support React is 16 ~ 18
[2025-10-02T08:10:30.678Z] [LOG] 开始智能分组...
[2025-10-02T08:10:35.901Z] [LOG] 分组完成，质量分: 89.5
```

## 更新日志

### 2025-10-02
- ✅ 实现 Vite 插件日志服务器
- ✅ 实现前端批量发送机制
- ✅ 添加日志管理脚本
- ✅ 添加 npm scripts
- ✅ 文档完善
