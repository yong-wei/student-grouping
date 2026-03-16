import type { Student, Group, GroupingWeights, GroupingResult, GroupStatistics } from '../types';
import {
  calculateAverageLearningStyle,
  calculateIntraGroupDiversity,
  calculateVectorDistance,
  calculateVariance,
} from './learningStyleUtils';

export interface SeedGroup {
  groupNumber: number;
  lockedMembers: Student[];
}

export interface GroupingOptions {
  seedGroups?: SeedGroup[];
}

const calculateAverage = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const calculateNullableAverage = (values: (number | undefined)[]): number | null => {
  const validValues = values.filter((value): value is number => value !== undefined);
  if (validValues.length === 0) {
    return null;
  }
  return calculateAverage(validValues);
};

const calculateVarianceScore = (values: number[], scale = 1): number => {
  if (values.length < 2) {
    return 1;
  }
  return 1 / (1 + calculateVariance(values) * scale);
};

const normalizeBalancedRandomWeights = (weights?: GroupingWeights): GroupingWeights => ({
  gender: weights?.gender ?? 25,
  major: weights?.major ?? 25,
  initiative: weights?.initiative ?? 25,
  ranking: weights?.ranking ?? 0,
  extroversion: weights?.extroversion ?? 0,
  leader: weights?.leader ?? 25,
  intraStyleDiversity: 0,
  interStyleSimilarity: 0,
});

/**
 * 初始化随机分组
 */
export function initializeRandomGroups(
  students: Student[],
  groupSize: number
): { groups: Group[]; unassigned: Student[] } {
  const shuffled = [...students].sort(() => Math.random() - 0.5);
  const numGroups = Math.floor(students.length / groupSize);
  const groups: Group[] = [];

  for (let i = 0; i < numGroups; i++) {
    const members = shuffled.slice(i * groupSize, (i + 1) * groupSize);
    groups.push({
      id: `group-${i + 1}`,
      groupNumber: i + 1,
      members,
      statistics: calculateGroupStatistics(members),
    });
  }

  const unassigned = shuffled.slice(numGroups * groupSize);
  return { groups, unassigned };
}

/**
 * 计算小组统计信息
 */
export function calculateGroupStatistics(members: Student[]): GroupStatistics {
  if (members.length === 0) {
    return {
      genderBalance: 0,
      leaderCount: 0,
      averageLearningStyleIntensity: 0,
      averageInitiativeScore: 0,
      averageRankingPercent: null,
      averageExtroversionScore: 0,
      rankingStudentCount: 0,
      majorDiversity: 0,
      averageLearningStyle: [0, 0, 0, 0],
      learningStyleDiversity: 0,
    };
  }

  const maleCount = members.filter((s) => s.gender === 1).length;
  const leaderCount = members.filter((s) => s.isLeader).length;
  const averageLearningStyleIntensity = calculateAverage(
    members.map((student) => student.learningStyleIntensity)
  );
  const averageInitiativeScore = calculateAverage(
    members.map((student) => student.initiativeScore)
  );
  const averageRankingPercent = calculateNullableAverage(
    members.map((student) => student.rankingPercent)
  );
  const averageExtroversionScore = calculateAverage(
    members.map((student) => student.extroversionScore)
  );
  const rankingStudentCount = members.filter(
    (student) => typeof student.rankingPercent === 'number'
  ).length;

  // 专业多样性（不同专业的数量）
  const uniqueMajors = new Set(members.map((s) => s.major));
  const majorDiversity = uniqueMajors.size;

  // 平均学习风格向量
  const averageLearningStyle = calculateAverageLearningStyle(members);

  // 学习风格多样性（组内异质性）
  const learningStyleDiversity = calculateIntraGroupDiversity(members);

  return {
    genderBalance: maleCount / (members.length || 1),
    leaderCount,
    averageLearningStyleIntensity,
    averageInitiativeScore,
    averageRankingPercent,
    averageExtroversionScore,
    rankingStudentCount,
    majorDiversity,
    averageLearningStyle: averageLearningStyle as [number, number, number, number],
    learningStyleDiversity,
  };
}

/**
 * 计算分组质量分
 */
type LockedMemberSets = Set<string>[];

function cloneGroupStatistics(statistics: GroupStatistics): GroupStatistics {
  const averageLearningStyle =
    statistics.averageLearningStyle.slice() as GroupStatistics['averageLearningStyle'];

  return {
    genderBalance: statistics.genderBalance,
    leaderCount: statistics.leaderCount,
    averageLearningStyleIntensity: statistics.averageLearningStyleIntensity,
    averageInitiativeScore: statistics.averageInitiativeScore,
    averageRankingPercent: statistics.averageRankingPercent,
    averageExtroversionScore: statistics.averageExtroversionScore,
    rankingStudentCount: statistics.rankingStudentCount,
    majorDiversity: statistics.majorDiversity,
    averageLearningStyle,
    learningStyleDiversity: statistics.learningStyleDiversity,
  };
}

