import type { GroupingTask, Student } from '../types';

export interface GlobalGroupMaps {
  groupNumberMap: Map<string, number>;
  studentToGroupMap: Map<string, number>;
  orderedGroups: {
    task: GroupingTask;
    groupId: string;
    localGroupNumber: number;
    globalGroupNumber: number;
  }[];
}

const groupKey = (taskId: string, groupId: string) => `${taskId}__${groupId}`;

export function computeGlobalGroupMaps(tasks: GroupingTask[]): GlobalGroupMaps {
  let nextNumber = 1;
  const groupNumberMap = new Map<string, number>();
  const studentToGroupMap = new Map<string, number>();
  const orderedGroups: GlobalGroupMaps['orderedGroups'] = [];

  tasks.forEach((task) => {
    if (!task.result) return;
    const sortedGroups = [...task.result.groups].sort((a, b) => a.groupNumber - b.groupNumber);
    sortedGroups.forEach((group) => {
      const globalNumber = nextNumber++;
      groupNumberMap.set(groupKey(task.id, group.id), globalNumber);
      orderedGroups.push({
        task,
        groupId: group.id,
        localGroupNumber: group.groupNumber,
        globalGroupNumber: globalNumber,
      });
      group.members.forEach((member) => {
        if (!studentToGroupMap.has(member.id)) {
          studentToGroupMap.set(member.id, globalNumber);
        }
      });
    });
  });

  return { groupNumberMap, studentToGroupMap, orderedGroups };
}

export function collectUniqueStudentsFromTasks(tasks: GroupingTask[]): Student[] {
  const map = new Map<string, Student>();
  tasks.forEach((task) => {
    if (!task.result) return;
    task.result.groups.forEach((group) => {
      group.members.forEach((member) => {
        if (!map.has(member.id)) {
          map.set(member.id, member);
        }
      });
    });
  });

  return Array.from(map.values()).sort((a, b) => a.serialNumber - b.serialNumber);
}

export function getGlobalGroupNumber(
  maps: GlobalGroupMaps,
  taskId: string,
  groupId: string
): number | undefined {
  return maps.groupNumberMap.get(groupKey(taskId, groupId));
}

export function getStudentGlobalGroupNumber(
  maps: GlobalGroupMaps,
  student: Student
): number | undefined {
  return maps.studentToGroupMap.get(student.id);
}
