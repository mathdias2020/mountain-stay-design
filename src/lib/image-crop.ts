// Client-side cropping helper. Renders the selected pixel area of an image
// into a JPEG blob/file at a target 4:3 aspect ratio.
export type CropArea = { x: number; y: number; width: number; height: number };

async function loadImage(src: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function cropImageToFile(
  source: File | string,
  area: CropArea,
  opts: { filename?: string; maxWidth?: number; quality?: number } = {},
): Promise<File> {
  const { filename = "photo.jpg", maxWidth = 2000, quality = 0.9 } = opts;
  const url =
    typeof source === "string" ? source : URL.createObjectURL(source);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, maxWidth / area.width);
    const w = Math.round(area.width * scale);
    const h = Math.round(area.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível");
    ctx.drawImage(
      img,
      area.x,
      area.y,
      area.width,
      area.height,
      0,
      0,
      w,
      h,
    );
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
    );
    if (!blob) throw new Error("Falha ao gerar imagem recortada");
    const safeName = filename.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], safeName, { type: "image/jpeg" });
  } finally {
    if (typeof source !== "string") URL.revokeObjectURL(url);
  }
}

export async function urlToFile(url: string, filename = "photo.jpg"): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Não foi possível carregar a imagem para recorte");
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/jpeg" });
}