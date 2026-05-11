import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { CheckoutClient, resolveTheme } from '@cocartheadless/checkout';
import type { CheckoutTheme, CheckoutGatewayAdapter, CheckoutFormSection, CheckoutGatewayPresentation } from '@cocartheadless/checkout';
import { MODERN_VARIABLES_DARK } from '@cocartheadless/checkout';
import type { AppliedCoupon } from '@cocartheadless/checkout/react';
import { CheckoutContainer, ExpressBar, Address, ShippingMethods, PaymentMethods, OrderSummary, OrderLineItems, DiscountCode, OrderTotals, PayButton, TermsAndConditions } from '@cocartheadless/checkout/react';
import { mockCoCartClient } from '../mock-client.js';
import type { BuilderState, GatewayConfig } from '../state.js';
import { MOCK_ITEMS, MOCK_COUPONS, MOCK_RATES, MOCK_SUBTOTAL_CENTS, MOCK_TAX_CENTS, MOCK_TOTAL, MOCK_CROSS_SELL_ITEMS } from '../mock-data.js';
import type { MockShippingRate } from '../mock-data.js';
import { TopBar } from './TopBar.js';

async function mockOnApply(code: string): Promise<AppliedCoupon | null> {
  await new Promise(r => setTimeout(r, 600));
  const entry = MOCK_COUPONS[code];
  if (!entry) return null;
  return { code, ...entry };
}

const SCOPE = '#checkout-preview-root';
let themeStyleEl: HTMLStyleElement | null = null;
let customStyleEl: HTMLStyleElement | null = null;

const MOCK_USER_EMAIL = 'customer@example.com';
const MOCK_USER_ADDRESS = '136 Commerce Boulevard, Garland, NE 68360, US';

