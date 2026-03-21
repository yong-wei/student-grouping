import type { Student } from '../types';
import type { SeedGroup } from './groupingAlgorithm';

export interface FixedGroupContext {
  fixedStudents: Student[];
  fixedStudentIds: Set<string>;
  fixedGroupMap: Map<number, Student[]>;
  highestFixedGroupNumber: number;
}

const isValidFixedGroupNumber = (groupNumber: number | undefined): groupNumber is number =>
  typeof groupNumber === 'number' &&
  Number.isFinite(groupNumber) &&
  Number.isInteger(groupNumber) &&
  groupNumber > 0;

export function buildFixedGroupContext(students: Student[]): FixedGroupContext {
  const fixedStudents = students.filter((student) => isValidFixedGroupNumber(student.groupNumber));
  const fixedGroupMap = new Map<number, Student[]>();

  fixedStudents.forEach((student) => {
    const groupNumber = Number(student.groupNumber);
    const current = fixedGroupMap.get(groupNumber) ?? [];
    current.push(student);
    fixedGroupMap.set(groupNumber, current);
  });

  const highestFixedGroupNumber = fixedStudents.reduce((max, student) => {
    const groupNumber = Number(student.groupNumber ?? 0);
    return groupNumber > max ? groupNumber : max;
  }, 0);

  return {
    fixedStudents,
    fixedStudentIds: new Set(fixedStudents.map((student) => student.id)),
    fixedGroupMap,
    highestFixedGroupNumber,
  };
}

export function isSeedGroupSizeValid(seedGroup: SeedGroup, groupSize: number): boolean {
  if (seedGroup.fillToCapacity === false) {
    return true;
  }
  return seedGroup.lockedMembers.length <= groupSize;
}

export function getSeedGroupFlexibleCapacity(seedGroup: SeedGroup, groupSize: number): number {
  if (seedGroup.fillToCapacity === false) {
    return 0;
  }
  return Math.max(groupSize - seedGroup.lockedMembers.length, 0);
}

export function resolveSeededTaskPlan(args: {
  fixedGroupMap: Map<number, Student[]>;
  selectedStudents: Student[];
  groupSize: number;
  startGroupNumber: number;
}): {
  participantIds: string[];
  participantStudents: Student[];
  flexibleStudents: Student[];
  lockedStudentIds: Set<string>;
  seedGroups: SeedGroup[];
  range: { start: number; end: number };
} {
  const { fixedGroupMap, selectedStudents, groupSize, startGroupNumber } = args;
  const participantMap = new Map(selectedStudents.map((student) => [student.id, student]));
  const selectedGroupCount =
    participantMap.size > 0 ? Math.max(1, Math.ceil(participantMap.size / groupSize)) : 0;
  let endGroupNumber =
    selectedGroupCount > 0 ? startGroupNumber + selectedGroupCount - 1 : startGroupNumber - 1;

  if (fixedGroupMap.has(startGroupNumber)) {
    endGroupNumber = Math.max(endGroupNumber, startGroupNumber);
  }

  let adjusted = true;
  while (adjusted) {
    adjusted = false;

    if (endGroupNumber < startGroupNumber) {
      break;
    }

    for (let groupNumber = startGroupNumber; groupNumber <= endGroupNumber; groupNumber += 1) {
      const lockedMembers = fixedGroupMap.get(groupNumber) ?? [];
      lockedMembers.forEach((student) => {
        if (!participantMap.has(student.id)) {
          participantMap.set(student.id, student);
          adjusted = true;
        }
      });
    }

    if (participantMap.size > 0) {
      const requiredEnd =
        startGroupNumber + Math.max(1, Math.ceil(participantMap.size / groupSize)) - 1;
      if (requiredEnd > endGroupNumber) {
        endGroupNumber = requiredEnd;
        adjusted = true;
      }
    }
  }

  if (endGroupNumber < startGroupNumber) {
    return {
      participantIds: [],
      participantStudents: [],
      flexibleStudents: [],
      lockedStudentIds: new Set<string>(),
      seedGroups: [],
      range: { start: startGroupNumber, end: startGroupNumber - 1 },
    };
  }

  const seedGroups: SeedGroup[] = [];
  const lockedStudentIds = new Set<string>();

  for (let groupNumber = startGroupNumber; groupNumber <= endGroupNumber; groupNumber += 1) {
    const lockedMembers = fixedGroupMap.get(groupNumber) ?? [];
    seedGroups.push({ groupNumber, lockedMembers });
    lockedMembers.forEach((student) => lockedStudentIds.add(student.id));
  }

  const participantStudents = Array.from(participantMap.values());

  return {
    participantIds: participantStudents.map((student) => student.id),
    participantStudents,
    flexibleStudents: participantStudents.filter((student) => !lockedStudentIds.has(student.id)),
    lockedStudentIds,
    seedGroups,
    range: { start: startGroupNumber, end: endGroupNumber },
  };
}

export function resolveFixedGroupsAsIsTaskPlan(args: {
  fixedGroupMap: Map<number, Student[]>;
  selectedStudents: Student[];
  groupSize: number;
  startGroupNumber: number;
}): {
  participantIds: string[];
  participantStudents: Student[];
  flexibleStudents: Student[];
  lockedStudentIds: Set<string>;
  seedGroups: SeedGroup[];
  range: { start: number; end: number };
} {
  const { fixedGroupMap, selectedStudents, groupSize, startGroupNumber } = args;
  const fixedStudentIds = new Set(
    Array.from(fixedGroupMap.values()).flatMap((members) => members.map((student) => student.id))
  );
  const flexibleStudents = selectedStudents.filter((student) => !fixedStudentIds.has(student.id));
  const participantMap = new Map(flexibleStudents.map((student) => [student.id, student]));
  const lockedStudentIds = new Set<string>();
  const flexibleGroupCount =
    flexibleStudents.length > 0 ? Math.max(1, Math.ceil(flexibleStudents.length / groupSize)) : 0;
  const seedGroups: SeedGroup[] = [];
  let endGroupNumber = startGroupNumber - 1;

  if (flexibleGroupCount === 0) {
    const lockedMembers = fixedGroupMap.get(startGroupNumber) ?? [];
    if (lockedMembers.length > 0) {
      seedGroups.push({
        groupNumber: startGroupNumber,
        lockedMembers,
        fillToCapacity: false,
      });
      lockedMembers.forEach((student) => {
        participantMap.set(student.id, student);
        lockedStudentIds.add(student.id);
      });
      endGroupNumber = startGroupNumber;
    }
  } else {
    let flexibleSlots = 0;
    let currentGroupNumber = startGroupNumber;

    while (flexibleSlots < flexibleGroupCount) {
      const lockedMembers = fixedGroupMap.get(currentGroupNumber) ?? [];
      if (lockedMembers.length > 0) {
        seedGroups.push({
          groupNumber: currentGroupNumber,
          lockedMembers,
          fillToCapacity: false,
        });
        lockedMembers.forEach((student) => {
          participantMap.set(student.id, student);
          lockedStudentIds.add(student.id);
        });
      } else {
        seedGroups.push({
          groupNumber: currentGroupNumber,
          lockedMembers: [],
        });
        flexibleSlots += 1;
      }

      endGroupNumber = currentGroupNumber;
      currentGroupNumber += 1;
    }
  }

  const participantStudents = Array.from(participantMap.values());

  return {
    participantIds: participantStudents.map((student) => student.id),
    participantStudents,
    flexibleStudents,
    lockedStudentIds,
    seedGroups,
    range: { start: startGroupNumber, end: endGroupNumber },
  };
}
