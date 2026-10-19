/**
 * Numeric input with an optional slider.
 *
 * The committed value is always a finite number; malformed text is never pushed
 * into scenario state. Text is committed on Enter or when the field loses focus,
 * so a partially typed decimal (for example "7.") cannot be reinterpreted
 * mid-keystroke. Range limits are enforced by the engine's validator, so typed
 * input outside the supported range surfaces a real validation message rather
 * than being silently clamped here.
 */

import { useState } from 'react';

/** Trims float noise for display; the committed value itself stays exact. */
function formatDraft(value: number): string {
  if (!Number.isFinite(value)) {
    return '';
  }
  return String(Number(value.toFixed(4)));
}

export type NumberFieldProps = {
  id: string;
  label: string;
  unit?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onCommit: (value: number) => void;
  hint?: string;
  /** Renders a slider next to the input for quick exploration. */
  showSlider?: boolean;
  disabled?: boolean;
};

export function NumberField({
  id,
  label,
  unit,
  value,
  min,
  max,
  step,
  onCommit,
  hint,
  showSlider = false,
  disabled = false,
}: NumberFieldProps) {
  const [draft, setDraft] = useState(() => formatDraft(value));
  const [trackedValue, setTrackedValue] = useState(value);

  // Keep the text field in sync when the value changes elsewhere (for example
  // when "use circular speed" updates it). Adjusted during render, which removes
  // a cascading effect render.
  if (trackedValue !== value) {
    setTrackedValue(value);
    setDraft(formatDraft(value));
  }

  const commitDraft = (): void => {
    const parsed = Number(draft);
    if (draft.trim() === '' || !Number.isFinite(parsed)) {
      setDraft(formatDraft(value));
      return;
    }
    setDraft(formatDraft(parsed));
    onCommit(parsed);
  };

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {unit ? <span className="field__unit"> ({unit})</span> : null}
      </label>

      <div className="field__row">
        {showSlider ? (
          <input
            className="field__slider"
            type="range"
            min={min}
            max={max}
            step={step}
            value={Number.isFinite(value) ? value : min}
            disabled={disabled}
            aria-label={`${label} slider`}
            onChange={(event) => onCommit(Number(event.target.value))}
          />
        ) : null}

        <input
          id={id}
          className="field__input"
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={draft}
          disabled={disabled}
          title="Applies when you press Enter or leave the field"
          onChange={(event) => {
            // Text is kept as typed; committing happens on Enter / blur so a
            // half-typed value is never parsed as a different number.
            setDraft(event.target.value);
          }}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commitDraft();
            }
          }}
        />
        <span className="field__range">
          {min}–{max}
        </span>
      </div>

      {hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}