function cloneGroups(groups: Group[]): Group[] {
  return groups.map((group) => ({
    id: group.id,
    groupNumber: group.groupNumber,
    members: [...group.members],
    statistics: cloneGroupStatistics(group.statistics),
  }));
}

function initializeSeededGroups(
  freeStudents: Student[],
  groupSize: number,
  seedGroups: SeedGroup[]
): { groups: Group[]; lockedSets: LockedMemberSets } {
  const sortedSeeds = [...seedGroups].sort((a, b) => a.groupNumber - b.groupNumber);
  const groups: Group[] = sortedSeeds.map((seed) => ({
    id: `group-${seed.groupNumber}`,
    groupNumber: seed.groupNumber,
    members: [...seed.lockedMembers],
    statistics: calculateGroupStatistics([...seed.lockedMembers]),
  }));
  const lockedSets: LockedMemberSets = sortedSeeds.map(
    (seed) => new Set(seed.lockedMembers.map((member) => member.id))
  );

  const shuffled = [...freeStudents].sort(() => Math.random() - 0.5);
  let index = 0;

  groups.forEach((group) => {
    const capacity = Math.max(groupSize - group.members.length, 0);
    for (let i = 0; i < capacity && index < shuffled.length; i += 1) {
      group.members.push(shuffled[index]);
      index += 1;
    }
  });

  while (index < shuffled.length && groups.length > 0) {
    const group = groups[index % groups.length];
    group.members.push(shuffled[index]);
    index += 1;
  }

  groups.forEach((group) => {
    group.statistics = calculateGroupStatistics(group.members);
  });

  return { groups, lockedSets };
}

function getEligibleGroupIndices(groups: Group[], lockedSets: LockedMemberSets): number[] {
  const indices: number[] = [];
  groups.forEach((group, index) => {
    const hasUnlocked = group.members.some((member) => !lockedSets[index].has(member.id));
    if (hasUnlocked) {
      indices.push(index);
    }
  });
  return indices;
}

function pickUnlockedMemberIndex(
  groups: Group[],
  lockedSets: LockedMemberSets,
  groupIndex: number
): number | null {
  const unlockedIndices = groups[groupIndex].members
    .map((member, index) => (lockedSets[groupIndex].has(member.id) ? -1 : index))
    .filter((value) => value !== -1);
  if (unlockedIndices.length === 0) {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * unlockedIndices.length);
  return unlockedIndices[randomIndex];
}

export function calculateGroupingQualityScore(groups: Group[], weights: GroupingWeights): number {
  if (groups.length === 0) {
    return 0;
  }

  // 1. 性别均衡分（各组性别比例方差越小越好）
  const genderBalances = groups.map((g) => g.statistics.genderBalance);
  const genderScore = calculateVarianceScore(genderBalances, 10);

  // 2. 学科均衡分（各组专业多样性越高越好，方差越小越好）
  const majorDiversities = groups.map((g) => g.statistics.majorDiversity);
  const majorScore = calculateVarianceScore(majorDiversities);

  // 3. 主动性均衡分（各组平均主动性分方差越小越好）
  const averageInitiativeScores = groups.map((group) => group.statistics.averageInitiativeScore);
  const initiativeScore = calculateVarianceScore(averageInitiativeScores, 0.01);

  // 4. 成绩均衡分（仅统计有排名数据的小组）
  const averageRankingPercents = groups
    .map((group) => group.statistics.averageRankingPercent)
    .filter((value): value is number => value !== null);
  const rankingScore = calculateVarianceScore(averageRankingPercents, 10);

  // 5. 外向程度均衡分（各组平均外向分方差越小越好）
  const averageExtroversionScores = groups.map(
    (group) => group.statistics.averageExtroversionScore
  );
  const extroversionScore = calculateVarianceScore(averageExtroversionScores);

  // 6. 组长分布分（没有组长的小组数量越少越好）
  const groupsWithoutLeader = groups.filter((g) => g.statistics.leaderCount === 0).length;
  const leaderScore = 1 - groupsWithoutLeader / groups.length;

  // 7. 组内学习风格异质性分（平均异质性越高越好）
  const avgIntraDiversity =
    groups.reduce((sum, g) => sum + g.statistics.learningStyleDiversity, 0) / groups.length;
  const intraDiversityScore = avgIntraDiversity / 4; // 归一化到 [0,1]

  // 8. 组间学习风格同质性分（各组平均风格向量与总体中心的距离方差越小越好）
  const groupAvgStyles = groups.map((g) => g.statistics.averageLearningStyle);
  const overallAvgStyle: [number, number, number, number] = [0, 0, 0, 0];
  groupAvgStyles.forEach((style) => {
    overallAvgStyle[0] += style[0];
    overallAvgStyle[1] += style[1];
    overallAvgStyle[2] += style[2];
    overallAvgStyle[3] += style[3];
  });
  const centerStyle = overallAvgStyle.map((val) => val / groups.length) as [
    number,
    number,
    number,
    number,
  ];

  const distances = groupAvgStyles.map((style) => calculateVectorDistance(style, centerStyle));
  const interSimilarityScore = calculateVarianceScore(distances, 10);

  // 综合质量分（加权求和）
  const totalScore =
    weights.gender * genderScore +
    weights.major * majorScore +
    weights.initiative * initiativeScore +
    weights.ranking * rankingScore +
    weights.extroversion * extroversionScore +
    weights.leader * leaderScore +
    weights.intraStyleDiversity * intraDiversityScore +
    weights.interStyleSimilarity * interSimilarityScore;

  return totalScore;
}

