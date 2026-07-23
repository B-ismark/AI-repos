import { useEffect, useRef, useState } from "react";

interface TipState {
  text: string;
  x: number;
  y: number;
  placement: "top" | "bottom";
}

const SHOW_DELAY = 110; // ms — deliberately fast

/**
 * A single, app-wide tooltip. Any element carrying a `data-tip` attribute gets
 * a styled bubble on hover/focus — no per-button wrapper, no native `title`
 * lag. Skipped on coarse (touch) pointers, where tooltips only get in the way.
 */
export function TooltipHost() {
  const [tip, setTip] = useState<TipState | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const current = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const clear = () => {
      window.clearTimeout(timer.current);
      current.current = null;
      setTip(null);
    };

    const show = (el: HTMLElement) => {
      const text = el.getAttribute("data-tip");
      if (!text) return;
      current.current = el;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (current.current !== el || !el.isConnected) return;
        const r = el.getBoundingClientRect();
        const above = r.top > 44;
        setTip({
          text,
          x: Math.round(r.left + r.width / 2),
          y: Math.round(above ? r.top - 8 : r.bottom + 8),
          placement: above ? "top" : "bottom",
        });
      }, SHOW_DELAY);
    };

    const onOver = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const el = (e.target as HTMLElement | null)?.closest?.("[data-tip]");
      if (el instanceof HTMLElement) show(el);
      else if (current.current) clear();
    };
    const onFocus = (e: FocusEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.("[data-tip]");
      if (el instanceof HTMLElement) show(el);
    };

    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerdown", clear, true);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", clear);
    window.addEventListener("scroll", clear, true);
    window.addEventListener("blur", clear);
    return () => {
      window.clearTimeout(timer.current);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerdown", clear, true);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", clear);
      window.removeEventListener("scroll", clear, true);
      window.removeEventListener("blur", clear);
    };
  }, []);

  if (!tip) return null;
  return (
    <div
      className={`tooltip tooltip--${tip.placement}`}
      role="tooltip"
      style={{ left: `${tip.x}px`, top: `${tip.y}px` }}
    >
      {tip.text}
    </div>
  );
}
