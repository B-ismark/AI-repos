# UI / UX Audit — PDF Editor

**Scope:** the full client-side PDF Editor (`src/`) — responsive shell, viewer,
tools, dialogs, and the Material 3 Expressive design system.
**Platforms reviewed:** mobile (phone, portrait + landscape), tablet, desktop —
in both **light** and **dark** themes.
**Method:** static review of every component, hook, and stylesheet against
Nielsen's usability heuristics, WCAG 2.2, the Gestalt principles, Material 3
guidance, and the common UX "laws" (Fitts, Hick, Jakob, Miller, Doherty,
Tesler, Aesthetic-Usability, Von Restorff).
**Date:** 2026-07-23

---

## How to read this report

**Criticality** — user impact if left unaddressed:

| Level | Meaning |
| --- | --- |
| 🔴 **Critical (P0)** | Blocks a whole user group or risks losing the user's work. |
| 🟠 **High (P1)** | Real accessibility failure or significant friction for many users. |
| 🟡 **Medium (P2)** | Noticeable problem on some platforms or in some flows. |
| ⚪ **Low (P3)** | Polish, consistency, or a nice-to-have enhancement. |

**Complexity** — engineering effort to fix:

| Level | Meaning |
| --- | --- |
| **Trivial** | One CSS rule or attribute; well under an hour. |
| **Low** | Localized change in a single component. |
| **Medium** | Touches several components or adds new behavior. |
| **High** | Architectural / substantial engineering. |

---

## What this app already does well

Worth stating up front — the baseline is strong, and several findings below are
refinements rather than rescues:

- **Theme system is exemplary.** A pre-paint inline script (`index.html:19`)
  resolves light/dark/system with no flash, `useTheme` follows the OS live in
  system mode and updates the `theme-color` meta, and every color is a token
  with a full dark palette (`theme.css`). Dark mode is a first-class citizen.
- **`prefers-reduced-motion` is honored** by zeroing the motion-duration tokens
  (`theme.css:155`), so every keyframe animation degrades to instant.
- **Undo/redo with gesture coalescing** (`useHistory`, keyed `doc.set`) is a
  genuinely advanced touch — drags and typing collapse into single steps.
- **Touch-first canvas model** — app-owned pan/pinch/double-tap with zoom
  anchoring (`useViewport`) and enlarged handles on coarse pointers
  (`styles.css:599`).
- **Destructive actions are guarded** with custom confirm dialogs
  (`ConfirmDialog`) rather than `window.confirm`, and preferences persist
  across sessions (`usePrefs`).
- **Aesthetic-Usability Effect** works in the app's favor: the M3 surface
  hierarchy, shape scale, and state layers make it feel trustworthy.

---

## Summary of findings

| # | Finding | Principle / Law | Platforms | Criticality | Complexity |
| --- | --- | --- | --- | --- | --- |
| 1 | No visible keyboard-focus indicator anywhere | WCAG 2.4.7; Nielsen "visibility of status" | All | 🔴 Critical | Trivial |
| 2 | Viewport blocks UI zoom (`user-scalable=no`) | WCAG 1.4.4 / 1.4.10 | Mobile, tablet | 🔴 Critical | Low |
| 3 | No unsaved-work guard on unload | Nielsen "error prevention"; Peak-End | All | 🔴 Critical | Trivial |
| 4 | Canvas elements are pointer-only (no keyboard) | WCAG 2.1.1 | All | 🟠 High | High |
| 5 | Dialogs lack focus trap, Esc, focus return, roles | WCAG 2.4.3; ARIA APG | All | 🟠 High | Medium |
| 6 | Icon-only bar controls unlabeled on touch | Nielsen "recognition"; Jakob | Mobile, tablet | 🟠 High | Low |
| 7 | Touch targets below 44px throughout | Fitts's Law; WCAG 2.5.8 | Mobile, tablet | 🟠 High | Low |
| 8 | Status messages not announced to AT | WCAG 4.1.3 | All | 🟡 Medium | Trivial |
| 9 | One breakpoint: no true tablet/desktop tiers | Responsive design; Fitts | Tablet, desktop | 🟡 Medium | Medium |
| 10 | Bottom-of-screen control congestion | Fitts; Law of Proximity | Mobile | 🟡 Medium | Low |
| 11 | No feedback during page render / zoom re-raster | Doherty Threshold | All | 🟡 Medium | Low |
| 12 | Raw technical error strings shown to users | Nielsen "recognize/recover from errors" | All | 🟡 Medium | Low |
| 13 | Overflow menu not keyboard-navigable | ARIA menu pattern; WCAG 2.1.1 | Desktop | 🟡 Medium | Low |
| 14 | contentEditable elements have no role/label | WCAG 4.1.2 | All | 🟡 Medium | Low |
| 15 | Bright white page glare in dark mode | Dark-mode ergonomics | All (dark) | ⚪ Low | Medium |
| 16 | Side panel appears/disappears (layout shift) | Gestalt stability; CLS | Tablet, desktop | ⚪ Low | Low |
| 17 | Inconsistent tooltip mechanisms (`title` vs custom) | Nielsen "consistency" | Desktop | ⚪ Low | Trivial |
| 18 | Sticky-note text contrast on user-chosen colors | WCAG 1.4.3 | All | ⚪ Low | Low |
| 19 | No keyboard shortcuts for tools | Nielsen "flexibility & efficiency" | Desktop | ⚪ Low | Low |
| 20 | README claims not matched by implementation | Trust / documentation | — | ⚪ Low | Trivial |

