import type {
  FaceFeature,
  FaceFeatureBindings,
  FaceFeatureRanges,
  FaceMetricKey,
  FaceMetricRanges,
  NumericRange,
  Student,
} from '../types';
import { FACE_PARAMETER_LIMITS } from './faceConfig';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export interface FaceParameters {
  faceRadius: number;
  mouthWidth: number;
  mouthCurve: number;
  noseLength: number;
  eyeRadius: number;
  eyeSpacing: number;
  browTilt: number;
}

export type FaceCue = 'mouth' | 'nose' | 'eyes' | 'eyebrows';

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

export const shouldRenderFaceCue = (bindings: FaceFeatureBindings, feature: FaceCue): boolean =>
  bindings[feature] !== 'none';

const normalizeWithRange = (value: number, range: NumericRange | null) => {
  if (!range) {
    return 0.5;
  }
  const span = range.max - range.min;
  if (Math.abs(span) < 1e-6) {
    return 0.5;
  }
  return clamp((value - range.min) / span, 0, 1);
};

const normalizeLearningDimension = (value: number, reverse = false) => {
  const normalized = clamp(value, -11, 11) / 11;
  return reverse ? (clamp(-normalized, -1, 1) + 1) / 2 : (normalized + 1) / 2;
};

const getRawFaceMetric = (student: Student, metric: FaceMetricKey): number | undefined => {
  switch (metric) {
    case 'rankingPercent':
      return student.rankingPercent;
    case 'initiativeScore':
      return student.initiativeScore;
    case 'extroversionScore':
      return student.extroversionScore;
    case 'learningStyleIntensity':
      return student.learningStyleIntensity;
    case 'activeReflective':
      return student.learningStyles.activeReflective;
    case 'sensingIntuitive':
      return student.learningStyles.sensingIntuitive;
    case 'visualVerbal':
      return student.learningStyles.visualVerbal;
    case 'sequentialGlobal':
      return student.learningStyles.sequentialGlobal;
    case 'none':
    default:
      return undefined;
  }
};

export const getFaceMetricValue = (
  student: Student,
  metric: FaceMetricKey,
  metricRanges: FaceMetricRanges
): number => {
  const rawValue = getRawFaceMetric(student, metric);
  if (rawValue === undefined || !Number.isFinite(rawValue)) {
    return 0.5;
  }

  switch (metric) {
    case 'rankingPercent':
      return 1 - normalizeWithRange(rawValue, metricRanges.rankingPercent);
    case 'initiativeScore':
      return normalizeWithRange(rawValue, metricRanges.initiativeScore);
    case 'extroversionScore':
      return normalizeWithRange(rawValue, metricRanges.extroversionScore);
    case 'learningStyleIntensity':
      return normalizeWithRange(rawValue, metricRanges.learningStyleIntensity);
    case 'activeReflective':
      return normalizeLearningDimension(rawValue, true);
    case 'visualVerbal':
      return normalizeLearningDimension(rawValue, true);
    case 'sensingIntuitive':
    case 'sequentialGlobal':
      return normalizeLearningDimension(rawValue);
    case 'none':
    default:
      return 0.5;
  }
};

const computeNumericRange = (values: (number | undefined)[]): NumericRange | null => {
  const validValues = values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value)
  );
  if (validValues.length === 0) {
    return null;
  }
  const min = Math.min(...validValues);
  const max = Math.max(...validValues);
  if (Math.abs(max - min) < 1e-6) {
    return null;
  }
  return { min, max };
};

export const computeFaceMetricRanges = (students: Student[]): FaceMetricRanges => ({
  rankingPercent: computeNumericRange(students.map((student) => student.rankingPercent)),
  initiativeScore: computeNumericRange(students.map((student) => student.initiativeScore)),
  extroversionScore: computeNumericRange(students.map((student) => student.extroversionScore)),
  learningStyleIntensity: computeNumericRange(
    students.map((student) => student.learningStyleIntensity)
  ),
});

