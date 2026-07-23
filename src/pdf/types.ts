/** A single editable text fragment extracted from a PDF page. */
export interface TextFragment {
  /** Stable id: `${pageIndex}:${itemIndex}`. */
  id: string;
  pageIndex: number;
  itemIndex: number;
  /** Original text as extracted from the PDF. */
  original: string;
  /** PDF-space transform matrix [a, b, c, d, e, f] (origin bottom-left). */
  transform: number[];
  /** Advance width of the fragment in PDF units (unscaled). */
  width: number;
  /** Glyph height in PDF units (unscaled). */
  height: number;
  /** CSS font-family resolved from the PDF font, used for the overlay. */
  fontFamily: string;
}

/** Everything needed to render and edit one page. */
export interface PageData {
  pageIndex: number;
  /** Unscaled page dimensions in PDF units. */
  viewBox: { width: number; height: number };
  fragments: TextFragment[];
}

/** The parsed document plus its original bytes (needed to re-export). */
export interface LoadedPdf {
  bytes: ArrayBuffer;
  pages: PageData[];
}

/** Map of fragment id -> edited text. */
export type Edits = Record<string, string>;
