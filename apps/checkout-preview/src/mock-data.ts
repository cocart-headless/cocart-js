import type { OrderLineItem, AppliedCoupon, ShippingRate } from '@cocartheadless/checkout/react';

export const MOCK_ITEMS: OrderLineItem[] = [
  { name: 'Product One', variant: 'Default', qty: 1, price: '$49.00' },
  { name: 'Product Two', variant: 'Size M / Black', qty: 2, price: '$38.00' },
];

export const MOCK_COUPONS: Record<string, Omit<AppliedCoupon, 'code'>> = {
  SAVE10:   { discount: '-$10.00',       discountCents: 1000 },
  SUMMER15: { discount: '-$13.05 (15%)', discountCents: 1305 },
  FREESHIP: { discount: 'Free shipping', discountCents: 0, freeShipping: true },
};

export interface MockShippingRate extends ShippingRate {
  costCents: number;
}

export const MOCK_RATES: MockShippingRate[] = [
  { id: 'standard', label: 'Standard shipping', meta: '5–7 business days', price: 'Free',   costCents: 0 },
  { id: 'express',  label: 'Express shipping',  meta: '2–3 business days', price: '$12.00', costCents: 1200 },
];

export const MOCK_SUBTOTAL_CENTS = 8700;
export const MOCK_TAX_CENTS = 870;
export const MOCK_TOTAL = 'USD $95.70';