function resolveEffectiveDark(colorScheme: BuilderState['colorScheme']): boolean {
  if (colorScheme === 'dark') return true;
  if (colorScheme === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches;
  return false;
}

function applyTheme(state: BuilderState): void {
  const isDark = resolveEffectiveDark(state.colorScheme);
  let theme: CheckoutTheme = state.theme;

  if (isDark && state.themePreset === 'modern') {
    theme = { ...state.theme, variables: MODERN_VARIABLES_DARK };
  }

  themeStyleEl?.remove();
  themeStyleEl = document.createElement('style');
  themeStyleEl.id = 'checkout-preview-theme';
  themeStyleEl.textContent = resolveTheme(theme, SCOPE);
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
  shippingCostCents?: number;
  onFreeShippingChange?: (free: boolean) => void;
  onShippingCostChange?: (cents: number) => void;
  suppressOrderSummary?: boolean;
}

function OrderSummarySection({ state, shippingCostCents, onCouponsChange }: { state: BuilderState; shippingCostCents?: number; onCouponsChange?: (free: boolean) => void }) {
  const { theme, showOrderLineItems, showDiscountCode, showOrderTotals } = state;
  const showShipping = state.collectShippingAddress && !state.shippingSameAsBilling;
  const [coupons, setCoupons] = useState<AppliedCoupon[]>([]);

  function handleCoupons(next: AppliedCoupon[]) {
    setCoupons(next);
    onCouponsChange?.(next.some(c => c.freeShipping));
  }

  const hasAny = showOrderLineItems || showDiscountCode || showOrderTotals;
  if (!hasAny) return null;

  return (
    <div className={theme.orderSummaryClassName ?? ''}>
      {showOrderLineItems && <OrderLineItems theme={theme} items={MOCK_ITEMS} />}
      {showDiscountCode && (
        <div className={showOrderLineItems ? 'border-t border-(--cocart-color-border) mt-4 pt-4' : ''}>
          <DiscountCode
            theme={theme}
            applied={coupons}
            onApply={async (code) => {
              const result = await mockOnApply(code);
              if (result) handleCoupons([...coupons, result]);
              return result;
            }}
            onRemove={code => handleCoupons(coupons.filter(c => c.code !== code))}
          />
        </div>
      )}
      {showOrderTotals && (
        <div className={(showOrderLineItems || showDiscountCode) ? 'border-t border-(--cocart-color-border) mt-4 pt-4' : ''}>
          <OrderTotals theme={theme} subtotalCents={MOCK_SUBTOTAL_CENTS} taxCents={MOCK_TAX_CENTS} coupons={coupons} showShipping={showShipping} shippingCostCents={shippingCostCents} />
        </div>
      )}
    </div>
  );
}

function MobileScreen({ state, expressGateways, regularGateways, expressOnly, activeGatewayId, sections }: PreviewProps) {
  const { theme, includeOrderSummary, mobileOrderSummaryDrawer } = state;
  const showShipping = state.collectShippingAddress && !state.shippingSameAsBilling;
  const [freeShipping, setFreeShipping] = useState(false);
  const [shippingCostCents, setShippingCostCents] = useState<number | undefined>(undefined);

  return (
    <div className="relative overflow-hidden rounded-[38px] bg-(--cocart-color-background) min-h-160 flex flex-col">
      {/* Top bar */}
      <TopBar storeName={state.topBarStoreName} logoUrl={state.topBarLogoUrl || undefined} bgColor={state.topBarBgColor} cartCount={MOCK_ITEMS.length} />

      {/* Status bar spacer */}
      <div className="h-4 bg-(--cocart-color-background)" />

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
          shippingCostCents={shippingCostCents}
          onFreeShippingChange={setFreeShipping}
          onShippingCostChange={setShippingCostCents}
          suppressOrderSummary
        />
        {includeOrderSummary && !mobileOrderSummaryDrawer && (
          <OrderSummary theme={theme} items={MOCK_ITEMS} subtotalCents={MOCK_SUBTOTAL_CENTS} taxCents={MOCK_TAX_CENTS} total={MOCK_TOTAL} showShipping={showShipping} shippingCostCents={shippingCostCents} crossSellProducts={MOCK_CROSS_SELL_ITEMS} onApply={mockOnApply} onCouponsChange={c => setFreeShipping(c.some(x => x.freeShipping))} />
        )}
        {!includeOrderSummary && (
          <OrderSummarySection state={state} shippingCostCents={shippingCostCents} onCouponsChange={setFreeShipping} />
        )}
      </div>

      {/* Bottom bar + drawer — rendered outside scroll so bar never scrolls away */}
      {includeOrderSummary && mobileOrderSummaryDrawer && (
        <OrderSummary theme={theme} mobileDrawer items={MOCK_ITEMS} subtotalCents={MOCK_SUBTOTAL_CENTS} taxCents={MOCK_TAX_CENTS} total={MOCK_TOTAL} showShipping={showShipping} shippingCostCents={shippingCostCents} crossSellProducts={MOCK_CROSS_SELL_ITEMS} onApply={mockOnApply} onCouponsChange={c => setFreeShipping(c.some(x => x.freeShipping))} />
      )}

      {/* Home indicator */}
      <div className="flex justify-center py-2 bg-(--cocart-color-background)">
        <div className="h-1 w-24 rounded-full bg-slate-300" />
      </div>
    </div>
  );
}

function CheckoutPreview({ state, expressGateways, regularGateways, expressOnly, activeGatewayId, sections, freeShipping: freeShippingProp, shippingCostCents: shippingCostCentsProp, onFreeShippingChange, onShippingCostChange, suppressOrderSummary }: PreviewProps) {
  const [freeShippingLocal, setFreeShippingLocal] = useState(false);
  const [shippingCostCentsLocal, setShippingCostCentsLocal] = useState<number | undefined>(
    state.isLoggedIn ? (MOCK_RATES[0]?.costCents ?? 0) : undefined
  );
  const freeShipping = freeShippingProp ?? freeShippingLocal;
  const shippingCostCents = shippingCostCentsProp ?? shippingCostCentsLocal;
  const addressEntered = state.isLoggedIn;

  function handleCouponsChange(coupons: AppliedCoupon[]) {
    const free = coupons.some(c => c.freeShipping);
    setFreeShippingLocal(free);
    onFreeShippingChange?.(free);
  }
  function handleFreeShippingChange(free: boolean) {
    setFreeShippingLocal(free);
    onFreeShippingChange?.(free);
  }
  function handleRateChange(rate: MockShippingRate) {
    setShippingCostCentsLocal(rate.costCents);
    onShippingCostChange?.(rate.costCents);
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
    ? (theme.containerClassName ?? 'mx-auto max-w-5xl grid grid-cols-[1fr_420px]').replace(/\blg:grid-cols-/g, 'grid-cols-')
    : theme.containerClassName;
  const formDef = { theme: { ...theme, containerClassName: previewContainerClass }, sections, gatewayId: activeGatewayId };

  const isModern = state.themePreset === 'modern';

  // Left column content — shared between stacked and two-column
  const leftContent = (
    <>
      {expressGateways.length > 0 && (
        <div className="express-bar-wrapper">
          <ExpressBar gateways={expressGateways} theme={theme} expressOnly={expressOnly} />
        </div>
      )}
      {contactSection && (
        <Address type="contact" section={contactSection} theme={theme} isAuthorized={state.isLoggedIn} compactSummary={MOCK_USER_EMAIL} />
      )}
      {showShipping && shippingSection && (
        <Address type="shipping" section={shippingSection} theme={theme} isAuthorized={state.isLoggedIn} compactSummary={MOCK_USER_ADDRESS} />
      )}
      {showShipping && (
        <ShippingMethods theme={theme} rates={MOCK_RATES} freeShipping={freeShipping} placeholder={!addressEntered} onRateChange={r => handleRateChange(r as MockShippingRate)} />
      )}
      {!showShipping && billingSection && (
        <Address type="billing" section={billingSection} theme={theme} isAuthorized={state.isLoggedIn} compactSummary={MOCK_USER_ADDRESS} />
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
          <PayButton theme={theme} onGuestCheckout={state.isLoggedIn ? () => {} : undefined} />
        </TermsAndConditions>
      ) : (
        <PayButton theme={theme} onGuestCheckout={state.isLoggedIn ? () => {} : undefined} />
      )}
    </>
  );

  // Modern theme: wrap sections with dividers and white bg.
  // Other themes: render content directly so their sectionClassName card styles drive layout.
  const leftCol = isModern
    ? <div className="min-w-0 overflow-hidden bg-(--cocart-color-background) text-(--cocart-color-text) modern-sections">{leftContent}</div>
    : <div className="min-w-0 overflow-hidden grid gap-(--cocart-section-gap) py-4">{leftContent}</div>;

  if (layout === 'stacked') {
    return (
      <CheckoutContainer form={formDef} layout="stacked">
        {!suppressOrderSummary && (
          <div className="bg-(--cocart-color-background-alt)">
            {includeOrderSummary
              ? <OrderSummary theme={theme} items={MOCK_ITEMS} subtotalCents={MOCK_SUBTOTAL_CENTS} taxCents={MOCK_TAX_CENTS} total={MOCK_TOTAL} showShipping={showShipping} shippingCostCents={shippingCostCents} crossSellProducts={MOCK_CROSS_SELL_ITEMS} onApply={mockOnApply} onCouponsChange={handleCouponsChange} />
              : <OrderSummarySection state={state} shippingCostCents={shippingCostCents} onCouponsChange={handleFreeShippingChange} />
            }
          </div>
        )}
        {leftCol}
      </CheckoutContainer>
    );
  }

  return (
    <CheckoutContainer form={formDef} layout="two-column">
      {leftCol}
      <div className="self-stretch bg-(--cocart-color-background-alt)">
        {includeOrderSummary
          ? <OrderSummary theme={theme} items={MOCK_ITEMS} subtotalCents={MOCK_SUBTOTAL_CENTS} taxCents={MOCK_TAX_CENTS} total={MOCK_TOTAL} showShipping={showShipping} shippingCostCents={shippingCostCents} crossSellProducts={MOCK_CROSS_SELL_ITEMS} onApply={mockOnApply} onCouponsChange={handleCouponsChange} />
          : <OrderSummarySection state={state} shippingCostCents={shippingCostCents} onCouponsChange={handleFreeShippingChange} />
        }
      </div>
    </CheckoutContainer>
  );
}

export class PreviewPane {
  private root: Root;
  private simulationKey = 0;

  constructor(container: HTMLElement) {
    container.id = 'checkout-preview-root';
    this.root = createRoot(container);
  }

  resetSimulation(): void {
    this.simulationKey += 1;
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

    const isDark = resolveEffectiveDark(state.colorScheme);
    const effectiveDaisyTheme = state.themePreset === 'tailwind' ? state.daisyTheme : undefined;
    const effectiveShadcnTheme = state.themePreset === 'shadcn' ? (isDark ? 'dark' : 'light') : undefined;
    const dataTheme = effectiveDaisyTheme ?? effectiveShadcnTheme;

    const wrapperClass = `bg-(--cocart-color-background) min-h-full${state.themePreset === 'shadcn' ? ' shadcn-vars' : ''}`;

    this.root.render(
      <div className={wrapperClass} {...(dataTheme ? { 'data-theme': dataTheme } : {})}>
        {state.previewViewport === 'mobile' ? (
          <div className="flex items-start justify-center py-8">
            <div className="relative w-97.5 rounded-[48px] bg-slate-900 p-3 shadow-2xl ring-1 ring-slate-700">
              {/* Notch */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 h-7 w-28 rounded-b-2xl bg-slate-900 z-10" />
              {/* Screen */}
              <MobileScreen
                key={this.simulationKey}
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
          <>
            <TopBar storeName={state.topBarStoreName} logoUrl={state.topBarLogoUrl || undefined} bgColor={state.topBarBgColor} cartCount={MOCK_ITEMS.length} />
            <CheckoutPreview
              key={this.simulationKey}
              state={state}
              expressGateways={expressGateways}
              regularGateways={regularGateways}
              expressOnly={expressOnly}
              activeGatewayId={activeGatewayId}
              sections={formDef.sections}
            />
          </>
        )}
      </div>
    );
  }
}
