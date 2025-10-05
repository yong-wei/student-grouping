# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个纯前端的智能学生分组应用,基于React + TypeScript + Vite构建。核心功能是从Excel问卷数据中提取学生的学习风格(ILS量表),然后使用模拟退火算法进行优化分组,并生成可视化报告。

## 常用命令

### 开发
```bash
npm run dev          # 启动开发服务器 (默认端口 5174)
npm run build        # TypeScript编译 + Vite打包生产版本
npm run preview      # 预览生产构建
```

### 代码质量
```bash
npm run lint         # ESLint检查 (--max-warnings=0)
npm run lint:fix     # 自动修复lint问题
npm test             # 运行Vitest测试
npm run test:ui      # 带UI界面的测试
npm run test:coverage # 生成测试覆盖率报告
```

### 日志管理 (仅开发模式)
```bash
npm run logs:view    # 查看 logs/console.log
npm run logs:clear   # 清空日志文件
```

所有console输出在开发模式下会自动写入 `logs/console.log`。详见 `LOG_AUTO_WRITE.md`。

## 核心架构

### 状态管理 (Zustand)
- **单一store**: `src/store/index.ts` 使用Zustand管理全局状态
- **主要状态**:
  - `uploadedData`: 上传的Excel数据和学生照片
  - `groupingTasks`: 分组任务列表 (配置 + 结果)
  - `currentStep`: 当前步骤 (0=数据上传, 1=分组配置, 2=结果展示)
  - `assignedStudentIds`: 已分配到任务的学生ID集合
  - `faceSettings`: 学习风格脸图可视化配置

### 数据流
```
Excel上传 → excelParser.ts (解析ILS问卷)
          → uploadedData (存入store)
          → GroupingConfigPage (创建分组任务)
          → groupingAlgorithm.ts (模拟退火优化)
          → ResultsPage (展示 + 导出)
```

### 核心算法 (`src/utils/groupingAlgorithm.ts`)
- **模拟退火**: `simulatedAnnealing()` 主函数
- **质量分函数**: `calculateQualityScore()` 综合6个维度:
  1. 性别均衡 (gender)
  2. 学科均衡 (major)
  3. 主动性均衡 (activeScore)
  4. 组长分布 (leader)
  5. 组内异质性 (intraStyleDiversity)
  6. 组间同质性 (interStyleSimilarity)
- **邻域操作**: `generateNeighbor()` 随机交换两个学生

### 类型系统 (`src/types/index.ts`)
- `Student`: 学生基础信息 + 学习风格
- `LearningStyle`: ILS量表4维度 + 8个分项得分
- `GroupingTask`: 分组任务配置 + 结果
- `GroupingWeights`: 6个权重维度
- `Group`: 单个小组 + 统计信息

### 路由结构 (`src/App.tsx`)
- `/`: 数据上传页 (`DataUploadPage`)
- `/config`: 分组配置页 (`GroupingConfigPage`)
- `/results`: 结果展示页 (`ResultsPage`)

使用 `currentStep` 控制步骤导航,确保数据流单向性。

### 导出功能
- **Excel**: `excelExport.ts` (使用SheetJS)
- **PDF**: `pdfExport.ts` (jsPDF + html2canvas)
  - 班级报告: 雷达图 + 统计表
  - 个人报告: 批量生成每个学生的学习风格分析
- **ZIP**: `zipExport.ts` (JSZip) 打包所有个人PDF

### 可视化
- **ECharts雷达图**: `LearningStyleRadar.tsx` 展示4维学习风格
- **学习风格脸图**: `StudentFace.tsx` + `faceUtils.ts` 基于维度生成抽象人脸
- 使用 `echarts-for-react` 封装

### Excel解析 (`src/utils/excelParser.ts`)
- 解析问卷Excel (44题ILS量表)
- 提取学生基本信息 (学号/姓名/性别/专业/排名/组长标记)
- 计算学习风格得分 (4维度 × 11题每维度)
- 处理未完成问卷的学生 (标记 `ilsCompleted: false`)

### 测试
- **框架**: Vitest + Testing Library
- **覆盖率目标**: 45% (statements/branches/functions/lines)
- **核心测试**:
  - `src/test/excelParser.test.ts`: Excel解析逻辑
  - `src/test/groupingAlgorithm.test.ts`: 分组算法
  - `src/test/store.test.ts`: Zustand store

运行单个测试: `npx vitest run src/test/excelParser.test.ts`

## 开发注意事项

### Excel数据格式
- 前5行为表头 (从第6行开始读取学生数据)
- 列顺序固定: 序号/学号/姓名/性别/专业/组长/排名/总分 + 44题ILS答案
- ILS答案: 1或2 (计算方式见 `learningDimensions.ts`)

### 学习风格计算
- 4个维度: 主动/沉思、感官/直觉、视觉/言语、顺序/全局
- 每维度11题, 分差范围 [-11, 11]
- 详见 `src/constants/learningDimensions.ts`

### 照片上传
- 支持按学号或姓名匹配 (自动检测文件名)
- 存储为Base64在 `uploadedData.photos` Map中
- 可选功能,不影响分组算法

### 日志调试
- 开发模式下所有console输出自动写入 `logs/console.log`
- Vite插件 `vite-plugin-logger.ts` 提供 `/api/log` 端点
- 前端拦截器 `src/utils/logger.ts` 批量发送日志

### 自定义Vite插件
- `vite-plugin-logger.ts`: 日志写入服务
- 仅在开发模式启用 (`npm run dev`)

### 代码规范
- ESLint + Prettier 配置于 `eslint.config.js`
- React 19 + React Router 7
- TypeScript严格模式
- 使用 `--max-warnings=0` 强制零警告

### 依赖说明
- **UI**: Ant Design 5.27.4
- **拖拽**: @dnd-kit (用于小组成员拖拽调整)
- **状态管理**: Zustand 5.0.8 (轻量级)
- **Excel**: xlsx 0.18.5
- **图表**: echarts 5.6.0 + echarts-for-react 3.0.2
- **PDF**: jspdf 3.0.3 + html2canvas 1.4.1
- **打包**: jszip 3.10.1

### 构建产物
- 输出目录: `dist/`
- 纯静态文件,可直接部署到任何静态托管服务
- 无需后端,所有数据处理在浏览器端完成

### 部署说明
- `deployment/` 目录包含部署相关配置 (已在git中忽略)
- 可部署到Vercel/Netlify/GitHub Pages等
- 构建命令: `npm run build`
- 输出目录: `dist`

## 项目文档
- `README.md`: 项目简介和快速开始
- `USAGE.md`: 详细使用说明
- `LOG_AUTO_WRITE.md`: 日志系统文档
- `DEBUGGING.md`: 调试指南
- `TROUBLESHOOTING.md`: 常见问题
- `AGENTS.md`: AI代理开发指南
