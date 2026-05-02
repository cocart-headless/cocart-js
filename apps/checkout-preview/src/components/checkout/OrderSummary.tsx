import type { CheckoutTheme } from '@cocartheadless/checkout';

interface OrderSummaryProps {
  theme: CheckoutTheme;
}

const MOCK_ITEMS = [
  { name: 'Product One', variant: 'Default', qty: 1, price: '$49.00' },
  { name: 'Product Two', variant: 'Size M / Black', qty: 2, price: '$38.00' },
];

export function OrderSummary({ theme }: OrderSummaryProps) {
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
