import { useState } from "react";
import { Lightbox } from "./Lightbox";

export function MasonryGallery({ images }: { images: string[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!images?.length) return null;
  return (
    <>
      <div className="columns-2 gap-4 md:columns-3 [&>*]:mb-4">
        {images.map((src, i) => (
          <button
            key={src + i}
            onClick={() => setOpen(i)}
            className="group block w-full overflow-hidden rounded-xl border border-border/70 bg-muted shadow-[var(--shadow-card)] focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <img
              src={src}
              alt=""
              loading="lazy"
              className="w-full transition duration-500 group-hover:scale-[1.03]"
            />
          </button>
        ))}
      </div>
      {open !== null && <Lightbox images={images} startIndex={open} onClose={() => setOpen(null)} />}
    </>
  );
}
