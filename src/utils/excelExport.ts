import * as XLSX from 'xlsx';
import type { GroupingTask } from '../types';
import { computeGlobalGroupMaps, getGlobalGroupNumber } from './groupingExportUtils';

/**
 * 导出分组结果到 Excel
 */
export function exportGroupingToExcel(tasks: GroupingTask[]): void {
  const workbook = XLSX.utils.book_new();
  const sheetNameCounts = new Map<string, number>();
  const invalidChars = new Set(['\\', '/', ':', '*', '?', '[', ']']);
  const maps = computeGlobalGroupMaps(tasks);

  const makeSheetName = (rawName: string): string => {
    const sanitized =
      rawName
        .split('')
        .map((char) => (invalidChars.has(char) ? '_' : char))
        .join('')
        .trim() || 'Sheet';
    const base = sanitized.length > 28 ? sanitized.slice(0, 28) : sanitized;
    const count = sheetNameCounts.get(base) ?? 0;
    sheetNameCounts.set(base, count + 1);

    if (count === 0) {
      return base;
    }

    const suffix = `_${count + 1}`;
    const availableLength = 31 - suffix.length;
    const trimmedBase = base.length > availableLength ? base.slice(0, availableLength) : base;
    return `${trimmedBase}${suffix}`;
  };

  tasks.forEach((task) => {
    if (!task.result) return;

    // 创建分组结果表
    const groupData: (string | number)[][] = [
      [
        '序号',
        '学号',
        '姓名',
        '性别',
        '组长',
        '排名',
        '专业',
        '学习风格强度',
        '积极/沉思',
        '感官/直觉',
        '视觉/言语',
        '顺序/全局',
        '小组编号',
      ],
    ];

    task.result.groups.forEach((group) => {
      const globalGroupNumber = getGlobalGroupNumber(maps, task.id, group.id) ?? group.groupNumber;
      group.members.forEach((member) => {
        groupData.push([
          member.serialNumber,
          member.studentNumber,
          member.name,
          member.gender === 1 ? '男' : '女',
          member.isLeader ? '是' : '否',
          member.ranking,
          member.major,
          member.totalScore,
          member.learningStyles.activeReflective,
          member.learningStyles.sensingIntuitive,
          member.learningStyles.visualVerbal,
          member.learningStyles.sequentialGlobal,
          globalGroupNumber,
        ]);
      });
    });

    const worksheet = XLSX.utils.aoa_to_sheet(groupData);
    const sheetName = makeSheetName(task.name);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // 创建小组统计表
    const statsData: (string | number)[][] = [
      [
        '小组编号',
        '人数',
        '男生数',
        '女生数',
        '组长候选人数',
        '平均学习风格强度',
        '平均排名',
        '专业数',
        '学习风格多样性',
      ],
    ];

    task.result.groups.forEach((group) => {
      const globalGroupNumber = getGlobalGroupNumber(maps, task.id, group.id) ?? group.groupNumber;
      const maleCount = Math.round(group.statistics.genderBalance * group.members.length);
      const femaleCount = group.members.length - maleCount;

      statsData.push([
        globalGroupNumber,
        group.members.length,
        maleCount,
        femaleCount,
        group.statistics.leaderCount,
        parseFloat(group.statistics.averageScore.toFixed(2)),
        parseFloat(group.statistics.averageRanking.toFixed(2)),
        group.statistics.majorDiversity,
        parseFloat(group.statistics.learningStyleDiversity.toFixed(2)),
      ]);
    });

    const statsWorksheet = XLSX.utils.aoa_to_sheet(statsData);
    const statsSheetName = makeSheetName(`${task.name}-统计`);
    XLSX.utils.book_append_sheet(workbook, statsWorksheet, statsSheetName);
  });

  // 导出文件
  const fileName = `分组结果_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * 导出单个分组任务到 Excel
 */
export function exportSingleTaskToExcel(task: GroupingTask): void {
  exportGroupingToExcel([task]);
}

/**
 * 准备导出数据（用于其他格式）
 */
export function prepareExportData(task: GroupingTask) {
  if (!task.result) return null;

  const maps = computeGlobalGroupMaps([task]);

  return {
    taskName: task.name,
    groups: task.result.groups.map((group) => ({
      groupNumber: getGlobalGroupNumber(maps, task.id, group.id) ?? group.groupNumber,
      members: group.members.map((m) => ({
        name: m.name,
        studentNumber: m.studentNumber,
        gender: m.gender === 1 ? '男' : '女',
        isLeader: m.isLeader,
        totalScore: m.totalScore,
      })),
      statistics: group.statistics,
    })),
    overallStatistics: task.result.statistics,
    qualityScore: task.result.qualityScore,
  };
}
