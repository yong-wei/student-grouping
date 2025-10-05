import { describe, it, expect } from 'vitest';
import {
  initializeRandomGroups,
  calculateGroupStatistics,
  calculateGroupingQualityScore,
  optimizeGrouping,
  balancedRandomGrouping,
} from '../utils/groupingAlgorithm';
import type { SeedGroup } from '../utils/groupingAlgorithm';
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

    it('should keep locked members in their assigned groups when using seeds', () => {
      const weights: GroupingWeights = {
        gender: 20,
        major: 20,
        activeScore: 20,
        leader: 20,
        intraStyleDiversity: 10,
        interStyleSimilarity: 10,
      };

      const seedGroups: SeedGroup[] = [
        { groupNumber: 1, lockedMembers: [mockStudents[0], mockStudents[1]] },
        { groupNumber: 2, lockedMembers: [mockStudents[2]] },
        { groupNumber: 3, lockedMembers: [] },
        { groupNumber: 4, lockedMembers: [] },
      ];

      const freeStudents = mockStudents.filter((_, index) => index > 2);

      const result = optimizeGrouping(freeStudents, 6, weights, 500, { seedGroups });

      expect(result.groups).toHaveLength(seedGroups.length);
      const groupOne = result.groups.find((group) => group.groupNumber === 1);
      expect(groupOne?.members).toEqual(expect.arrayContaining(seedGroups[0].lockedMembers));
      const otherGroups = result.groups.filter((group) => group.groupNumber !== 1);
      otherGroups.forEach((group) => {
        seedGroups[0].lockedMembers.forEach((student) => {
          expect(group.members.some((member) => member.id === student.id)).toBe(false);
        });
      });
    });

    it('should handle scenarios with only locked members', () => {
      const weights: GroupingWeights = {
        gender: 20,
        major: 20,
        activeScore: 20,
        leader: 20,
        intraStyleDiversity: 10,
        interStyleSimilarity: 10,
      };

      const seedGroups: SeedGroup[] = [
        { groupNumber: 1, lockedMembers: mockStudents.slice(0, 6) },
        { groupNumber: 2, lockedMembers: mockStudents.slice(6, 12) },
      ];

      const result = optimizeGrouping([], 6, weights, 200, { seedGroups });

      expect(result.groups).toHaveLength(seedGroups.length);
      seedGroups.forEach((seed) => {
        const group = result.groups.find((item) => item.groupNumber === seed.groupNumber);
        expect(group).toBeDefined();
        expect(group?.members).toHaveLength(seed.lockedMembers.length);
        expect(group?.members).toEqual(expect.arrayContaining(seed.lockedMembers));
      });
    });

    it('should keep locked members when using seeds with balanced random grouping', () => {
      const seedGroups: SeedGroup[] = [
        { groupNumber: 1, lockedMembers: [mockStudents[0]] },
        { groupNumber: 2, lockedMembers: [] },
        { groupNumber: 3, lockedMembers: [] },
        { groupNumber: 4, lockedMembers: [] },
      ];

      const freeStudents = mockStudents.slice(1);

      const result = balancedRandomGrouping(freeStudents, 6, { seedGroups });

      expect(result.groups).toHaveLength(seedGroups.length);
      const firstGroup = result.groups.find((group) => group.groupNumber === 1);
      expect(firstGroup).toBeDefined();
      expect(firstGroup?.members.some((member) => member.id === mockStudents[0].id)).toBe(true);
    });
  });
});
