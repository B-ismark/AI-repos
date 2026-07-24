import { PDFArray, PDFDict, PDFDocument, PDFName } from "pdf-lib";

/**
 * Strip identifying and potentially-active hidden data from a document before
 * it leaves the browser: document metadata (Info dictionary + XMP), creation/
 * modification timestamps, embedded JavaScript, embedded files, and auto-run
 * actions.
 *
 * This makes the app's privacy promise concrete — a downloaded copy should not
 * silently carry who made it, when, or with what tool, nor any active content
 * that runs when the file is opened. The exporter rebuilds into a fresh
 * document (which already drops the source's catalog-level metadata), so this
 * pass mainly (a) prevents pdf-lib stamping its own Producer/timestamps and
 * (b) scrubs page-level actions that ride along on copied pages.
 *
 * Best-effort and defensive: a malformed object anywhere is skipped rather than
 * failing the whole export. Callers MUST save with `updateMetadata: false` so
 * pdf-lib doesn't re-stamp Producer/CreationDate/ModDate afterwards.
 */
export function sanitizeDocument(doc: PDFDocument): void {
  const ctx = doc.context;
  const catalog = doc.catalog;
  const deref = (obj: unknown) => (obj ? ctx.lookup(obj as never) : undefined);

  // 1) Empty the Info dictionary — author/tool/timestamps and all. pdf-lib
  //    stamps its own Producer + CreationDate/ModDate when the output document
  //    is created, so deleting these here (just before save) is what actually
  //    keeps them out of the downloaded file.
  try {
    const info = deref(ctx.trailerInfo.Info);
    if (info instanceof PDFDict) {
      for (const key of [
        "Title",
        "Author",
        "Subject",
        "Keywords",
        "Creator",
        "Producer",
        "CreationDate",
        "ModDate",
        "Trapped",
      ]) {
        info.delete(PDFName.of(key));
      }
    }
  } catch {
    /* no / malformed Info dict */
  }

  // 2) Remove the XMP metadata stream and any document-level auto-run/extra
  //    actions (OpenAction and AA are common JavaScript triggers).
  for (const key of ["Metadata", "OpenAction", "AA"]) {
    try {
      catalog.delete(PDFName.of(key));
    } catch {
      /* ignore */
    }
  }

  // 3) Remove embedded JavaScript + embedded files from the Names tree, and XFA
  //    (which can carry active content) from any AcroForm.
  try {
    const names = deref(catalog.get(PDFName.of("Names")));
    if (names instanceof PDFDict) {
      names.delete(PDFName.of("JavaScript"));
      names.delete(PDFName.of("EmbeddedFiles"));
    }
  } catch {
    /* ignore */
  }
  try {
    const acro = deref(catalog.get(PDFName.of("AcroForm")));
    if (acro instanceof PDFDict) acro.delete(PDFName.of("XFA"));
  } catch {
    /* ignore */
  }

  // 4) Scrub page-level additional actions and per-annotation JavaScript
  //    actions. URI/link/GoTo actions are preserved so real links keep working.
  for (const page of doc.getPages()) {
    try {
      page.node.delete(PDFName.of("AA"));
    } catch {
      /* ignore */
    }
    let annots: unknown;
    try {
      annots = deref(page.node.get(PDFName.of("Annots")));
    } catch {
      annots = undefined;
    }
    if (!(annots instanceof PDFArray)) continue;
    for (let i = 0; i < annots.size(); i++) {
      let annot: unknown;
      try {
        annot = ctx.lookup(annots.get(i));
      } catch {
        continue;
      }
      if (!(annot instanceof PDFDict)) continue;
      try {
        annot.delete(PDFName.of("AA"));
      } catch {
        /* ignore */
      }
      try {
        const action = deref(annot.get(PDFName.of("A")));
        if (action instanceof PDFDict) {
          const s = action.get(PDFName.of("S"));
          if (s instanceof PDFName && s.toString() === "/JavaScript") {
            annot.delete(PDFName.of("A"));
          }
        }
      } catch {
        /* ignore */
      }
    }
  }
}
