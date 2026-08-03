import { useEffect, useState } from "react";
import { X, Home, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { PropertyPhoto } from "@/lib/properties.functions";

interface Props {
  photos: PropertyPhoto[];
  propertyName: string;
}

export function PhotoGallery({ photos, propertyName }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const markBroken = (id: string) =>
    setBroken((prev) => {
      const n = new Set(prev);
      n.add(id);
      return n;
    });

  const usable = photos.filter((p) => !broken.has(p.id));

  const safeIdx = Math.min(activeIdx, Math.max(0, usable.length - 1));
  const canPrev = safeIdx > 0;
  const canNext = safeIdx < usable.length - 1;

  useEffect(() => {
    if (modalOpen || usable.length <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && safeIdx > 0) {
        setActiveIdx(safeIdx - 1);
      } else if (e.key === "ArrowRight" && safeIdx < usable.length - 1) {
        setActiveIdx(safeIdx + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen, safeIdx, usable.length]);

  if (usable.length === 0) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-[14px] bg-secondary">
        <Home className="h-16 w-16 text-text-muted" strokeWidth={1.5} />
      </div>
    );
  }

  const main = usable[safeIdx];
  const thumbs = usable.slice(0, 4);
  const extra = usable.length - 4;

  return (
    <>
      <div className="relative overflow-hidden rounded-[14px] bg-secondary">
        <img
          src={main.medium_url || main.url}
          srcSet={
            main.medium_url && main.medium_url !== main.url
              ? `${main.url} 800w, ${main.medium_url} 1800w`
              : undefined
          }
          sizes="(min-width: 1024px) 820px, 100vw"
          alt={`Foto de ${propertyName}`}
          fetchPriority="high"
          decoding="async"
          className="aspect-[16/9] w-full object-cover"
          onError={() => {
            markBroken(main.id);
            setActiveIdx(0);
          }}
        />
        {usable.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={() => canPrev && setActiveIdx(safeIdx - 1)}
              disabled={!canPrev}
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#1C1C1A] shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-opacity sm:h-10 sm:w-10",
                canPrev
                  ? "cursor-pointer hover:opacity-100 opacity-90"
                  : "opacity-30 cursor-not-allowed",
              )}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Próxima foto"
              onClick={() => canNext && setActiveIdx(safeIdx + 1)}
              disabled={!canNext}
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#1C1C1A] shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-opacity sm:h-10 sm:w-10",
                canNext
                  ? "cursor-pointer hover:opacity-100 opacity-90"
                  : "opacity-30 cursor-not-allowed",
              )}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="mt-3 flex gap-2">
          {thumbs.map((p, i) => {
            const showOverlay = i === 3 && extra > 0;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => (showOverlay ? setModalOpen(true) : setActiveIdx(i))}
                className={cn(
                  "relative h-20 w-20 overflow-hidden rounded-[8px] bg-secondary transition-opacity",
                  i === safeIdx && !showOverlay
                    ? "ring-2 ring-primary"
                    : "hover:opacity-90",
                )}
              >
                <img
                  src={p.url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                  onError={() => markBroken(p.id)}
                />
                {showOverlay && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-medium text-white">
                    + {extra} fotos
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-5xl bg-surface p-6">
          <DialogTitle className="sr-only">Todas as fotos</DialogTitle>
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setModalOpen(false)}
            className="absolute right-4 top-4 z-10 rounded-md bg-surface/90 p-2 text-text-primary hover:bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="grid max-h-[80vh] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2 md:grid-cols-3">
            {photos.map((p) => (
              <img
                key={p.id}
                src={p.full_url}
                alt={`Foto de ${propertyName}`}
                loading="lazy"
                decoding="async"
                className="aspect-square w-full rounded-[8px] object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}