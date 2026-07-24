/** Move the caret to the end of a contentEditable element's contents. */
export function placeCaretEnd(el: HTMLElement): void {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

/**
 * Drop the caret at the given viewport point, if it falls inside `el`. Returns
 * whether it landed — callers fall back to `placeCaretEnd` when it didn't (the
 * point was outside the element, or the browser lacks the API). Used to make
 * tapping into a text overlay feel like tapping into a native input: the caret
 * goes where the finger was, not to the end.
 */
export function placeCaretAtPoint(el: HTMLElement, x: number, y: number): boolean {
  const d = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (
      x: number,
      y: number,
    ) => { offsetNode: Node; offset: number } | null;
  };
  let range: Range | null = null;
  if (d.caretRangeFromPoint) {
    range = d.caretRangeFromPoint(x, y);
  } else if (d.caretPositionFromPoint) {
    const pos = d.caretPositionFromPoint(x, y);
    if (pos) {
      range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
    }
  }
  if (!range || !el.contains(range.startContainer)) return false;
  range.collapse(true);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
  return true;
}

/**
 * Focus an editable overlay and drop the caret sensibly: at the point of a
 * recent entering tap (so it lands where the finger was, like a native input),
 * else at the end. Then scroll it into view above the keyboard. `point` is the
 * shared `lastEditPoint`; a stale one (older than ~1.2s) is ignored.
 */
export function focusEditable(
  el: HTMLElement,
  point?: { x: number; y: number; at: number },
): void {
  el.focus();
  const fresh = !!point && performance.now() - point.at < 1200;
  if (!(fresh && placeCaretAtPoint(el, point!.x, point!.y))) placeCaretEnd(el);
  el.scrollIntoView({ block: "center", inline: "nearest" });
}
