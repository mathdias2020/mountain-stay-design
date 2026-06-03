import { useState } from "react";
import { X, Home } from "lucide-react";
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

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-[14px] bg-secondary">
        <Home className="h-16 w-16 text-text-muted" strokeWidth={1.5} />
      </div>
    );
  }

  const main = photos[activeIdx] ?? photos[0];
  const thumbs = photos.slice(0, 4);
  const extra = photos.length - 4;

  return (
    <>
      <div className="overflow-hidden rounded-[14px] bg-secondary">
        <img
          src={main.url}
          alt={`Foto de ${propertyName}`}
          className="aspect-[16/9] w-full object-cover"
        />
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
                  i === activeIdx && !showOverlay
                    ? "ring-2 ring-primary"
                    : "hover:opacity-90",
                )}
              >
                <img
                  src={p.url}
                  alt=""
                  className="h-full w-full object-cover"
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
                src={p.url}
                alt={`Foto de ${propertyName}`}
                className="aspect-square w-full rounded-[8px] object-cover"
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}