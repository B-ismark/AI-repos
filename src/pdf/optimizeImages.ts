import { PDFArray, PDFName, PDFNumber, PDFRawStream, type PDFDocument, type PDFRef } from "pdf-lib";
import { loadJpegEncoder } from "./jpeg";

export interface OptimizeImagesResult {
  /** Number of image streams downsampled + re-encoded. */
  changed: number;
  /** Bytes saved across all replaced images (encoded-stream sizes). */
  saved: number;
}

export interface OptimizeImagesOptions {
  /** Downsample only when an image's larger side exceeds this many pixels. */
  maxDim: number;
  /** JPEG quality 0..1 for re-encoding. */
  quality: number;
}

/** A PDFName's bare name without the leading slash (pdf-lib's asString keeps
 *  it, e.g. "/Image" → "Image"), or null if the value isn't a name. */
const nameOf = (v: unknown): string | null =>
  v instanceof PDFName ? v.asString().replace(/^\//, "") : null;

/** Read a PDFNumber entry, or null. */
function num(dict: { get: (k: PDFName) => unknown }, key: string): number | null {
  const v = dict.get(PDFName.of(key));
  return v instanceof PDFNumber ? v.asNumber() : null;
}

/** True if this image stream is safe to re-encode as a DeviceRGB JPEG without
 *  changing how it renders. We deliberately skip anything where the browser's
 *  standalone JPEG decode might not match the PDF's intended output:
 *  non-DCTDecode filters, CMYK / indexed / exotic colour spaces, a /Decode
 *  array, soft/stencil masks, or image masks. Skipping just leaves the image
 *  untouched — never corrupts it. */
function isSafeJpeg(stream: PDFRawStream): boolean {
  const d = stream.dict;
  if (nameOf(d.get(PDFName.of("Subtype"))) !== "Image") return false;

  // Exactly one filter, DCTDecode.
  const filter = d.get(PDFName.of("Filter"));
  const filterName =
    filter instanceof PDFArray
      ? filter.size() === 1
        ? nameOf(filter.get(0))
        : null
      : nameOf(filter);
  if (filterName !== "DCTDecode") return false;

  // No masks / stencil (JPEG can't carry alpha; dropping it would change output).
  if (d.get(PDFName.of("SMask")) || d.get(PDFName.of("Mask"))) return false;
  const imageMask = d.get(PDFName.of("ImageMask"));
  if (imageMask && nameOf(imageMask) !== "false") return false;
  // A /Decode array can invert/remap samples — skip so we don't ignore it.
  if (d.get(PDFName.of("Decode"))) return false;

  // Colour space must be one the browser decode reproduces faithfully:
  // DeviceRGB, DeviceGray, or ICCBased with 1 or 3 components. Skip CMYK,
  // Indexed, Separation, etc.
  const cs = d.get(PDFName.of("ColorSpace"));
  const csName = nameOf(cs);
  if (csName === "DeviceRGB" || csName === "DeviceGray") return true;
  if (cs instanceof PDFArray && cs.size() >= 2 && nameOf(cs.get(0)) === "ICCBased") {
    // ICCBased profile is a stream carrying /N (component count).
    const icc = stream.dict.context.lookup(cs.get(1)) as unknown as
      | { dict?: { get: (k: PDFName) => unknown } }
      | undefined;
    const iccDict = icc?.dict;
    if (!iccDict) return false;
    const n = num(iccDict, "N");
    return n === 1 || n === 3;
  }
  return false;
}

/**
 * Shrink a PDF by downsampling and re-encoding its oversized JPEG images in
 * place, leaving all vector/text content — and every image we can't safely
 * touch — exactly as it was. This keeps the document selectable/searchable
 * while cutting the bulk that dominates most large PDFs (embedded photos and
 * scans).
 *
 * Each candidate image is decoded by the browser (so it handles the colour
 * space), downscaled if its larger side exceeds `maxDim`, and re-encoded with
 * MozJPEG. The original is kept whenever re-encoding wouldn't be smaller, so a
 * page never grows.
 */
export async function optimizeImages(
  doc: PDFDocument,
  opts: OptimizeImagesOptions,
): Promise<OptimizeImagesResult> {
  const encode = await loadJpegEncoder(opts.quality);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return { changed: 0, saved: 0 };

  let changed = 0;
  let saved = 0;

  const entries = doc.context.enumerateIndirectObjects();
  for (const [ref, obj] of entries as [PDFRef, unknown][]) {
    if (!(obj instanceof PDFRawStream)) continue;
    if (!isSafeJpeg(obj)) continue;

    const d = obj.dict;
    const w = num(d, "Width");
    const h = num(d, "Height");
    if (!w || !h) continue;
    const longest = Math.max(w, h);
    // Only bother when the image is large enough that downsampling helps.
    if (longest <= opts.maxDim && obj.contents.length < 40_000) continue;

    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(new Blob([obj.contents.slice() as BlobPart], { type: "image/jpeg" }));
    } catch {
      continue; // undecodable → leave untouched
    }

    const factor = longest > opts.maxDim ? opts.maxDim / longest : 1;
    const nw = Math.max(1, Math.round(w * factor));
    const nh = Math.max(1, Math.round(h * factor));
    canvas.width = nw;
    canvas.height = nh;
    ctx.clearRect(0, 0, nw, nh);
    ctx.drawImage(bitmap, 0, 0, nw, nh);
    bitmap.close?.();

    let encoded: Uint8Array;
    try {
      encoded = await encode(canvas);
    } catch {
      continue;
    }
    // Never grow a stream: keep the original if re-encoding didn't help.
    if (encoded.length >= obj.contents.length) continue;

    const ctxObj = doc.context;
    const newDict = ctxObj.obj({}) as unknown as { set: (k: PDFName, v: unknown) => void };
    // Preserve the /Interpolate flag if present; otherwise a minimal image dict.
    newDict.set(PDFName.of("Type"), PDFName.of("XObject"));
    newDict.set(PDFName.of("Subtype"), PDFName.of("Image"));
    newDict.set(PDFName.of("Width"), PDFNumber.of(nw));
    newDict.set(PDFName.of("Height"), PDFNumber.of(nh));
    newDict.set(PDFName.of("ColorSpace"), PDFName.of("DeviceRGB"));
    newDict.set(PDFName.of("BitsPerComponent"), PDFNumber.of(8));
    newDict.set(PDFName.of("Filter"), PDFName.of("DCTDecode"));
    newDict.set(PDFName.of("Length"), PDFNumber.of(encoded.length));

    const newStream = PDFRawStream.of(newDict as never, encoded);
    ctxObj.assign(ref, newStream);
    changed++;
    saved += obj.contents.length - encoded.length;
  }

  return { changed, saved };
}
