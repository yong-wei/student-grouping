import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { Student } from '../types';
import { LEARNING_DIMENSIONS } from '../constants/learningDimensions';
import {
  calculateDistributionChartHeight,
  createDistributionChartOption,
  prepareDistributionChartData,
} from '../utils/learningStyleChartConfig';

interface LearningStyleDistributionProps {
  students: Student[];
}

const LearningStyleDistribution: React.FC<LearningStyleDistributionProps> = ({ students }) => {
  const height = calculateDistributionChartHeight(students.length);

  return (
    <div
      style={{
        display: 'grid',
        gap: 16,
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
      }}
    >
      {LEARNING_DIMENSIONS.map((descriptor) => {
        const chartData = prepareDistributionChartData(students, descriptor);
        const option = createDistributionChartOption(chartData, {
          showTitle: true,
          edgeSerialsOnly: true,
          barWidth: 1.6,
          categoryGap: '0%',
        });
        return (
          <ReactECharts
            key={descriptor.diffKey}
            option={option}
            style={{ height: `${height}px` }}
            opts={{ renderer: 'canvas' }}
            notMerge
            lazyUpdate
          />
        );
      })}
    </div>
  );
};

export default LearningStyleDistribution;
