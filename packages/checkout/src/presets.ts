import type { CheckoutTheme } from './types.js';
import { MODERN_VARIABLES, TAILWIND_VARIABLES, SHADCN_VARIABLES } from './theme-engine.js';

export function createCheckoutTheme(options: CheckoutTheme = {}): CheckoutTheme {
  return { preset: 'modern', ...options };
}

export function createModernCheckoutTheme(overrides: Partial<CheckoutTheme> = {}): CheckoutTheme {
  return {
    preset: 'modern',
    containerClassName: 'mx-auto max-w-5xl grid lg:grid-cols-[1fr_420px]',
    sectionClassName: 'px-4 lg:px-10',
    orderSummaryClassName: 'px-4 py-4 lg:px-10 lg:py-8',
    ...overrides,
  };
}

export function createTailwindCheckoutTheme(overrides: Partial<CheckoutTheme> = {}): CheckoutTheme {
  return {
    preset: 'tailwind',
    containerClassName: 'mx-auto max-w-5xl grid gap-6 lg:grid-cols-[1.2fr_0.8fr]',
    sectionClassName: 'card bg-base-100 shadow-sm p-6',
    orderSummaryClassName: 'card p-6',
    inputClassName: 'input input-bordered w-full h-(--cocart-input-height) text-sm',
    submitButtonClassName: 'btn btn-primary btn-block mt-2',
    helperTextClassName: 'text-xs text-base-content/50 mt-0.5',
    ...overrides,
  };
}

export function createShadcnCheckoutTheme(overrides: Partial<CheckoutTheme> = {}): CheckoutTheme {
  return {
    preset: 'shadcn',
    containerClassName: 'mx-auto max-w-5xl grid gap-6 lg:grid-cols-[1.2fr_0.8fr]',
    sectionClassName: 'rounded-lg border border-(--cocart-color-border) bg-(--cocart-color-surface) p-6 shadow-xs',
    orderSummaryClassName: 'rounded-lg border border-(--cocart-color-border) bg-(--cocart-color-surface) p-6 shadow-xs',
    inputClassName: 'flex h-(--cocart-input-height) w-full rounded-md border border-[hsl(var(--input))] bg-(--cocart-color-background) px-3 py-1 text-sm shadow-xs outline-none placeholder:text-(--cocart-color-text-muted) focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 transition-colors',
    labelClassName: 'text-sm font-medium leading-none text-(--cocart-color-text)',
    helperTextClassName: 'text-xs text-(--cocart-color-text-muted) mt-1',
    submitButtonClassName: 'inline-flex h-10 w-full items-center justify-center rounded-[--cocart-border-radius-full] bg-(--cocart-color-button) px-4 text-sm font-medium text-(--cocart-color-button-text) shadow-xs transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2',
    ...overrides,
  };
}

export { MODERN_VARIABLES, TAILWIND_VARIABLES, SHADCN_VARIABLES };
