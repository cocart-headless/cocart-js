import type { CheckoutTheme } from '../index.js';

interface ShippingMethodsProps {
  theme: CheckoutTheme;
}

const MOCK_RATES = [
  { id: 'standard', label: 'Standard shipping', meta: '5–7 business days', price: 'Free' },
  { id: 'express',  label: 'Express shipping',  meta: '2–3 business days', price: '$12.00' },
];

export function ShippingMethods({ theme }: ShippingMethodsProps) {
  return (
    <div className={theme.sectionClassName ?? ''}>
      <h2 className="mb-4 text-base font-bold text-(--cocart-color-text)">Shipping method</h2>
      <div className="grid gap-(--cocart-field-gap)">
        {MOCK_RATES.map((rate, i) => (
          <label
            key={rate.id}
            className="flex items-center gap-3 cursor-pointer rounded-(--cocart-border-radius) border border-(--cocart-color-border) px-4 py-3.5 text-sm transition hover:bg-(--cocart-color-background-hover)"
          >
            <input
              type="radio"
              name="shipping_method"
              value={rate.id}
              defaultChecked={i === 0}
              className="h-4 w-4 shrink-0 accent-(--cocart-color-primary)"
            />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="font-medium text-(--cocart-color-text)">{rate.label}</span>
              <span className="text-xs text-(--cocart-color-text-muted)">{rate.meta}</span>
            </div>
            <span className="font-medium shrink-0 text-(--cocart-color-text)">{rate.price}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
