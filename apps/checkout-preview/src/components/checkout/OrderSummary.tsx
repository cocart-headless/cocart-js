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
            <div className="relative h-14 w-14 shrink-0 rounded-lg border border-[#d9d9d9] bg-white flex items-center justify-center">
              <span className="text-xs text-[#bbb]">img</span>
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#6b6b6b] text-[10px] font-medium text-white">
                {item.qty}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1a1a1a] truncate">{item.name}</p>
              <p className="text-xs text-[#6b6b6b]">{item.variant}</p>
            </div>
            <span className="text-sm font-medium text-[#1a1a1a] shrink-0">{item.price}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-[#d9d9d9] pt-4 grid gap-2.5">
        <div className="flex justify-between text-sm text-[#1a1a1a]">
          <span>Subtotal</span>
          <span>$87.00</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#1a1a1a]">Shipping</span>
          <span className="text-[#6b6b6b]">Calculated at next step</span>
        </div>
        <div className="flex justify-between text-sm text-[#1a1a1a]">
          <span>Taxes</span>
          <span>$8.70</span>
        </div>
        <div className="flex justify-between text-base font-semibold text-[#1a1a1a] border-t border-[#d9d9d9] pt-3 mt-1">
          <span>Total</span>
          <span>USD $95.70</span>
        </div>
      </div>
    </div>
  );
}