/**
 * 模拟退火算法优化分组
 */
export function optimizeGrouping(
  students: Student[],
  groupSize: number,
  weights: GroupingWeights,
  maxIterations = 10000,
  options?: GroupingOptions
): GroupingResult {
  if (options?.seedGroups && options.seedGroups.length > 0) {
    return optimizeGroupingWithSeeds(
      students,
      groupSize,
      weights,
      maxIterations,
      options.seedGroups
    );
  }

  const { groups } = initializeRandomGroups(students, groupSize);
  let currentScore = calculateGroupingQualityScore(groups, weights);
  let bestGroups = cloneGroups(groups);
  let bestScore = currentScore;

  let temperature = 1.0;
  const coolingRate = 0.9995;

  for (let iter = 0; iter < maxIterations; iter += 1) {
    if (groups.length === 0) {
      break;
    }

    const group1Index = Math.floor(Math.random() * groups.length);
    const group2Index =
      groups.length > 1
        ? (group1Index + 1 + Math.floor(Math.random() * (groups.length - 1))) % groups.length
        : group1Index;

    const member1Index = Math.floor(Math.random() * groups[group1Index].members.length);
    const member2Index = Math.floor(Math.random() * groups[group2Index].members.length);

    const tempMember = groups[group1Index].members[member1Index];
    groups[group1Index].members[member1Index] = groups[group2Index].members[member2Index];
    groups[group2Index].members[member2Index] = tempMember;

    groups[group1Index].statistics = calculateGroupStatistics(groups[group1Index].members);
    groups[group2Index].statistics = calculateGroupStatistics(groups[group2Index].members);

    const newScore = calculateGroupingQualityScore(groups, weights);
    const delta = newScore - currentScore;

    if (delta > 0 || Math.random() < Math.exp(delta / temperature)) {
      currentScore = newScore;
      if (currentScore > bestScore) {
        bestScore = currentScore;
        bestGroups = cloneGroups(groups);
      }
    } else {
      const revertMember = groups[group1Index].members[member1Index];
      groups[group1Index].members[member1Index] = groups[group2Index].members[member2Index];
      groups[group2Index].members[member2Index] = revertMember;

      groups[group1Index].statistics = calculateGroupStatistics(groups[group1Index].members);
      groups[group2Index].statistics = calculateGroupStatistics(groups[group2Index].members);
    }

    temperature *= coolingRate;
    if (temperature < 0.001) {
      break;
    }
  }

  const sortedBestGroups = [...bestGroups].sort((a, b) => a.groupNumber - b.groupNumber);
  sortedBestGroups.forEach((group) => {
    group.id = `group-${group.groupNumber}`;
    group.statistics = calculateGroupStatistics(group.members);
  });
  const finalScore = calculateGroupingQualityScore(sortedBestGroups, weights);

  return {
    groups: sortedBestGroups,
    qualityScore: finalScore,
    statistics: calculateOverallStatistics(sortedBestGroups),
  };
}

