// Bag photos: URLs, and resizing in the browser before upload.

export const photoUrl = (id: number, size: "full" | "thumb" = "full") =>
  `/photos/${id}/${size}`;

/** Long edge of the stored photo: sharp full-screen on a phone, with room to zoom. */
export const PHOTO_EDGE = 2560;
/** Long edge of the thumbnail used in lists. */
export const THUMB_EDGE = 400;

/**
 * Decode a picked photo (camera or library) the way the browser displays it,
 * upright and in colour, including HEIC on iPhone. createImageBitmap is the
 * fast path; an <img> is the fallback for formats it won't take.
 */
async function decode(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  done: () => void;
}> {
  try {
    const bmp = await createImageBitmap(file);
    return {
      source: bmp,
      width: bmp.width,
      height: bmp.height,
      done: () => bmp.close(),
    };
  } catch {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await img.decode();
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      done: () => URL.revokeObjectURL(url),
    };
  }
}

function draw(
  source: CanvasImageSource,
  width: number,
  height: number,
  edge: number,
  quality: number,
): Promise<Blob> {
  const scale = Math.min(1, edge / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Couldn't encode the photo"))),
      "image/jpeg",
      quality,
    ),
  );
}

/**
 * The photo to upload and its thumbnail, both JPEG. Redrawing on a canvas
 * also drops the original's metadata, including where it was taken.
 */
export async function preparePhoto(file: File) {
  const img = await decode(file);
  try {
    const full = await draw(
      img.source,
      img.width,
      img.height,
      PHOTO_EDGE,
      0.85,
    );
    const thumb = await draw(
      img.source,
      img.width,
      img.height,
      THUMB_EDGE,
      0.8,
    );
    return { full, thumb };
  } finally {
    img.done();
  }
}
