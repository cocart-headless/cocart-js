import { getPresetVariables } from '@cocartheadless/checkout';
import type { CheckoutThemeVariables } from '@cocartheadless/checkout';
import type { BuilderState } from '../state.js';
import { GATEWAY_CATALOG } from '../state.js';

const CATALOG_DEFAULTS = Object.fromEntries(GATEWAY_CATALOG.map(g => [g.id, g]));

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
  const preset = state.themePreset as 'modern' | 'tailwind' | 'shadcn' | 'custom';

  if (preset === 'custom') {
    // Emit full createCheckoutTheme call with all variables and rules
    const vars = state.theme.variables;
    const rules = state.theme.rules;
    const parts: string[] = [];
    if (vars && Object.keys(vars).length > 0) {
      const entries = Object.entries(vars).map(([k, v]) => `    ${k}: '${v}'`).join(',\n');
      parts.push(`  variables: {\n${entries},\n  }`);
    }
    if (rules && Object.keys(rules).length > 0) {
      const ruleEntries = Object.entries(rules)
        .map(([sel, props]) => {
          const propEntries = Object.entries(props).map(([p, v]) => `      ${p}: '${v}'`).join(',\n');
          return `    '${sel}': {\n${propEntries},\n    }`;
        })
        .join(',\n');
      parts.push(`  rules: {\n${ruleEntries},\n  }`);
    }
    if (parts.length === 0) return `createCheckoutTheme()`;
    return `createCheckoutTheme({\n${parts.join(',\n')},\n})`;
  }

  // Named preset — only emit variables that differ from the preset defaults
  const presetVars = getPresetVariables(preset);
  const themeVars = state.theme.variables ?? {};
  const overrides: Partial<CheckoutThemeVariables> = {};
  for (const key of Object.keys(presetVars) as (keyof CheckoutThemeVariables)[]) {
    if (themeVars[key] !== undefined && themeVars[key] !== presetVars[key]) {
      overrides[key] = themeVars[key];
    }
  }

  const presetFn = preset === 'modern' ? 'createModernCheckoutTheme'
    : preset === 'tailwind' ? 'createTailwindCheckoutTheme'
    : 'createShadcnCheckoutTheme';

  if (Object.keys(overrides).length === 0) return `${presetFn}()`;

  const entries = Object.entries(overrides).map(([k, v]) => `    ${k}: '${v}'`).join(',\n');
  return `${presetFn}({\n  variables: {\n${entries},\n  },\n})`;
}

