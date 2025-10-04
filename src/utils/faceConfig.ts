import type { FaceFeature, FaceFeatureRanges } from '../types';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const DEFAULT_EXAGGERATION = 0.6;

export const FACE_FEATURES: FaceFeature[] = [
  'faceSize',
  'mouth',
  'nose',
  'eyes',
  'eyeSpacing',
  'eyebrows',
];

export const DEFAULT_FACE_EXAGGERATIONS: Record<FaceFeature, number> = FACE_FEATURES.reduce(
  (acc, feature) => {
    acc[feature] = DEFAULT_EXAGGERATION;
    return acc;
  },
  {} as Record<FaceFeature, number>
);

export const exaggerationToRange = (exaggeration: number) => {
  const clamped = clamp(exaggeration, 0, 1);
  const offset = 0.5 * clamped;
  return {
    min: Number((0.5 - offset).toFixed(6)),
    max: Number((0.5 + offset).toFixed(6)),
  };
};

export const buildRangesFromExaggerations = (
  exaggerations: Record<FaceFeature, number>
): FaceFeatureRanges =>
  Object.entries(exaggerations).reduce((ranges, [feature, value]) => {
    ranges[feature as FaceFeature] = exaggerationToRange(value);
    return ranges;
  }, {} as FaceFeatureRanges);

export const DEFAULT_FACE_RANGES: FaceFeatureRanges = buildRangesFromExaggerations(
  DEFAULT_FACE_EXAGGERATIONS
);

export interface FaceParameterBounds {
  min: number;
  max: number;
}

export const FACE_PARAMETER_LIMITS = {
  faceRadiusMultiplier: { min: 0.72, max: 1.32 },
  mouthWidthRatio: { min: 0.05, max: 0.45 },
  mouthCurveRatio: { min: -0.6, max: 0.6 },
  noseLengthRatio: { min: 0.08, max: 0.42 },
  eyeRadiusRatio: { min: 0.02, max: 0.13 },
  eyeSpacingRatio: { min: 0.05, max: 0.45 },
  browTiltRatio: { min: -0.22, max: 0.22 },
} as const satisfies Record<string, FaceParameterBounds>;
