import type { GroupStatistics, VisibleGroupStatistic } from '../types';

type DisplayMode = 'card' | 'report';

interface GroupStatisticDefinition {
  key: VisibleGroupStatistic;
  label: string;
  format: (statistics: GroupStatistics, memberCount: number, mode: DisplayMode) => string;
}

export const GROUP_STATISTIC_DEFINITIONS: GroupStatisticDefinition[] = [
  {
    key: 'genderBalance',
    label: '男女比例',
    format: (statistics, memberCount) => {
      const maleCount = Math.round(statistics.genderBalance * memberCount);
      return `${maleCount} : ${memberCount - maleCount}`;
    },
  },
  {
    key: 'leaderCount',
    label: '组长候选',
    format: (statistics) => `${statistics.leaderCount}`,
  },
  {
    key: 'averageInitiativeScore',
    label: '平均主动性',
    format: (statistics, _memberCount, mode) =>
      statistics.averageInitiativeScore.toFixed(mode === 'card' ? 1 : 2),
  },
  {
    key: 'averageExtroversionScore',
    label: '平均外向度',
    format: (statistics, _memberCount, mode) =>
      statistics.averageExtroversionScore.toFixed(mode === 'card' ? 1 : 2),
  },
  {
    key: 'learningStyleDiversity',
    label: '学习风格多样性',
    format: (statistics) => statistics.learningStyleDiversity.toFixed(2),
  },
  {
    key: 'averageRankingPercent',
    label: '平均成绩排名百分比',
    format: (statistics) =>
      statistics.averageRankingPercent === null ? '无数据' : statistics.averageRankingPercent.toFixed(2),
  },
  {
    key: 'averageLearningStyleIntensity',
    label: '平均学习风格强度',
    format: (statistics) => statistics.averageLearningStyleIntensity.toFixed(2),
  },
  {
    key: 'majorDiversity',
    label: '专业数',
    format: (statistics) => `${statistics.majorDiversity}`,
  },
];

export const GROUP_STATISTIC_OPTIONS = GROUP_STATISTIC_DEFINITIONS.map(({ key, label }) => ({
  label,
  value: key,
}));

export const DEFAULT_VISIBLE_GROUP_STATISTICS = GROUP_STATISTIC_DEFINITIONS.map(
  ({ key }) => key
);

export function normalizeVisibleGroupStatistics(
  values: readonly VisibleGroupStatistic[]
): VisibleGroupStatistic[] {
  const selected = new Set(values);
  return DEFAULT_VISIBLE_GROUP_STATISTICS.filter((key) => selected.has(key));
}

export function getVisibleGroupStatisticItems(
  statistics: GroupStatistics,
  memberCount: number,
  visibleStatistics: readonly VisibleGroupStatistic[],
  mode: DisplayMode
) {
  const visibleSet = new Set(visibleStatistics);
  return GROUP_STATISTIC_DEFINITIONS.filter(({ key }) => visibleSet.has(key)).map(
    ({ key, label, format }) => ({
      key,
      label,
      value: format(statistics, memberCount, mode),
    })
  );
}
