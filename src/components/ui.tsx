/**
 * Small shared UI primitives for the workspace panels.
 * Presentation only — no simulation logic lives here.
 */

import type { ReactNode } from 'react';

export function Panel({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className ? `panel ${className}` : 'panel'}>
      <header className="panel__header">
        <h2>{title}</h2>
        {subtitle ? <p className="panel__subtitle">{subtitle}</p> : null}
      </header>
      <div className="panel__body">{children}</div>
    </section>
  );
}

/** Label/value row; the caller supplies the unit inside `value`. */
export function MetricRow({
  label,
  value,
  hint,
  emphasis,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="metric" title={hint}>
      <span className="metric__label">{label}</span>
      <span className={emphasis ? 'metric__value metric__value--emphasis' : 'metric__value'}>
        {value}
      </span>
    </div>
  );
}

export function Chip({
  children,
  tone = 'neutral',
  title,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'info';
  title?: string;
}) {
  return (
    <span className={`chip chip--${tone}`} title={title}>
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  title,
  variant = 'default',
  ariaLabel,
  ariaPressed,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  variant?: 'default' | 'primary' | 'ghost';
  ariaLabel?: string;
  ariaPressed?: boolean;
}) {
  return (
    <button
      type="button"
      className={`button button--${variant}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
    >
      {children}
    </button>
  );
}
