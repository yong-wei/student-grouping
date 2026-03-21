export type DetectedImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | null;
export type PdfImageFormat = 'JPEG' | 'PNG';

const DATA_URL_PREFIX_PATTERN = /^data:[^;]+;base64,/i;
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];
const WEBP_RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46];
const WEBP_WEBP_SIGNATURE = [0x57, 0x45, 0x42, 0x50];

export function detectImageMimeType(bytes: Uint8Array): DetectedImageMimeType {
  if (bytes.length >= JPEG_SIGNATURE.length) {
    const isJpeg = JPEG_SIGNATURE.every((value, index) => bytes[index] === value);
    if (isJpeg) {
      return 'image/jpeg';
    }
  }

  if (bytes.length >= PNG_SIGNATURE.length) {
    const isPng = PNG_SIGNATURE.every((value, index) => bytes[index] === value);
    if (isPng) {
      return 'image/png';
    }
  }

  if (bytes.length >= 12) {
    const isRiff = WEBP_RIFF_SIGNATURE.every((value, index) => bytes[index] === value);
    const isWebp = WEBP_WEBP_SIGNATURE.every((value, index) => bytes[index + 8] === value);
    if (isRiff && isWebp) {
      return 'image/webp';
    }
  }

  return null;
}

export function normalizeDataUrlMimeType(
  dataUrl: string,
  mimeType: Exclude<DetectedImageMimeType, null>
): string {
  if (!DATA_URL_PREFIX_PATTERN.test(dataUrl)) {
    return dataUrl;
  }

  return dataUrl.replace(DATA_URL_PREFIX_PATTERN, `data:${mimeType};base64,`);
}

export function calculateScaledImageSize(
  width: number,
  height: number,
  maxDimension: number
): {
  width: number;
  height: number;
  scaled: boolean;
} {
  if (maxDimension <= 0 || Math.max(width, height) <= maxDimension) {
    return {
      width,
      height,
      scaled: false,
    };
  }

  const scale = maxDimension / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scaled: true,
  };
}

const blobToDataUrl = async (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'));
    reader.readAsDataURL(blob);
  });

const loadImageElement = async (dataUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('解码图片失败'));
    image.src = dataUrl;
  });

const mimeTypeToPdfFormat = (mimeType: DetectedImageMimeType): PdfImageFormat => {
  return mimeType === 'image/png' ? 'PNG' : 'JPEG';
};

export interface PdfCompatibleImage {
  dataUrl: string;
  format: PdfImageFormat;
  width: number;
  height: number;
}

export async function loadPdfCompatibleImage(
  src?: string,
  options?: {
    maxDimension?: number;
    jpegQuality?: number;
  }
): Promise<PdfCompatibleImage | null> {
  if (!src) {
    return null;
  }

  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`加载图片失败: ${response.status}`);
  }

  const blob = await response.blob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const detectedMimeType =
    detectImageMimeType(bytes) ??
    (blob.type.startsWith('image/') ? (blob.type as DetectedImageMimeType) : null);
  const dataUrl = await blobToDataUrl(blob);
  const normalizedDataUrl =
    detectedMimeType && detectedMimeType !== 'image/webp'
      ? normalizeDataUrlMimeType(dataUrl, detectedMimeType)
      : dataUrl;
  const image = await loadImageElement(normalizedDataUrl);
  const scaledSize = calculateScaledImageSize(
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
    options?.maxDimension ?? 1600
  );

  const shouldRasterize = scaledSize.scaled || detectedMimeType !== 'image/jpeg';
  if (!shouldRasterize) {
    return {
      dataUrl: normalizedDataUrl,
      format: mimeTypeToPdfFormat(detectedMimeType),
      width: scaledSize.width,
      height: scaledSize.height,
    };
  }

  const canvas = document.createElement('canvas');
  canvas.width = scaledSize.width;
  canvas.height = scaledSize.height;

  const context = canvas.getContext('2d');
  if (!context) {
    return {
      dataUrl: normalizedDataUrl,
      format: mimeTypeToPdfFormat(detectedMimeType),
      width: scaledSize.width,
      height: scaledSize.height,
    };
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return {
    dataUrl: canvas.toDataURL('image/jpeg', options?.jpegQuality ?? 0.86),
    format: 'JPEG',
    width: canvas.width,
    height: canvas.height,
  };
}
