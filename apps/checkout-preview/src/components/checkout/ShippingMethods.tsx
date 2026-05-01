import type { CheckoutTheme } from '@cocartheadless/checkout';

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
      <h2 className="mb-3 text-base font-bold text-[#1a1a1a]">Shipping method</h2>
      <div className="grid gap-2">
        {MOCK_RATES.map((rate, i) => (
          <label
            key={rate.id}
            className={`flex items-center gap-3 cursor-pointer rounded-lg border px-4 py-3.5 text-sm transition ${
              i === 0
                ? 'border-[#1a1a1a] bg-white'
                : 'border-[#d9d9d9] bg-white hover:border-[#999]'
            }`}
          >
            <input
              type="radio"
              name="shipping_method"
              value={rate.id}
              defaultChecked={i === 0}
              className="h-4 w-4 accent-[#1a1a1a] shrink-0"
            />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="font-medium text-[#1a1a1a]">{rate.label}</span>
              <span className="text-xs text-[#6b6b6b]">{rate.meta}</span>
            </div>
            <span className="font-medium text-[#1a1a1a] shrink-0">{rate.price}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