---

## Detailed findings

### 🔴 1 — No visible keyboard-focus indicator anywhere
**Principle:** WCAG 2.4.7 Focus Visible (AA); Nielsen "visibility of system status".
**Platforms:** all (keyboard, switch, and screen-reader users).

The stylesheet defines `:hover` and `:active` state layers on `.icon-btn` and
`.btn` (`styles.css:50`, `81`) but there is **no `:focus` or `:focus-visible`
rule in the entire codebase** (verified — zero matches). Tabbing through the
app moves focus invisibly across the app bar, tool nav, panel controls,
dialogs, and `contentEditable` overlays. A keyboard user literally cannot see
where they are.

- **Impact:** keyboard navigation is effectively unusable; a hard AA failure.
- **Fix:** add a global `:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }`
  plus a matched treatment for the state-layer buttons and the on-page
  `contentEditable` items.
- **Complexity:** Trivial.

---

### 🔴 2 — The viewport meta disables user zoom
**Principle:** WCAG 1.4.4 Resize Text (AA), 1.4.10 Reflow (AA).
**Platforms:** mobile, tablet.

```html
<!-- index.html:7 -->
content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
```

`maximum-scale=1.0, user-scalable=no` prevents the browser's native pinch-zoom.
The app implements its own pinch-zoom for the *document*, but the **UI chrome**
— app bar, tool labels, properties panel, dialogs, snackbars — cannot be
magnified at all. Low-vision users who rely on browser zoom are locked out of
the controls.

- **Why it's here:** to stop the page zooming while the canvas handles its own
  gestures — but `touch-action: none` on `.viewer__scroll` (`styles.css:187`)
  already scopes that to the canvas, so the global lock is overreach.
- **Fix:** drop `maximum-scale` and `user-scalable=no`; verify canvas gestures
  still behave (they should, given the scoped `touch-action`).
- **Complexity:** Low (one line + a manual gesture regression pass).

---

### 🔴 3 — No protection against losing unsaved work
**Principle:** Nielsen "error prevention"; Peak-End Rule.
**Platforms:** all.

Everything lives in memory — "no server, no uploads, no accounts." There is
**no `beforeunload` handler** (verified — zero matches). An accidental
refresh, tab close, or back-gesture silently discards every edit,
annotation, redaction, and placed signature. The in-app "Open another PDF"
flow *is* guarded (`App.tsx:621`), which makes the missing unload guard an
inconsistency as much as a risk.

- **Impact:** catastrophic, unrecoverable data loss from a common gesture —
  and it poisons the "end" of the experience (Peak-End).
- **Fix:** attach a `beforeunload` listener while `changeCount > 0`.
- **Complexity:** Trivial.

---

### 🟠 4 — On-page elements are operable by pointer only
**Principle:** WCAG 2.1.1 Keyboard (A).
**Platforms:** all.

Selecting, moving, resizing, and (for text boxes/notes) editing on-page
elements is driven entirely by pointer events (`PageView.onDown`,
`startPointerDrag` in `useDrag.ts`, and every `*Item` component). Once a
redaction or stamp *is* selected, Delete/Backspace works (`App.tsx:564`), but
there is no keyboard route to select or reposition anything. There is also no
`<main>` landmark and no skip link.