const lerp = (min: number, max: number, t: number) => min + (max - min) * t;

const midpoint = (min: number, max: number) => (min + max) / 2;

const UNITY_RANGE: FaceFeatureRanges = {
  faceSize: { min: 0, max: 1 },
  mouth: { min: 0, max: 1 },
  nose: { min: 0, max: 1 },
  eyes: { min: 0, max: 1 },
  eyeSpacing: { min: 0, max: 1 },
  eyebrows: { min: 0, max: 1 },
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

export const deriveFaceParameters = (
  size: number,
  student: Student,
  bindings: FaceFeatureBindings,
  ranges: FaceFeatureRanges,
  metricRanges: FaceMetricRanges
): FaceParameters => {
  const baseFaceRadius = size * 0.32;
  const appliedRanges = { ...UNITY_RANGE, ...ranges };
  const getFeatureMetric = (feature: FaceFeature) =>
    getFaceMetricValue(student, bindings[feature], metricRanges);

  const faceBounds = FACE_PARAMETER_LIMITS.faceRadiusMultiplier;
  const faceRadiusMultiplier =
    bindings.faceSize === 'none'
      ? midpoint(faceBounds.min, faceBounds.max)
      : computeEffectiveRatio(getFeatureMetric('faceSize'), appliedRanges.faceSize, faceBounds);
  const faceRadius = baseFaceRadius * faceRadiusMultiplier;

  const faceDiameter = faceRadius * 2;
  const mouthWidthBounds = FACE_PARAMETER_LIMITS.mouthWidthRatio;
  const mouthCurveBounds = FACE_PARAMETER_LIMITS.mouthCurveRatio;
  const mouthWidthRatio =
    bindings.mouth === 'none'
      ? midpoint(mouthWidthBounds.min, mouthWidthBounds.max)
      : computeEffectiveRatio(getFeatureMetric('mouth'), appliedRanges.mouth, mouthWidthBounds);
  const mouthCurveRatio =
    bindings.mouth === 'none'
      ? midpoint(mouthCurveBounds.min, mouthCurveBounds.max)
      : computeEffectiveRatio(getFeatureMetric('mouth'), appliedRanges.mouth, mouthCurveBounds);
  const mouthWidth = faceDiameter * mouthWidthRatio;
  const mouthCurve = faceDiameter * mouthCurveRatio;

  const noseBounds = FACE_PARAMETER_LIMITS.noseLengthRatio;
  const noseLengthRatio =
    bindings.nose === 'none'
      ? midpoint(noseBounds.min, noseBounds.max)
      : computeEffectiveRatio(getFeatureMetric('nose'), appliedRanges.nose, noseBounds);
  const noseLength = size * noseLengthRatio;

  const eyeRadiusBounds = FACE_PARAMETER_LIMITS.eyeRadiusRatio;
  const eyeRadiusRatio =
    bindings.eyes === 'none'
      ? midpoint(eyeRadiusBounds.min, eyeRadiusBounds.max)
      : computeEffectiveRatio(getFeatureMetric('eyes'), appliedRanges.eyes, eyeRadiusBounds);
  const eyeRadius = size * eyeRadiusRatio;

  const spacingBounds = FACE_PARAMETER_LIMITS.eyeSpacingRatio;
  const eyeSpacingRatio =
    bindings.eyeSpacing === 'none'
      ? midpoint(spacingBounds.min, spacingBounds.max)
      : computeEffectiveRatio(
          getFeatureMetric('eyeSpacing'),
          appliedRanges.eyeSpacing,
          spacingBounds
        );
  const eyeSpacing = faceDiameter * eyeSpacingRatio;

  const browBounds = FACE_PARAMETER_LIMITS.browTiltRatio;
  const browTiltRatio =
    bindings.eyebrows === 'none'
      ? midpoint(browBounds.min, browBounds.max)
      : computeEffectiveRatio(getFeatureMetric('eyebrows'), appliedRanges.eyebrows, browBounds);
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
