/**
 * lib/signature-image.ts
 *
 * Turns an uploaded signature photo into a small base64 data URI suitable for
 * storing inline on a CM report.
 *
 * Signatures are stored in the report row itself rather than on disk, because the
 * backend's file storage is local disk and Render's disk is ephemeral — a redeploy
 * would silently break reprints of past reports. That makes size the whole problem:
 * a raw phone photo is 3–5 MB and base64 inflates it by a third, which is far too
 * much for a database row. So the file is downscaled here before it is ever sent.
 *
 * The backend re-checks the result (image data URI, under 512 KB) — this is a
 * convenience, not the security boundary.
 */

/** Long edge of the stored image. Enough for a legible signature, ~20–50 KB as PNG. */
const MAX_EDGE_PX = 600;

export const MAX_SIGNATURE_BYTES = 512 * 1024;

/**
 * Reads an image file and returns a downscaled PNG data URI.
 *
 * Rejects with a user-facing message if the file isn't an image or can't be
 * decoded — callers surface it directly.
 */
export async function fileToSignatureDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (JPG, PNG, or HEIC).');
  }

  const bitmap = await loadBitmap(file);
  try {
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not process the image in this browser.');
    ctx.drawImage(bitmap, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/png');
    if (dataUrl.length > MAX_SIGNATURE_BYTES) {
      throw new Error('That image is too detailed to store. Try a tighter crop of just the signature.');
    }
    return dataUrl;
  } finally {
    // createImageBitmap allocates outside the JS heap; release it explicitly rather
    // than waiting for GC, since a technician may upload several in a row.
    bitmap.close?.();
  }
}

/**
 * `createImageBitmap` is the fast path and handles EXIF orientation, but Safari
 * only gained it recently — fall back to an <img> decode so an older iPad in the
 * field still works.
 */
async function loadBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall through to the <img> path
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('That image could not be read. Try a different photo.'));
      el.src = url;
    });
    return await createImageBitmap(img);
  } finally {
    URL.revokeObjectURL(url);
  }
}
