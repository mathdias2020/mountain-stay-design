import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cropImageToFile, urlToFile } from "@/lib/image-crop";

export const CROP_ASPECT = 4 / 3;

type Source = { kind: "file"; file: File } | { kind: "url"; url: string; filename?: string };

export type ImageCropDialogProps = {
  open: boolean;
  source: Source | null;
  title?: string;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
};

export function ImageCropDialog({ open, source, title = "Recortar foto", onCancel, onConfirm }: ImageCropDialogProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPx, setAreaPx] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let revoke: string | null = null;
    let cancelled = false;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAreaPx(null);
    setImageUrl(null);
    setOriginalFile(null);
    if (!open || !source) return;
    (async () => {
      try {
        if (source.kind === "file") {
          const u = URL.createObjectURL(source.file);
          revoke = u;
          if (cancelled) return;
          setOriginalFile(source.file);
          setImageUrl(u);
        } else {
          const f = await urlToFile(source.url, source.filename ?? "photo.jpg");
          const u = URL.createObjectURL(f);
          revoke = u;
          if (cancelled) return;
          setOriginalFile(f);
          setImageUrl(u);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao carregar imagem");
        onCancel();
      }
    })();
    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [open, source, onCancel]);

  const onComplete = useCallback((_: Area, px: Area) => setAreaPx(px), []);

  async function handleConfirm() {
    if (!originalFile || !areaPx) return;
    setBusy(true);
    try {
      const file = await cropImageToFile(originalFile, areaPx, { filename: originalFile.name });
      onConfirm(file);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao recortar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !busy) onCancel(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div style={{ position: "relative", width: "100%", height: 400, background: "#1a1a1a", borderRadius: 8, overflow: "hidden" }}>
          {imageUrl && (
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={CROP_ASPECT}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onComplete}
              objectFit="contain"
            />
          )}
        </div>
        <div style={{ padding: "8px 4px" }}>
          <div style={{ fontSize: 12, color: "#5C5B57", marginBottom: 6 }}>Zoom</div>
          <Slider value={[zoom]} min={1} max={4} step={0.05} onValueChange={(v) => setZoom(v[0])} />
          <p style={{ fontSize: 12, color: "#9A9890", marginTop: 10 }}>
            Proporção fixa 4:3 — arraste para enquadrar.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>Cancelar</Button>
          <Button type="button" onClick={handleConfirm} disabled={busy || !areaPx}>
            {busy ? "Processando..." : "Aplicar recorte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}