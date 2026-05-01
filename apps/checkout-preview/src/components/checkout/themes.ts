import type { CheckoutTheme } from '@cocartheadless/checkout';
import { createTailwindCheckoutTheme, shadcnCheckoutTheme } from '@cocartheadless/checkout';

export function createModernCheckoutTheme(): CheckoutTheme {
  return {
    name: 'modern',
    containerClassName: 'mx-auto max-w-5xl grid lg:grid-cols-[1fr_380px]',
    sectionClassName: 'px-4 lg:px-10',
    fieldClassName: 'relative',
    inputClassName: 'h-14 w-full rounded-lg border border-[#d9d9d9] bg-white px-3.5 pt-5 pb-1.5 text-sm text-[#1a1a1a] outline-none transition focus:border-[#1a1a1a] focus:ring-0 peer',
    labelClassName: 'absolute left-3.5 top-1.5 text-[10px] font-medium text-[#6b6b6b] pointer-events-none',
    helperTextClassName: 'mt-1 text-xs text-[#6b6b6b]',
    submitButtonClassName: 'w-full rounded-full bg-[#1a1a1a] py-4 text-white text-sm font-semibold tracking-wide hover:bg-[#333] transition',
    paymentContainerClassName: 'rounded-lg border border-[#e5e5e5] bg-[#fafafa] p-4',
    orderSummaryClassName: 'bg-[#f6f6f1] px-4 py-4 lg:px-10 lg:py-8',
    expressCheckoutBarClassName: 'flex gap-2.5 flex-wrap',
  };
}

export { createTailwindCheckoutTheme, shadcnCheckoutTheme };
