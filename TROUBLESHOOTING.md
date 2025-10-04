# 故障排查指南

## Excel 上传问题排查

### 当前已知问题

#### 1. React 19 兼容性警告
**症状**: 控制台显示 `Warning: [antd: compatible] antd v5 support React is 16 ~ 18`

**影响**: 仅为警告，不影响功能

**解决方案**:
```bash
# 选项 1: 降级 React 到 18.x
npm install react@18 react-dom@18

# 选项 2: 等待 Ant Design 官方支持 React 19
# 参考: https://u.ant.design/v5-for-19
```

### 调试步骤

#### 步骤 1: 检查日志文件
```bash
# 实时监控日志
tail -f logs/console.log

# 查看所有日志
npm run logs:view
```

#### 步骤 2: 打开浏览器开发者工具
1. 按 `F12` 或 `Cmd+Option+I` (Mac)
2. 切换到 Console 标签
3. 尝试上传 Excel 文件
4. 查看是否有错误信息

#### 步骤 3: 检查 Excel 文件格式
确保您的 Excel 文件包含以下必需列：
- ✅ 序号
- ✅ 学号
- ✅ 姓名
- ✅ 性别 (0=女, 1=男)
- ✅ 组长 (0=否, 1=是)
- ✅ 排名 (0-1 之间的数值)
- ✅ 专业 (数字)
- ✅ 总分 (数字)

可选列（学习风格）：
- 积极/沉思
- 感官/直觉
- 视觉/言语
- 顺序/全局

#### 步骤 4: 测试解析功能
使用测试 Excel 文件：
```bash
# 使用项目中的测试文件
# student-group-ref/302728255LS.xlsx
```

在浏览器控制台测试：
```javascript
// 检查日志服务是否正常
console.log('测试日志');
console.error('测试错误');

// 1秒后检查 logs/console.log 是否有新内容
```

### 常见错误及解决方案

#### 错误 1: "解析 Excel 文件失败"
**可能原因**:
- Excel 文件格式不正确 (.xlsx 或 .xls)
- 文件损坏
- 缺少必需列
- 数据类型不匹配

**解决方案**:
1. 确认文件扩展名为 .xlsx 或 .xls
2. 尝试用 Excel/WPS 重新打开并保存
3. 检查列名是否与要求一致（区分大小写）
4. 确保学号、姓名字段非空

#### 错误 2: "第 X 行：缺少学号/姓名"
**原因**: 数据验证失败

**解决方案**:
1. 检查 Excel 文件对应行
2. 确保学号和姓名列不为空
3. 删除空行或填充数据

#### 错误 3: 数据显示为 undefined
**原因**: 列名不匹配或数据类型转换问题

**解决方案**: 已在最新版本中修复
- 使用 `getStringValue()` 和 `getNumberValue()` 安全转换
- 检查更新后的代码

#### 错误 4: 日志文件为空
**原因**:
- 还没有访问应用
- 批量发送延迟（最多1秒）
- 服务器未启动

**解决方案**:
1. 确认服务器正在运行：`npm run dev`
2. 看到提示：`✅ Logger plugin enabled`
3. 在浏览器中访问 http://localhost:5174/
4. 等待 1-2 秒让日志批量发送

### 高级调试

#### 启用详细日志
在 `src/utils/excelParser.ts` 中添加调试输出：

```typescript
export async function parseExcelFile(file: File): Promise<Student[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        console.log('📂 开始解析 Excel 文件:', file.name);
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        console.log('📊 工作表:', workbook.SheetNames);

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        console.log('📋 解析行数:', jsonData.length);
        console.log('📋 第一行数据:', jsonData[0]);

        // ... 继续处理
      } catch (error) {
        console.error('❌ 解析失败:', error);
        reject(error);
      }
    };

    reader.readAsBinaryString(file);
  });
}
```

#### 检查网络请求
在浏览器开发者工具中：
1. 切换到 Network 标签
2. 筛选 XHR/Fetch
3. 上传 Excel 文件
4. 查看是否有失败的请求

#### 检查 API 日志
查看服务器终端输出，看是否有：
- `/api/log` 请求
- 错误信息
- 堆栈跟踪

### 获取帮助

如果问题仍然存在，请提供以下信息：

1. **日志文件内容**
   ```bash
   npm run logs:view > debug.txt
   ```

2. **浏览器控制台截图**
   - 包含完整错误信息
   - 包含错误堆栈

3. **Excel 文件格式**
   - 列名截图
   - 前几行数据示例

4. **环境信息**
   ```bash
   node --version
   npm --version
   cat package.json | grep react
   ```

5. **服务器输出**
   - 终端中运行 `npm run dev` 后的所有输出

## 快速检查清单

在报告问题前，请确认：

- [ ] 服务器正在运行 (`npm run dev`)
- [ ] 看到 `✅ Logger plugin enabled` 提示
- [ ] 在浏览器中访问了 http://localhost:5174/
- [ ] Excel 文件格式正确 (.xlsx 或 .xls)
- [ ] Excel 包含所有必需列
- [ ] 浏览器控制台已打开 (F12)
- [ ] 查看了 `logs/console.log` 文件
- [ ] 尝试了测试文件 `student-group-ref/302728255LS.xlsx`

## 已知限制

1. **浏览器兼容性**
   - 推荐使用 Chrome/Edge 最新版本
   - Firefox/Safari 可能有兼容性问题

2. **文件大小**
   - 建议 Excel 文件 < 5MB
   - 行数 < 1000 行

3. **React 版本**
   - 当前使用 React 19.1.1
   - 与 Ant Design 5 有兼容性警告（不影响功能）

## 更新日志

### 2025-10-02
- ✅ 改进 Excel 解析错误处理
- ✅ 添加详细错误日志
- ✅ 修复类型转换问题
- ✅ 添加日志自动写入功能
