import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import StudentFace from '../components/StudentFace';
import { DEFAULT_FACE_RANGES } from '../utils/faceConfig';
import type { FaceFeatureBindings, FaceMetricRanges, Student } from '../types';

const student: Student = {
  id: 'student-1',
  serialNumber: 1,
  studentNumber: '2023001',
  name: '张三',
  gender: 1,
  isLeader: false,
  rankingPercent: 0.2,
  major: '软件工程',
  learningStyleIntensity: 12,
  initiativeScore: 60,
  extroversionScore: 4,
  learningStyles: {
    activeReflective: 3,
    sensingIntuitive: -1,
    visualVerbal: 5,
    sequentialGlobal: -3,
    active: 7,
    reflective: 4,
    sensing: 5,
    intuitive: 6,
    visual: 8,
    verbal: 3,
    sequential: 4,
    global: 7,
  },
  ilsCompleted: true,
  ilsAnswers: Array.from({ length: 44 }, () => 1),
};

const hiddenBindings: FaceFeatureBindings = {
  faceSize: 'none',
  mouth: 'none',
  nose: 'none',
  eyes: 'none',
  eyeSpacing: 'none',
  eyebrows: 'none',
};

const metricRanges: FaceMetricRanges = {
  rankingPercent: { min: 0.2, max: 0.8 },
  initiativeScore: { min: 40, max: 80 },
  extroversionScore: { min: 1, max: 6 },
  learningStyleIntensity: { min: 4, max: 16 },
};

describe('StudentFace', () => {
  it('hides facial features when bindings are set to none', () => {
    const { container } = render(
      <StudentFace
        student={student}
        size={72}
        bindings={hiddenBindings}
        ranges={DEFAULT_FACE_RANGES}
        metricRanges={metricRanges}
      />
    );

    expect(container.querySelectorAll('circle')).toHaveLength(1);
    expect(container.querySelectorAll('ellipse')).toHaveLength(0);
    expect(container.querySelectorAll('line')).toHaveLength(0);
    expect(container.querySelector('path')).toBeNull();
  });
});
