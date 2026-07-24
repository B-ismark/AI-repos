import { useEffect, useRef, useState, type RefObject } from "react";
import { Icon } from "./Icon";

/**
 * A subtle "done editing" tick that trails the end of a text element while it
 * is being edited on mobile. Gives an explicit way to commit and dismiss the
 * keyboard. It hides itself while the user is actively typing (so it never
 * sits on top of the text being written) and reappears — repositioned to the
 * new end of the text — once typing pauses. Pointer-down is swallowed so
 * pressing it doesn't blur the editable before the click lands.
 */
export function EditDoneButton({
  editableRef,
  onDone,
}: {
  editableRef: RefObject<HTMLElement | null>;
  onDone: () => void;
}) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [typing, setTyping] = useState(false);
  const timer = useRef<number>(0);

  // Position the tick just past the caret at the very end of the content,
  // in the page overlay's coordinate space (the same space the editable and
  // the other overlay chrome live in).
  const measure = () => {
    const el = editableRef.current;
    if (!el) return;
    const overlay = el.closest(".page__overlay") as HTMLElement | null;
    if (!overlay) return;
    const o = overlay.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const rects = range.getClientRects();
    // Empty element (no text yet) has no caret rects — anchor to its own box.
    const r = rects.length ? rects[rects.length - 1] : el.getBoundingClientRect();
    setPos({ left: r.right - o.left, top: r.top - o.top + r.height / 2 });
  };

  useEffect(() => {
    measure();
    const el = editableRef.current;
    if (!el) return;
    const onInput = () => {
      setTyping(true);
      window.clearTimeout(timer.current);
      // "Done typing" = a short pause after the last keystroke.
      timer.current = window.setTimeout(() => {
        setTyping(false);
        measure();
      }, 650);
    };
    el.addEventListener("input", onInput);
    return () => {
      el.removeEventListener("input", onInput);
      window.clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!pos || typing) return null;

  return (
    <button
      type="button"
      className="edit-done"
      aria-label="Done editing"
      data-tip="Done"
      style={{ left: `${pos.left + 8}px`, top: `${pos.top}px` }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDone();
      }}
    >
      <Icon name="check" size={16} />
    </button>
  );
}
