import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { useModal } from "../hooks/useModal";
import type { CompressOptions } from "../pdf/finishOps";

interface Estimate {
  before: number;
  after: number;
  helped: boolean;
}

interface Props {
  /** Compress at the given preset and report the resulting size (no download). */
  onEstimate: (opts: CompressOptions) => Promise<Estimate>;
  /** Download the most recently estimated result. */
  onDownload: () => void;
  onClose: () => void;
}

const PRESETS: { key: string; label: string; hint: string; opts: CompressOptions }[] = [
  { key: "high", label: "High quality", hint: "≈150 dpi · crisp", opts: { scale: 2, quality: 0.82 } },
  { key: "balanced", label: "Balanced", hint: "≈110 dpi · good for sharing", opts: { scale: 1.5, quality: 0.7 } },
  { key: "small", label: "Smallest", hint: "≈72 dpi · email-friendly", opts: { scale: 1, quality: 0.6 } },
];

const fmt = (n: number) => (n < 1_000_000 ? Math.round(n / 1000) + " KB" : (n / 1_000_000).toFixed(2) + " MB");

/** Pick a compression preset and preview the resulting size before downloading.
 * Compression rasterises pages (text becomes an image), which is called out so
 * the trade-off is clear. */
export function CompressDialog({ onEstimate, onDownload, onClose }: Props) {
  const [sel, setSel] = useState("balanced");
  const [busy, setBusy] = useState(false);
  const [est, setEst] = useState<Estimate | null>(null);
  const [errored, setErrored] = useState(false);
  const modalRef = useModal<HTMLDivElement>(onClose);

  // Re-estimate whenever the preset changes; clears any stale preview first.
  const pick = async (key: string) => {
    setSel(key);
    setEst(null);
    setErrored(false);
    setBusy(true);
    try {
      const result = await onEstimate(PRESETS.find((p) => p.key === key)!.opts);
      setEst(result);
    } catch {
      setErrored(true);
    } finally {
      setBusy(false);
    }
  };

  // Preview the default preset as soon as the dialog opens.
  useEffect(() => {
    void pick("balanced");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = est && est.before > 0 ? Math.round((1 - est.after / est.before) * 100) : 0;

  return (
    <div className="dialog-scrim" onPointerDown={onClose}>
      <div
        ref={modalRef}
        tabIndex={-1}
        className="dialog dialog--sm"
        role="dialog"
        aria-modal="true"
        aria-label="Compress PDF"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="dialog__head">
          <span className="title-medium">Compress PDF</span>
          <button className="icon-btn" onClick={onClose} aria-label="Close" data-tip="Close">
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="compress__presets">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              className={`compress__preset${sel === p.key ? " compress__preset--on" : ""}`}
              onClick={() => void pick(p.key)}
              aria-pressed={sel === p.key}
              disabled={busy}
            >
              <span className="compress__preset-label">{p.label}</span>
              <span className="compress__preset-hint body-small">{p.hint}</span>
            </button>
          ))}
        </div>

        {/* Live size preview for the selected preset. */}
        <div className="compress__estimate body-medium" aria-live="polite">
          {busy ? (
            <><span className="spinner spinner--sm" aria-hidden="true" /> Estimating size…</>
          ) : errored ? (
            <span className="compress__estimate-err">Couldn't estimate — try again.</span>
          ) : est ? (
            est.helped ? (
              <><Icon name="compress" size={15} /> {fmt(est.before)} → <strong>{fmt(est.after)}</strong> · {pct}% smaller</>
            ) : (
              <>Already compact — {fmt(est.before)}. Compressing would grow it to {fmt(est.after)}, so the original is kept.</>
            )
          ) : (
            <>Pick a preset to preview the size.</>
          )}
        </div>

        <p className="confirm__msg body-small">
          Compression flattens each page to an image, so the exported copy won't be text-editable.
          Your working document is untouched.
        </p>
        <div className="dialog__actions">
          <button className="btn btn--text" onClick={onClose}>Cancel</button>
          <button className="btn btn--filled" onClick={onDownload} disabled={busy || !est}>
            <Icon name="download" size={16} /> {est && !est.helped ? "Download original" : "Download"}
          </button>
        </div>
      </div>
    </div>
  );
}
