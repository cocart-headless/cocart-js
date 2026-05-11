import type { CheckoutTheme } from '../index.js';

interface PayButtonProps {
  label?: string;
  theme: CheckoutTheme;
  onGuestCheckout?: () => void;
}

export function PayButton({ label = 'Pay now', theme, onGuestCheckout }: PayButtonProps) {
  const btnClass = theme.submitButtonClassName
    ?? 'w-full rounded-(--cocart-border-radius-full) bg-(--cocart-color-button) py-4 text-(--cocart-color-button-text) text-[length:var(--cocart-font-size-base)] font-semibold tracking-wide transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-(--cocart-color-primary)';

  return (
    <div className={`${theme.sectionClassName ?? ''} border-b-0!`}>
      <button type="submit" className={btnClass}>
        {label}
      </button>
      {onGuestCheckout !== undefined && (
        <p className="text-center mt-3 text-sm text-(--cocart-color-text-muted)">
          {onGuestCheckout ? (
            <button
              type="button"
              onClick={onGuestCheckout}
              className="underline hover:text-(--cocart-color-text) focus-visible:ring-2 focus-visible:ring-(--cocart-color-primary) focus-visible:outline-none rounded"
            >
              Check out as a guest
            </button>
          ) : (
            <a
              href="#"
              className="underline hover:text-(--cocart-color-text) focus-visible:ring-2 focus-visible:ring-(--cocart-color-primary) focus-visible:outline-none rounded"
            >
              Check out as a guest
            </a>
          )}
        </p>
      )}
    </div>
  );
}
