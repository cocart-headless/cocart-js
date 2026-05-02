import { useState } from 'react';
import type { CheckoutTheme } from '../index.js';

interface OrderSummaryProps {
  theme: CheckoutTheme;
  mobileDrawer?: boolean;
  total?: string;
  currency?: string;
}

const MOCK_ITEMS = [
  { name: 'Product One', variant: 'Default', qty: 1, price: '$49.00' },
  { name: 'Product Two', variant: 'Size M / Black', qty: 2, price: '$38.00' },
];

function SummaryContent({ theme }: { theme: CheckoutTheme }) {
  return (
    <div className={theme.orderSummaryClassName ?? ''}>
      <div className="grid gap-4 mb-6">
        {MOCK_ITEMS.map(item => (
          <div key={item.name} className="flex items-center gap-3">
            <div className="relative h-14 w-14 shrink-0 rounded-(--cocart-border-radius) border border-(--cocart-color-border) bg-(--cocart-color-surface) flex items-center justify-center">
              <span className="text-xs text-(--cocart-color-text-muted)">img</span>
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-(--cocart-color-text-muted) text-[10px] font-medium text-(--cocart-color-surface)">
                {item.qty}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-(--cocart-color-text) truncate">{item.name}</p>
              <p className="text-xs text-(--cocart-color-text-muted)">{item.variant}</p>
            </div>
            <span className="text-sm font-medium text-(--cocart-color-text) shrink-0">{item.price}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-(--cocart-color-border) pt-4 grid gap-2.5">
        <div className="flex justify-between text-sm text-(--cocart-color-text)">
          <span>Subtotal</span>
          <span>$87.00</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-(--cocart-color-text)">Shipping</span>
          <span className="text-(--cocart-color-text-muted)">Calculated at next step</span>
        </div>
        <div className="flex justify-between text-sm text-(--cocart-color-text)">
          <span>Taxes</span>
          <span>$8.70</span>
        </div>
        <div className="flex justify-between text-base font-semibold text-(--cocart-color-text) border-t border-(--cocart-color-border) pt-3 mt-1">
          <span>Total</span>
          <span>USD $95.70</span>
        </div>
      </div>
    </div>
  );
}

export function OrderSummary({ theme, mobileDrawer = false, total = 'USD $95.70', currency: _currency }: OrderSummaryProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!mobileDrawer) {
    return <SummaryContent theme={theme} />;
  }

  return (
    <>
      {/* Sticky bottom bar */}
      <div className="border-t border-(--cocart-color-border) bg-(--cocart-color-background-alt)">
        <button
          type="button"
          onClick={() => setDrawerOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium text-(--cocart-color-text)"
        >
          <span className="flex items-center gap-2">
            <svg
              className={`h-4 w-4 transition-transform duration-200 ${drawerOpen ? 'rotate-180' : ''}`}
              viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M3 6l5 5 5-5" />
            </svg>
            Order summary
          </span>
          <span className="font-semibold">{total}</span>
        </button>
      </div>

      {/* Bottom sheet drawer — rendered as a sibling, positioned absolutely by the parent container */}
      {drawerOpen && (
        <div
          className="absolute inset-0 z-30 flex flex-col justify-end bg-black/20"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="rounded-t-2xl bg-(--cocart-color-background-alt) overflow-y-auto max-h-4/5 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-(--cocart-color-border)" />
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-(--cocart-color-border)">
              <span className="text-sm font-semibold text-(--cocart-color-text)">Order summary</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="text-(--cocart-color-text-muted)"
              >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 3l10 10M13 3L3 13" />
                </svg>
              </button>
            </div>
            <SummaryContent theme={theme} />
          </div>
        </div>
      )}
    </>
  );
}
