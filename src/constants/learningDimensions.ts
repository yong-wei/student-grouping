import type { Student } from '../types';

export type LearningStyleDiffKey =
  | 'activeReflective'
  | 'sensingIntuitive'
  | 'visualVerbal'
  | 'sequentialGlobal';

export type LearningStyleValueKey = Exclude<keyof Student['learningStyles'], LearningStyleDiffKey>;

export interface LearningDimensionDescriptor {
  diffKey: LearningStyleDiffKey;
  category: string;
  leftLabel: string;
  rightLabel: string;
  leftValueKey: LearningStyleValueKey;
  rightValueKey: LearningStyleValueKey;
}

export const LEARNING_DIMENSIONS: LearningDimensionDescriptor[] = [
  {
    diffKey: 'activeReflective',
    category: '信息加工',
    leftLabel: '积极',
    rightLabel: '沉思',
    leftValueKey: 'active',
    rightValueKey: 'reflective',
  },
  {
    diffKey: 'sensingIntuitive',
    category: '信息感知',
    leftLabel: '感官',
    rightLabel: '直觉',
    leftValueKey: 'sensing',
    rightValueKey: 'intuitive',
  },
  {
    diffKey: 'visualVerbal',
    category: '信息输入',
    leftLabel: '视觉',
    rightLabel: '言语',
    leftValueKey: 'visual',
    rightValueKey: 'verbal',
  },
  {
    diffKey: 'sequentialGlobal',
    category: '内容理解',
    leftLabel: '顺序',
    rightLabel: '全局',
    leftValueKey: 'sequential',
    rightValueKey: 'global',
  },
];
