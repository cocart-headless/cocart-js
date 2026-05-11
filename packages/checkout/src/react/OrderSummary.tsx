import { useState, useRef, useEffect } from 'react';
import type { CheckoutTheme } from '../index.js';
import { Sk } from './skeleton.js';
import { CrossSellProducts } from './CrossSellProducts.js';
import type { CrossSellProduct } from './CrossSellProducts.js';

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
    : 'h-(--cocart-input-height) flex-1 min-w-0 rounded-(--cocart-border-radius) border border-(--cocart-color-border) bg-(--cocart-color-surface) px-3.5 text-sm text-(--cocart-color-text) placeholder:text-(--cocart-color-text-muted) outline-none transition focus:border-(--cocart-color-primary) focus-visible:ring-2 focus-visible:ring-(--cocart-color-primary) focus-visible:ring-offset-1';
  const btnClass = 'h-(--cocart-input-height) shrink-0 rounded-(--cocart-border-radius) border border-(--cocart-color-border) bg-(--cocart-color-background) px-4 text-sm font-medium text-(--cocart-color-text) transition hover:bg-(--cocart-color-background-hover) disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-(--cocart-color-primary) focus-visible:ring-offset-1';

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
        <label htmlFor="discount-code" className="sr-only">Discount code or gift card</label>
        <input
          id="discount-code"
          type="text"
          value={code}
          onChange={e => { setCode(e.target.value); setError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleApply(); } }}
          placeholder="Discount code or gift card"
          className={`${inputClass}${error ? ' border-(--cocart-color-error)' : ''}`}
          disabled={loading}
          aria-describedby={error ? 'discount-error' : undefined}
        />
        <button
          type="button"
          disabled={!code.trim() || loading}
          aria-busy={loading}
          aria-label={loading ? 'Applying discount code' : 'Apply discount code'}
          className={btnClass}
          onClick={() => void handleApply()}
        >
          {loading ? '…' : 'Apply'}
        </button>
      </div>
      {error && (
        <p id="discount-error" role="alert" className="text-xs" style={{ color: 'var(--cocart-color-error)' }}>
          {error}
        </p>
      )}
      {applied.map(coupon => (
        <div key={coupon.code} className="flex items-center justify-between gap-2 text-sm">
          <span className="inline-flex items-center rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 font-mono text-xs font-medium text-green-700 uppercase">
            <span className="sr-only">Discount code: </span>{coupon.code}
          </span>
          <button
            type="button"
            aria-label={`Remove discount code ${coupon.code}`}
            className="text-xs text-(--cocart-color-text-muted) underline shrink-0 ml-auto focus-visible:ring-2 focus-visible:ring-(--cocart-color-primary) rounded"
            onClick={() => onRemove(coupon.code)}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

export interface OrderLineItem {
  name: string;
  variant: string;
  qty: number;
  price: string;
}

export interface OrderLineItemsProps {
  theme: CheckoutTheme;
  items: OrderLineItem[];
}

export function OrderLineItems({ theme: _theme, items }: OrderLineItemsProps) {
  return (
    <ul className="grid gap-4 list-none m-0 p-0">
      {items.map(item => (
        <li key={item.name} className="flex items-center gap-3">
          <div
            className="relative h-14 w-14 shrink-0 rounded-(--cocart-border-radius) border border-(--cocart-color-border) bg-(--cocart-color-surface) flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="text-xs text-(--cocart-color-text-muted)">img</span>
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-(--cocart-color-text-muted) text-[10px] font-medium text-(--cocart-color-surface)">
              {item.qty}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-(--cocart-color-text) truncate">{item.name}</p>
            <p className="text-xs text-(--cocart-color-text-muted)">{item.variant}</p>
          </div>
          <span className="text-sm font-medium text-(--cocart-color-text) shrink-0" aria-label={`Price: ${item.price}`}>
            {item.price}
          </span>
        </li>
      ))}
    </ul>
  );
}

export interface OrderTotalsProps {
  theme: CheckoutTheme;
  subtotalCents: number;
  taxCents: number;
  coupons?: AppliedCoupon[];
  showShipping?: boolean;
  shippingCostCents?: number;
}

export function OrderTotals({ theme: _theme, subtotalCents, taxCents, coupons = [], showShipping = true, shippingCostCents }: OrderTotalsProps) {
  const hasFreeShipping = coupons.some(c => c.freeShipping);
  const totalDiscountCents = coupons.reduce((sum, c) => sum + (Number(c.discountCents) || 0), 0);
  const effectiveShippingCents = hasFreeShipping ? 0 : (shippingCostCents ?? 0);
  const totalCents = subtotalCents - totalDiscountCents + taxCents + (shippingCostCents !== undefined ? effectiveShippingCents : 0);
  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const itemCount = 2;

  return (
    <dl className="grid gap-2.5 m-0">
      <div className="flex justify-between text-sm text-(--cocart-color-text)">
        <dt>Subtotal · {itemCount} items</dt>
        <dd className="m-0">{fmt(subtotalCents)}</dd>
      </div>
      {coupons.filter(c => !c.freeShipping).map(coupon => (
        <div key={coupon.code} className="flex justify-between text-sm">
          <dt className="text-green-600">Discount ({coupon.code})</dt>
          <dd className="m-0 text-green-600 font-medium">-{fmt(coupon.discountCents)}</dd>
        </div>
      ))}
      {hasFreeShipping && (
        <div className="flex justify-between text-sm">
          <dt className="text-green-600">Discount ({coupons.find(c => c.freeShipping)?.code})</dt>
          <dd className="m-0 text-green-600 font-medium">Free shipping</dd>
        </div>
      )}
      {showShipping && (
        <div className="flex justify-between text-sm">
          <dt className="text-(--cocart-color-text)">Shipping</dt>
          <dd className="m-0">
            {shippingCostCents === undefined ? (
              <span className="text-(--cocart-color-text-muted)">Enter shipping address</span>
            ) : hasFreeShipping || shippingCostCents === 0 ? (
              <span className="text-green-600 font-medium">Free</span>
            ) : (
              <span className="text-(--cocart-color-text)">{fmt(shippingCostCents)}</span>
            )}
          </dd>
        </div>
      )}
      <div className="flex justify-between text-base font-semibold text-(--cocart-color-text) border-t border-(--cocart-color-border) pt-3 mt-1">
        <dt>Total</dt>
        <dd className="m-0">USD {fmt(totalCents)}</dd>
      </div>
      <div className="flex justify-between text-xs text-(--cocart-color-text-muted) mt-1">
        <dt>Including {fmt(taxCents)} in taxes</dt>
        <dd className="m-0" />
      </div>
    </dl>
  );
}

export interface OrderSummaryProps {
  theme: CheckoutTheme;
  mobileDrawer?: boolean;
  loading?: boolean;
  total?: string;
  currency?: string;
  showShipping?: boolean;
  shippingCostCents?: number;
  items: OrderLineItem[];
  subtotalCents: number;
  taxCents: number;
  crossSellProducts?: CrossSellProduct[];
  onCrossAdd?: (product: CrossSellProduct) => void;
  onApply: (code: string) => Promise<AppliedCoupon | null>;
  onCouponsChange?: (coupons: AppliedCoupon[]) => void;
}

interface SummaryContentProps {
  theme: CheckoutTheme;
  showShipping?: boolean;
  shippingCostCents?: number;
  items: OrderLineItem[];
  subtotalCents: number;
  taxCents: number;
  crossSellProducts?: CrossSellProduct[];
  onCrossAdd?: (product: CrossSellProduct) => void;
  onApply: (code: string) => Promise<AppliedCoupon | null>;
  onCouponsChange?: (coupons: AppliedCoupon[]) => void;
}

function SummaryContent({ theme, showShipping = true, shippingCostCents, items, subtotalCents, taxCents, crossSellProducts, onCrossAdd, onApply, onCouponsChange }: SummaryContentProps) {
  const [coupons, setCoupons] = useState<AppliedCoupon[]>([]);

  function updateCoupons(next: AppliedCoupon[]) {
    setCoupons(next);
    onCouponsChange?.(next);
  }

  async function handleApply(code: string): Promise<AppliedCoupon | null> {
    const result = await onApply(code);
    if (result) updateCoupons([...coupons, result]);
    return result;
  }

  return (
    <div className={theme.orderSummaryClassName ?? ''}>
      <OrderLineItems theme={theme} items={items} />
      {crossSellProducts && crossSellProducts.length > 0 && (
        <div className="border-t border-(--cocart-color-border) mt-4 pt-4">
          <CrossSellProducts
            theme={theme}
            products={crossSellProducts}
            onAdd={onCrossAdd ?? (() => {})}
          />
        </div>
      )}
      <div className="border-t border-(--cocart-color-border) mt-4 pt-4">
        <DiscountCode
          theme={theme}
          applied={coupons}
          onApply={handleApply}
          onRemove={code => updateCoupons(coupons.filter(c => c.code !== code))}
        />
      </div>
      <div className="border-t border-(--cocart-color-border) mt-4 pt-4">
        <OrderTotals theme={theme} subtotalCents={subtotalCents} taxCents={taxCents} coupons={coupons} showShipping={showShipping} shippingCostCents={shippingCostCents} />
      </div>
    </div>
  );
}

export function OrderSummary({ theme, mobileDrawer = false, loading = false, total, currency: _currency, showShipping = true, shippingCostCents, items, subtotalCents, taxCents, crossSellProducts, onCrossAdd, onApply, onCouponsChange }: OrderSummaryProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const drawerId = 'order-summary-drawer';
  const drawerTitleId = 'order-summary-drawer-title';

  useEffect(() => {
    if (drawerOpen) {
      closeBtnRef.current?.focus();
    }
  }, [drawerOpen]);

  function closeDrawer() {
    setDrawerOpen(false);
    toggleBtnRef.current?.focus();
  }

  function handleDrawerKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') closeDrawer();
  }

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
      <div className={theme.orderSummaryClassName ?? ''} aria-busy="true" aria-label="Loading order summary">
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
    return <SummaryContent theme={theme} showShipping={showShipping} shippingCostCents={shippingCostCents} items={items} subtotalCents={subtotalCents} taxCents={taxCents} crossSellProducts={crossSellProducts} onCrossAdd={onCrossAdd} onApply={onApply} onCouponsChange={onCouponsChange} />;
  }

  return (
    <>
      {/* Sticky bottom bar */}
      <div className="border-t border-(--cocart-color-border) bg-(--cocart-color-background-alt)">
        <button
          ref={toggleBtnRef}
          type="button"
          aria-expanded={drawerOpen}
          aria-controls={drawerId}
          onClick={() => setDrawerOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium text-(--cocart-color-text) focus-visible:ring-2 focus-visible:ring-(--cocart-color-primary) focus-visible:ring-inset"
        >
          <span className="flex items-center gap-2">
            <svg
              className={`h-4 w-4 transition-transform duration-200 ${drawerOpen ? 'rotate-180' : ''}`}
              viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 6l5 5 5-5" />
            </svg>
            Order summary
          </span>
          <span className="font-semibold" aria-live="polite">{total}</span>
        </button>
      </div>

      {/* Bottom sheet drawer */}
      {drawerOpen && (
        <div
          id={drawerId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={drawerTitleId}
          className="absolute inset-0 z-30 flex flex-col justify-end bg-black/20"
          onClick={closeDrawer}
          onKeyDown={handleDrawerKeyDown}
        >
          <div
            className="rounded-t-2xl bg-(--cocart-color-background-alt) overflow-y-auto max-h-4/5 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
              <div className="h-1 w-10 rounded-full bg-(--cocart-color-border)" />
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-(--cocart-color-border)">
              <span id={drawerTitleId} className="text-sm font-semibold text-(--cocart-color-text)">Order summary</span>
              <button
                ref={closeBtnRef}
                type="button"
                aria-label="Close order summary"
                onClick={closeDrawer}
                className="p-1 text-(--cocart-color-text-muted) rounded focus-visible:ring-2 focus-visible:ring-(--cocart-color-primary)"
              >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M3 3l10 10M13 3L3 13" />
                </svg>
              </button>
            </div>
            <SummaryContent theme={theme} shippingCostCents={shippingCostCents} items={items} subtotalCents={subtotalCents} taxCents={taxCents} crossSellProducts={crossSellProducts} onCrossAdd={onCrossAdd} onApply={onApply} onCouponsChange={onCouponsChange} />
          </div>
        </div>
      )}
    </>
  );
}
