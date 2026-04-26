import imageCompression from 'browser-image-compression';

export interface CompressOptions {
  /** Longest edge in pixels (default 1920). */
  maxEdge?: number;
  /** Hard cap on output size in MB (default 1). */
  maxSizeMB?: number;
  /** 0..100 progress callback while encoding. */
  onProgress?: (percent: number) => void;
}

/**
 * Compress an image File using browser-image-compression.
 * - Resizes the longest edge to maxEdge (default 1920)
 * - Caps file size to maxSizeMB
 * - Uses a Web Worker so the main thread stays responsive
 * - Reports 0..100 progress via onProgress
 */
export async function compressImage(
  file: File,
  opts: CompressOptions = {}
): Promise<File> {
  const { maxEdge = 1920, maxSizeMB = 1, onProgress } = opts;

  const compressed = await imageCompression(file, {
    maxWidthOrHeight: maxEdge,
    maxSizeMB,
    useWebWorker: true,
    onProgress,
    fileType: 'image/jpeg',
    initialQuality: 0.82,
  });

  // imageCompression returns a Blob in some paths — normalize to File so callers
  // can read .name when uploading to storage.
  if (compressed instanceof File) return compressed;
  const name = file.name.replace(/\.[^.]+$/, '') || 'photo';
  return new File([compressed], `${name}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}
