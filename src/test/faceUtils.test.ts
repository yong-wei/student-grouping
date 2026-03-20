import { describe, expect, it } from 'vitest';
import { shouldRenderFaceCue } from '../utils/faceUtils';
import type { FaceFeatureBindings } from '../types';

const defaultBindings: FaceFeatureBindings = {
  faceSize: 'rankingPercent',
  mouth: 'activeReflective',
  nose: 'sensingIntuitive',
  eyes: 'visualVerbal',
  eyeSpacing: 'sequentialGlobal',
  eyebrows: 'activeReflective',
};

describe('faceUtils', () => {
  it('returns false for cues explicitly bound to none', () => {
    const bindings: FaceFeatureBindings = {
      ...defaultBindings,
      eyes: 'none',
      eyebrows: 'none',
      nose: 'none',
      mouth: 'none',
    };

    expect(shouldRenderFaceCue(bindings, 'eyes')).toBe(false);
    expect(shouldRenderFaceCue(bindings, 'eyebrows')).toBe(false);
    expect(shouldRenderFaceCue(bindings, 'nose')).toBe(false);
    expect(shouldRenderFaceCue(bindings, 'mouth')).toBe(false);
  });

  it('keeps cues visible when they remain bound to a metric', () => {
    expect(shouldRenderFaceCue(defaultBindings, 'eyes')).toBe(true);
    expect(shouldRenderFaceCue(defaultBindings, 'mouth')).toBe(true);
  });
});