- **Impact:** the core editing surface is unreachable without a pointer.
- **Fix:** make items focusable with roving `tabindex`, add arrow-key nudging
  and Enter/Space to select; add a `<main>` landmark. Full parity is a large
  effort inherent to canvas editors — a phased approach (focus + delete +
  nudge) delivers most of the value.
- **Complexity:** High. *(Reasonable to document as a known limitation while
  the higher-ROI a11y fixes above land first.)*

---

### 🟠 5 — Dialogs are not fully accessible modals
**Principle:** WCAG 2.4.3 Focus Order; ARIA Authoring Practices (dialog).
**Platforms:** all.

`SignatureDialog`, `FinishDialog`, `Organize`, and the `ColorField` popover:

- **No focus trap** — Tab escapes to the page behind the scrim.
- **No Escape-to-close** (verified — no Escape handling anywhere). Users must
  hit the ✕ or tap the scrim.
- **Focus isn't moved in on open, nor returned to the trigger on close.**
- **Inconsistent semantics:** only `ConfirmDialog` has `role="alertdialog"`
  + `aria-modal` (`ConfirmDialog.tsx:23`); `SignatureDialog`/`FinishDialog`
  are plain divs; `ColorField` has `role="dialog"` but no label or
  `aria-modal` (`ColorField.tsx:61`).

- **Fix:** a small shared `useModal` (or `<dialog>`) that traps focus, closes
  on Escape, restores focus, and standardizes `role`/`aria-modal`/labelling.
- **Complexity:** Medium (one primitive, applied in ~4 places).

---

### 🟠 6 — Icon-only bar controls are unlabeled on touch
**Principle:** Nielsen "recognition rather than recall"; Jakob's Law.
**Platforms:** mobile, tablet.

The app-bar Undo, Redo, More (⋮), and Theme buttons are icon-only. They carry
`aria-label`/`data-tip`, but `TooltipHost` deliberately suppresses tips on
coarse pointers (`TooltipHost.tsx:48`), and on phones the text Download label
and app name are hidden too (`styles.css:1015`). A touch user is left to
*recall* what each glyph does, with no on-demand label. (The bottom tool nav is
fine — it has permanent text labels.)

- **Fix:** on touch, surface labels on long-press, or move overflow-menu-style
  labeled rows for these actions; at minimum keep the accessible names (present)
  and add a visible label affordance.
- **Complexity:** Low.

---

### 🟠 7 — Touch targets fall below the recommended minimum
**Principle:** Fitts's Law; WCAG 2.5.8 Target Size (Minimum, AA = 24px; Material recommends 48px).
**Platforms:** mobile, tablet.

- `.icon-btn` is **40×40px** (`styles.css:29`) — the most-used control in the
  app (app bar, zoom bar, draw bar, organize). Below the 44/48px comfort target
  and below the README's claimed "48px touch targets."
- `.btn` is **38px tall** (`styles.css:63`) — all dialog Cancel/Apply/Add
  buttons.
- `.sigsaved__del` is **22×22px** at a -6px offset (`styles.css:806`) — below
  even the 24px WCAG floor, and easy to miss or fat-finger.
- `.posgrid__cell` is 30px tall (`styles.css:416`); the `.tb-move` handle is
  24×16 (32×20 coarse).

- **Fix:** raise `.icon-btn`/`.btn` to 44–48px (or keep visual size but expand
  the hit area with padding/`::before`), and enlarge the tiny delete affordance.
- **Complexity:** Low.

---

### 🟡 8 — Status messages aren't announced to assistive tech
**Principle:** WCAG 4.1.3 Status Messages (AA).
**Platforms:** all.

The snackbar renders as a plain `<div>` (`App.tsx:904`) with no `aria-live` or
`role`. "Downloaded edited PDF," "Tap the page to place your signature," and
error text are invisible to screen-reader users. The same applies to the
"placing" instructional messages that are the *only* cue for the place-stamp
flow.

- **Fix:** `role="status"` + `aria-live="polite"` for normal messages,
  `role="alert"` for `snackbar--err`.
- **Complexity:** Trivial.

---

### 🟡 9 — A single 600px breakpoint collapses tablet and desktop
**Principle:** responsive design; Fitts's Law.
**Platforms:** tablet, desktop.

Everything above `min-width: 600px` (`styles.css:975`) is treated identically,
which creates three separate problems:

