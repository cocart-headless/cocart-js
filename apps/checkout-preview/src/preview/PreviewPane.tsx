import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { CheckoutClient } from '@cocartheadless/checkout';
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

let customStyleEl: HTMLStyleElement | null = null;
let shadcnStyleEl: HTMLStyleElement | null = null;

const SHADCN_CSS_VARS = `
  --background: #ffffff; --foreground: #0f172a;
  --card: #ffffff; --card-foreground: #0f172a;
  --primary: #1e293b; --primary-foreground: #f8fafc;
  --muted: #f1f5f9; --muted-foreground: #64748b;
  --border: #e2e8f0; --input: #e2e8f0; --ring: #1e293b;
`;

function applyCustomCss(css: string): void {
  customStyleEl?.remove();
  customStyleEl = document.createElement('style');
  customStyleEl.id = 'checkout-preview-custom-css';
  customStyleEl.textContent = css;
  document.head.appendChild(customStyleEl);
}

function applyShadcnVars(active: boolean): void {
  if (active && !shadcnStyleEl) {
    shadcnStyleEl = document.createElement('style');
    shadcnStyleEl.textContent = `#checkout-preview-root .shadcn-vars { ${SHADCN_CSS_VARS} }`;
    document.head.appendChild(shadcnStyleEl);
  } else if (!active && shadcnStyleEl) {
    shadcnStyleEl.remove();
    shadcnStyleEl = null;
  }
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

  const leftCol = (
    <div className="bg-white *:py-4">
      {leftContent}
    </div>
  );

  if (layout === 'stacked') {
    return (
      <CheckoutContainer form={formDef} layout="stacked">
        {leftCol}
        {includeOrderSummary && <OrderSummary theme={theme} />}
      </CheckoutContainer>
    );
  }

  return (
    <CheckoutContainer form={formDef} layout="two-column">
      {leftCol}
      <div className="grid content-start">
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
    applyShadcnVars(state.themePreset === 'shadcn');
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

    const wrapperClass = state.themePreset === 'shadcn' ? 'shadcn-vars' : '';

    this.root.render(
      <div className={wrapperClass}>
        {state.previewViewport === 'mobile' ? (
          <div className="max-w-[390px] mx-auto device-frame overflow-hidden rounded-[20px] bg-white">
            <div className="overflow-y-auto max-h-[700px]">
              <CheckoutPreview
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
