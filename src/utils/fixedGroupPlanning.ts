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
  const remainingFixedGroups = Array.from(fixedGroupMap.entries())
    .filter(([groupNumber]) => groupNumber >= startGroupNumber)
    .sort(([left], [right]) => left - right);

  const participantMap = new Map(selectedStudents.map((student) => [student.id, student]));
  const lockedStudentIds = new Set<string>();

  const fixedSeedGroups: SeedGroup[] = remainingFixedGroups.map(([groupNumber, lockedMembers]) => {
    lockedMembers.forEach((student) => {
      participantMap.set(student.id, student);
      lockedStudentIds.add(student.id);
    });

    return {
      groupNumber,
      lockedMembers,
      fillToCapacity: false,
    };
  });

  const flexibleStudents = selectedStudents.filter((student) => !lockedStudentIds.has(student.id));
  const flexibleGroupCount =
    flexibleStudents.length > 0 ? Math.max(1, Math.ceil(flexibleStudents.length / groupSize)) : 0;
  const occupiedGroupNumbers = new Set(fixedSeedGroups.map((seed) => seed.groupNumber));
  const flexibleSeedGroups: SeedGroup[] = [];

  let candidateGroupNumber = startGroupNumber;
  while (flexibleSeedGroups.length < flexibleGroupCount) {
    if (!occupiedGroupNumbers.has(candidateGroupNumber)) {
      flexibleSeedGroups.push({
        groupNumber: candidateGroupNumber,
        lockedMembers: [],
      });
    }
    candidateGroupNumber += 1;
  }

  const seedGroups = [...fixedSeedGroups, ...flexibleSeedGroups].sort(
    (left, right) => left.groupNumber - right.groupNumber
  );
  const participantStudents = Array.from(participantMap.values());
  const endGroupNumber =
    seedGroups.length > 0
      ? Math.max(...seedGroups.map((seed) => seed.groupNumber))
      : startGroupNumber - 1;

  return {
    participantIds: participantStudents.map((student) => student.id),
    participantStudents,
    flexibleStudents,
    lockedStudentIds,
    seedGroups,
    range: { start: startGroupNumber, end: endGroupNumber },
  };
}
