import { describe, expect, it } from 'vitest';
import { buildFixedGroupContext, resolveSeededTaskPlan } from '../utils/fixedGroupPlanning';
import type { Student } from '../types';

function createStudent(
  id: string,
  groupNumber?: number,
  overrides: Partial<Student> = {}
): Student {
  return {
    id,
    serialNumber: Number(id.replace(/\D/g, '')) || 1,
    studentNumber: `2026${id}`,
    name: `学生${id}`,
    gender: 1,
    isLeader: false,
    rankingPercent: 0.5,
    major: '软件工程',
    learningStyleIntensity: 8,
    initiativeScore: 70,
    extroversionScore: 60,
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
    groupNumber,
    ilsCompleted: true,
    ilsAnswers: Array(44).fill(1),
    ...overrides,
  };
}

describe('fixedGroupPlanning', () => {
  it('groups scattered fixed students by group number', () => {
    const students = [
      createStudent('1', 2),
      createStudent('2'),
      createStudent('3', 1),
      createStudent('4', 2),
      createStudent('5', 1),
    ];

    const context = buildFixedGroupContext(students);

    expect(context.fixedStudents).toHaveLength(4);
    expect(context.highestFixedGroupNumber).toBe(2);
    expect(context.fixedGroupMap.get(1)?.map((student) => student.id)).toEqual(['3', '5']);
    expect(context.fixedGroupMap.get(2)?.map((student) => student.id)).toEqual(['1', '4']);
  });

  it('locks fixed groups first and leaves only remaining students flexible', () => {
    const students = [
      createStudent('1', 1),
      createStudent('2'),
      createStudent('3', 2),
      createStudent('4', 1),
      createStudent('5'),
      createStudent('6'),
    ];
    const context = buildFixedGroupContext(students);

    const plan = resolveSeededTaskPlan({
      fixedGroupMap: context.fixedGroupMap,
      selectedStudents: [students[1], students[4], students[5]],
      groupSize: 3,
      startGroupNumber: 1,
    });

    expect(plan.seedGroups).toHaveLength(2);
    expect(plan.range).toEqual({ start: 1, end: 2 });
    expect(plan.seedGroups[0].lockedMembers.map((student) => student.id)).toEqual(['1', '4']);
    expect(plan.seedGroups[1].lockedMembers.map((student) => student.id)).toEqual(['3']);
    expect(plan.lockedStudentIds).toEqual(new Set(['1', '3', '4']));
    expect(plan.flexibleStudents.map((student) => student.id)).toEqual(['2', '5', '6']);
  });
});
