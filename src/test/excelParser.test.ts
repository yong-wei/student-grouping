import { describe, it, expect } from 'vitest';
import {
  validateStudentData,
  calculateDataStatistics,
  matchStudentsWithPhotos,
  parsePhotoFiles,
} from '../utils/excelParser';
import type { Student } from '../types';

describe('Excel Parser Utils', () => {
  const mockStudents: Student[] = [
    {
      id: '2023001',
      serialNumber: 1,
      studentNumber: '2023001',
      name: '张三',
      gender: 1,
      isLeader: true,
      ranking: 0.85,
      major: '大数据',
      totalScore: 24,
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
      ranking: 0.75,
      major: '人工智能',
      totalScore: 0,
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
