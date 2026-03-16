import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ResultsPage from '../pages/ResultsPage';
import { useAppStore } from '../store';
import type { GroupingTask, Student } from '../types';

const mockGenerateClassAnalysisReport = vi.fn().mockResolvedValue(undefined);

vi.mock('../utils/pdfExport', () => ({
  generateClassAnalysisReport: (...args: unknown[]) => mockGenerateClassAnalysisReport(...args),
}));

vi.mock('../utils/excelExport', () => ({
  exportGroupingToExcel: vi.fn(),
}));

vi.mock('../utils/zipExport', () => ({
  generateBatchReports: vi.fn(),
}));

vi.mock('../components/LearningStyleDistribution', () => ({
  default: () => <div>learning-style-distribution</div>,
}));

vi.mock('../components/LearningStyleRadar', () => ({
  default: () => <div>learning-style-radar</div>,
}));

vi.mock('../components/FaceControls', () => ({
  default: () => <div>face-controls</div>,
}));

const initialState = useAppStore.getState();

function createStudent(overrides: Partial<Student>): Student {
  return {
    id: `student-${overrides.serialNumber ?? 1}`,
    serialNumber: overrides.serialNumber ?? 1,
    studentNumber: overrides.studentNumber ?? '20260001',
    name: overrides.name ?? '学生',
    gender: overrides.gender ?? 1,
    isLeader: overrides.isLeader ?? false,
    rankingPercent: overrides.rankingPercent ?? 25,
    major: overrides.major ?? '软件工程',
    learningStyleIntensity: overrides.learningStyleIntensity ?? 6,
    initiativeScore: overrides.initiativeScore ?? 82,
    extroversionScore: overrides.extroversionScore ?? 70,
    learningStyles: overrides.learningStyles ?? {
      activeReflective: 2,
      sensingIntuitive: -1,
      visualVerbal: 3,
      sequentialGlobal: -2,
      active: 7,
      reflective: 5,
      sensing: 6,
      intuitive: 5,
      visual: 8,
      verbal: 3,
      sequential: 4,
      global: 7,
    },
    photo: overrides.photo,
    groupNumber: overrides.groupNumber,
    ilsCompleted: overrides.ilsCompleted ?? true,
    ilsAnswers: overrides.ilsAnswers ?? Array(44).fill(1),
  };
}

const members = [
  createStudent({
    serialNumber: 1,
    studentNumber: '20260001',
    name: '张三',
    gender: 1,
    isLeader: true,
    rankingPercent: 18,
    initiativeScore: 88,
    extroversionScore: 74,
  }),
  createStudent({
    serialNumber: 2,
    studentNumber: '20260002',
    name: '李四',
    gender: 0,
    rankingPercent: 32,
    initiativeScore: 76,
    extroversionScore: 62,
  }),
];

const groupingTask: GroupingTask = {
  id: 'task-1',
  name: '任务一',
  studentIds: members.map((member) => member.id),
  groupSize: 2,
  mode: 'learning-style',
  weights: {
    gender: 1,
    major: 1,
    initiative: 1,
    ranking: 1,
    extroversion: 1,
    leader: 1,
    intraStyleDiversity: 1,
    interStyleSimilarity: 1,
  },
  result: {
    qualityScore: 91.2,
    statistics: {
      totalStudents: 2,
      totalGroups: 1,
      averageGroupSize: 2,
      genderVariance: 0.1,
      majorVariance: 0.3,
      initiativeVariance: 0.2,
      rankingVariance: 0.4,
      extroversionVariance: 0.25,
      leaderDistribution: 1,
    },
    groups: [
      {
        id: 'group-1',
        groupNumber: 1,
        members,
        statistics: {
          genderBalance: 0.5,
          leaderCount: 1,
          averageLearningStyleIntensity: 6.5,
          averageInitiativeScore: 82,
          averageRankingPercent: 25,
          averageExtroversionScore: 68,
          rankingStudentCount: 2,
          majorDiversity: 1,
          averageLearningStyle: [2, -1, 3, -2],
          learningStyleDiversity: 1.75,
        },
      },
    ],
  },
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ResultsPage />
    </MemoryRouter>
  );
}

describe('ResultsPage', () => {
  beforeEach(() => {
    mockGenerateClassAnalysisReport.mockClear();
    useAppStore.setState({
      ...initialState,
      groupingTasks: [groupingTask],
      currentStep: 2,
      uploadedData: null,
      assignedStudentIds: new Set(),
      taskDrafts: [],
      faceSettings: {
        ...initialState.faceSettings,
        enabled: false,
      },
    });
  });

  it('默认全选统计项，并在取消勾选后隐藏对应分组统计', async () => {
    const user = userEvent.setup();
    renderPage();

    const extroversionCheckbox = screen.getByRole('checkbox', { name: '平均外向度' });
    expect(extroversionCheckbox).toBeChecked();

    const groupCard = screen.getByText('第 1 组').closest('.ant-card');
    expect(groupCard).not.toBeNull();
    expect(within(groupCard as HTMLElement).getByText('平均外向度')).toBeInTheDocument();
    expect(within(groupCard as HTMLElement).getByText('平均主动性')).toBeInTheDocument();

    await user.click(extroversionCheckbox);

    expect(extroversionCheckbox).not.toBeChecked();
    expect(within(groupCard as HTMLElement).queryByText('平均外向度')).not.toBeInTheDocument();
    expect(within(groupCard as HTMLElement).getByText('平均主动性')).toBeInTheDocument();
  });

  it('导出 PDF 时使用当前勾选的统计项', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('checkbox', { name: '平均外向度' }));
    await user.click(screen.getByRole('button', { name: /导出班级分析报告 \(PDF\)/ }));

    await waitFor(() => {
      expect(mockGenerateClassAnalysisReport).toHaveBeenCalledTimes(1);
    });

    const [, options] = mockGenerateClassAnalysisReport.mock.calls[0];
    expect(options).toEqual(
      expect.objectContaining({
        visibleGroupStatistics: expect.arrayContaining(['averageInitiativeScore']),
      })
    );
    expect(options.visibleGroupStatistics).not.toContain('averageExtroversionScore');
  });
});
