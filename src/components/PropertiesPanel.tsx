import { Icon } from "./Icon";
import type { FontKey, Selection, TextStyle } from "../pdf/types";

interface Props {
  selection: Selection;
  style: TextStyle | null;
  redactionColor: string | null;
  onChangeStyle: (patch: Partial<TextStyle>) => void;
  onChangeRedactionColor: (color: string) => void;
  onDelete: () => void;
  /** Mobile bottom-sheet close affordance (omitted on desktop side panel). */
  onClose?: () => void;
}

const FONTS: { key: FontKey; label: string }[] = [
  { key: "sans", label: "Sans" },
  { key: "serif", label: "Serif" },
  { key: "mono", label: "Mono" },
];

/** Contextual controls for the selected element. */
export function PropertiesPanel({
  selection,
  style,
  redactionColor,
  onChangeStyle,
  onChangeRedactionColor,
  onDelete,
  onClose,
}: Props) {
  const title =
    selection?.kind === "redaction"
      ? "Redaction"
      : selection?.kind === "textbox"
        ? "Text box"
        : selection?.kind === "fragment"
          ? "Text"
          : "Properties";

  return (
    <div className="props">
      <div className="props__header">
        <span className="props__title title-medium">{title}</span>
        {onClose && (
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" size={22} />
          </button>
        )}
      </div>

      {!selection && (
        <p className="props__empty body-medium">
          Select text to restyle it, or use the tools to add text and
          redactions.
        </p>
      )}

      {selection?.kind === "redaction" && (
        <div className="props__section">
          <div className="field">
            <span className="field__label label-medium">Fill colour</span>
            <label className="swatch">
              <input
                type="color"
                value={redactionColor ?? "#000000"}
                onChange={(e) => onChangeRedactionColor(e.target.value)}
              />
              <span style={{ background: redactionColor ?? "#000000" }} />
            </label>
          </div>
          <button className="btn btn--danger" onClick={onDelete}>
            <Icon name="delete" size={18} /> Delete
          </button>
        </div>
      )}

      {style && selection && selection.kind !== "redaction" && (
        <div className="props__section">
          <div className="field">
            <span className="field__label label-medium">Font</span>
            <div className="segmented">
              {FONTS.map((f) => (
                <button
                  key={f.key}
                  className={`segmented__btn${style.font === f.key ? " segmented__btn--on" : ""}`}
                  onClick={() => onChangeStyle({ font: f.key })}
                  style={{
                    fontFamily:
                      f.key === "serif"
                        ? "Georgia, serif"
                        : f.key === "mono"
                          ? "ui-monospace, monospace"
                          : "inherit",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field field--row">
            <span className="field__label label-medium">Style</span>
            <div className="chip-row">
              <button
                className={`chip${style.bold ? " chip--on" : ""}`}
                onClick={() => onChangeStyle({ bold: !style.bold })}
                aria-pressed={style.bold}
                style={{ fontWeight: 700 }}
              >
                B
              </button>
              <button
                className={`chip${style.italic ? " chip--on" : ""}`}
                onClick={() => onChangeStyle({ italic: !style.italic })}
                aria-pressed={style.italic}
                style={{ fontStyle: "italic" }}
              >
                I
              </button>
            </div>
          </div>

          <div className="field">
            <span className="field__label label-medium">
              Size <b>{Math.round(style.size)}</b>
            </span>
            <input
              className="slider"
              type="range"
              min={6}
              max={96}
              value={Math.min(96, Math.max(6, Math.round(style.size)))}
              onChange={(e) => onChangeStyle({ size: Number(e.target.value) })}
            />
          </div>

          <div className="field">
            <span className="field__label label-medium">Colour</span>
            <label className="swatch">
              <input
                type="color"
                value={style.color}
                onChange={(e) => onChangeStyle({ color: e.target.value })}
              />
              <span style={{ background: style.color }} />
            </label>
          </div>

          {selection.kind === "textbox" && (
            <button className="btn btn--danger" onClick={onDelete}>
              <Icon name="delete" size={18} /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
