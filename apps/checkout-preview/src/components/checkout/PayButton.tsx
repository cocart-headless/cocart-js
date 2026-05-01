import type { CheckoutTheme } from '@cocartheadless/checkout';

interface PayButtonProps {
  label?: string;
  theme: CheckoutTheme;
}

export function PayButton({ label = 'Pay now', theme }: PayButtonProps) {
  const btnClass = theme.submitButtonClassName
    ?? 'w-full rounded-full bg-[#1a1a1a] py-4 text-white text-sm font-semibold hover:bg-[#333] transition';

  return (
    <div className={`${theme.sectionClassName ?? ''} pt-0`}>
      <button type="submit" className={btnClass}>
        {label}
      </button>
    </div>
  );
}
