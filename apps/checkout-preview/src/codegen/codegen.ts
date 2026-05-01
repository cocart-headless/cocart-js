import type { CheckoutTheme } from '@cocartheadless/checkout';
import { createTailwindCheckoutTheme, shadcnCheckoutTheme } from '@cocartheadless/checkout';
import type { BuilderState } from '../state.js';

const TAILWIND_DEFAULTS = createTailwindCheckoutTheme();

const GATEWAY_IMPORT_MAP: Record<string, string> = {
  'stripe':         'createStripeGateway',
  'stripe-express': 'createStripeExpressGateway',
  'paypal':         'createPayPalGateway',
  'authorizenet':   'createAuthorizeNetGateway',
  'bacs':           'createBankTransferGateway',
  'cheque':         'createCheckPaymentGateway',
  'cod':            'createCashOnDeliveryGateway',
};

const GATEWAY_SNIPPET: Record<string, string> = {
  'stripe':         'createStripeGateway({ stripe, elements })',
  'stripe-express': 'createStripeExpressGateway({ stripe, elements })',
  'paypal':         'createPayPalGateway({ createOrder, onApprove })',
  'authorizenet':   'createAuthorizeNetGateway({ dispatchData, clientKey, apiLoginID })',
  'bacs':           'createBankTransferGateway()',
  'cheque':         'createCheckPaymentGateway()',
  'cod':            'createCashOnDeliveryGateway()',
};

function themeExpression(state: BuilderState): string {
  if (state.themePreset === 'modern') return 'createModernCheckoutTheme()';
  if (state.themePreset === 'shadcn') return 'shadcnCheckoutTheme';
  if (state.themePreset === 'tailwind') {
    const overrides = getThemeOverrides(state.theme, TAILWIND_DEFAULTS);
    if (Object.keys(overrides).length === 0) return 'createTailwindCheckoutTheme()';
    const entries = Object.entries(overrides)
      .map(([k, v]) => `    ${k}: '${v}'`)
      .join(',\n');
    return `createTailwindCheckoutTheme({\n${entries},\n  })`;
  }
  // custom — inline object
  const entries = (Object.keys(state.theme) as (keyof CheckoutTheme)[])
    .filter(k => k !== 'name')
    .map(k => `    ${k}: '${state.theme[k]}'`)
    .join(',\n');
  return `{\n    name: 'custom',\n${entries},\n  }`;
}

function getThemeOverrides(theme: CheckoutTheme, defaults: CheckoutTheme): Partial<Record<keyof CheckoutTheme, string>> {
  const out: Partial<Record<keyof CheckoutTheme, string>> = {};
  for (const k of Object.keys(defaults) as (keyof CheckoutTheme)[]) {
    if (k === 'name') continue;
    if (theme[k] !== defaults[k]) {
      out[k] = theme[k] as string;
    }
  }
  return out;
}

function buildSetupCode(state: BuilderState): string {
  const enabledGateways = state.gateways.filter(g => g.enabled);
  const lines: string[] = [];

  const baseImports: string[] = ['createCheckout'];
  if (state.themePreset === 'modern') baseImports.push('createModernCheckoutTheme');
  if (state.themePreset === 'tailwind') baseImports.push('createTailwindCheckoutTheme');
  if (state.themePreset === 'shadcn') baseImports.push('shadcnCheckoutTheme');

  const gatewayFns = enabledGateways.map(g => GATEWAY_IMPORT_MAP[g.id]).filter(Boolean);
  const allImports = [...new Set([...baseImports, ...gatewayFns])];

  lines.push(`import {\n  ${allImports.join(',\n  ')},\n} from '@cocartheadless/checkout';`);
  lines.push('');
  lines.push('const checkout = createCheckout({');
  if (state.successUrl) lines.push(`  successUrl: '${state.successUrl}',`);
  if (state.returnUrl)  lines.push(`  returnUrl: '${state.returnUrl}',`);
  if (!state.collectShippingAddress) lines.push('  collectShippingAddress: false,');
  if (!state.shippingSameAsBilling)  lines.push('  shippingSameAsBilling: false,');
  lines.push(`  defaultTheme: ${themeExpression(state)},`);
  if (state.defaultGateway) lines.push(`  defaultGateway: '${state.defaultGateway}',`);
  if (enabledGateways.length > 0) {
    lines.push('  gatewayAdapters: [');
    enabledGateways.forEach(gw => {
      lines.push(`    ${GATEWAY_SNIPPET[gw.id] ?? `/* ${gw.id} */`},`);
    });
    lines.push('  ],');
  }
  lines.push('});');

  return lines.join('\n');
}

