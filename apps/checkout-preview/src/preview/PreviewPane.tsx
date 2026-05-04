import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { CheckoutClient, resolveTheme } from '@cocartheadless/checkout';
import type { CheckoutGatewayAdapter, CheckoutFormSection, CheckoutGatewayPresentation } from '@cocartheadless/checkout';
import type { AppliedCoupon } from '@cocartheadless/checkout/react';
import { CheckoutContainer, ExpressBar, Address, ShippingMethods, PaymentMethods, OrderSummary, PayButton, TermsAndConditions } from '@cocartheadless/checkout/react';
import { mockCoCartClient } from '../mock-client.js';
import type { BuilderState, GatewayConfig } from '../state.js';

const SCOPE = '#checkout-preview-root';
let themeStyleEl: HTMLStyleElement | null = null;
let customStyleEl: HTMLStyleElement | null = null;

function applyTheme(state: BuilderState): void {
  themeStyleEl?.remove();
  themeStyleEl = document.createElement('style');
  themeStyleEl.id = 'checkout-preview-theme';
  themeStyleEl.textContent = resolveTheme(state.theme, SCOPE);
  document.head.appendChild(themeStyleEl);
}

function applyCustomCss(css: string): void {
  customStyleEl?.remove();
  customStyleEl = document.createElement('style');
  customStyleEl.id = 'checkout-preview-custom-css';
  customStyleEl.textContent = css;
  document.head.appendChild(customStyleEl);
}

function buildStubAdapter(gw: GatewayConfig): CheckoutGatewayAdapter {
  return {
    id: gw.id,
    provider: gw.id,
    label: gw.label,
    description: gw.description,
    supports: gw.isOffline ? ['offline'] : [],
    express: gw.isExpress,
    getFields: () => gw.isOffline ? [] : [
      { name: `payment_data.${gw.id}`, label: gw.label, type: 'gateway-element' as const, description: gw.description },
    ],
  };
}

interface PreviewProps {
  state: BuilderState;
  expressGateways: CheckoutGatewayPresentation[];
  regularGateways: CheckoutGatewayPresentation[];
  expressOnly: boolean;
  activeGatewayId: string | undefined;
  sections: CheckoutFormSection[];
  freeShipping?: boolean;
  onFreeShippingChange?: (free: boolean) => void;
}

function MobileScreen({ state, expressGateways, regularGateways, expressOnly, activeGatewayId, sections }: PreviewProps) {
  const { theme, includeOrderSummary, mobileOrderSummaryDrawer } = state;
  const [freeShipping, setFreeShipping] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-[38px] bg-(--cocart-color-background) min-h-160 flex flex-col">
      {/* Status bar spacer */}
      <div className="h-10 bg-(--cocart-color-background)" />

      {/* Scrollable form content */}
      <div className={`overflow-y-auto max-h-180${expressOnly ? ' px-4 pb-8' : ''}`}>
        <CheckoutPreview
          state={state}
          expressGateways={expressGateways}
          regularGateways={regularGateways}
          expressOnly={expressOnly}
          activeGatewayId={activeGatewayId}
          sections={sections}
          freeShipping={freeShipping}
          onFreeShippingChange={setFreeShipping}
        />
        {includeOrderSummary && !mobileOrderSummaryDrawer && (
          <OrderSummary theme={theme} onCouponsChange={c => setFreeShipping(c.some(x => x.freeShipping))} />
        )}
      </div>

      {/* Bottom bar + drawer — rendered outside scroll so bar never scrolls away */}
      {includeOrderSummary && mobileOrderSummaryDrawer && (
        <OrderSummary theme={theme} mobileDrawer onCouponsChange={c => setFreeShipping(c.some(x => x.freeShipping))} />
      )}

      {/* Home indicator */}
      <div className="flex justify-center py-2 bg-(--cocart-color-background)">
        <div className="h-1 w-24 rounded-full bg-slate-300" />
      </div>
    </div>
  );
}

