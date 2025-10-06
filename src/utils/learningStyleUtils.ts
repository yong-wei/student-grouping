import type { Student, LearningStyle } from '../types';

/**
 * 计算学习风格向量（4维）
 */
export function getLearningStyleVector(learningStyle: LearningStyle): number[] {
  return [
    learningStyle.activeReflective / 11, // 归一化到 [-1, 1]
    learningStyle.sensingIntuitive / 11,
    learningStyle.visualVerbal / 11,
    learningStyle.sequentialGlobal / 11,
  ];
}

/**
 * 计算两个学习风格向量之间的欧氏距离
 */
export function calculateLearningStyleDistance(
  style1: LearningStyle,
  style2: LearningStyle
): number {
  const vec1 = getLearningStyleVector(style1);
  const vec2 = getLearningStyleVector(style2);

  const sumSquares = vec1.reduce((sum, val, i) => sum + Math.pow(val - vec2[i], 2), 0);
  return Math.sqrt(sumSquares);
}

/**
 * 计算学习风格的平均向量
 */
export function calculateAverageLearningStyle(students: Student[]): number[] {
  if (students.length === 0) return [0, 0, 0, 0];

  const sum = students.reduce(
    (acc, student) => {
      const vec = getLearningStyleVector(student.learningStyles);
      return acc.map((val, i) => val + vec[i]);
    },
    [0, 0, 0, 0]
  );

  return sum.map((val) => val / students.length);
}

/**
 * 计算组内学习风格异质性（组内成员间平均距离）
 */
export function calculateIntraGroupDiversity(students: Student[]): number {
  if (students.length <= 1) return 0;

  let totalDistance = 0;
  let count = 0;

  for (let i = 0; i < students.length; i++) {
    for (let j = i + 1; j < students.length; j++) {
      totalDistance += calculateLearningStyleDistance(
        students[i].learningStyles,
        students[j].learningStyles
      );
      count++;
    }
  }

  return count > 0 ? totalDistance / count : 0;
}

/**
 * 计算向量之间的欧氏距离
 */
export function calculateVectorDistance(vec1: number[], vec2: number[]): number {
  const sumSquares = vec1.reduce((sum, val, i) => sum + Math.pow(val - vec2[i], 2), 0);
  return Math.sqrt(sumSquares);
}

/**
 * 计算方差
 */
export function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * 计算标准差
 */
export function calculateStdDev(values: number[]): number {
  return Math.sqrt(calculateVariance(values));
}

/**
 * 从 ILS 问卷原始数据计算学习风格
 * @param answers 44道题的答案数组，1表示选项a，2表示选项b
 */
export function calculateLearningStyleFromILS(answers: (number | null)[]): LearningStyle {
  if (answers.length !== 44) {
    throw new Error('ILS问卷应包含44道题');
  }

  const processedAnswers = answers.map((ans) => {
    if (ans === 1) return 1;
    if (ans === 2) return -1;
    return 0;
  });

  const learningStyle: LearningStyle = {
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
  };

  for (let dimensionIndex = 0; dimensionIndex < 4; dimensionIndex += 1) {
    const indices = Array.from({ length: 11 }, (_, i) => i * 4 + dimensionIndex);
    const dimensionAnswers = indices.map((idx) => processedAnswers[idx]);
    const sum = dimensionAnswers.reduce<number>((total, value) => total + value, 0);
    const positiveCount = dimensionAnswers.filter((value) => value === 1).length;
    const negativeCount = dimensionAnswers.filter((value) => value === -1).length;

    switch (dimensionIndex) {
      case 0:
        learningStyle.activeReflective = -sum;
        learningStyle.active = positiveCount;
        learningStyle.reflective = negativeCount;
        break;
      case 1:
        learningStyle.sensingIntuitive = -sum;
        learningStyle.sensing = positiveCount;
        learningStyle.intuitive = negativeCount;
        break;
      case 2:
        learningStyle.visualVerbal = -sum;
        learningStyle.visual = positiveCount;
        learningStyle.verbal = negativeCount;
        break;
      case 3:
        learningStyle.sequentialGlobal = -sum;
        learningStyle.sequential = positiveCount;
        learningStyle.global = negativeCount;
        break;
      default:
        break;
    }
  }

  return learningStyle;
}