function buildJsxCode(state: BuilderState): string {
  const enabledGateways = state.gateways.filter(g => g.enabled);
  const regularGateways = enabledGateways.filter(g => !g.isExpress);
  const expressGateways = enabledGateways.filter(g => g.isExpress);

  const componentImports = [
    'CheckoutContainer',
    expressGateways.length > 0 ? 'ExpressBar' : null,
    'Address',
    regularGateways.length > 0 ? 'PaymentMethods' : null,
    state.includeOrderSummary ? 'OrderSummary' : null,
    'PayButton',
  ].filter(Boolean) as string[];

  const lines: string[] = [];
  lines.push(`import { ${componentImports.join(', ')} } from './components/checkout';`);
  lines.push('');
  lines.push('export function CheckoutForm({ form }) {');
  lines.push('  return (');
  lines.push('    <CheckoutContainer form={form} layout="two-column">');

  if (expressGateways.length > 0) {
    lines.push('      <ExpressBar gateways={expressBar.gateways} theme={form.theme} />');
  }

  const sections: Array<{ type: 'contact' | 'billing' | 'shipping'; id: string }> = [
    { type: 'contact', id: 'contact' },
    { type: 'billing', id: 'billing' },
  ];
  if (state.collectShippingAddress && !state.shippingSameAsBilling) {
    sections.push({ type: 'shipping', id: 'shipping' });
  }

  sections.forEach(({ type, id }) => {
    lines.push(`      <Address type="${type}" section={form.sections.find(s => s.id === '${id}')!} theme={form.theme} />`);
  });

  if (regularGateways.length > 0) {
    lines.push('      <PaymentMethods gateways={gateways} theme={form.theme} />');
  }

  if (state.includeOrderSummary) {
    lines.push('      <OrderSummary theme={form.theme} />');
  }

  lines.push('      <PayButton theme={form.theme} label="Pay now" />');
  lines.push('    </CheckoutContainer>');
  lines.push('  );');
  lines.push('}');

  return lines.join('\n');
}

export function generateCode(state: BuilderState): string {
  return buildSetupCode(state) + '\n\n' + buildJsxCode(state);
}

export function generateLLMPrompt(state: BuilderState): string {
  const enabledGateways = state.gateways.filter(g => g.enabled);
  const sections: string[] = ['contact', 'billing'];
  if (state.collectShippingAddress && !state.shippingSameAsBilling) sections.push('shipping');
  if (state.includeNotes) sections.push('notes');
  if (enabledGateways.length > 0) sections.push('payment');
  if (state.includeOrderSummary) sections.push('order summary');

  const descLines = [
    '// CoCart Checkout SDK — Builder Configuration',
    '//',
    `// Theme:              ${state.themePreset}`,
    `// Collect shipping:   ${state.collectShippingAddress}`,
    `// Shipping = billing: ${state.shippingSameAsBilling}`,
    `// Sections:           ${sections.join(', ')}`,
    `// Payment gateways:   ${enabledGateways.length > 0 ? enabledGateways.map(g => g.label).join(', ') : 'none'}`,
    state.defaultGateway ? `// Default gateway:   ${state.defaultGateway}` : null,
    state.successUrl ? `// Success URL:       ${state.successUrl}` : null,
    state.returnUrl  ? `// Return URL:        ${state.returnUrl}` : null,
    '//',
    '// Paste this configuration into your CoCart client setup.',
  ].filter((l): l is string => l !== null);

  return descLines.join('\n') + '\n\n' + generateCode(state);
}

export function highlightCode(code: string): HTMLElement {
  const pre = document.createElement('pre');
  pre.className = 'font-mono text-xs leading-relaxed p-4 text-slate-300 overflow-auto';

  const lines = code.split('\n');
  lines.forEach((line, i) => {
    const lineEl = document.createElement('span');
    lineEl.className = 'block';
    lineEl.dataset['line'] = String(i + 1);
    lineEl.appendChild(colorizeTokens(line));
    pre.appendChild(lineEl);
  });

  return pre;
}

function colorizeTokens(line: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  const tokens = tokenizeLine(line);
  tokens.forEach(({ text, kind }) => {
    if (kind === 'plain') {
      frag.appendChild(document.createTextNode(text));
      return;
    }
    const span = document.createElement('span');
    span.textContent = text;
    span.className = `code-${kind}`;
    frag.appendChild(span);
  });
  return frag;
}

interface Token { text: string; kind: string; }

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let remaining = line;

  while (remaining.length > 0) {
    const commentMatch = remaining.match(/^(\/\/.*)/);
    if (commentMatch) { tokens.push({ text: commentMatch[1], kind: 'comment' }); break; }

    const strMatch = remaining.match(/^('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/);
    if (strMatch) { tokens.push({ text: strMatch[1], kind: 'string' }); remaining = remaining.slice(strMatch[1].length); continue; }

    const kwMatch = remaining.match(/^(import|from|const|let|var|export|default|type|return)\b/);
    if (kwMatch) { tokens.push({ text: kwMatch[1], kind: 'keyword' }); remaining = remaining.slice(kwMatch[1].length); continue; }

    const fnMatch = remaining.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*[({<])/);
    if (fnMatch) { tokens.push({ text: fnMatch[1], kind: 'fn' }); remaining = remaining.slice(fnMatch[1].length); continue; }

    const propMatch = remaining.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*[=:])/);
    if (propMatch) { tokens.push({ text: propMatch[1], kind: 'prop' }); remaining = remaining.slice(propMatch[1].length); continue; }

    tokens.push({ text: remaining[0], kind: 'plain' });
    remaining = remaining.slice(1);
  }

  return tokens;
}

// Keep shadcnCheckoutTheme import live (used in themeExpression string comparison)
void shadcnCheckoutTheme;
