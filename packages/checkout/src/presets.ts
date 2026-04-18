import type { CheckoutTheme } from './types.js';

export const bareCheckoutTheme: CheckoutTheme = {
  name: 'bare',
  containerClassName: 'cocart-checkout',
  sectionClassName: 'cocart-checkout__section',
  fieldClassName: 'cocart-checkout__field',
  inputClassName: 'cocart-checkout__input',
  labelClassName: 'cocart-checkout__label',
  helperTextClassName: 'cocart-checkout__helper',
  submitButtonClassName: 'cocart-checkout__submit',
  paymentContainerClassName: 'cocart-checkout__payment',
  orderSummaryClassName: 'cocart-checkout__summary',
};

export function createTailwindCheckoutTheme(overrides: Partial<CheckoutTheme> = {}): CheckoutTheme {
  return {
    name: 'tailwind',
    containerClassName: 'mx-auto grid gap-6 lg:grid-cols-[1.2fr_0.8fr]',
    sectionClassName: 'rounded-3xl border border-slate-200 bg-white p-6 shadow-sm',
    fieldClassName: 'grid gap-2',
    inputClassName: 'h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10',
    labelClassName: 'text-sm font-medium text-slate-900',
    helperTextClassName: 'text-sm text-slate-500',
    submitButtonClassName: 'inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800',
    paymentContainerClassName: 'grid gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4',
    orderSummaryClassName: 'rounded-3xl border border-slate-200 bg-slate-950 p-6 text-slate-50',
    ...overrides,
  };
}

export const shadcnCheckoutTheme: CheckoutTheme = createTailwindCheckoutTheme({
  name: 'shadcn',
  sectionClassName: 'rounded-xl border bg-card p-6 text-card-foreground shadow-sm',
  inputClassName: 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  labelClassName: 'text-sm font-medium leading-none',
  helperTextClassName: 'text-sm text-muted-foreground',
  submitButtonClassName: 'inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90',
  paymentContainerClassName: 'grid gap-4 rounded-lg border border-dashed border-border bg-muted/40 p-4',
  orderSummaryClassName: 'rounded-xl border bg-muted/50 p-6 text-foreground',
});
