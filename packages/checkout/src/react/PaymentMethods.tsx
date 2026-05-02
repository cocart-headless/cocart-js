import { useState } from 'react';
import type { CheckoutFormSection, CheckoutTheme, CheckoutGatewayPresentation } from '../index.js';
import { Address } from './Address.js';
import { Sk } from './skeleton.js';

interface PaymentMethodsProps {
  gateways: CheckoutGatewayPresentation[];
  activeGatewayId?: string;
  theme: CheckoutTheme;
  paymentSection?: CheckoutFormSection;
  billingSection?: CheckoutFormSection;
  showBillingUnderPayment?: boolean;
  loading?: boolean;
}

export function PaymentMethods({
  gateways,
  activeGatewayId,
  theme,
  paymentSection,
  billingSection,
  showBillingUnderPayment = true,
  loading = false,
}: PaymentMethodsProps) {
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);

  if (loading) {
    const helperClass = theme.helperTextClassName ?? 'text-xs text-(--cocart-color-text-muted)';
    return (
      <div className={theme.sectionClassName ?? ''}>
        <Sk className="mb-1 h-5 w-20" />
        <Sk className={`mb-4 h-3 w-56 ${helperClass}`} />
        <div className="mb-4 rounded-(--cocart-border-radius) border border-(--cocart-color-border) overflow-hidden">
          {[0, 1].map((i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-(--cocart-color-border)' : ''}`}>
              <Sk className="h-4 w-4 shrink-0 rounded-full" />
              <div className="flex flex-col flex-1 gap-1.5">
                <Sk className="h-3.5 w-28" />
                <Sk className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (gateways.length === 0 && !paymentSection) return null;

  const activeId = activeGatewayId ?? (gateways.length > 0 ? gateways[0].id : undefined);
  const helperClass = theme.helperTextClassName ?? 'text-xs text-(--cocart-color-text-muted)';

  const GatewayRow = ({ gw, selected, border }: { gw: CheckoutGatewayPresentation; selected: boolean; border: boolean }) => (
    <label className={`flex items-center gap-3 px-4 py-3.5 text-sm cursor-pointer transition ${border ? 'border-t border-(--cocart-color-border)' : ''} ${selected ? 'bg-(--cocart-color-background-hover)' : 'bg-(--cocart-color-surface) hover:bg-(--cocart-color-background-hover)'}`}>
      <input type="radio" name="payment_method" value={gw.id} defaultChecked={selected} className="h-4 w-4 shrink-0 accent-(--cocart-color-primary)" />
      <div className="flex flex-col flex-1 min-w-0">
        <span className="font-medium text-(--cocart-color-text)">{gw.label}</span>
        {gw.description && <span className={helperClass}>{gw.description}</span>}
      </div>
      {gw.supports.includes('offline') && (
        <span className="rounded-full bg-(--cocart-color-background-hover) px-2 py-0.5 text-xs text-(--cocart-color-text-muted)">Offline</span>
      )}
    </label>
  );

  return (
    <div className={theme.sectionClassName ?? ''}>
      <h2 className="mb-1 text-base font-bold text-(--cocart-color-text)">Payment</h2>
      <p className={`mb-4 ${helperClass}`}>All transactions are secure and encrypted.</p>

      {gateways.length > 0 && (
        <div className="mb-4 rounded-(--cocart-border-radius) border border-(--cocart-color-border) overflow-hidden">
          {gateways.map((gw, i) => (
            <GatewayRow key={gw.id} gw={gw} selected={gw.id === activeId} border={i > 0} />
          ))}
          {gateways.length === 1 && !gateways[0].supports.includes('offline') && paymentSection && (
            <div className="border-t border-(--cocart-color-border) px-4 py-4">
              <div className={theme.paymentContainerClassName ?? 'rounded-(--cocart-border-radius) border border-dashed border-(--cocart-color-border) bg-(--cocart-color-background-hover) p-4'}>
                {paymentSection.fields.filter(f => !f.hidden).map(field => (
                  <div key={field.name} className="flex items-center justify-center min-h-16">
                    <span className={helperClass}>[{field.label}]</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {gateways.length === 0 && paymentSection && (
        <div className={`mb-4 ${theme.paymentContainerClassName ?? 'rounded-(--cocart-border-radius) border border-dashed border-(--cocart-color-border) bg-(--cocart-color-background-hover) p-4'}`}>
          {paymentSection.fields.filter(f => !f.hidden).map(field => (
            <div key={field.name} className="flex items-center justify-center min-h-16">
              <span className={helperClass}>[{field.label}]</span>
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
              className="h-4 w-4 rounded accent-(--cocart-color-primary)"
            />
            <span className="text-sm text-(--cocart-color-text)">Use shipping address as billing address</span>
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
