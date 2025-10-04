# 智能学生分组助手

一款纯前端的 Web 应用，帮助教师和教学助理根据学生的问卷调查数据、基本信息和特定分组需求，自动化并优化学生分组流程。

## ✨ 核心特性

- 📊 **数据驱动**: 直接处理 Excel 问卷数据和学生照片
- 🧠 **智能分组**: 基于模拟退火算法的优化分组，支持多种策略
- 📈 **数据可视化**: ECharts 雷达图展示班级和小组学习风格
- 📁 **报告生成**: 一键导出分组 Excel、班级分析 PDF 和批量个人报告
- 🔒 **高隐私性**: 纯前端实现，数据全程在用户本地处理，无需服务器

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 运行测试

```bash
npm run test
```

### 代码检查

```bash
npm run lint
npm run lint:fix  # 自动修复
```

### 日志管理（开发模式）

```bash
npm run logs:view   # 查看日志
npm run logs:clear  # 清空日志
```

所有控制台输出会自动写入 `logs/console.log`。详见 [LOG_AUTO_WRITE.md](./LOG_AUTO_WRITE.md)

## 🛠️ 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI 组件**: Ant Design 5
- **状态管理**: Zustand
- **路由**: React Router
- **Excel 处理**: SheetJS (xlsx)
- **数据可视化**: Apache ECharts
- **PDF 生成**: jsPDF + html2canvas
- **文件打包**: JSZip
- **代码规范**: ESLint + Prettier
- **测试**: Vitest + Testing Library

## 🎯 使用流程

### 1. 数据上传
- 上传 Excel 格式的问卷数据
- 可选：上传学生照片
- 数据预览和统计信息展示

### 2. 分组配置
- 创建分组任务
- 选择参与学生
- 设置小组人数和分组模式
- 调节6个权重维度

### 3. 结果展示
- 查看分组结果
- 学习风格可视化
- 导出 Excel/PDF/ZIP

## 📊 核心算法

使用模拟退火算法优化分组，质量分函数包含6个维度：
- 性别均衡
- 学科均衡
- 主动性均衡
- 组长分布
- 组内异质性
- 组间同质性

## 📝 项目状态

✅ **已完成** (100%)
- 项目搭建与数据导入
- 核心逻辑与配置界面
- 算法实现与结果展示
- 导出功能与完善

## 📄 许可证

MIT License
