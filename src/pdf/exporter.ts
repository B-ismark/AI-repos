import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { Edits, LoadedPdf, TextFragment } from "./types";

export interface ExportOptions {
  /** Fill colour drawn over the original glyphs before redrawing. */
  background: { r: number; g: number; b: number };
  /** Colour of the redrawn edited text. */
  textColor: { r: number; g: number; b: number };
}

const DEFAULT_OPTIONS: ExportOptions = {
  background: { r: 1, g: 1, b: 1 },
  textColor: { r: 0, g: 0, b: 0 },
};

/** Pick the closest standard font from a PDF font-family hint. */
function chooseFontKey(fontFamily: string): keyof typeof StandardFonts {
  const f = fontFamily.toLowerCase();
  const bold = /bold|black|heavy|semibold/.test(f);
  const italic = /italic|oblique/.test(f);

  if (/mono|courier|consol/.test(f)) {
    if (bold && italic) return "CourierBoldOblique";
    if (bold) return "CourierBold";
    if (italic) return "CourierOblique";
    return "Courier";
  }
  if (/serif|times|georgia|roman|garamond|minion/.test(f)) {
    if (bold && italic) return "TimesRomanBoldItalic";
    if (bold) return "TimesRomanBold";
    if (italic) return "TimesRomanItalic";
    return "TimesRoman";
  }
  if (bold && italic) return "HelveticaBoldOblique";
  if (bold) return "HelveticaBold";
  if (italic) return "HelveticaOblique";
  return "Helvetica";
}

/** Drop characters the standard (WinAnsi) fonts cannot encode. */
function sanitize(text: string, font: PDFFont): string {
  let out = "";
  for (const ch of text) {
    try {
      font.encodeText(ch);
      out += ch;
    } catch {
      out += ch === "\t" ? "    " : "";
    }
  }
  return out;
}

/** Font size baked into a PDF text transform matrix. */
function fontSize(fragment: TextFragment): number {
  const [a, b] = fragment.transform;
  const size = Math.hypot(a, b);
  return size > 0.1 ? size : fragment.height || 12;
}

/**
 * Produce a new PDF where every edited fragment is covered with a filled
 * rectangle and its new text is drawn back in place. Untouched content is
 * carried over verbatim from the original file.
 */
export async function exportPdf(
  loaded: LoadedPdf,
  edits: Edits,
  options: Partial<ExportOptions> = {},
): Promise<Uint8Array> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const doc = await PDFDocument.load(loaded.bytes.slice(0));
  const fontCache = new Map<string, PDFFont>();

  const getFont = async (key: keyof typeof StandardFonts): Promise<PDFFont> => {
    let font = fontCache.get(key);
    if (!font) {
      font = await doc.embedFont(StandardFonts[key]);
      fontCache.set(key, font);
    }
    return font;
  };

  const pages = doc.getPages();

  for (const pageData of loaded.pages) {
    const page = pages[pageData.pageIndex];
    if (!page) continue;

    for (const fragment of pageData.fragments) {
      const edited = edits[fragment.id];
      if (edited === undefined || edited === fragment.original) continue;

      const size = fontSize(fragment);
      const x = fragment.transform[4];
      const y = fragment.transform[5]; // baseline, PDF origin bottom-left
      const descent = size * 0.22;

      // Cover the original glyphs. Widen slightly so anti-aliased edges of
      // the original render are fully hidden.
      page.drawRectangle({
        x: x - size * 0.05,
        y: y - descent,
        width: Math.max(fragment.width, edited.length * size * 0.2) + size * 0.1,
        height: size * 1.2,
        color: rgb(opts.background.r, opts.background.g, opts.background.b),
      });

      const font = await getFont(chooseFontKey(fragment.fontFamily));
      page.drawText(sanitize(edited, font), {
        x,
        y,
        size,
        font,
        color: rgb(opts.textColor.r, opts.textColor.g, opts.textColor.b),
      });
    }
  }

  return doc.save();
}
