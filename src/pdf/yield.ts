/**
 * Yield control back to the browser so it can paint and process input between
 * chunks of CPU-heavy work (per-page rasterisation/encoding). This doesn't move
 * the work off the main thread — a full Web Worker / OffscreenCanvas migration
 * would — but it turns one long freeze into short per-page bursts with a paint
 * in between, so progress updates show and the tab stays responsive.
 */
export function yieldToUI(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
