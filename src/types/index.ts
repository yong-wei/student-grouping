// 学生信息接口
export interface Student {
  id: string;
  serialNumber: number; // 序号
  studentNumber: string; // 学号
  name: string; // 姓名
  gender: number; // 性别 (0: 女, 1: 男)
  isLeader: boolean; // 是否组长候选人
  ranking: number; // 排名
  major: string; // 专业
  totalScore: number; // 总分
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
  mode: 'learning-style' | 'balanced-random';
  weights: GroupingWeights;
}

// 权重配置接口
export interface GroupingWeights {
  gender: number; // 性别均衡度
  major: number; // 学科均衡度
  activeScore: number; // 学习主动性均衡度
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
  averageScore: number; // 平均总分
  averageRanking: number; // 平均排名
  majorDiversity: number; // 专业多样性
  averageLearningStyle: [number, number, number, number]; // 平均学习风格向量
  learningStyleDiversity: number; // 学习风格多样性
}

// 分组统计信息
export interface GroupingStatistics {
  totalStudents: number;
  totalGroups: number;
  averageGroupSize: number;
  genderVariance: number;
  majorVariance: number;
  scoreVariance: number;
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

export interface FaceFeatureRange {
  min: number;
  max: number;
}

export type FaceFeatureRanges = Record<FaceFeature, FaceFeatureRange>;
