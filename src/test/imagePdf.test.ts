import { describe, expect, it } from 'vitest';
import {
  detectImageMimeType,
  normalizeDataUrlMimeType,
  calculateScaledImageSize,
} from '../utils/imagePdf';

describe('imagePdf helpers', () => {
  it('detects the actual jpeg mime type from file bytes', () => {
    const jpegBytes = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);

    expect(detectImageMimeType(jpegBytes)).toBe('image/jpeg');
  });

  it('rewrites mismatched data url mime types to the detected image type', () => {
    const mismatchedDataUrl = 'data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD';

    expect(normalizeDataUrlMimeType(mismatchedDataUrl, 'image/jpeg')).toBe(
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD'
    );
  });

  it('downscales oversized photos while preserving aspect ratio', () => {
    expect(calculateScaledImageSize(3246, 3248, 1600)).toEqual({
      width: 1599,
      height: 1600,
      scaled: true,
    });
  });

  it('keeps already small photos unchanged', () => {
    expect(calculateScaledImageSize(770, 1061, 1600)).toEqual({
      width: 770,
      height: 1061,
      scaled: false,
    });
  });
});
