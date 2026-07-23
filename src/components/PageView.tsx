import { useEffect, useRef, useState } from "react";
import { renderPage } from "../pdf/loader";
import type { Edits, PageData } from "../pdf/types";
import { EditableFragment } from "./EditableFragment";

interface Props {
  bytes: ArrayBuffer;
  page: PageData;
  scale: number;
  edits: Edits;
  focusedId: string | null;
  onFocus: (id: string) => void;
  onBlur: () => void;
  onChange: (id: string, text: string) => void;
}

/** One rendered page: a raster canvas with an editable text overlay on top. */
export function PageView({
  bytes,
  page,
  scale,
  edits,
  focusedId,
  onFocus,
  onBlur,
  onChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderPage(bytes, page.pageIndex, canvas, scale).catch((err) => {
      if (!cancelled) setError(String(err));
    });
    return () => {
      cancelled = true;
    };
  }, [bytes, page.pageIndex, scale]);

  const width = page.viewBox.width * scale;
  const height = page.viewBox.height * scale;

  return (
    <div className="page" style={{ width, height }}>
      <canvas ref={canvasRef} className="page__canvas" />
      {error ? (
        <div className="page__error">Failed to render page: {error}</div>
      ) : (
        <div className="page__overlay">
          {page.fragments.map((fragment) => {
            const value = edits[fragment.id] ?? fragment.original;
            const isEdited =
              edits[fragment.id] !== undefined &&
              edits[fragment.id] !== fragment.original;
            return (
              <EditableFragment
                key={fragment.id}
                fragment={fragment}
                scale={scale}
                pageHeight={page.viewBox.height}
                value={value}
                edited={isEdited || focusedId === fragment.id}
                onFocus={onFocus}
                onBlur={onBlur}
                onChange={onChange}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
