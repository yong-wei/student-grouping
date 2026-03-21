// 学生信息接口
export interface Student {
  id: string;
  serialNumber: number; // 序号
  studentNumber: string; // 学号
  name: string; // 姓名
  gender: number; // 性别 (0: 女, 1: 男)
  isLeader: boolean; // 是否组长候选人
  rankingPercent?: number; // 成绩排名百分比，数值越小越好
  major: string; // 专业
  learningStyleIntensity: number; // 学习风格强度
  initiativeScore: number; // 学习主动性总分
  extroversionScore: number; // 外向程度得分
  learningStyles: LearningStyle; // 学习风格
  photo?: string; // 照片路径
  groupNumber?: number; // 分组序号
  ilsCompleted: boolean; // 是否完成 ILS 量表
  ilsAnswers?: (number | null)[]; // ILS 原始答案（1/2）
}

// 学习风格接口
export interface LearningStyle {
  activeReflective: number; // 积极/沉思 (-11 to 11)
  sensingIntuitive: number; // 感官/直觉 (-11 to 11)
  visualVerbal: number; // 视觉/言语 (-11 to 11)
  sequentialGlobal: number; // 顺序/全局 (-11 to 11)
  active: number; // 积极得分
  reflective: number; // 沉思得分
  sensing: number; // 感官得分
  intuitive: number; // 直觉得分
  visual: number; // 视觉得分
  verbal: number; // 言语得分
  sequential: number; // 顺序得分
  global: number; // 全局得分
}

// 分组任务接口
export interface GroupingTask {
  id: string;
  name: string;
  studentIds: string[]; // 参与分组的学生ID
  groupSize: number; // 小组人数
  fillFixedGroups: boolean; // 是否补齐固定分组人数
  mode: 'learning-style' | 'balanced-random'; // 分组模式
  weights: GroupingWeights; // 权重配置
  result?: GroupingResult; // 分组结果
}

// 分组任务草稿（配置阶段使用）
export interface GroupingTaskDraft {
  id: string;
  name: string;
  studentIds: string[];
  groupSize: number;
  fillFixedGroups: boolean;
  mode: 'learning-style' | 'balanced-random';
  weights: GroupingWeights;
}

// 权重配置接口
export interface GroupingWeights {
  gender: number; // 性别均衡度
  major: number; // 学科均衡度
  initiative: number; // 学习主动性均衡度
  ranking: number; // 成绩均衡度
  extroversion: number; // 外向程度均衡度
  leader: number; // 组长候选人分布
  intraStyleDiversity: number; // 组内学习风格异质性
  interStyleSimilarity: number; // 组间风格构成同质性
}

// 分组结果接口
export interface GroupingResult {
  groups: Group[];
  qualityScore: number; // 总质量分
  statistics: GroupingStatistics;
}

// 小组接口
export interface Group {
  id: string;
  groupNumber: number;
  members: Student[];
  statistics: GroupStatistics;
}

// 小组统计信息
export interface GroupStatistics {
  genderBalance: number; // 男女比例
  leaderCount: number; // 组长候选人数量
  averageLearningStyleIntensity: number; // 平均学习风格强度
  averageInitiativeScore: number; // 平均学习主动性总分
  averageRankingPercent: number | null; // 平均成绩排名百分比
  averageExtroversionScore: number; // 平均外向程度
  rankingStudentCount: number; // 有成绩排名的学生数量
  majorDiversity: number; // 专业多样性
  averageLearningStyle: [number, number, number, number]; // 平均学习风格向量
  learningStyleDiversity: number; // 学习风格多样性
}

export type VisibleGroupStatistic =
  | 'genderBalance'
  | 'leaderCount'
  | 'averageInitiativeScore'
  | 'averageExtroversionScore'
  | 'learningStyleDiversity'
  | 'averageRankingPercent'
  | 'averageLearningStyleIntensity'
  | 'majorDiversity';

// 分组统计信息
export interface GroupingStatistics {
  totalStudents: number;
  totalGroups: number;
  averageGroupSize: number;
  genderVariance: number;
  majorVariance: number;
  initiativeVariance: number;
  rankingVariance: number;
  extroversionVariance: number;
  leaderDistribution: number;
}

// 上传数据状态
export interface UploadedData {
  students: Student[];
  photos: Map<string, string>; // 学号/姓名 -> 照片路径
  hasCompleteName: boolean;
  untestedStudents: string[]; // 未测试学生名单
  sourceFileName?: string;
}

export type FaceFeature = 'faceSize' | 'mouth' | 'nose' | 'eyes' | 'eyeSpacing' | 'eyebrows';
export type FaceMetricKey =
  | 'none'
  | 'rankingPercent'
  | 'initiativeScore'
  | 'extroversionScore'
  | 'learningStyleIntensity'
  | 'activeReflective'
  | 'sensingIntuitive'
  | 'visualVerbal'
  | 'sequentialGlobal';

export interface FaceFeatureRange {
  min: number;
  max: number;
}

export type FaceFeatureRanges = Record<FaceFeature, FaceFeatureRange>;
export type FaceFeatureBindings = Record<FaceFeature, FaceMetricKey>;

export interface NumericRange {
  min: number;
  max: number;
}

export interface FaceMetricRanges {
  rankingPercent: NumericRange | null;
  initiativeScore: NumericRange | null;
  extroversionScore: NumericRange | null;
  learningStyleIntensity: NumericRange | null;
}
