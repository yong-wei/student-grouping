import type { Student, Group, GroupingWeights, GroupingResult, GroupStatistics } from '../types';
import {
  calculateAverageLearningStyle,
  calculateIntraGroupDiversity,
  calculateVectorDistance,
  calculateVariance,
} from './learningStyleUtils';

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
  const maleCount = members.filter((s) => s.gender === 1).length;
  const leaderCount = members.filter((s) => s.isLeader).length;
  const avgScore = members.reduce((sum, s) => sum + s.totalScore, 0) / members.length;
  const avgRanking = members.reduce((sum, s) => sum + s.ranking, 0) / members.length;

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
    averageScore: avgScore,
    averageRanking: avgRanking,
    majorDiversity,
    averageLearningStyle: averageLearningStyle as [number, number, number, number],
    learningStyleDiversity,
  };
}

/**
 * 计算分组质量分
 */
export function calculateGroupingQualityScore(groups: Group[], weights: GroupingWeights): number {
  // 1. 性别均衡分（各组性别比例方差越小越好）
  const genderBalances = groups.map((g) => g.statistics.genderBalance);
  const genderVariance = calculateVariance(genderBalances);
  const genderScore = 1 / (1 + genderVariance * 10); // 归一化

  // 2. 学科均衡分（各组专业多样性越高越好，方差越小越好）
  const majorDiversities = groups.map((g) => g.statistics.majorDiversity);
  const majorVariance = calculateVariance(majorDiversities);
  const majorScore = 1 / (1 + majorVariance);

  // 3. 主动性均衡分（各组平均分方差越小越好）
  const avgScores = groups.map((g) => g.statistics.averageScore);
  const scoreVariance = calculateVariance(avgScores);
  const activeScoreScore = 1 / (1 + scoreVariance / 100);

  // 4. 组长分布分（没有组长的小组数量越少越好）
  const groupsWithoutLeader = groups.filter((g) => g.statistics.leaderCount === 0).length;
  const leaderScore = 1 - groupsWithoutLeader / groups.length;

  // 5. 组内学习风格异质性分（平均异质性越高越好）
  const avgIntraDiversity =
    groups.reduce((sum, g) => sum + g.statistics.learningStyleDiversity, 0) / groups.length;
  const intraDiversityScore = avgIntraDiversity / 4; // 归一化到 [0,1]

  // 6. 组间学习风格同质性分（各组平均风格向量与总体中心的距离方差越小越好）
  const groupAvgStyles = groups.map((g) => g.statistics.averageLearningStyle);
  const overallAvgStyle = groupAvgStyles.reduce(
    (acc, style) => acc.map((val, i) => val + style[i]),
    [0, 0, 0, 0]
  );
  const centerStyle = overallAvgStyle.map((val) => val / groups.length);

  const distances = groupAvgStyles.map((style) => calculateVectorDistance(style, centerStyle));
  const interVariance = calculateVariance(distances);
  const interSimilarityScore = 1 / (1 + interVariance * 10);

  // 综合质量分（加权求和）
  const totalScore =
    weights.gender * genderScore +
    weights.major * majorScore +
    weights.activeScore * activeScoreScore +
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
  maxIterations = 10000
): GroupingResult {
  // 初始化
  const { groups } = initializeRandomGroups(students, groupSize);
  let currentScore = calculateGroupingQualityScore(groups, weights);
  let bestGroups = JSON.parse(JSON.stringify(groups)) as Group[];
  let bestScore = currentScore;

  // 模拟退火参数
  let temperature = 1.0;
  const coolingRate = 0.9995;

  for (let iter = 0; iter < maxIterations; iter++) {
    // 随机选择两个不同组的学生进行交换
    const group1Index = Math.floor(Math.random() * groups.length);
    const group2Index =
      (group1Index + 1 + Math.floor(Math.random() * (groups.length - 1))) % groups.length;

    const member1Index = Math.floor(Math.random() * groups[group1Index].members.length);
    const member2Index = Math.floor(Math.random() * groups[group2Index].members.length);

    // 交换
    const temp = groups[group1Index].members[member1Index];
    groups[group1Index].members[member1Index] = groups[group2Index].members[member2Index];
    groups[group2Index].members[member2Index] = temp;

    // 更新统计信息
    groups[group1Index].statistics = calculateGroupStatistics(groups[group1Index].members);
    groups[group2Index].statistics = calculateGroupStatistics(groups[group2Index].members);

    // 计算新分数
    const newScore = calculateGroupingQualityScore(groups, weights);

    // 决定是否接受交换
    const delta = newScore - currentScore;
    if (delta > 0 || Math.random() < Math.exp(delta / temperature)) {
      currentScore = newScore;

      // 更新最佳结果
      if (currentScore > bestScore) {
        bestScore = currentScore;
        bestGroups = JSON.parse(JSON.stringify(groups)) as Group[];
      }
    } else {
      // 恢复交换
      const temp = groups[group1Index].members[member1Index];
      groups[group1Index].members[member1Index] = groups[group2Index].members[member2Index];
      groups[group2Index].members[member2Index] = temp;
      groups[group1Index].statistics = calculateGroupStatistics(groups[group1Index].members);
      groups[group2Index].statistics = calculateGroupStatistics(groups[group2Index].members);
    }

    // 降温
    temperature *= coolingRate;

    // 早停条件
    if (temperature < 0.001) break;
  }

  return {
    groups: bestGroups,
    qualityScore: bestScore,
    statistics: calculateOverallStatistics(bestGroups),
  };
}

/**
 * 计算整体统计信息
 */
function calculateOverallStatistics(groups: Group[]) {
  const totalStudents = groups.reduce((sum, g) => g.members.length + sum, 0);
  const avgGroupSize = totalStudents / groups.length;

  const genderBalances = groups.map((g) => g.statistics.genderBalance);
  const majorDiversities = groups.map((g) => g.statistics.majorDiversity);
  const avgScores = groups.map((g) => g.statistics.averageScore);
  const leaderCounts = groups.map((g) => g.statistics.leaderCount);

  return {
    totalStudents,
    totalGroups: groups.length,
    averageGroupSize: avgGroupSize,
    genderVariance: calculateVariance(genderBalances),
    majorVariance: calculateVariance(majorDiversities),
    scoreVariance: calculateVariance(avgScores),
    leaderDistribution: leaderCounts.reduce((sum, c) => sum + c, 0) / groups.length,
  };
}

/**
 * 均衡随机分组（不考虑学习风格，仅考虑基本属性）
 */
export function balancedRandomGrouping(students: Student[], groupSize: number): GroupingResult {
  const weights: GroupingWeights = {
    gender: 25,
    major: 25,
    activeScore: 25,
    leader: 25,
    intraStyleDiversity: 0,
    interStyleSimilarity: 0,
  };

  return optimizeGrouping(students, groupSize, weights, 5000);
}
