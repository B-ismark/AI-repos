import { intersects, redactionBox, type Box } from "./bbox";
import type { LoadedPdf, Redaction, TextFragment } from "./types";

/** Approximate glyph box for a text fragment in PDF units (bottom-left origin).
 * The transform's translation is the baseline; text rises ~one glyph-height
 * above it and dips a little below for descenders. */
function fragmentBox(f: TextFragment): Box {
  const x = f.transform[4];
  const y = f.transform[5];
  const h = f.height || 10;
  return { l: x, r: x + f.width, b: y - h * 0.2, t: y + h };
}

export interface CoverWarning {
  /** 1-based page numbers that have a whiteout cover sitting over live text. */
  pages: number[];
  /** How many covers overlap real text across the document. */
  count: number;
}

/**
 * A *whiteout cover* only paints a filled rectangle on top of the content — the
 * text beneath survives in the exported file and is recoverable by copy/paste
 * or text search. Flag covers that overlap real text so the user can convert
 * them to true (destructive) redactions before sharing.
 *
 * True redactions are NOT flagged: the exporter rasterises any page carrying
 * one, so the underlying text is genuinely removed.
 */
export function findUnsafeCovers(loaded: LoadedPdf, redactions: Redaction[]): CoverWarning {
  const pages = new Set<number>();
  let count = 0;
  const byPage = new Map<number, TextFragment[]>();
  for (const p of loaded.pages) byPage.set(p.pageIndex, p.fragments);

  for (const r of redactions) {
    if (!r.cover) continue; // true redaction → destructive → safe
    const frags = byPage.get(r.pageIndex);
    if (!frags || frags.length === 0) continue;
    const rb = redactionBox(r);
    if (frags.some((f) => intersects(rb, fragmentBox(f)))) {
      count++;
      pages.add(r.pageIndex + 1);
    }
  }
  return { pages: [...pages].sort((a, b) => a - b), count };
}
