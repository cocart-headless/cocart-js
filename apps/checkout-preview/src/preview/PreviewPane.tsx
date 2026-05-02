import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import type { Root } from 'react-dom/client';
import { CheckoutClient, resolveTheme } from '@cocartheadless/checkout';
import type { CheckoutGatewayAdapter, CheckoutFormSection } from '@cocartheadless/checkout';
import { mockCoCartClient } from '../mock-client.js';
import type { BuilderState, GatewayConfig } from '../state.js';
import { CheckoutContainer } from '../components/checkout/CheckoutContainer.js';
import { ExpressBar } from '../components/checkout/ExpressBar.js';
import { Address } from '../components/checkout/Address.js';
import { ShippingMethods } from '../components/checkout/ShippingMethods.js';
import { PaymentMethods } from '../components/checkout/PaymentMethods.js';
import { OrderSummary } from '../components/checkout/OrderSummary.js';
import { PayButton } from '../components/checkout/PayButton.js';

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
  expressGateways: GatewayConfig[];
  regularGateways: GatewayConfig[];
  expressOnly: boolean;
  activeGatewayId: string | undefined;
  sections: CheckoutFormSection[];
}

function MobileScreen({ state, expressGateways, regularGateways, expressOnly, activeGatewayId, sections }: PreviewProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { theme, includeOrderSummary } = state;

  return (
    <div className="relative overflow-hidden rounded-[38px] bg-(--cocart-color-background)">
      {/* Status bar spacer */}
      <div className="h-10 bg-(--cocart-color-background)" />

      {/* Scrollable form content */}
      <div className="overflow-y-auto max-h-180">
        <CheckoutPreview
          state={state}
          expressGateways={expressGateways}
          regularGateways={regularGateways}
          expressOnly={expressOnly}
          activeGatewayId={activeGatewayId}
          sections={sections}
        />
      </div>

      {/* Sticky bottom bar — outside scroll div so it never scrolls away */}
      {includeOrderSummary && (
        <div className="border-t border-(--cocart-color-border) bg-(--cocart-color-background-alt)">
          <button
            type="button"
            onClick={() => setDrawerOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium text-(--cocart-color-text)"
          >
            <span className="flex items-center gap-2">
              <svg className={`h-4 w-4 transition-transform duration-200 ${drawerOpen ? 'rotate-180' : ''}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6l5 5 5-5" />
              </svg>
              Order summary
            </span>
            <span className="font-semibold">USD $95.70</span>
          </button>
        </div>
      )}

      {/* Drawer — absolute within screen, never scrolls */}
      {drawerOpen && includeOrderSummary && (
        <div className="absolute inset-0 z-30 flex flex-col justify-end bg-black/20" onClick={() => setDrawerOpen(false)}>
          <div
            className="rounded-t-2xl bg-(--cocart-color-background-alt) overflow-y-auto max-h-4/5 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-(--cocart-color-border)" />
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-(--cocart-color-border)">
              <span className="text-sm font-semibold text-(--cocart-color-text)">Order summary</span>
              <button type="button" onClick={() => setDrawerOpen(false)} className="text-(--cocart-color-text-muted)">
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 3l10 10M13 3L3 13" />
                </svg>
              </button>
            </div>
            <OrderSummary theme={theme} />
          </div>
        </div>
      )}

      {/* Home indicator */}
      <div className="flex justify-center py-2 bg-(--cocart-color-background)">
        <div className="h-1 w-24 rounded-full bg-slate-300" />
      </div>
    </div>
  );
}

function CheckoutPreview({ state, expressGateways, regularGateways, expressOnly, activeGatewayId, sections }: PreviewProps) {
  const { theme, includeOrderSummary } = state;
  const layout = state.previewViewport === 'mobile' ? 'stacked' : 'two-column';

  const contactSection  = sections.find(s => s.id === 'contact');
  const billingSection  = sections.find(s => s.id === 'billing');
  const shippingSection = sections.find(s => s.id === 'shipping');
  const notesSection    = sections.find(s => s.id === 'notes');
  const paymentSection  = sections.find(s => s.id === 'payment');

  const showShipping = state.collectShippingAddress;
  const formDef = { theme, sections, gatewayId: activeGatewayId };

  if (expressOnly) {
    return (
      <CheckoutContainer form={formDef} layout="stacked">
        <ExpressBar gateways={expressGateways} theme={theme} expressOnly />
      </CheckoutContainer>
    );
  }

  const isModern = state.themePreset === 'modern';

  // Left column content — shared between stacked and two-column
  const leftContent = (
    <>
      {expressGateways.length > 0 && (
        <ExpressBar gateways={expressGateways} theme={theme} />
      )}
      {contactSection && (
        <Address type="contact" section={contactSection} theme={theme} />
      )}
      {showShipping && shippingSection && (
        <Address type="shipping" section={shippingSection} theme={theme} />
      )}
      {showShipping && (
        <ShippingMethods theme={theme} />
      )}
      {notesSection && state.includeNotes && (
        <Address type="contact" section={notesSection} theme={theme} />
      )}
      <PaymentMethods
        gateways={regularGateways}
        activeGatewayId={activeGatewayId}
        theme={theme}
        paymentSection={paymentSection}
        billingSection={billingSection}
        showBillingUnderPayment={showShipping}
      />
      {!showShipping && billingSection && (
        <Address type="billing" section={billingSection} theme={theme} />
      )}
      <PayButton theme={theme} />
    </>
  );

  // Modern theme: wrap sections with dividers and white bg.
  // Other themes: render content directly so their sectionClassName card styles drive layout.
  const leftCol = isModern
    ? <div className="bg-(--cocart-color-background) text-(--cocart-color-text) *:py-4 *:border-b *:border-(--cocart-color-border) last:*:border-b-0">{leftContent}</div>
    : <div className="grid gap-(--cocart-section-gap) py-4">{leftContent}</div>;

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
      <div className="lg:self-stretch bg-(--cocart-color-background-alt)">
        {includeOrderSummary && <OrderSummary theme={theme} />}
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
    const expressGateways  = enabledGateways.filter(g => g.isExpress);
    const regularGateways  = enabledGateways.filter(g => !g.isExpress);
    const expressOnly      = expressGateways.length > 0 && regularGateways.length === 0;
    const activeGatewayId  = state.defaultGateway || (regularGateways[0]?.id);

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
