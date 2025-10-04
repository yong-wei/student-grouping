import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { Student } from '../types';
import { calculateAverageLearningStyle } from '../utils/learningStyleUtils';

interface LearningStyleRadarProps {
  students: Student[];
  title?: string;
  height?: number;
  showTitle?: boolean;
}

const LearningStyleRadar: React.FC<LearningStyleRadarProps> = ({
  students,
  title = '学习风格分析',
  height = 400,
  showTitle = true,
}) => {
  const avgStyle = calculateAverageLearningStyle(students);

  // 将 [-1, 1] 范围转换为 [0, 100] 用于显示
  const data = [
    ((avgStyle[0] + 1) / 2) * 100, // 积极/沉思
    ((avgStyle[1] + 1) / 2) * 100, // 感官/直觉
    ((avgStyle[2] + 1) / 2) * 100, // 视觉/言语
    ((avgStyle[3] + 1) / 2) * 100, // 顺序/全局
  ];

  const option: EChartsOption = {
    title: {
      text: title,
      left: 'center',
      show: showTitle && Boolean(title),
    },
    tooltip: {
      trigger: 'item',
    },
    radar: {
      indicator: [
        { name: '积极 ← → 沉思', max: 100 },
        { name: '感官 ← → 直觉', max: 100 },
        { name: '视觉 ← → 言语', max: 100 },
        { name: '顺序 ← → 全局', max: 100 },
      ],
      shape: 'polygon',
      radius: '60%',
    },
    series: [
      {
        name: '学习风格',
        type: 'radar',
        data: [
          {
            value: data,
            name: '平均学习风格',
            areaStyle: {
              color: 'rgba(24, 144, 255, 0.3)',
            },
            lineStyle: {
              color: '#1890ff',
              width: 2,
            },
            itemStyle: {
              color: '#1890ff',
            },
          },
        ],
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: `${height}px` }} />;
};

export default LearningStyleRadar;
