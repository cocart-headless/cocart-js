import { useState } from 'react';
import type { CheckoutTheme } from '../index.js';
import { Sk } from './skeleton.js';

export interface AppliedCoupon {
  code: string;
  /** Human-readable discount label shown in the totals, e.g. "-$10.00" or "-15%" */
  discount: string;
  /** Discount value in cents used to compute the adjusted total */
  discountCents: number;
  /** When true, shipping is shown as free and excluded from the total */
  freeShipping?: boolean;
}

interface DiscountCodeProps {
  theme: CheckoutTheme;
  applied: AppliedCoupon[];
  /** Called when the user clicks Apply. Resolve with an AppliedCoupon on success, or reject/return null to show an error. */
  onApply: (code: string) => Promise<AppliedCoupon | null>;
  onRemove: (code: string) => void;
}

export function DiscountCode({ theme, applied, onApply, onRemove }: DiscountCodeProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputClass = theme.inputClassName
    ? `${theme.inputClassName} flex-1 min-w-0`
    : 'h-(--cocart-input-height) flex-1 min-w-0 rounded-(--cocart-border-radius) border border-(--cocart-color-border) bg-(--cocart-color-surface) px-3.5 text-sm text-(--cocart-color-text) placeholder:text-(--cocart-color-text-muted) outline-none transition focus:border-(--cocart-color-primary)';
  const btnClass = 'h-(--cocart-input-height) shrink-0 rounded-(--cocart-border-radius) border border-(--cocart-color-border) bg-(--cocart-color-background) px-4 text-sm font-medium text-(--cocart-color-text) transition hover:bg-(--cocart-color-background-hover) disabled:opacity-40';

  async function handleApply() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    if (applied.some(c => c.code === trimmed)) {
      setError('This code has already been applied.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await onApply(trimmed);
      if (result) {
        setCode('');
      } else {
        setError('This code is invalid or has expired.');
      }
    } catch {
      setError('Could not apply code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-2 mb-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={e => { setCode(e.target.value); setError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleApply(); } }}
          placeholder="Discount code or gift card"
          className={`${inputClass}${error ? ' border-red-400' : ''}`}
          disabled={loading}
        />
        <button
          type="button"
          disabled={!code.trim() || loading}
          className={btnClass}
          onClick={() => void handleApply()}
        >
          {loading ? '…' : 'Apply'}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {applied.map(coupon => (
        <div key={coupon.code} className="flex items-center justify-between gap-2 text-sm">
          <span className="inline-flex items-center rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 font-mono text-xs font-medium text-green-700 uppercase">
            {coupon.code}
          </span>
          <button
            type="button"
            className="text-xs text-(--cocart-color-text-muted) underline shrink-0 ml-auto"
            onClick={() => onRemove(coupon.code)}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

interface OrderSummaryProps {
  theme: CheckoutTheme;
  mobileDrawer?: boolean;
  loading?: boolean;
  total?: string;
  currency?: string;
  onCouponsChange?: (coupons: AppliedCoupon[]) => void;
}

const MOCK_ITEMS = [
  { name: 'Product One', variant: 'Default', qty: 1, price: '$49.00' },
  { name: 'Product Two', variant: 'Size M / Black', qty: 2, price: '$38.00' },
];

// Mock coupons for preview — real integrations replace onApply with an API call
const MOCK_COUPONS: Record<string, { discount: string; discountCents: number; freeShipping?: boolean }> = {
  'SAVE10':   { discount: '-$10.00',       discountCents: 1000 },
  'SUMMER15': { discount: '-$13.05 (15%)', discountCents: 1305 },
  'FREESHIP': { discount: 'Free shipping', discountCents: 0, freeShipping: true },
};

function SummaryContent({ theme, onCouponsChange }: { theme: CheckoutTheme; onCouponsChange?: (coupons: AppliedCoupon[]) => void }) {
  const [coupons, setCoupons] = useState<AppliedCoupon[]>([]);

  function updateCoupons(next: AppliedCoupon[]) {
    setCoupons(next);
    onCouponsChange?.(next);
  }

  async function handleApplyAndAdd(code: string): Promise<AppliedCoupon | null> {
    await new Promise(r => setTimeout(r, 600));
    const mock = MOCK_COUPONS[code];
    if (!mock) return null;
    const coupon: AppliedCoupon = { code, discount: mock.discount, discountCents: mock.discountCents, freeShipping: mock.freeShipping };
    updateCoupons([...coupons, coupon]);
    return coupon;
  }

  function handleRemove(code: string) {
    updateCoupons(coupons.filter(c => c.code !== code));
  }

  const subtotalCents = 8700;
  const taxCents = 870;
  const hasFreeShipping = coupons.some(c => c.freeShipping);
  const totalDiscountCents = coupons.reduce((sum, c) => sum + (Number(c.discountCents) || 0), 0);
  const totalCents = subtotalCents - totalDiscountCents + taxCents;
  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

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

      <DiscountCode
        theme={theme}
        applied={coupons}
        onApply={handleApplyAndAdd}
        onRemove={handleRemove}
      />

      <div className="border-t border-(--cocart-color-border) pt-4 grid gap-2.5">
        <div className="flex justify-between text-sm text-(--cocart-color-text)">
          <span>Subtotal · 2 items</span>
          <span>{fmt(subtotalCents)}</span>
        </div>
        {coupons.filter(c => !c.freeShipping).map(coupon => (
          <div key={coupon.code} className="flex justify-between text-sm">
            <span className="text-green-600">Discount ({coupon.code})</span>
            <span className="text-green-600 font-medium">-{fmt(coupon.discountCents)}</span>
          </div>
        ))}
        {hasFreeShipping && (
          <div className="flex justify-between text-sm">
            <span className="text-green-600">Discount ({coupons.find(c => c.freeShipping)?.code})</span>
            <span className="text-green-600 font-medium">Free</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-(--cocart-color-text)">Shipping</span>
          <span className={hasFreeShipping ? 'line-through text-(--cocart-color-text-muted)' : 'text-(--cocart-color-text-muted)'}>
            {hasFreeShipping ? 'Free' : 'Enter shipping address'}
          </span>
        </div>
        <div className="flex justify-between text-sm text-(--cocart-color-text)">
          <span>Taxes</span>
          <span>{fmt(taxCents)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold text-(--cocart-color-text) border-t border-(--cocart-color-border) pt-3 mt-1">
          <span>Total</span>
          <span>USD {fmt(totalCents)}</span>
        </div>
      </div>
    </div>
  );
}

export function OrderSummary({ theme, mobileDrawer = false, loading = false, total = 'USD $95.70', currency: _currency, onCouponsChange }: OrderSummaryProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (loading) {
    if (mobileDrawer) {
      return (
        <div className="border-t border-(--cocart-color-border) bg-(--cocart-color-background-alt)">
          <div className="flex items-center justify-between px-4 py-3.5">
            <Sk className="h-4 w-28" />
            <Sk className="h-4 w-16" />
          </div>
        </div>
      );
    }
    return (
      <div className={theme.orderSummaryClassName ?? ''}>
        <div className="grid gap-4 mb-6">
          {[0, 1].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Sk className="h-14 w-14 shrink-0 rounded-(--cocart-border-radius)" />
              <div className="flex-1 grid gap-1.5">
                <Sk className="h-3.5 w-3/4" />
                <Sk className="h-3 w-1/2" />
              </div>
              <Sk className="h-3.5 w-12 shrink-0" />
            </div>
          ))}
        </div>
        <div className="border-t border-(--cocart-color-border) pt-4 grid gap-2.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex justify-between">
              <Sk className="h-3.5 w-16" />
              <Sk className="h-3.5 w-12" />
            </div>
          ))}
          <div className="flex justify-between border-t border-(--cocart-color-border) pt-3 mt-1">
            <Sk className="h-4 w-12" />
            <Sk className="h-4 w-20" />
          </div>
        </div>
      </div>
    );
  }

  if (!mobileDrawer) {
    return <SummaryContent theme={theme} onCouponsChange={onCouponsChange} />;
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
            <SummaryContent theme={theme} onCouponsChange={onCouponsChange} />
          </div>
        </div>
      )}
    </>
  );
}
