import type { CheckoutTheme } from '../index.js';

interface PayButtonProps {
  label?: string;
  theme: CheckoutTheme;
}

export function PayButton({ label = 'Pay now', theme }: PayButtonProps) {
  const btnClass = theme.submitButtonClassName
    ?? 'w-full rounded-(--cocart-border-radius-full) bg-(--cocart-color-button) py-4 text-(--cocart-color-button-text) text-[length:var(--cocart-font-size-base)] font-semibold tracking-wide transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-(--cocart-color-primary)';

  return (
    <div className={`${theme.sectionClassName ?? ''} border-b-0!`}>
      <button type="submit" className={btnClass}>
        {label}
      </button>
    </div>
  );
}
