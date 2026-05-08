import { useState } from 'react';
import type { ReactNode } from 'react';
import type { CheckoutTheme } from '../index.js';

interface TermsAndConditionsProps {
  theme: CheckoutTheme;
  /** URL to the terms and conditions page */
  termsUrl?: string;
  /** URL to the privacy policy page */
  privacyUrl?: string;
  /** Custom label — overrides the default text entirely */
  label?: ReactNode;
  /** Wrapped children (typically PayButton) are rendered with pointer-events-none + opacity when unchecked */
  children?: ReactNode;
}

export function TermsAndConditions({ theme, termsUrl, privacyUrl, label, children }: TermsAndConditionsProps) {
  const [accepted, setAccepted] = useState(false);
  const helperClass = theme.helperTextClassName ?? 'text-xs text-(--cocart-color-text-muted)';

  const defaultLabel = (
    <span className={helperClass}>
      I agree to the{' '}
      {termsUrl ? (
        <a href={termsUrl} target="_blank" rel="noopener noreferrer" aria-label="Terms &amp; Conditions (opens in new tab)" className="underline text-(--cocart-color-text)">
          Terms &amp; Conditions
        </a>
      ) : (
        <span className="underline text-(--cocart-color-text)">Terms &amp; Conditions</span>
      )}
      {privacyUrl && (
        <>
          {' '}and{' '}
          <a href={privacyUrl} target="_blank" rel="noopener noreferrer" aria-label="Privacy Policy (opens in new tab)" className="underline text-(--cocart-color-text)">
            Privacy Policy
          </a>
        </>
      )}
    </span>
  );

  return (
    <div className={`${theme.sectionClassName ?? ''} grid gap-3`}>
      <label className="flex items-start gap-2.5 cursor-pointer select-none">
        <input
          id="terms-and-conditions"
          type="checkbox"
          checked={accepted}
          onChange={e => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded accent-(--cocart-color-primary) focus-visible:ring-2 focus-visible:ring-(--cocart-color-primary)"
        />
        {label ?? defaultLabel}
      </label>
      {children && (
        <div
          className={`transition-opacity ${accepted ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}
          aria-disabled={!accepted}
        >
          {children}
        </div>
      )}
    </div>
  );
}
