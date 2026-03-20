import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  parseExcelFile,
  validateStudentData,
  calculateDataStatistics,
  matchStudentsWithPhotos,
  parsePhotoFiles,
} from '../utils/excelParser';
import type { Student } from '../types';

describe('Excel Parser Utils', () => {
  const rawRankingHeader = `成绩排名百分比(%)
（数值越小成绩越好。说明：#N/A表示数据暂缺）`;
  const initiativeHeader = '学习主动性总分（满分84分，越高越主动）——针对第二部分的八道题得分求和';
  const extroQuestionOne =
    '在小组合作讨论中，你通常是哪种状态？（判断内向外向的第一题，数值越高越喜欢小组合作）';
  const extroQuestionTwo =
    '在一次持续 60 分钟的小组合作任务结束后，你通常感觉：（判断内向外向的第二题，数值越高越喜欢小组合作）';
  const ilsRawFirstQuestion = '1.在我（    ）之后，我对某事物有了更好的理解。';

  const mockStudents: Student[] = [
    {
      id: '2023001',
      serialNumber: 1,
      studentNumber: '2023001',
      name: '张三',
      gender: 1,
      isLeader: true,
      rankingPercent: 0.85,
      major: '大数据',
      learningStyleIntensity: 24,
      initiativeScore: 66,
      extroversionScore: 5,
      learningStyles: {
        activeReflective: -5,
        sensingIntuitive: 3,
        visualVerbal: -7,
        sequentialGlobal: 1,
        active: 8,
        reflective: 3,
        sensing: 6,
        intuitive: 3,
        visual: 9,
        verbal: 2,
        sequential: 5,
        global: 6,
      },
      ilsCompleted: true,
      ilsAnswers: Array.from({ length: 44 }, () => 1),
    },
    {
      id: '2023002',
      serialNumber: 2,
      studentNumber: '2023002',
      name: '李四',
      gender: 0,
      isLeader: false,
      rankingPercent: undefined,
      major: '人工智能',
      learningStyleIntensity: 0,
      initiativeScore: 48,
      extroversionScore: 3,
      learningStyles: {
        activeReflective: 0,
        sensingIntuitive: 0,
        visualVerbal: 0,
        sequentialGlobal: 0,
        active: 0,
        reflective: 0,
        sensing: 0,
        intuitive: 0,
        visual: 0,
        verbal: 0,
        sequential: 0,
        global: 0,
      },
      ilsCompleted: false,
      ilsAnswers: Array.from({ length: 44 }, () => null),
    },
  ];

  const createWorkbookFile = (
    rows: Record<string, unknown>[],
    fileName = 'students.xlsx'
  ): File => {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    const content = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    return new File([content], fileName, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  };

  describe('parseExcelFile', () => {
    it('should parse raw questionnaire headers and derive ranking, initiative, extroversion and ILS data', async () => {
      const ilsHeaders = Array.from({ length: 44 }, (_, index) =>
        index === 0 ? ilsRawFirstQuestion : `ILS原题${index + 1}`
      );
      const ilsAnswers = Array.from({ length: 44 }, (_, index) => (index % 2 === 0 ? 1 : 2));
      const file = createWorkbookFile([
        {
          序号: 1,
          '1.你的姓名?': '张三',
          性别: '男',
          专业: '人工智能',
          '2.你的学号?': '2023001',
          '5.你是否愿意承担本课程中小组长的角色？': 1,
          [rawRankingHeader]: '#N/A',
          [initiativeHeader]: 63,
          [extroQuestionOne]: 3,
          [extroQuestionTwo]: 2,
          ...Object.fromEntries(ilsHeaders.map((header, index) => [header, ilsAnswers[index]])),
        },
      ]);

      const students = await parseExcelFile(file);

      expect(students).toHaveLength(1);
      expect(students[0]).toMatchObject({
        studentNumber: '2023001',
        name: '张三',
        rankingPercent: undefined,
        initiativeScore: 63,
        extroversionScore: 5,
        learningStyleIntensity: 44,
        isLeader: true,
        ilsCompleted: true,
      });
      expect(students[0].ilsAnswers).toEqual(ilsAnswers);
    });

    it('should parse normalized computed columns without raw ILS answers', async () => {
      const file = createWorkbookFile([
        {
          序号: 2,
          姓名: '李四',
          学号: '2023002',
          性别: '女',
          专业: '大数据',
          组长: 0,
          成绩排名百分比: 0.42,
          学习主动性总分: 52,
          外向程度: 4,
          '积极/沉思': -5,
          '感官/直觉': 3,
          '视觉/言语': -7,
          '顺序/全局': 1,
          积极: 8,
          沉思: 3,
          感官: 7,
          直觉: 4,
          视觉: 9,
          言语: 2,
          顺序: 6,
          全局: 5,
        },
      ]);

      const students = await parseExcelFile(file);

      expect(students).toHaveLength(1);
      expect(students[0]).toMatchObject({
        rankingPercent: 0.42,
        initiativeScore: 52,
        extroversionScore: 4,
        learningStyleIntensity: 16,
        ilsCompleted: true,
      });
      expect(students[0].ilsAnswers).toBeUndefined();
      expect(students[0].learningStyles.activeReflective).toBe(-5);
    });

    it('should preserve sparse pre-group columns when the first row has no group number', async () => {
      const file = createWorkbookFile([
        {
          序号: 1,
          姓名: '张三',
          学号: '2023001',
          性别: '男',
          专业: '人工智能',
          分组序号: '',
        },
        {
          序号: 2,
          姓名: '李四',
          学号: '2023002',
          性别: '女',
          专业: '大数据',
          分组序号: 3,
        },
      ]);

      const students = await parseExcelFile(file);
      const stats = calculateDataStatistics(students);

      expect(students).toHaveLength(2);
      expect(students[0].groupNumber).toBeUndefined();
      expect(students[1].groupNumber).toBe(3);
      expect(stats.preGroupedStudents).toBe(1);
      expect(stats.ungroupedStudents).toBe(1);
    });
  });

  describe('validateStudentData', () => {
    it('should validate correct student data', () => {
      const result = validateStudentData(mockStudents);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing student number', () => {
      const invalidStudents = [{ ...mockStudents[0], studentNumber: '' }];
      const result = validateStudentData(invalidStudents);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('第 1 行：缺少学号');
    });

    it('should detect missing name', () => {
      const invalidStudents = [{ ...mockStudents[0], name: '' }];
      const result = validateStudentData(invalidStudents);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('第 1 行：缺少姓名');
    });
  });

  describe('calculateDataStatistics', () => {
    it('should calculate correct statistics', () => {
      const stats = calculateDataStatistics(mockStudents);
      expect(stats.totalStudents).toBe(2);
      expect(stats.testedStudents).toBe(1);
      expect(stats.untestedStudents).toBe(1);
      expect(stats.studentsWithPhotos).toBe(0);
      expect(stats.studentsWithoutPhotos).toBe(2);
      expect(stats.preGroupedStudents).toBe(0);
      expect(stats.ungroupedStudents).toBe(2);
    });
  });

  describe('matchStudentsWithPhotos', () => {
    it('should match students only when serial number and name both align', () => {
      const photoMap = new Map([['1::张三', 'photo1.jpg']]);
      const result = matchStudentsWithPhotos(mockStudents, photoMap);
      expect(result[0].photo).toBe('photo1.jpg');
      expect(result[1].photo).toBeUndefined();
    });

    it('should ignore photos when serial matches but name differs', () => {
      const photoMap = new Map([['1::李四', 'photo-mismatch.jpg']]);
      const result = matchStudentsWithPhotos(mockStudents, photoMap);
      expect(result[0].photo).toBeUndefined();
      expect(result[1].photo).toBeUndefined();
    });

    it('should normalize whitespace in names before matching', () => {
      const students = [
        mockStudents[0],
        {
          ...mockStudents[1],
          name: ' 李 四 ',
        },
      ];
      const photoMap = new Map([['2::李四', 'photo2.jpg']]);
      const result = matchStudentsWithPhotos(students, photoMap);
      expect(result[1].photo).toBe('photo2.jpg');
    });
  });

  describe('parsePhotoFiles', () => {
    it('should create composite keys from filenames containing serial and name', async () => {
      const file = new File(['dummy'], '序号1_张三.jpg', { type: 'image/jpeg' });
      const photoMap = await parsePhotoFiles([file]);
      expect(photoMap.get('1::张三')).toBeDefined();
    });

    it('should handle filenames with multiple segments and pick the correct student name', async () => {
      const file = new File(['dummy'], '1-三年级二班-张三.png', { type: 'image/png' });
      const photoMap = await parsePhotoFiles([file]);
      expect(photoMap.get('1::张三')).toBeDefined();
    });
  });
});
