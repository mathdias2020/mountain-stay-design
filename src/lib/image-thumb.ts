// Client-side thumbnail generator. Produces a JPEG ~maxSize px on the longest
// edge to keep listing/thumbnail payloads small while the original is kept for
// the gallery / lightbox.
export async function generateThumbnail(
  file: File,
  maxSize = 800,
  quality = 0.78,
): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file).catch(() => null);
    let width: number;
    let height: number;
    let source: CanvasImageSource;

    if (bitmap) {
      width = bitmap.width;
      height = bitmap.height;
      source = bitmap;
    } else {
      const url = URL.createObjectURL(file);
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = reject;
          i.src = url;
        });
        width = img.naturalWidth;
        height = img.naturalHeight;
        source = img;
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    if (!width || !height) return null;
    const scale = Math.min(1, maxSize / Math.max(width, height));
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0, w, h);
    if (bitmap && "close" in bitmap) bitmap.close();

    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
    );
  } catch {
    return null;
  }
}