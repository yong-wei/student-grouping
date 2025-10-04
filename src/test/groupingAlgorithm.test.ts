import { describe, it, expect } from 'vitest';
import {
  initializeRandomGroups,
  calculateGroupStatistics,
  calculateGroupingQualityScore,
  optimizeGrouping,
} from '../utils/groupingAlgorithm';
import type { Student, GroupingWeights } from '../types';

describe('Grouping Algorithm', () => {
  const majors = ['大数据', '人工智能', '机械工程', '工商管理'];

  const mockStudents: Student[] = Array.from({ length: 24 }, (_, i) => ({
    id: `student-${i + 1}`,
    serialNumber: i + 1,
    studentNumber: `2023${String(i + 1).padStart(3, '0')}`,
    name: `学生${i + 1}`,
    gender: i % 2,
    isLeader: i % 6 === 0,
    ranking: Math.random(),
    major: majors[i % majors.length],
    totalScore: 60 + Math.random() * 40,
    learningStyles: {
      activeReflective: Math.floor(Math.random() * 23) - 11,
      sensingIntuitive: Math.floor(Math.random() * 23) - 11,
      visualVerbal: Math.floor(Math.random() * 23) - 11,
      sequentialGlobal: Math.floor(Math.random() * 23) - 11,
      active: Math.floor(Math.random() * 12),
      reflective: Math.floor(Math.random() * 12),
      sensing: Math.floor(Math.random() * 12),
      intuitive: Math.floor(Math.random() * 12),
      visual: Math.floor(Math.random() * 12),
      verbal: Math.floor(Math.random() * 12),
      sequential: Math.floor(Math.random() * 12),
      global: Math.floor(Math.random() * 12),
    },
    ilsCompleted: true,
    ilsAnswers: Array.from({ length: 44 }, () => (Math.random() > 0.5 ? 1 : 2)),
  }));

  describe('initializeRandomGroups', () => {
    it('should create groups with correct size', () => {
      const { groups, unassigned } = initializeRandomGroups(mockStudents, 6);
      expect(groups).toHaveLength(4);
      groups.forEach((group) => {
        expect(group.members).toHaveLength(6);
      });
      expect(unassigned).toHaveLength(0);
    });

    it('should handle uneven division', () => {
      const { groups, unassigned } = initializeRandomGroups(mockStudents, 7);
      expect(groups).toHaveLength(3);
      expect(unassigned).toHaveLength(3);
    });
  });

  describe('calculateGroupStatistics', () => {
    it('should calculate correct statistics', () => {
      const group = mockStudents.slice(0, 6);
      const stats = calculateGroupStatistics(group);

      expect(stats.genderBalance).toBeGreaterThanOrEqual(0);
      expect(stats.genderBalance).toBeLessThanOrEqual(1);
      expect(stats.leaderCount).toBeGreaterThanOrEqual(0);
      expect(stats.averageScore).toBeGreaterThan(0);
      expect(stats.majorDiversity).toBeGreaterThan(0);
      expect(stats.averageLearningStyle).toHaveLength(4);
    });
  });

  describe('calculateGroupingQualityScore', () => {
    it('should calculate quality score', () => {
      const { groups } = initializeRandomGroups(mockStudents, 6);
      const weights: GroupingWeights = {
        gender: 20,
        major: 20,
        activeScore: 20,
        leader: 20,
        intraStyleDiversity: 10,
        interStyleSimilarity: 10,
      };

      const score = calculateGroupingQualityScore(groups, weights);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('optimizeGrouping', () => {
    it('should improve grouping quality', () => {
      const weights: GroupingWeights = {
        gender: 25,
        major: 25,
        activeScore: 25,
        leader: 25,
        intraStyleDiversity: 0,
        interStyleSimilarity: 0,
      };

      const result = optimizeGrouping(mockStudents, 6, weights, 1000);

      expect(result.groups).toHaveLength(4);
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.statistics.totalStudents).toBe(24);
      expect(result.statistics.totalGroups).toBe(4);
    });
  });
});
