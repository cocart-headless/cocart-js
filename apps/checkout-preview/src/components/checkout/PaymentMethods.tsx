import { useState } from 'react';
import type { CheckoutFormSection, CheckoutTheme } from '@cocartheadless/checkout';
import type { GatewayConfig } from '../../state.js';
import { Address } from './Address.js';

interface PaymentMethodsProps {
  gateways: GatewayConfig[];
  activeGatewayId?: string;
  theme: CheckoutTheme;
  paymentSection?: CheckoutFormSection;
  billingSection?: CheckoutFormSection;
  showBillingUnderPayment?: boolean;
}

export function PaymentMethods({
  gateways,
  activeGatewayId,
  theme,
  paymentSection,
  billingSection,
  showBillingUnderPayment = true,
}: PaymentMethodsProps) {
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);

  if (gateways.length === 0 && !paymentSection) return null;

  const activeId = activeGatewayId ?? (gateways.length > 0 ? gateways[0].id : undefined);

  return (
    <div className={theme.sectionClassName ?? ''}>
      <h2 className="mb-2 text-base font-bold text-[#1a1a1a]">Payment</h2>
      <p className="mb-3 text-xs text-[#6b6b6b]">All transactions are secure and encrypted.</p>

      {gateways.length > 1 && (
        <div className="mb-4 rounded-lg border border-[#d9d9d9] overflow-hidden">
          {gateways.map((gw, i) => {
            const isSelected = gw.id === activeId;
            return (
              <label
                key={gw.id}
                className={`flex items-center gap-3 px-4 py-3.5 text-sm cursor-pointer transition ${
                  i > 0 ? 'border-t border-[#d9d9d9]' : ''
                } ${isSelected ? 'bg-[#f0f0f0]' : 'bg-white hover:bg-[#fafafa]'}`}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value={gw.id}
                  defaultChecked={isSelected}
                  className="h-4 w-4 accent-[#1a1a1a] shrink-0"
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-medium text-[#1a1a1a]">{gw.label}</span>
                  {gw.description && <span className="text-xs text-[#6b6b6b]">{gw.description}</span>}
                </div>
                {gw.isOffline && (
                  <span className="rounded-full bg-[#f0f0f0] px-2 py-0.5 text-xs text-[#6b6b6b]">
                    Offline
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}

      {gateways.length === 1 && (
        <div className="mb-4 rounded-lg border border-[#d9d9d9] overflow-hidden">
          <label className="flex items-center gap-3 px-4 py-3.5 text-sm bg-[#f0f0f0] cursor-pointer">
            <input type="radio" name="payment_method" value={gateways[0].id} defaultChecked className="h-4 w-4 accent-[#1a1a1a] shrink-0" />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="font-medium text-[#1a1a1a]">{gateways[0].label}</span>
              {gateways[0].description && <span className="text-xs text-[#6b6b6b]">{gateways[0].description}</span>}
            </div>
          </label>
          {!gateways[0].isOffline && paymentSection && (
            <div className="border-t border-[#d9d9d9] px-4 py-4">
              <div className={theme.paymentContainerClassName ?? ''}>
                {paymentSection.fields.filter(f => !f.hidden).map(field => (
                  <div key={field.name} className="flex items-center justify-center min-h-[60px]">
                    <span className="text-sm text-[#6b6b6b]">[{field.label}]</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {gateways.length === 0 && paymentSection && (
        <div className={`mb-4 ${theme.paymentContainerClassName ?? ''}`}>
          {paymentSection.fields.filter(f => !f.hidden).map(field => (
            <div key={field.name} className="flex items-center justify-center min-h-[60px]">
              <span className="text-sm text-[#6b6b6b]">[{field.label}]</span>
            </div>
          ))}
        </div>
      )}

      {showBillingUnderPayment && billingSection && (
        <div className="mt-4">
          <label className="flex items-center gap-2.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={billingSameAsShipping}
              onChange={e => setBillingSameAsShipping(e.target.checked)}
              className="h-4 w-4 rounded border-[#d9d9d9] accent-[#1a1a1a]"
            />
            <span className="text-sm text-[#1a1a1a]">Use shipping address as billing address</span>
          </label>

          {!billingSameAsShipping && (
            <div className="mt-4">
              <Address type="billing" section={billingSection} theme={{ ...theme, sectionClassName: '' }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
