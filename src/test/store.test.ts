import { describe, it, expect } from 'vitest';
import { useAppStore } from '../store';

describe('App Store', () => {
  it('should initialize with correct default values', () => {
    const store = useAppStore.getState();
    expect(store.uploadedData).toBeNull();
    expect(store.groupingTasks).toEqual([]);
    expect(store.currentStep).toBe(0);
    expect(store.assignedStudentIds.size).toBe(0);
  });

  it('should update current step', () => {
    const { setCurrentStep } = useAppStore.getState();
    setCurrentStep(1);
    expect(useAppStore.getState().currentStep).toBe(1);
  });

  it('updates face feature exaggeration symmetrically', () => {
    const { setFaceExaggeration } = useAppStore.getState();
    setFaceExaggeration('mouth', 0);
    expect(useAppStore.getState().faceSettings.ranges.mouth).toEqual({ min: 0.5, max: 0.5 });

    // values should clamp within [0,1] while keeping symmetry
    setFaceExaggeration('eyes', 1.4);
    const eyesRange = useAppStore.getState().faceSettings.ranges.eyes;
    expect(eyesRange.min).toBeCloseTo(0, 6);
    expect(eyesRange.max).toBeCloseTo(1, 6);

    setFaceExaggeration('nose', 0.25);
    const noseRange = useAppStore.getState().faceSettings.ranges.nose;
    expect(noseRange.min).toBeCloseTo(0.375, 6);
    expect(noseRange.max).toBeCloseTo(0.625, 6);
  });
});