function buildSetupCode(state: BuilderState): string {
  const enabledGateways = state.gateways.filter(g => g.enabled);
  const preset = state.themePreset as string;
  const lines: string[] = [];

  const themeImport = preset === 'modern' ? 'createModernCheckoutTheme'
    : preset === 'tailwind' ? 'createTailwindCheckoutTheme'
    : preset === 'shadcn' ? 'createShadcnCheckoutTheme'
    : 'createCheckoutTheme';

  // Only emit defaultTheme when it differs from the SDK default (modern preset, no overrides)
  const themeExpr = themeExpression(state);
  const isDefaultTheme = themeExpr === 'createModernCheckoutTheme()';

  const baseImports = isDefaultTheme ? ['createCheckout'] : ['createCheckout', themeImport];
  const gatewayFns = enabledGateways.map(g => GATEWAY_IMPORT_MAP[g.id]).filter(Boolean);
  const allImports = [...new Set([...baseImports, ...gatewayFns])];

  lines.push(`import {\n  ${allImports.join(',\n  ')},\n} from '@cocartheadless/checkout';`);
  lines.push('');
  const checkoutOptions: string[] = [];
  if (state.successUrl) checkoutOptions.push(`  successUrl: '${state.successUrl}',`);
  if (state.returnUrl)  checkoutOptions.push(`  returnUrl: '${state.returnUrl}',`);
  if (!state.collectShippingAddress) checkoutOptions.push('  collectShippingAddress: false,');
  if (state.shippingSameAsBilling)   checkoutOptions.push('  shippingSameAsBilling: true,');
  if (!isDefaultTheme) checkoutOptions.push(`  defaultTheme: ${themeExpr},`);
  const regularGateways = enabledGateways.filter(g => !g.isExpress);
  const defaultId = state.defaultGateway || regularGateways[0]?.id;
  const sortedGateways = [...enabledGateways].sort((a, b) =>
    a.id === defaultId ? -1 : b.id === defaultId ? 1 : 0
  );
  if (enabledGateways.length > 0) {
    const gatewayLines: string[] = [];
    sortedGateways.forEach(gw => {
      const base = CATALOG_DEFAULTS[gw.id];
      const labelOverride = base && gw.label       !== base.label       ? `label: '${gw.label}', `       : '';
      const descOverride  = base && gw.description !== base.description ? `description: '${gw.description}', ` : '';
      const baseSnippet   = GATEWAY_SNIPPET[gw.id] ?? `/* ${gw.id} */`;
      if (labelOverride || descOverride) {
        const injected = baseSnippet.includes('({')
          ? baseSnippet.replace(/\(\{/, `({ ${labelOverride}${descOverride}`)
          : baseSnippet.replace(/\(\)/, `({ ${labelOverride}${descOverride}})`);
        gatewayLines.push(`    ${injected},`);
      } else {
        gatewayLines.push(`    ${baseSnippet},`);
      }
    });
    checkoutOptions.push(`  gatewayAdapters: [\n${gatewayLines.join('\n')}\n  ],`);
  }

  if (checkoutOptions.length === 0) {
    lines.push('const checkout = createCheckout();');
  } else {
    lines.push('const checkout = createCheckout({');
    checkoutOptions.forEach(o => lines.push(o));
    lines.push('});');
  }

  return lines.join('\n');
}

function buildJsxCode(state: BuilderState): string {
  const enabledGateways = state.gateways.filter(g => g.enabled);
  const regularGateways = enabledGateways.filter(g => !g.isExpress);
  const expressGateways = enabledGateways.filter(g => g.isExpress);
  const showShipping = state.collectShippingAddress && !state.shippingSameAsBilling;

  const componentImports = [
    'CheckoutContainer',
    expressGateways.length > 0 ? 'ExpressBar' : null,
    'Address',
    showShipping ? 'ShippingMethods' : null,
    regularGateways.length > 0 ? 'PaymentMethods' : null,
    state.includeOrderSummary ? 'OrderSummary' : null,
    state.includeTerms ? 'TermsAndConditions' : null,
    'PayButton',
  ].filter(Boolean) as string[];

  const lines: string[] = [];
  lines.push(`import { ${componentImports.join(', ')} } from '@cocartheadless/checkout/react';`);
  lines.push('');
  lines.push('export function CheckoutForm({ form, expressGateways, regularGateways }) {');
  lines.push('  return (');
  const layoutProp = state.containerLayout === 'stacked' ? ' layout="stacked"' : '';
  lines.push(`    <CheckoutContainer form={form}${layoutProp}>`);

  if (expressGateways.length > 0) {
    lines.push('      <ExpressBar gateways={expressGateways} theme={form.theme} />');
  }

  lines.push('      <Address type="contact" section={form.sections.find(s => s.id === \'contact\')!} theme={form.theme} />');

  if (showShipping) {
    lines.push('      <Address type="shipping" section={form.sections.find(s => s.id === \'shipping\')!} theme={form.theme} />');
    lines.push('      <ShippingMethods theme={form.theme} />');
  } else {
    lines.push('      <Address type="billing" section={form.sections.find(s => s.id === \'billing\')!} theme={form.theme} />');
  }

  if (state.includeNotes) {
    lines.push('      <Address type="contact" section={form.sections.find(s => s.id === \'notes\')!} theme={form.theme} />');
  }

  if (regularGateways.length > 0) {
    const paymentLayoutProp = state.paymentLayout !== 'radio' ? ` layout="${state.paymentLayout}"` : '';
    const billingProp = showShipping ? ' showBillingUnderPayment' : '';
    lines.push(`      <PaymentMethods gateways={regularGateways} theme={form.theme}${paymentLayoutProp}${billingProp} />`);
  }

  if (state.includeOrderSummary) {
    const drawerProp = state.mobileOrderSummaryDrawer ? ' mobileDrawer' : '';
    lines.push(`      <OrderSummary theme={form.theme}${drawerProp} />`);
  }

  if (state.includeTerms) {
    lines.push('      <TermsAndConditions theme={form.theme} termsUrl="/terms" privacyUrl="/privacy">');
    lines.push('        <PayButton theme={form.theme} />');
    lines.push('      </TermsAndConditions>');
  } else {
    lines.push('      <PayButton theme={form.theme} />');
  }
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
