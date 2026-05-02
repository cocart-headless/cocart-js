import type { CheckoutTheme } from './types.js';
import { MODERN_VARIABLES, TAILWIND_VARIABLES, SHADCN_VARIABLES } from './theme-engine.js';

export function createCheckoutTheme(options: CheckoutTheme = {}): CheckoutTheme {
  return { preset: 'modern', ...options };
}

export function createModernCheckoutTheme(overrides: Partial<CheckoutTheme> = {}): CheckoutTheme {
  return {
    preset: 'modern',
    containerClassName: 'mx-auto max-w-5xl grid lg:grid-cols-[1fr_380px]',
    sectionClassName: 'px-4 lg:px-10',
    orderSummaryClassName: 'px-4 py-4 lg:px-10 lg:py-8',
    ...overrides,
  };
}

export function createTailwindCheckoutTheme(overrides: Partial<CheckoutTheme> = {}): CheckoutTheme {
  return {
    preset: 'tailwind',
    containerClassName: 'mx-auto grid gap-6 lg:grid-cols-[1.2fr_0.8fr]',
    sectionClassName: 'rounded-3xl border border-(--cocart-color-border) bg-(--cocart-color-surface) p-6 shadow-sm',
    orderSummaryClassName: 'rounded-3xl border border-(--cocart-color-border) bg-(--cocart-color-text) p-6 text-(--cocart-color-surface)',
    submitButtonClassName: 'inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-(--cocart-color-button) px-5 text-sm font-semibold text-(--cocart-color-button-text) transition hover:opacity-90',
    ...overrides,
  };
}

export function createShadcnCheckoutTheme(overrides: Partial<CheckoutTheme> = {}): CheckoutTheme {
  return {
    preset: 'shadcn',
    containerClassName: 'mx-auto grid gap-6 lg:grid-cols-[1.2fr_0.8fr]',
    sectionClassName: 'rounded-xl border border-(--cocart-color-border) bg-(--cocart-color-surface) p-6 shadow-sm',
    orderSummaryClassName: 'rounded-xl border border-(--cocart-color-border) bg-(--cocart-color-background) p-6',
    submitButtonClassName: 'inline-flex h-10 w-full items-center justify-center rounded-(--cocart-border-radius) bg-(--cocart-color-button) px-4 text-sm font-medium text-(--cocart-color-button-text) transition hover:opacity-90',
    ...overrides,
  };
}

export { MODERN_VARIABLES, TAILWIND_VARIABLES, SHADCN_VARIABLES };
