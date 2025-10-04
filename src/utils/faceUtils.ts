import type { FaceFeature, FaceFeatureRanges, Student } from '../types';
import { FACE_PARAMETER_LIMITS } from './faceConfig';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export interface FaceMetricSet {
  rankingRatio: number;
  active: number;
  intuitive: number;
  visual: number;
  global: number;
}

export interface FaceParameters {
  faceRadius: number;
  mouthWidth: number;
  mouthCurve: number;
  noseLength: number;
  eyeRadius: number;
  eyeSpacing: number;
  browTilt: number;
}

export const GENDER_COLORS: Record<'male' | 'female' | 'unknown', string> = {
  male: '#1890ff',
  female: '#fa8c16',
  unknown: '#8c8c8c',
};

export const getGenderColor = (gender: number): string => {
  if (gender === 1) return GENDER_COLORS.male;
  if (gender === 0) return GENDER_COLORS.female;
  return GENDER_COLORS.unknown;
};

export const computeFaceMetrics = (
  student: Student,
  rankingRange: { min: number; max: number } | null
): FaceMetricSet => {
  const vector = [
    student.learningStyles.activeReflective / 11,
    student.learningStyles.sensingIntuitive / 11,
    student.learningStyles.visualVerbal / 11,
    student.learningStyles.sequentialGlobal / 11,
  ].map((value) => clamp(value, -1, 1));

  const active = (clamp(-vector[0], -1, 1) + 1) / 2;
  const intuitive = (vector[1] + 1) / 2;
  const visual = (clamp(-vector[2], -1, 1) + 1) / 2;
  const global = (vector[3] + 1) / 2;

  let rankingRatio = 0.5;
  if (student.ranking !== undefined && rankingRange && Number.isFinite(student.ranking)) {
    const { min, max } = rankingRange;
    if (Number.isFinite(min) && Number.isFinite(max) && max !== min) {
      const clampedRanking = clamp(student.ranking, min, max);
      const normalized = (clampedRanking - min) / (max - min);
      rankingRatio = 1 - normalized;
    }
  }

  return {
    rankingRatio,
    active,
    intuitive,
    visual,
    global,
  };
};

const normalizeWithRange = (value: number, range: { min: number; max: number }) => {
  const span = range.max - range.min;
  if (Math.abs(span) < 1e-6) {
    return 0.5;
  }
  const normalized = (value - range.min) / span;
  return clamp(normalized, 0, 1);
};

const UNITY_RANGE: FaceFeatureRanges = {
  faceSize: { min: 0, max: 1 },
  mouth: { min: 0, max: 1 },
  nose: { min: 0, max: 1 },
  eyes: { min: 0, max: 1 },
  eyeSpacing: { min: 0, max: 1 },
  eyebrows: { min: 0, max: 1 },
};

const lerp = (min: number, max: number, t: number) => min + (max - min) * t;

const midpoint = (min: number, max: number) => (min + max) / 2;

export const deriveFaceParameters = (
  size: number,
  metrics: FaceMetricSet,
  features: Record<FaceFeature, boolean>,
  ranges: FaceFeatureRanges
): FaceParameters => {
  const baseFaceRadius = size * 0.32;
  const appliedRanges = { ...UNITY_RANGE, ...ranges };

  const faceBounds = FACE_PARAMETER_LIMITS.faceRadiusMultiplier;
  const faceRadiusMultiplier = features.faceSize
    ? computeEffectiveRatio(metrics.rankingRatio, appliedRanges.faceSize, faceBounds)
    : midpoint(faceBounds.min, faceBounds.max);
  const faceRadius = baseFaceRadius * faceRadiusMultiplier;

  const faceDiameter = faceRadius * 2;
  const mouthWidthBounds = FACE_PARAMETER_LIMITS.mouthWidthRatio;
  const mouthCurveBounds = FACE_PARAMETER_LIMITS.mouthCurveRatio;
  const mouthWidthRatio = features.mouth
    ? computeEffectiveRatio(metrics.active, appliedRanges.mouth, mouthWidthBounds)
    : midpoint(mouthWidthBounds.min, mouthWidthBounds.max);
  const mouthCurveRatio = features.mouth
    ? computeEffectiveRatio(metrics.active, appliedRanges.mouth, mouthCurveBounds)
    : midpoint(mouthCurveBounds.min, mouthCurveBounds.max);
  const mouthWidth = faceDiameter * mouthWidthRatio;
  const mouthCurve = faceDiameter * mouthCurveRatio;

  const noseBounds = FACE_PARAMETER_LIMITS.noseLengthRatio;
  const noseLengthRatio = features.nose
    ? computeEffectiveRatio(metrics.intuitive, appliedRanges.nose, noseBounds)
    : midpoint(noseBounds.min, noseBounds.max);
  const noseLength = size * noseLengthRatio;

  const eyeRadiusBounds = FACE_PARAMETER_LIMITS.eyeRadiusRatio;
  const eyeRadiusRatio = features.eyes
    ? computeEffectiveRatio(metrics.visual, appliedRanges.eyes, eyeRadiusBounds)
    : midpoint(eyeRadiusBounds.min, eyeRadiusBounds.max);
  const eyeRadius = size * eyeRadiusRatio;

  const spacingBounds = FACE_PARAMETER_LIMITS.eyeSpacingRatio;
  const eyeSpacingRatio = features.eyeSpacing
    ? computeEffectiveRatio(metrics.global, appliedRanges.eyeSpacing, spacingBounds)
    : midpoint(spacingBounds.min, spacingBounds.max);
  const eyeSpacing = faceDiameter * eyeSpacingRatio;

  const browBounds = FACE_PARAMETER_LIMITS.browTiltRatio;
  const browTiltRatio = features.eyebrows
    ? computeEffectiveRatio(metrics.active, appliedRanges.eyebrows, browBounds)
    : midpoint(browBounds.min, browBounds.max);
  const browTilt = size * browTiltRatio;

  return {
    faceRadius,
    mouthWidth,
    mouthCurve,
    noseLength,
    eyeRadius,
    eyeSpacing,
    browTilt,
  };
};
const computeEffectiveRatio = (
  rawMetric: number,
  range: { min: number; max: number },
  bounds: { min: number; max: number }
) => {
  const intensity = clamp(range.max - range.min, 0, 1);
  const baseMid = midpoint(bounds.min, bounds.max);
  const baseExtent = (bounds.max - bounds.min) / 2;
  const effectiveExtent = baseExtent * intensity;
  if (effectiveExtent < 1e-6) {
    return baseMid;
  }
  const normalized = normalizeWithRange(rawMetric, range);
  const effectiveMin = baseMid - effectiveExtent;
  const effectiveMax = baseMid + effectiveExtent;
  return clamp(lerp(effectiveMin, effectiveMax, normalized), bounds.min, bounds.max);
};
