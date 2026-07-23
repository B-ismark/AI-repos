import { useCallback, useMemo, useRef, useState } from "react";
import { PageView } from "./components/PageView";
import { loadPdf } from "./pdf/loader";
import { exportPdf } from "./pdf/exporter";
import type { Edits, LoadedPdf } from "./pdf/types";

type Status = "idle" | "loading" | "ready" | "exporting" | "error";

export function App() {
  const [pdf, setPdf] = useState<LoadedPdf | null>(null);
  const [fileName, setFileName] = useState("document.pdf");
  const [edits, setEdits] = useState<Edits>({});
  const [scale, setScale] = useState(1.4);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const editedCount = useMemo(
    () =>
      pdf
        ? pdf.pages
            .flatMap((p) => p.fragments)
            .filter(
              (f) => edits[f.id] !== undefined && edits[f.id] !== f.original,
            ).length
        : 0,
    [pdf, edits],
  );

  const openFile = useCallback(async (file: File) => {
    if (file.type && file.type !== "application/pdf") {
      setStatus("error");
      setMessage(`"${file.name}" is not a PDF.`);
      return;
    }
    setStatus("loading");
    setMessage(`Loading ${file.name}…`);
    try {
      const bytes = await file.arrayBuffer();
      const loaded = await loadPdf(bytes);
      setPdf(loaded);
      setFileName(file.name);
      setEdits({});
      setFocusedId(null);
      setStatus("ready");
      const total = loaded.pages.reduce((n, p) => n + p.fragments.length, 0);
      setMessage(`${loaded.pages.length} page(s), ${total} text fragments.`);
    } catch (err) {
      setStatus("error");
      setMessage(`Could not open PDF: ${String(err)}`);
    }
  }, []);

  const onChange = useCallback((id: string, text: string) => {
    setEdits((prev) => ({ ...prev, [id]: text }));
  }, []);

  const onFocus = useCallback((id: string) => setFocusedId(id), []);
  const onBlur = useCallback(() => setFocusedId(null), []);

  const download = useCallback(async () => {
    if (!pdf) return;
    setStatus("exporting");
    setMessage("Building edited PDF…");
    try {
      const out = await exportPdf(pdf, edits);
      const blob = new Blob([out as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName.replace(/\.pdf$/i, "") + "-edited.pdf";
      a.click();
      URL.revokeObjectURL(url);
      setStatus("ready");
      setMessage("Downloaded edited PDF.");
    } catch (err) {
      setStatus("error");
      setMessage(`Export failed: ${String(err)}`);
    }
  }, [pdf, edits, fileName]);

  const reset = useCallback(() => {
    if (editedCount > 0 && !confirm("Discard all edits and start over?")) return;
    setPdf(null);
    setEdits({});
    setFocusedId(null);
    setStatus("idle");
    setMessage("");
  }, [editedCount]);

  return (
    <div className="app">
      <header className="toolbar">
        <div className="toolbar__brand">
          <span className="toolbar__logo">✎</span>
          <span>PDF Text Editor</span>
        </div>

        {pdf && (
          <div className="toolbar__group">
            <button
              onClick={() => setScale((s) => Math.max(0.5, +(s - 0.2).toFixed(2)))}
              title="Zoom out"
            >
              −
            </button>
            <span className="toolbar__zoom">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale((s) => Math.min(3, +(s + 0.2).toFixed(2)))}
              title="Zoom in"
            >
              +
            </button>
          </div>
        )}

        <div className="toolbar__spacer" />

        {pdf && (
          <>
            <span className="toolbar__status">
              {editedCount > 0
                ? `${editedCount} edit${editedCount === 1 ? "" : "s"}`
                : "No edits yet"}
            </span>
            <button
              className="btn btn--primary"
              onClick={download}
              disabled={status === "exporting"}
            >
              {status === "exporting" ? "Exporting…" : "Download PDF"}
            </button>
            <button className="btn" onClick={reset}>
              New file
            </button>
          </>
        )}
      </header>

      {!pdf ? (
        <div
          className={`dropzone${dragging ? " dropzone--active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) void openFile(file);
          }}
          onClick={() => inputRef.current?.click()}
        >
          <div className="dropzone__icon">📄</div>
          <h1>Drop a PDF here</h1>
          <p>or click to browse. Everything runs in your browser — no uploads.</p>
          {status === "loading" && <p className="dropzone__note">{message}</p>}
          {status === "error" && <p className="dropzone__error">{message}</p>}
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void openFile(file);
              e.target.value = "";
            }}
          />
        </div>
      ) : (
        <>
          <div className="statusbar">
            <span className={status === "error" ? "statusbar--error" : ""}>
              {message}
            </span>
            <span className="statusbar__hint">
              Click any text to edit it, then Download.
            </span>
          </div>
          <main className="viewer">
            {pdf.pages.map((page) => (
              <PageView
                key={page.pageIndex}
                bytes={pdf.bytes}
                page={page}
                scale={scale}
                edits={edits}
                focusedId={focusedId}
                onFocus={onFocus}
                onBlur={onBlur}
                onChange={onChange}
              />
            ))}
          </main>
        </>
      )}
    </div>
  );
}
