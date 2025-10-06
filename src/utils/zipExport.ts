import JSZip from 'jszip';
import type { GroupingTask } from '../types';
import { generateIndividualReport } from './pdfExport';
import {
  collectUniqueStudentsFromTasks,
  computeGlobalGroupMaps,
  getGlobalGroupNumber,
  getStudentGlobalGroupNumber,
} from './groupingExportUtils';

/**
 * 批量生成个人报告并打包为 ZIP
 */
export async function generateBatchReports(
  tasks: GroupingTask[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const tasksWithResult = tasks.filter(
    (task): task is GroupingTask & { result: NonNullable<GroupingTask['result']> } =>
      Boolean(task.result && task.result.groups.length > 0)
  );
  if (tasksWithResult.length === 0) {
    throw new Error('没有分组结果');
  }

  const zip = new JSZip();
  const assignments = collectUniqueStudentsFromTasks(tasksWithResult);
  const globalMaps = computeGlobalGroupMaps(tasksWithResult);
  const total = assignments.length;

  // 为每个学生生成报告
  for (let i = 0; i < assignments.length; i += 1) {
    const student = assignments[i];
    const globalGroupNumber = getStudentGlobalGroupNumber(globalMaps, student) ?? 0;

    // 生成个人报告
    const displayName = student.name || student.studentNumber || `student-${i + 1}`;
    const identifier = student.studentNumber || student.id;
    const sanitize = (value: string) => value.replace(/[\\/:*?"<>|]/g, '_');

    const pdfBlob = await generateIndividualReport(student, globalGroupNumber);

    // 添加到 ZIP
    const serialPart = String(student.serialNumber).padStart(3, '0');
    const fileName = `${serialPart}_${sanitize(identifier)}_${sanitize(displayName)}_学习报告.pdf`;
    zip.file(fileName, pdfBlob);

    // 更新进度
    if (onProgress) {
      onProgress(i + 1, total);
      if ((i + 1) % 5 === 0 || i + 1 === total) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  // 生成 ZIP 文件
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6,
    },
  });

  // 下载
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `班级个人报告_${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 导出所有任务的结果为 ZIP
 */
export async function exportAllTasksToZip(tasks: GroupingTask[]): Promise<void> {
  const zip = new JSZip();
  const tasksWithResult = tasks.filter((task) => task.result && task.result.groups.length > 0);
  const maps = computeGlobalGroupMaps(tasksWithResult);

  for (const task of tasks) {
    if (!task.result) continue;

    // 为每个任务创建文件夹
    const folder = zip.folder(task.name);
    if (!folder) continue;

    // 添加分组列表文本文件
    let groupListContent = `${task.name}\n${'='.repeat(50)}\n\n`;

    task.result.groups
      .slice()
      .sort((a, b) => a.groupNumber - b.groupNumber)
      .forEach((group) => {
        const globalNumber = getGlobalGroupNumber(maps, task.id, group.id) ?? group.groupNumber;

        groupListContent += `第 ${globalNumber} 组 (${group.members.length}人)\n`;
        groupListContent += `-`.repeat(30) + '\n';

        group.members
          .slice()
          .sort((a, b) => a.serialNumber - b.serialNumber)
          .forEach((member) => {
            groupListContent += `${member.serialNumber}. ${member.name} (${member.studentNumber})`;
            if (member.isLeader) {
              groupListContent += ' [组长候选]';
            }
            groupListContent += '\n';
          });

        groupListContent += '\n';
      });

    folder.file('分组列表.txt', groupListContent);
  }

  // 生成并下载
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `所有分组结果_${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