function CheckoutPreview({ state, expressGateways, regularGateways, expressOnly, activeGatewayId, sections, freeShipping: freeShippingProp, onFreeShippingChange }: PreviewProps) {
  const [freeShippingLocal, setFreeShippingLocal] = useState(false);
  const freeShipping = freeShippingProp ?? freeShippingLocal;
  function handleCouponsChange(coupons: AppliedCoupon[]) {
    const free = coupons.some(c => c.freeShipping);
    setFreeShippingLocal(free);
    onFreeShippingChange?.(free);
  }
  const { theme, includeOrderSummary } = state;
  const layout = state.previewViewport === 'mobile' ? 'stacked' : state.containerLayout;

  const contactSection  = sections.find(s => s.id === 'contact');
  const billingSection  = sections.find(s => s.id === 'billing');
  const shippingSection = sections.find(s => s.id === 'shipping');
  const notesSection    = sections.find(s => s.id === 'notes');
  const paymentSection  = sections.find(s => s.id === 'payment');

  const showShipping = state.collectShippingAddress && !state.shippingSameAsBilling;
  const previewContainerClass = layout === 'two-column'
    ? (theme.containerClassName ?? 'mx-auto max-w-5xl grid grid-cols-[1fr_380px]').replace(/\blg:grid-cols-/g, 'grid-cols-')
    : theme.containerClassName;
  const formDef = { theme: { ...theme, containerClassName: previewContainerClass }, sections, gatewayId: activeGatewayId };

  const isModern = state.themePreset === 'modern';

  // Left column content — shared between stacked and two-column
  const leftContent = (
    <>
      {expressGateways.length > 0 && (
        <ExpressBar gateways={expressGateways} theme={theme} expressOnly={expressOnly} />
      )}
      {contactSection && (
        <Address type="contact" section={contactSection} theme={theme} />
      )}
      {showShipping && shippingSection && (
        <Address type="shipping" section={shippingSection} theme={theme} />
      )}
      {showShipping && (
        <ShippingMethods theme={theme} freeShipping={freeShipping} />
      )}
      {!showShipping && billingSection && (
        <Address type="billing" section={billingSection} theme={theme} />
      )}
      {notesSection && state.includeNotes && (
        <Address type="contact" section={notesSection} theme={theme} />
      )}
      {!expressOnly && (
        <PaymentMethods
          gateways={regularGateways}
          activeGatewayId={activeGatewayId}
          theme={theme}
          paymentSection={paymentSection}
          billingSection={billingSection}
          showBillingUnderPayment={showShipping}
          layout={state.paymentLayout}
        />
      )}
      {state.includeTerms ? (
        <TermsAndConditions theme={theme}>
          <PayButton theme={theme} />
        </TermsAndConditions>
      ) : (
        <PayButton theme={theme} />
      )}
    </>
  );

  // Modern theme: wrap sections with dividers and white bg.
  // Other themes: render content directly so their sectionClassName card styles drive layout.
  const leftCol = isModern
    ? <div className="min-w-0 overflow-hidden bg-(--cocart-color-background) text-(--cocart-color-text) *:py-4 *:border-b *:border-(--cocart-color-border) last:*:border-b-0">{leftContent}</div>
    : <div className="min-w-0 overflow-hidden grid gap-(--cocart-section-gap) py-4">{leftContent}</div>;

  if (layout === 'stacked') {
    return (
      <CheckoutContainer form={formDef} layout="stacked">
        {leftCol}
      </CheckoutContainer>
    );
  }

  return (
    <CheckoutContainer form={formDef} layout="two-column">
      {leftCol}
      <div className="self-stretch bg-(--cocart-color-background-alt)">
        {includeOrderSummary && <OrderSummary theme={theme} onCouponsChange={handleCouponsChange} />}
      </div>
    </CheckoutContainer>
  );
}

export class PreviewPane {
  private root: Root;

  constructor(container: HTMLElement) {
    container.id = 'checkout-preview-root';
    this.root = createRoot(container);
  }

  render(state: BuilderState): void {
    applyTheme(state);
    applyCustomCss(state.customCss);

    const enabledGateways  = state.gateways.filter(g => g.enabled);
    const toPresentation = (g: GatewayConfig): CheckoutGatewayPresentation => ({
      id: g.id, label: g.label, provider: g.id, description: g.description,
      supports: [
        ...(g.isOffline ? ['offline'] : []),
        ...(g.isExpress ? ['express'] : []),
      ],
    });
    const expressGateways  = enabledGateways.filter(g => g.isExpress).map(toPresentation);
    const regularRaw       = enabledGateways.filter(g => !g.isExpress);
    const activeGatewayId  = state.defaultGateway || regularRaw[0]?.id;
    const regularGateways  = regularRaw
      .sort((a, b) => (a.id === activeGatewayId ? -1 : b.id === activeGatewayId ? 1 : 0))
      .map(toPresentation);
    const expressOnly      = expressGateways.length > 0 && regularGateways.length === 0;

    const client = new CheckoutClient(mockCoCartClient, {
      defaultTheme: state.theme,
      defaultGateway: state.defaultGateway || undefined,
      collectShippingAddress: state.collectShippingAddress,
      shippingSameAsBilling: state.shippingSameAsBilling,
      fields: {
        contact:  state.fields.contact.map(f => ({ name: f.name, label: f.label, type: f.type, required: f.required, hidden: f.hidden, autoComplete: f.autoComplete, placeholder: f.placeholder, defaultValue: f.defaultValue })),
        billing:  state.fields.billing.map(f => ({ name: f.name, label: f.label, type: f.type, required: f.required, hidden: f.hidden, autoComplete: f.autoComplete, placeholder: f.placeholder, defaultValue: f.defaultValue })),
        shipping: state.fields.shipping.map(f => ({ name: f.name, label: f.label, type: f.type, required: f.required, hidden: f.hidden, autoComplete: f.autoComplete, placeholder: f.placeholder, defaultValue: f.defaultValue })),
        notes:    state.includeNotes ? state.fields.notes.map(f => ({ name: f.name, label: f.label, type: f.type, required: f.required, hidden: f.hidden, placeholder: f.placeholder, defaultValue: f.defaultValue })) : [],
      },
    });

    enabledGateways.forEach(gw => client.registerGateway(buildStubAdapter(gw)));

    const formDef = client.createForm({
      gatewayId: activeGatewayId,
      theme: state.theme,
      needsPayment: regularGateways.length > 0,
      includeSummary: false,
    });

    const wrapperClass = `bg-(--cocart-color-background) min-h-full${state.themePreset === 'shadcn' ? ' shadcn-vars' : ''}`;

    this.root.render(
      <div className={wrapperClass}>
        {state.previewViewport === 'mobile' ? (
          <div className="flex items-start justify-center py-8">
            <div className="relative w-97.5 rounded-[48px] bg-slate-900 p-3 shadow-2xl ring-1 ring-slate-700">
              {/* Notch */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 h-7 w-28 rounded-b-2xl bg-slate-900 z-10" />
              {/* Screen */}
              <MobileScreen
                state={state}
                expressGateways={expressGateways}
                regularGateways={regularGateways}
                expressOnly={expressOnly}
                activeGatewayId={activeGatewayId}
                sections={formDef.sections}
              />
            </div>
          </div>
        ) : (
          <CheckoutPreview
            state={state}
            expressGateways={expressGateways}
            regularGateways={regularGateways}
            expressOnly={expressOnly}
            activeGatewayId={activeGatewayId}
            sections={formDef.sections}
          />
        )}
      </div>
    );
  }
}
