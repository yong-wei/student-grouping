import { create } from 'zustand';
import type {
  FaceFeature,
  FaceFeatureRanges,
  GroupingTask,
  GroupingTaskDraft,
  UploadedData,
} from '../types';
import {
  DEFAULT_FACE_EXAGGERATIONS,
  DEFAULT_FACE_RANGES,
  exaggerationToRange,
} from '../utils/faceConfig';

interface AppState {
  // 上传的数据
  uploadedData: UploadedData | null;
  setUploadedData: (data: UploadedData) => void;

  // 分组任务
  groupingTasks: GroupingTask[];
  addGroupingTask: (task: GroupingTask) => void;
  replaceGroupingTasks: (tasks: GroupingTask[]) => void;
  updateGroupingTask: (id: string, task: Partial<GroupingTask>) => void;
  removeGroupingTask: (id: string) => void;

  // 当前步骤
  currentStep: number;
  setCurrentStep: (step: number) => void;

  // 已分组学生ID集合
  assignedStudentIds: Set<string>;
  addAssignedStudents: (ids: string[]) => void;
  removeAssignedStudents: (ids: string[]) => void;

  // 分组配置草稿
  taskDrafts: GroupingTaskDraft[];
  setTaskDrafts: (drafts: GroupingTaskDraft[]) => void;

  // 学习风格脸图设置
  faceSettings: {
    enabled: boolean;
    features: Record<FaceFeature, boolean>;
    ranges: FaceFeatureRanges;
    exaggerations: Record<FaceFeature, number>;
  };
  setFaceEnabled: (enabled: boolean) => void;
  setFaceFeatures: (features: Record<FaceFeature, boolean>) => void;
  setFaceExaggeration: (feature: FaceFeature, value: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  uploadedData: null,
  setUploadedData: (data) => set({ uploadedData: data }),

  groupingTasks: [],
  addGroupingTask: (task) => set((state) => ({ groupingTasks: [...state.groupingTasks, task] })),
  replaceGroupingTasks: (tasks) => set({ groupingTasks: tasks }),
  updateGroupingTask: (id, updates) =>
    set((state) => ({
      groupingTasks: state.groupingTasks.map((task) =>
        task.id === id ? { ...task, ...updates } : task
      ),
    })),
  removeGroupingTask: (id) =>
    set((state) => ({
      groupingTasks: state.groupingTasks.filter((task) => task.id !== id),
    })),

  currentStep: 0,
  setCurrentStep: (step) => set({ currentStep: step }),

  assignedStudentIds: new Set(),
  addAssignedStudents: (ids) =>
    set((state) => ({
      assignedStudentIds: new Set([...state.assignedStudentIds, ...ids]),
    })),
  removeAssignedStudents: (ids) =>
    set((state) => {
      const newSet = new Set(state.assignedStudentIds);
      ids.forEach((id) => newSet.delete(id));
      return { assignedStudentIds: newSet };
    }),

  taskDrafts: [],
  setTaskDrafts: (drafts) => set({ taskDrafts: drafts }),

  faceSettings: {
    enabled: false,
    features: {
      faceSize: true,
      mouth: true,
      nose: true,
      eyes: true,
      eyeSpacing: true,
      eyebrows: true,
    },
    ranges: DEFAULT_FACE_RANGES,
    exaggerations: DEFAULT_FACE_EXAGGERATIONS,
  },
  setFaceEnabled: (enabled) =>
    set((state) => {
      if (state.faceSettings.enabled === enabled) {
        return undefined;
      }
      return {
        faceSettings: {
          ...state.faceSettings,
          enabled,
        },
      };
    }),
  setFaceFeatures: (features) =>
    set((state) => {
      const current = state.faceSettings.features;
      const changed = (Object.keys(features) as FaceFeature[]).some(
        (key) => current[key] !== features[key]
      );
      if (!changed) {
        return undefined;
      }
      return {
        faceSettings: {
          ...state.faceSettings,
          features,
        },
      };
    }),
  setFaceExaggeration: (feature, value) =>
    set((state) => {
      const clamped = Math.min(Math.max(value, 0), 1);
      const current = state.faceSettings.exaggerations[feature];
      if (Math.abs(current - clamped) < 0.001) {
        return undefined;
      }
      const nextRange = exaggerationToRange(clamped);
      return {
        faceSettings: {
          ...state.faceSettings,
          ranges: {
            ...state.faceSettings.ranges,
            [feature]: nextRange,
          },
          exaggerations: {
            ...state.faceSettings.exaggerations,
            [feature]: clamped,
          },
        },
      };
    }),
}));