- **Cramped at ~600px:** a 66px rail + 288px side panel leaves ~246px for the
  document on a 600px-wide tablet in portrait, and the panel can't be collapsed.
- **Over-scaled on wide desktops:** fit-to-width scales the widest page to the
  viewport (`useViewport.ts:40`) with no max-width or two-page spread, so on a
  1920px monitor a single page balloons to an awkward size.
- **No landscape-phone handling:** in landscape the top bar + bottom nav + FAB
  crush the viewer vertically, and the 72%-height bottom sheet (`styles.css:270`)
  covers most of what's left.

- **Fix:** add a desktop tier (e.g. ≥1024px) with a content max-width / optional
  two-up view, make the tablet side panel collapsible, and add a short-viewport
  media query.
- **Complexity:** Medium.

---

### 🟡 10 — Bottom-of-screen controls compete for the same space
**Principle:** Fitts's Law; Gestalt Law of Proximity.
**Platforms:** mobile.

On phones the bottom edge simultaneously hosts the full-width tool nav, the FAB
(`bottom: 88px`, `styles.css:364`), and the zoom bar (`bottom: 76px`,
`styles.css:232`) — and opening the properties sheet (up to 72% height) lands on
top of all of it. Three stacked, differently-elevated targets in the thumb zone
invite mis-taps, and proximity makes them read as one cluttered region.

- **Fix:** hide the zoom bar while the sheet is open, or dock zoom into the nav;
  reduce simultaneous floating layers.
- **Complexity:** Low.

---

### 🟡 11 — No feedback during page render or zoom re-rasterization
**Principle:** Doherty Threshold (<400ms).
**Platforms:** all.

`PageView` debounces 90ms then rasterizes each page (`PageView.tsx:87`). During
initial open of a large document, and on **every zoom change** (which re-renders
at the new scale), pages show a blank white canvas with no spinner or skeleton.
On big/complex PDFs this can visibly exceed the 400ms comfort threshold with no
indication that work is happening.

- **Fix:** per-page loading skeleton/shimmer until the canvas paints; consider a
  low-res immediate paint upscaled while the sharp render runs.
- **Complexity:** Low (skeleton) to Medium (progressive raster).

---

### 🟡 12 — Errors are shown as raw technical strings
**Principle:** Nielsen "help users recognize, diagnose, and recover from errors."
**Platforms:** all.

Failures surface `String(err)` directly — e.g. `Could not open PDF: ${String(err)}`
(`App.tsx:138`), and similar in the finishing/export paths. Users see stack-ish
text like "Error: Invalid PDF structure" with no guidance on what to do.

- **Fix:** map common failures (corrupt/encrypted/non-PDF) to plain-language
  messages with a next step; keep the raw detail behind a "details" affordance.
- **Complexity:** Low.

---

### 🟡 13 — The overflow menu isn't keyboard-navigable
**Principle:** ARIA menu pattern; WCAG 2.1.1.
**Platforms:** desktop.

The ⋮ menu uses `role="menu"`/`role="menuitem"` (`App.tsx:670`) but has no
arrow-key roving focus, no Home/End, and no Escape-to-close/focus-return.
Declaring the menu role without the keyboard behavior is worse than a plain
list because AT announces interactions the widget doesn't support.

- **Fix:** implement roving `tabindex` + arrow/Escape handling, or drop the menu
  roles in favor of a labeled button group.
- **Complexity:** Low.

---

### 🟡 14 — On-page editable text has no accessible role or name
**Principle:** WCAG 4.1.2 Name, Role, Value.
**Platforms:** all.

`EditableFragment`, `TextBoxItem`, and `NoteItem` are `contentEditable` `<div>`s
with no `role="textbox"`, no `aria-label`, and (for text boxes/notes) no
programmatic name. The fragment at least sets `title={fragment.original}`
(`EditableFragment.tsx:92`); the others expose nothing to AT.

- **Fix:** add `role="textbox"`, `aria-multiline="false"`, and a meaningful
  `aria-label` ("Editable text: …" / "Sticky note").
- **Complexity:** Low.

---

### ⚪ 15 — Full-white page is harsh in dark mode
**Principle:** dark-mode ergonomics.
**Platforms:** all (dark theme).

