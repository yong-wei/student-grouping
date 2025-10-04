import type { EChartsOption } from 'echarts';
import type { Student } from '../types';
import type { LearningDimensionDescriptor } from '../constants/learningDimensions';

interface DistributionDataPoint {
  name: string;
  studentNumber: string;
  gender: number;
  value: number;
  serialNumber: number;
}

export interface DistributionChartData {
  descriptor: LearningDimensionDescriptor;
  categories: string[];
  data: DistributionDataPoint[];
}

const LEFT_COLOR = '#1d39c4';
const RIGHT_COLOR = '#d46b08';

export const prepareDistributionChartData = (
  students: Student[],
  descriptor: LearningDimensionDescriptor
): DistributionChartData => {
  const sorted = [...students].sort((a, b) => a.serialNumber - b.serialNumber);

  return {
    descriptor,
    categories: sorted.map((student) => `序号 ${student.serialNumber}`),
    data: sorted.map((student) => ({
      name: student.name,
      studentNumber: student.studentNumber,
      gender: student.gender,
      value: student.learningStyles[descriptor.diffKey],
      serialNumber: student.serialNumber,
    })),
  };
};

export const calculateDistributionChartHeight = (studentCount: number): number => {
  const baseHeight = 132;
  const perStudent = 4.2;
  const capped = Math.min(320, baseHeight + studentCount * perStudent);
  return Math.max(120, Math.round(capped));
};

export const getDistributionChartPixelSize = (studentCount: number, width = 480) => {
  const baseHeight = 160;
  const perStudent = 5.5;
  const maxHeight = 360;
  const minHeight = 180;
  const height = Math.min(maxHeight, Math.max(minHeight, baseHeight + studentCount * perStudent));
  return { width, height };
};

const formatTooltip = (descriptor: LearningDimensionDescriptor, point: DistributionDataPoint) => {
  const orientation = point.value >= 0 ? descriptor.rightLabel : descriptor.leftLabel;
  const intensity = Math.abs(point.value);
  return `序号：${point.serialNumber}<br/>姓名：${point.name}<br/>学号：${point.studentNumber}<br/>倾向：${orientation}（${intensity.toFixed(
    1
  )}）`;
};

interface ChartOptionExtras {
  showTitle?: boolean;
  edgeSerialsOnly?: boolean;
  barWidth?: number;
  categoryGap?: string;
}

export const createDistributionChartOption = (
  chartData: DistributionChartData,
  options?: ChartOptionExtras
): EChartsOption => {
  const { descriptor, categories, data } = chartData;
  const showTitle = options?.showTitle ?? true;
  const gridTop = showTitle ? 60 : 34;
  const barWidth = options?.barWidth ?? 2;
  const barCategoryGap = options?.categoryGap ?? '0%';
  const showEdgeSerialsOnly = options?.edgeSerialsOnly ?? false;

  return {
    animation: false,
    backgroundColor: '#ffffff',
    title: showTitle
      ? {
          text: `${descriptor.category}（${descriptor.leftLabel} ←→ ${descriptor.rightLabel}）`,
          left: 'center',
          top: 10,
          textStyle: {
            fontSize: 16,
            fontWeight: 600,
          },
        }
      : undefined,
    grid: {
      top: gridTop,
      left: 102,
      right: 36,
      bottom: 22,
    },
    graphic: [
      {
        type: 'group',
        left: 32,
        top: 'middle',
        children: [
          {
            type: 'text',
            style: {
              text: '序号减小\n▲\n学生序号\n▼\n序号增大',
              fill: '#595959',
              fontSize: 11,
              fontWeight: 500,
              lineHeight: 16,
              align: 'center',
            },
          },
        ],
      },
    ],
    tooltip: {
      trigger: 'item',
      formatter: (params: { dataIndex: number }) => {
        const point = data[params.dataIndex];
        if (!point) {
          return '暂无数据';
        }
        return formatTooltip(descriptor, point);
      },
    },
    xAxis: {
      type: 'value',
      min: -11,
      max: 11,
      splitNumber: 11,
      axisTick: { show: false },
      axisLabel: {
        formatter: (value: number) => value.toFixed(0),
        color: '#595959',
      },
      axisLine: {
        lineStyle: {
          color: '#8c8c8c',
        },
      },
      splitLine: {
        lineStyle: {
          type: 'dashed',
          color: '#d9d9d9',
        },
      },
    },
    yAxis: {
      type: 'category',
      data: categories,
      inverse: true,
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: {
        color: '#595959',
        fontSize: 9,
        margin: 4,
        formatter: (_value: string, index: number) => {
          if (!showEdgeSerialsOnly) {
            return categories[index];
          }
          if (index === 0) {
            return String(data[0]?.serialNumber ?? '');
          }
          if (index === categories.length - 1) {
            return String(data[data.length - 1]?.serialNumber ?? '');
          }
          return '';
        },
      },
    },
    series: [
      {
        type: 'bar',
        barWidth,
        barCategoryGap,
        data: data.map((point) => ({
          value: Number(point.value.toFixed(2)),
          itemStyle: {
            color: point.value >= 0 ? RIGHT_COLOR : LEFT_COLOR,
            borderRadius: [2, 2, 2, 2],
          },
        })),
        markLine: {
          symbol: 'none',
          data: [{ xAxis: 0 }],
          lineStyle: {
            color: '#8c8c8c',
            width: 1,
          },
        },
        label: { show: false },
      },
    ],
  } as EChartsOption;
};
