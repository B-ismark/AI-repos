import type { CSSProperties } from "react";
import { Icon } from "./Icon";

/**
 * A small "done editing" checkmark anchored beside a text element while it is
 * being edited on mobile. Gives an explicit way to commit and dismiss the
 * keyboard (tapping empty canvas also works, but isn't discoverable on a
 * phone). Pointer-down is swallowed so pressing it doesn't blur the editable
 * before the click lands — the click then finishes the edit.
 */
export function EditDoneButton({
  style,
  onDone,
}: {
  style?: CSSProperties;
  onDone: () => void;
}) {
  return (
    <button
      type="button"
      className="edit-done"
      aria-label="Done editing"
      data-tip="Done"
      style={style}
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
      <Icon name="check" size={18} />
    </button>
  );
}