function optimizeGroupingWithSeeds(
  freeStudents: Student[],
  groupSize: number,
  weights: GroupingWeights,
  maxIterations: number,
  seedGroups: SeedGroup[]
): GroupingResult {
  if (seedGroups.length === 0) {
    return optimizeGrouping(freeStudents, groupSize, weights, maxIterations);
  }

  const { groups, lockedSets } = initializeSeededGroups(freeStudents, groupSize, seedGroups);

  if (groups.length === 0) {
    return {
      groups: [],
      qualityScore: 0,
      statistics: {
        totalStudents: 0,
        totalGroups: 0,
        averageGroupSize: 0,
        genderVariance: 0,
        majorVariance: 0,
        initiativeVariance: 0,
        rankingVariance: 0,
        extroversionVariance: 0,
        leaderDistribution: 0,
      },
    };
  }

  let currentScore = calculateGroupingQualityScore(groups, weights);
  let bestGroups = cloneGroups(groups);
  let bestScore = currentScore;

  let temperature = 1.0;
  const coolingRate = 0.9995;

  for (let iter = 0; iter < maxIterations; iter += 1) {
    const eligibleGroups = getEligibleGroupIndices(groups, lockedSets);
    if (eligibleGroups.length < 2) {
      break;
    }

    const group1Index = eligibleGroups[Math.floor(Math.random() * eligibleGroups.length)];
    let group2Index = group1Index;
    while (group2Index === group1Index) {
      group2Index = eligibleGroups[Math.floor(Math.random() * eligibleGroups.length)];
    }

    const member1Index = pickUnlockedMemberIndex(groups, lockedSets, group1Index);
    const member2Index = pickUnlockedMemberIndex(groups, lockedSets, group2Index);

    if (member1Index === null || member2Index === null) {
      continue;
    }

    const tempMember = groups[group1Index].members[member1Index];
    groups[group1Index].members[member1Index] = groups[group2Index].members[member2Index];
    groups[group2Index].members[member2Index] = tempMember;

    groups[group1Index].statistics = calculateGroupStatistics(groups[group1Index].members);
    groups[group2Index].statistics = calculateGroupStatistics(groups[group2Index].members);

    const newScore = calculateGroupingQualityScore(groups, weights);
    const delta = newScore - currentScore;

    if (delta > 0 || Math.random() < Math.exp(delta / temperature)) {
      currentScore = newScore;
      if (currentScore > bestScore) {
        bestScore = currentScore;
        bestGroups = cloneGroups(groups);
      }
    } else {
      const revertMember = groups[group1Index].members[member1Index];
      groups[group1Index].members[member1Index] = groups[group2Index].members[member2Index];
      groups[group2Index].members[member2Index] = revertMember;

      groups[group1Index].statistics = calculateGroupStatistics(groups[group1Index].members);
      groups[group2Index].statistics = calculateGroupStatistics(groups[group2Index].members);
    }

    temperature *= coolingRate;
    if (temperature < 0.001) {
      break;
    }
  }

  const sortedBestGroups = [...bestGroups].sort((a, b) => a.groupNumber - b.groupNumber);
  sortedBestGroups.forEach((group) => {
    group.id = `group-${group.groupNumber}`;
    group.statistics = calculateGroupStatistics(group.members);
  });
  const finalScore = calculateGroupingQualityScore(sortedBestGroups, weights);

  return {
    groups: sortedBestGroups,
    qualityScore: finalScore,
    statistics: calculateOverallStatistics(sortedBestGroups),
  };
}

/**
 * 计算整体统计信息
 */
function calculateOverallStatistics(groups: Group[]) {
  if (groups.length === 0) {
    return {
      totalStudents: 0,
      totalGroups: 0,
      averageGroupSize: 0,
      genderVariance: 0,
      majorVariance: 0,
      initiativeVariance: 0,
      rankingVariance: 0,
      extroversionVariance: 0,
      leaderDistribution: 0,
    };
  }

  const totalStudents = groups.reduce((sum, g) => g.members.length + sum, 0);
  const avgGroupSize = totalStudents / groups.length;

  const genderBalances = groups.map((g) => g.statistics.genderBalance);
  const majorDiversities = groups.map((g) => g.statistics.majorDiversity);
  const averageInitiativeScores = groups.map((g) => g.statistics.averageInitiativeScore);
  const averageRankingPercents = groups
    .map((group) => group.statistics.averageRankingPercent)
    .filter((value): value is number => value !== null);
  const averageExtroversionScores = groups.map(
    (group) => group.statistics.averageExtroversionScore
  );
  const leaderCounts = groups.map((g) => g.statistics.leaderCount);

  return {
    totalStudents,
    totalGroups: groups.length,
    averageGroupSize: avgGroupSize,
    genderVariance: calculateVariance(genderBalances),
    majorVariance: calculateVariance(majorDiversities),
    initiativeVariance: calculateVariance(averageInitiativeScores),
    rankingVariance:
      averageRankingPercents.length < 2 ? 0 : calculateVariance(averageRankingPercents),
    extroversionVariance: calculateVariance(averageExtroversionScores),
    leaderDistribution: leaderCounts.reduce((sum, c) => sum + c, 0) / groups.length,
  };
}

/**
 * 均衡随机分组（不考虑学习风格，仅考虑基本属性）
 */
export function balancedRandomGrouping(
  students: Student[],
  groupSize: number,
  weights?: GroupingWeights,
  options?: GroupingOptions
): GroupingResult {
  return optimizeGrouping(
    students,
    groupSize,
    normalizeBalancedRandomWeights(weights),
    5000,
    options
  );
}
