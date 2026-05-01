import type { CheckoutFieldType, CheckoutTheme } from '@cocartheadless/checkout';
import { createTailwindCheckoutTheme } from '@cocartheadless/checkout';
import { createModernCheckoutTheme } from './components/checkout/themes.js';

export interface GatewayConfig {
  id: string;
  enabled: boolean;
  label: string;
  description: string;
  isExpress: boolean;
  isOffline: boolean;
}

export interface FieldConfig {
  name: string;
  label: string;
  type: CheckoutFieldType;
  required: boolean;
  hidden: boolean;
  autoComplete?: string;
  placeholder?: string;
  defaultValue?: string | boolean;
}

export interface BuilderState {
  collectShippingAddress: boolean;
  shippingSameAsBilling: boolean;
  includeNotes: boolean;
  includeOrderSummary: boolean;
  successUrl: string;
  returnUrl: string;
  fields: {
    contact: FieldConfig[];
    billing: FieldConfig[];
    shipping: FieldConfig[];
    notes: FieldConfig[];
  };
  themePreset: 'modern' | 'tailwind' | 'shadcn' | 'custom';
  theme: CheckoutTheme;
  customCss: string;
  gateways: GatewayConfig[];
  defaultGateway: string;
  previewViewport: 'desktop' | 'mobile';
  activeTab: 'data' | 'appearance' | 'payments';
}

export const GATEWAY_CATALOG: GatewayConfig[] = [
  { id: 'stripe-express', label: 'Stripe Express',        description: 'Apple Pay, Google Pay & Link via Stripe',   isExpress: true,  isOffline: false, enabled: true },
  { id: 'stripe',         label: 'Stripe',                description: 'Card payments via Stripe Elements',         isExpress: false, isOffline: false, enabled: false },
  { id: 'paypal',         label: 'PayPal',                description: 'Smart Buttons & redirectless checkout',     isExpress: false, isOffline: false, enabled: false },
  { id: 'authorizenet',   label: 'Authorize.Net',         description: 'Accept.js card tokenization',               isExpress: false, isOffline: false, enabled: false },
  { id: 'bacs',           label: 'Direct Bank Transfer',  description: 'Customer pays via bank transfer',           isExpress: false, isOffline: true,  enabled: false },
  { id: 'cheque',         label: 'Check Payment',         description: 'Customer pays by check or money order',     isExpress: false, isOffline: true,  enabled: false },
  { id: 'cod',            label: 'Cash on Delivery',      description: 'Customer pays upon delivery',               isExpress: false, isOffline: true,  enabled: true },
];

const DEFAULT_TAILWIND_THEME = createTailwindCheckoutTheme();
const DEFAULT_MODERN_THEME = createModernCheckoutTheme();

function defaultState(): BuilderState {
  return {
    collectShippingAddress: true,
    shippingSameAsBilling: false,
    includeNotes: false,
    includeOrderSummary: true,
    successUrl: '',
    returnUrl: '',
    fields: {
      contact: [
        { name: 'billing_address.email', label: 'Email address', type: 'email',    required: true,  hidden: false, autoComplete: 'email' },
        { name: 'billing_address.phone', label: 'Phone number',  type: 'tel',      required: false, hidden: false, autoComplete: 'tel' },
      ],
      billing: [
        { name: 'billing_address.country',    label: 'Country/Region',          type: 'select', required: true,  hidden: false, autoComplete: 'country-name' },
        { name: 'billing_address.first_name', label: 'First name',       type: 'text', required: true,  hidden: false, autoComplete: 'given-name' },
        { name: 'billing_address.last_name',  label: 'Last name',        type: 'text', required: true,  hidden: false, autoComplete: 'family-name' },
        { name: 'billing_address.address_1',  label: 'Address line 1',   type: 'text', required: true,  hidden: false, autoComplete: 'address-line1' },
        { name: 'billing_address.address_2',  label: 'Address line 2',   type: 'text', required: false, hidden: false, autoComplete: 'address-line2' },
        { name: 'billing_address.city',       label: 'City',             type: 'text', required: true,  hidden: false, autoComplete: 'address-level2' },
        { name: 'billing_address.state',      label: 'State / Province', type: 'text', required: false, hidden: false, autoComplete: 'address-level1' },
        { name: 'billing_address.postcode',   label: 'Postal code',      type: 'text', required: true,  hidden: false, autoComplete: 'postal-code' },
      ],
      shipping: [
        { name: 'shipping_address.country',    label: 'Country/Region', type: 'select', required: true,  hidden: false, autoComplete: 'shipping country-name', defaultValue: 'US' },
        { name: 'shipping_address.first_name', label: 'First name',       type: 'text', required: true,  hidden: false, autoComplete: 'shipping given-name' },
        { name: 'shipping_address.last_name',  label: 'Last name',        type: 'text', required: true,  hidden: false, autoComplete: 'shipping family-name' },
        { name: 'shipping_address.address_1',  label: 'Address line 1',   type: 'text', required: true,  hidden: false, autoComplete: 'shipping address-line1' },
        { name: 'shipping_address.address_2',  label: 'Address line 2',   type: 'text', required: false, hidden: false, autoComplete: 'shipping address-line2' },
        { name: 'shipping_address.city',       label: 'City',             type: 'text', required: true,  hidden: false, autoComplete: 'shipping address-level2' },
        { name: 'shipping_address.state',      label: 'State / Province', type: 'text', required: false, hidden: false, autoComplete: 'shipping address-level1' },
        { name: 'shipping_address.postcode',   label: 'Postal code',      type: 'text', required: true,  hidden: false, autoComplete: 'shipping postal-code' },
      ],
      notes: [
        { name: 'customer_note', label: 'Order notes', type: 'textarea', required: false, hidden: false, placeholder: 'Delivery instructions or special notes' },
      ],
    },
    themePreset: 'modern',
    theme: DEFAULT_MODERN_THEME,
    customCss: '',
    gateways: GATEWAY_CATALOG.map(g => ({ ...g })),
    defaultGateway: '',
    previewViewport: 'desktop',
    activeTab: 'data',
  };
}

type Listener = (state: BuilderState) => void;

class StateStore {
  private state: BuilderState = defaultState();
  private listeners: Set<Listener> = new Set();

  get(): BuilderState {
    return this.state;
  }

  update(patch: Partial<BuilderState>): void {
    this.state = { ...this.state, ...patch };
    this.notify();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    this.listeners.forEach(fn => fn(this.state));
  }
}

export const store = new StateStore();
export { DEFAULT_TAILWIND_THEME, DEFAULT_MODERN_THEME };
