import React, { useMemo } from 'react';
import type { Student, FaceFeature, FaceFeatureRanges } from '../types';
import { computeFaceMetrics, deriveFaceParameters, getGenderColor } from '../utils/faceUtils';

interface StudentFaceProps {
  student: Student;
  size?: number;
  rankingRange: { min: number; max: number } | null;
  features: Record<FaceFeature, boolean>;
  ranges: FaceFeatureRanges;
}

const StudentFace: React.FC<StudentFaceProps> = ({
  student,
  size = 72,
  rankingRange,
  features,
  ranges,
}) => {
  const metrics = useMemo(() => {
    const ratios = computeFaceMetrics(student, rankingRange);
    return deriveFaceParameters(size, ratios, features, ranges);
  }, [features, rankingRange, ranges, size, student]);

  const center = size / 2;
  const faceColor = getGenderColor(student.gender);
  const neutralStroke = '#595959';

  const leftEyeX = center - metrics.eyeSpacing;
  const rightEyeX = center + metrics.eyeSpacing;
  const eyeY = center - metrics.faceRadius * 0.25;
  const browY = eyeY - metrics.eyeRadius * 1.5;
  const noseTopY = center - metrics.faceRadius * 0.05;
  const noseBottomY = noseTopY + metrics.noseLength;
  const mouthY = center + metrics.faceRadius * 0.4;
  const mouthLeftX = center - metrics.mouthWidth;
  const mouthRightX = center + metrics.mouthWidth;
  const mouthControlY = mouthY + metrics.mouthCurve;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={center}
        cy={center}
        r={metrics.faceRadius}
        fill="#fff7e6"
        stroke={faceColor}
        strokeWidth={1.4}
      />

      <ellipse
        cx={leftEyeX}
        cy={eyeY}
        rx={metrics.eyeRadius}
        ry={metrics.eyeRadius * 0.85}
        fill={neutralStroke}
      />
      <ellipse
        cx={rightEyeX}
        cy={eyeY}
        rx={metrics.eyeRadius}
        ry={metrics.eyeRadius * 0.85}
        fill={neutralStroke}
      />

      <line
        x1={leftEyeX - metrics.eyeRadius}
        y1={browY - metrics.browTilt}
        x2={leftEyeX + metrics.eyeRadius}
        y2={browY + metrics.browTilt}
        stroke={faceColor}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      <line
        x1={rightEyeX - metrics.eyeRadius}
        y1={browY + metrics.browTilt}
        x2={rightEyeX + metrics.eyeRadius}
        y2={browY - metrics.browTilt}
        stroke={faceColor}
        strokeWidth={1.2}
        strokeLinecap="round"
      />

      <line
        x1={center}
        y1={noseTopY}
        x2={center}
        y2={noseBottomY}
        stroke={neutralStroke}
        strokeWidth={1.1}
        strokeLinecap="round"
      />

      <path
        d={`M ${mouthLeftX} ${mouthY} Q ${center} ${mouthControlY} ${mouthRightX} ${mouthY}`}
        stroke={faceColor}
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default StudentFace;
