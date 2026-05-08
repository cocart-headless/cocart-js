import { useState } from 'react';
import type { CheckoutTheme } from '../index.js';
import { Sk } from './skeleton.js';

export interface ShippingRate {
  id: string;
  label: string;
  meta: string;
  price: string;
}

export interface ShippingMethodsProps {
  theme: CheckoutTheme;
  rates: ShippingRate[];
  loading?: boolean;
  freeShipping?: boolean;
  placeholder?: boolean;
  onRateChange?: (rate: ShippingRate) => void;
}

export function ShippingMethods({ theme, rates, loading = false, freeShipping = false, placeholder = false, onRateChange }: ShippingMethodsProps) {
  const [selectedId, setSelectedId] = useState(rates[0]?.id ?? '');

  if (placeholder) {
    return (
      <div className={theme.sectionClassName ?? ''}>
        <h2 className="mb-2 text-base font-bold text-(--cocart-color-text)">Shipping method</h2>
        <p className="text-sm text-(--cocart-color-text-muted)">Enter your shipping address to view available shipping methods.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={theme.sectionClassName ?? ''}>
        <Sk className="mb-4 h-5 w-36" />
        <div className="grid gap-(--cocart-field-gap)">
          {[0, 1].map(i => (
            <div key={i} className="flex items-center gap-3 rounded-(--cocart-border-radius) border border-(--cocart-color-border) px-4 py-3.5">
              <Sk className="h-4 w-4 shrink-0 rounded-full" />
              <div className="flex flex-col flex-1 gap-1.5">
                <Sk className="h-3.5 w-32" />
                <Sk className="h-3 w-24" />
              </div>
              <Sk className="h-3.5 w-10 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={theme.sectionClassName ?? ''}>
      <fieldset className="border-0 p-0 m-0">
        <legend className="mb-4 text-base font-bold text-(--cocart-color-text)">Shipping method</legend>
        <div className="grid gap-(--cocart-field-gap)">
          {rates.map((rate) => {
            const selected = rate.id === selectedId;
            return (
              <label
                key={rate.id}
                className={`flex items-center gap-3 cursor-pointer rounded-(--cocart-border-radius) border border-(--cocart-color-border) px-4 py-3.5 text-sm transition ${selected ? 'bg-(--cocart-color-background-hover)' : 'hover:bg-(--cocart-color-background-hover)'}`}
              >
                <input
                  type="radio"
                  name="shipping_method"
                  value={rate.id}
                  checked={selected}
                  onChange={() => { setSelectedId(rate.id); onRateChange?.(rate); }}
                  className="h-4 w-4 shrink-0 accent-(--cocart-color-primary) focus-visible:ring-2 focus-visible:ring-(--cocart-color-primary) focus-visible:ring-offset-1"
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-medium text-(--cocart-color-text)">{rate.label}</span>
                  <span className="text-xs text-(--cocart-color-text-muted)">{rate.meta}</span>
                </div>
                <span className="font-medium shrink-0 flex items-center gap-1.5">
                  {freeShipping && rate.price !== 'Free' ? (
                    <>
                      <span className="line-through text-(--cocart-color-text-muted) font-normal" aria-hidden="true">{rate.price}</span>
                      <span className="text-green-600"><span className="sr-only">was {rate.price}, now </span>Free</span>
                    </>
                  ) : (
                    <span className="text-(--cocart-color-text)">{rate.price}</span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
