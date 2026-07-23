import { memo, useEffect, useRef } from "react";
import type { TextFragment } from "../pdf/types";

interface Props {
  fragment: TextFragment;
  /** Render scale (CSS px per PDF unit). */
  scale: number;
  /** Unscaled page height in PDF units. */
  pageHeight: number;
  /** Current text (edited value or original). Applied on mount only. */
  value: string;
  /** True when the fragment has been changed from its original text. */
  edited: boolean;
  onFocus: (id: string) => void;
  onBlur: () => void;
  onChange: (id: string, text: string) => void;
}

/**
 * A single contentEditable overlay positioned over its glyphs on the page
 * canvas. It is invisible until focused or edited, at which point it paints
 * an opaque box over the original text so the preview matches the export.
 *
 * Memoized and text-managed imperatively so React never clobbers the caret
 * while typing — only positioning styles are updated on re-render.
 */
function EditableFragmentImpl({
  fragment,
  scale,
  pageHeight,
  value,
  edited,
  onFocus,
  onBlur,
  onChange,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Seed the DOM text exactly once; subsequent edits live in the DOM.
  useEffect(() => {
    if (ref.current) ref.current.textContent = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [, , c, d, e, f] = fragment.transform;
  const fontPx = Math.hypot(c, d) * scale;
  const left = e * scale;
  const top = (pageHeight - f) * scale - fontPx;

  return (
    <div
      ref={ref}
      className={`fragment${edited ? " fragment--edited" : ""}`}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-id={fragment.id}
      title={fragment.original}
      style={{
        left: `${left}px`,
        top: `${top}px`,
        fontSize: `${fontPx}px`,
        fontFamily: fragment.fontFamily,
        lineHeight: 1,
      }}
      onFocus={() => onFocus(fragment.id)}
      onBlur={() => onBlur()}
      onInput={(ev) => onChange(fragment.id, ev.currentTarget.textContent ?? "")}
      onKeyDown={(ev) => {
        // Fragments are single-line; keep Enter from injecting <div> breaks.
        if (ev.key === "Enter") ev.preventDefault();
      }}
    />
  );
}

export const EditableFragment = memo(EditableFragmentImpl);