`.page` and thumbnails are hardcoded `#fff` (`styles.css:209`, `954`) — correct
for representing paper, but on the `--surface-dim` (#141218) dark background a
full-page white rectangle is a bright slab that causes glare in low light.
Mature PDF readers offer a page-dim / invert / sepia mode for exactly this.

- **Fix:** offer an optional "dark page" / dimmed-canvas view (CSS filter on the
  canvas, preview-only) toggle; keep export untouched.
- **Complexity:** Medium.

---

### ⚪ 16 — Side panel appears and disappears, shifting layout
**Principle:** Gestalt stability; Cumulative Layout Shift.
**Platforms:** tablet, desktop.

The side panel only renders when something is selected (`App.tsx:869`), so on
desktop the viewer widens and narrows as selection changes. `useViewport`
intentionally avoids rescaling to prevent a zoom-jump (`useViewport.ts:44`),
which is a thoughtful mitigation, but the panel itself still pops in/out — and
the README's "persistent side panel" describes a stability the build doesn't
deliver.

- **Fix:** on desktop, keep a persistent panel that shows the empty-state copy
  (`props__empty` already exists) instead of unmounting.
- **Complexity:** Low.

---

### ⚪ 17 — Two different tooltip mechanisms
**Principle:** Nielsen "consistency and standards."
**Platforms:** desktop.

Most controls use the custom `data-tip`/`TooltipHost` system (fast, styled),
but the move/resize handles use the native `title` attribute
(`TextBoxItem.tsx:113`, `118`) — which is slow, unstyled, and invisible on
touch. Two tooltip systems for one app.

- **Fix:** standardize on `data-tip`.
- **Complexity:** Trivial.

---

### ⚪ 18 — Sticky-note text contrast depends on user color choice
**Principle:** WCAG 1.4.3 Contrast.
**Platforms:** all.

Sticky notes paint text at a fixed `#1a1a1a` on a user-chosen background
(`styles.css:611`, `NoteItem` `style.background = color`). The default yellow is
fine, but a user who picks a dark note color gets near-black text on a dark
fill.

- **Fix:** auto-pick black/white note text from the background luminance.
- **Complexity:** Low.

---

### ⚪ 19 — No keyboard shortcuts for tool switching
**Principle:** Nielsen "flexibility and efficiency of use."
**Platforms:** desktop.

Undo/redo/delete have shortcuts (`App.tsx:550`), but there are no accelerators
for the primary tools (Select/Text/Draw/Sign/Redact) the way every comparable
editor offers (V, T, etc.). Power users on desktop pay a mouse round-trip for
every tool switch.

- **Fix:** add single-key tool shortcuts with a discoverable hint in tooltips.
- **Complexity:** Low.

---

### ⚪ 20 — README claims not matched by the implementation
**Principle:** trust / documentation accuracy.

Two specifics: the README advertises **"48px touch targets"** (actual
`.icon-btn` is 40px — see #7) and a **"persistent side panel"** on
tablet/desktop (actually conditional — see #16). Small gaps, but they erode
trust when a reviewer checks.

- **Fix:** align the code to the claims (preferred) or soften the claims.
- **Complexity:** Trivial.

---

## Cross-cutting themes

1. **Keyboard & screen-reader accessibility is the biggest gap.** Findings 1,
   4, 5, 8, 13, 14 all point the same way: the app is beautifully built for
   pointer + sighted use, and largely unbuilt for keyboard and AT. Fixing
   focus-visible (#1), the unload guard (#3), the viewport lock (#2), live
   regions (#8), and dialog behavior (#5) is high-value and mostly low-cost.
2. **"Responsive" today means "phone vs. not-phone."** The single 600px
   breakpoint (#9) leaves real tablet, wide-desktop, and landscape cases
   unoptimized.
3. **Dark mode is structurally excellent** — the one ergonomic gap is page
   glare (#15); everything else in dark theme is handled correctly.
4. **Feedback is good globally but thin locally** — strong document-level status,
   but per-page render (#11) and error legibility (#12) need attention.

## Suggested sequencing

- **Quick wins (Trivial/Low, high impact):** #1 focus-visible, #3 unload guard,
  #8 live regions, #2 viewport, #7 touch targets, #6 touch labels, #12 error
  copy, #17 tooltip consistency, #20 README.
- **Next (Low/Medium):** #5 modal primitive, #13 menu keyboard, #14 editable
  roles, #10 bottom-bar congestion, #11 render feedback, #16 persistent panel,
  #9 breakpoint tiers.
- **Larger, plan separately:** #4 full keyboard editing, #15 dark-page view.
