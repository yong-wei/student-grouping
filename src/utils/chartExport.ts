import * as echarts from 'echarts';
import type { Student } from '../types';
import { getLearningStyleVector } from './learningStyleUtils';
import type { LearningDimensionDescriptor } from '../constants/learningDimensions';
import {
  createDistributionChartOption,
  getDistributionChartPixelSize,
  prepareDistributionChartData,
} from './learningStyleChartConfig';

const RADAR_INDICATORS = [
  { name: '积极 ← → 沉思', max: 100 },
  { name: '感官 ← → 直觉', max: 100 },
  { name: '视觉 ← → 言语', max: 100 },
  { name: '顺序 ← → 全局', max: 100 },
];

interface RadarOptions {
  color?: string;
  title?: string;
  width?: number;
  height?: number;
  showAxisName?: boolean;
}

const toPercentageVector = (values: number[]) => values.map((value) => ((value + 1) / 2) * 100);

const suppressEchartsWarnings = <T>(runner: () => T): T => {
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('[ECharts] The ticks may be not readable')
    ) {
      return;
    }
    originalWarn(...args);
  };
  try {
    return runner();
  } finally {
    console.warn = originalWarn;
  }
};

const createContainer = (width: number, height: number) => {
  const container = document.createElement('div');
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '-10000px';
  document.body.appendChild(container);
  return container;
};

const createChart = (container: HTMLElement, width: number, height: number) =>
  echarts.init(container, undefined, {
    renderer: 'canvas',
    width,
    height,
  });

export async function renderLearningStyleRadarToDataURL(
  students: Student[],
  title: string,
  width = 600,
  height = 420,
  options?: RadarOptions
): Promise<string> {
  const container = document.createElement('div');
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '-10000px';
  document.body.appendChild(container);

  const chart = echarts.init(container, undefined, {
    renderer: 'canvas',
    width,
    height,
  });

  try {
    const dataVector = students.length
      ? students
          .map((student) => getLearningStyleVector(student.learningStyles))
          .reduce((acc, vec) => acc.map((value, index) => value + vec[index]), [0, 0, 0, 0])
          .map((value) => value / students.length)
      : [0, 0, 0, 0];

    return suppressEchartsWarnings(() => {
      const showAxisName = options?.showAxisName ?? true;
      const hasTitle = Boolean(options?.title ?? title);
      const centerY = hasTitle ? (showAxisName ? '52%' : '50%') : '50%';
      const radius = showAxisName ? '68%' : '74%';
      const axisFontSize = showAxisName ? 12 : 11;

      chart.setOption({
        animation: false,
        backgroundColor: '#ffffff',
        title: {
          text: options?.title ?? title,
          left: 'center',
          top: hasTitle ? 8 : 0,
          textStyle: {
            fontSize: 20,
          },
          show: Boolean(options?.title ?? title),
        },
        radar: {
          indicator: RADAR_INDICATORS,
          shape: 'polygon',
          radius,
          center: ['50%', centerY],
          axisNameGap: showAxisName ? 8 : 4,
          splitNumber: 4,
          axisName: showAxisName
            ? {
                color: '#444',
                fontSize: axisFontSize,
              }
            : {
                show: false,
              },
        },
        series: [
          {
            type: 'radar',
            data: [
              {
                value: toPercentageVector(dataVector),
                areaStyle: {
                  color: options?.color ? `${options.color}40` : 'rgba(24, 144, 255, 0.25)',
                },
                lineStyle: {
                  color: options?.color ?? '#1890ff',
                  width: 2,
                },
                itemStyle: {
                  color: options?.color ?? '#1890ff',
                },
              },
            ],
          },
        ],
      });

      return chart.getDataURL({
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        excludeComponents: ['toolbox'],
      });
    });
  } finally {
    chart.dispose();
    container.remove();
  }
}

export async function renderIndividualLearningStyleRadar(
  learningVector: number[],
  title: string,
  width = 480,
  height = 340,
  options?: RadarOptions
): Promise<string> {
  const resolvedWidth = options?.width ?? width;
  const resolvedHeight = options?.height ?? height;
  const container = createContainer(resolvedWidth, resolvedHeight);
  const chart = createChart(container, resolvedWidth, resolvedHeight);

  try {
    return suppressEchartsWarnings(() => {
      const showAxisName = options?.showAxisName ?? true;
      const hasTitle = Boolean(options?.title ?? title);
      const centerY = hasTitle ? (showAxisName ? '54%' : '52%') : '50%';
      const radius = showAxisName ? '70%' : '74%';
      const axisFontSize = showAxisName ? 12 : 11;

      chart.setOption({
        animation: false,
        backgroundColor: '#ffffff',
        title: {
          text: options?.title ?? title,
          left: 'center',
          top: hasTitle ? 6 : 0,
          textStyle: {
            fontSize: 18,
          },
          show: Boolean(options?.title ?? title),
        },
        radar: {
          indicator: RADAR_INDICATORS,
          shape: 'polygon',
          radius,
          center: ['50%', centerY],
          axisNameGap: showAxisName ? 8 : 4,
          splitNumber: 4,
          axisName: showAxisName
            ? {
                color: '#444',
                fontSize: axisFontSize,
              }
            : {
                show: false,
              },
        },
        series: [
          {
            type: 'radar',
            data: [
              {
                value: toPercentageVector(learningVector),
                areaStyle: {
                  color: options?.color ? `${options.color}4d` : 'rgba(114, 46, 209, 0.3)',
                },
                lineStyle: {
                  color: options?.color ?? '#722ed1',
                  width: 2,
                },
                itemStyle: {
                  color: options?.color ?? '#722ed1',
                },
              },
            ],
          },
        ],
      });

      return chart.getDataURL({
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        excludeComponents: ['toolbox'],
      });
    });
  } finally {
    chart.dispose();
    container.remove();
  }
}

export async function renderStudentRadar(
  student: Student,
  options?: RadarOptions
): Promise<string> {
  const vector = getLearningStyleVector(student.learningStyles);
  return renderIndividualLearningStyleRadar(
    vector,
    options?.title ?? '',
    options?.width ?? 260,
    options?.height ?? 260,
    options
  );
}

export interface DistributionChartRenderResult {
  dataUrl: string;
  width: number;
  height: number;
}

interface DistributionRenderOptions {
  showTitle?: boolean;
  edgeSerialsOnly?: boolean;
  barWidth?: number;
  categoryGap?: string;
  width?: number;
}

export async function renderLearningStyleDistributionChart(
  students: Student[],
  descriptor: LearningDimensionDescriptor,
  options?: DistributionRenderOptions
): Promise<DistributionChartRenderResult> {
  const chartWidth = options?.width ?? 460;
  const { width, height } = getDistributionChartPixelSize(students.length, chartWidth);
  const container = createContainer(width, height);
  const chart = createChart(container, width, height);

  try {
    const chartData = prepareDistributionChartData(students, descriptor);
    const option = createDistributionChartOption(chartData, {
      showTitle: options?.showTitle,
      edgeSerialsOnly: options?.edgeSerialsOnly,
      barWidth: options?.barWidth,
      categoryGap: options?.categoryGap,
    });
    chart.setOption(option);

    const dataUrl = chart.getDataURL({
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      excludeComponents: ['toolbox'],
    });

    return { dataUrl, width, height };
  } finally {
    chart.dispose();
    container.remove();
  }
}
