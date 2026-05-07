import type { CheckoutTheme, CheckoutThemeVariables } from './types.js';

const MODERN_VARIABLES: CheckoutThemeVariables = {
  colorPrimary:          '#1a1a1a',
  colorBackground:       '#ffffff',
  colorBackgroundAlt:    '#f6f6f1',
  colorBackgroundHover:  '#f5f5f5',
  colorSurface:          '#ffffff',
  colorText:             '#1a1a1a',
  colorTextMuted:        '#6b6b6b',
  colorBorder:           '#d9d9d9',
  colorError:            '#dc2626',
  colorButton:           '#1a1a1a',
  colorButtonText:       '#ffffff',
  fontFamily:      "'Inter', system-ui, sans-serif",
  fontSizeBase:    '14px',
  fontWeightNormal: '400',
  fontWeightMedium: '500',
  fontWeightBold:   '700',
  borderRadius:     '8px',
  borderRadiusFull: '9999px',
  inputHeight:      '48px',
  spacingUnit:      '4px',
  fieldGap:         '8px',
  sectionGap:       '0px',
};

// Maps cocart variables to daisyUI semantic tokens — adapts to any data-theme automatically
const TAILWIND_VARIABLES: CheckoutThemeVariables = {
  colorPrimary:         'var(--color-primary)',
  colorBackground:      'var(--color-base-100)',
  colorBackgroundAlt:   'var(--color-base-200)',
  colorBackgroundHover: 'var(--color-base-200)',
  colorSurface:         'var(--color-base-100)',
  colorText:            'var(--color-base-content)',
  colorTextMuted:       'color-mix(in oklab, var(--color-base-content) 50%, transparent)',
  colorBorder:          'var(--color-base-300)',
  colorError:           'var(--color-error)',
  colorButton:          'var(--color-primary)',
  colorButtonText:      'var(--color-primary-content)',
  fontFamily:      "ui-sans-serif, system-ui, sans-serif",
  fontSizeBase:    '14px',
  fontWeightNormal: '400',
  fontWeightMedium: '500',
  fontWeightBold:   '600',
  borderRadius:     '12px',
  borderRadiusFull: '16px',
  inputHeight:      '44px',
  spacingUnit:      '4px',
  fieldGap:         '8px',
  sectionGap:       '24px',
};

const SHADCN_VARIABLES: CheckoutThemeVariables = {
  colorPrimary:         'hsl(222.2 47.4% 11.2%)',
  colorBackground:      'hsl(0 0% 100%)',
  colorBackgroundAlt:   'hsl(210 40% 96.1%)',
  colorBackgroundHover: 'hsl(210 40% 96.1%)',
  colorSurface:         'hsl(0 0% 100%)',
  colorText:            'hsl(222.2 84% 4.9%)',
  colorTextMuted:       'hsl(215.4 16.3% 46.9%)',
  colorBorder:          'hsl(214.3 31.8% 91.4%)',
  colorError:           'hsl(0 84.2% 60.2%)',
  colorButton:          'hsl(222.2 47.4% 11.2%)',
  colorButtonText:      'hsl(0 0% 100%)',
  fontFamily:      "ui-sans-serif, system-ui, sans-serif",
  fontSizeBase:    '14px',
  fontWeightNormal: '400',
  fontWeightMedium: '500',
  fontWeightBold:   '600',
  borderRadius:     '6px',
  borderRadiusFull: '6px',
  inputHeight:      '40px',
  spacingUnit:      '4px',
  fieldGap:         '6px',
  sectionGap:       '16px',
};

const MODERN_VARIABLES_DARK: CheckoutThemeVariables = {
  colorPrimary:          '#ffffff',
  colorBackground:       '#111111',
  colorBackgroundAlt:    '#111111',
  colorBackgroundHover:  '#252525',
  colorSurface:          '#1a1a1a',
  colorText:             '#f5f5f5',
  colorTextMuted:        '#999999',
  colorBorder:           '#333333',
  colorError:            '#f87171',
  colorButton:           '#ffffff',
  colorButtonText:       '#111111',
  fontFamily:      "'Inter', system-ui, sans-serif",
  fontSizeBase:    '14px',
  fontWeightNormal: '400',
  fontWeightMedium: '500',
  fontWeightBold:   '700',
  borderRadius:     '8px',
  borderRadiusFull: '9999px',
  inputHeight:      '48px',
  spacingUnit:      '4px',
  fieldGap:         '8px',
  sectionGap:       '0px',
};

// daisyUI tokens are self-adapting — no separate dark variant needed
const TAILWIND_VARIABLES_DARK = TAILWIND_VARIABLES;

const SHADCN_VARIABLES_DARK: CheckoutThemeVariables = {
  colorPrimary:         'hsl(210 40% 98%)',
  colorBackground:      'hsl(222.2 84% 4.9%)',
  colorBackgroundAlt:   'hsl(217.2 32.6% 17.5%)',
  colorBackgroundHover: 'hsl(217.2 32.6% 17.5%)',
  colorSurface:         'hsl(222.2 84% 4.9%)',
  colorText:            'hsl(210 40% 98%)',
  colorTextMuted:       'hsl(215 20.2% 65.1%)',
  colorBorder:          'hsl(217.2 32.6% 17.5%)',
  colorError:           'hsl(0 62.8% 30.6%)',
  colorButton:          'hsl(210 40% 98%)',
  colorButtonText:      'hsl(222.2 47.4% 11.2%)',
  fontFamily:      "ui-sans-serif, system-ui, sans-serif",
  fontSizeBase:    '14px',
  fontWeightNormal: '400',
  fontWeightMedium: '500',
  fontWeightBold:   '600',
  borderRadius:     '6px',
  borderRadiusFull: '6px',
  inputHeight:      '40px',
  spacingUnit:      '4px',
  fieldGap:         '6px',
  sectionGap:       '16px',
};

const PRESET_VARIABLES: Record<string, CheckoutThemeVariables> = {
  modern:  MODERN_VARIABLES,
  tailwind: TAILWIND_VARIABLES,
  shadcn:  SHADCN_VARIABLES,
};

function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, m => `-${m.toLowerCase()}`);
}

function variablesToCss(vars: CheckoutThemeVariables): string {
  return (Object.entries(vars) as [keyof CheckoutThemeVariables, string][])
    .map(([key, value]) => `  --cocart-${camelToKebab(key)}: ${value};`)
    .join('\n');
}

function rulesToCss(rules: Record<string, Record<string, string>>, scope: string): string {
  return Object.entries(rules)
    .map(([selector, props]) => {
      const css = Object.entries(props)
        .map(([prop, val]) => `  ${camelToKebab(prop)}: ${val};`)
        .join('\n');
      return `${scope} ${selector} {\n${css}\n}`;
    })
    .join('\n');
}

export function resolveTheme(theme: CheckoutTheme, scopeSelector: string): string {
  const preset = theme.preset ?? 'modern';
  const baseVars = PRESET_VARIABLES[preset] ?? MODERN_VARIABLES;
  const mergedVars: CheckoutThemeVariables = { ...baseVars, ...theme.variables };

  const varBlock = `${scopeSelector} {\n${variablesToCss(mergedVars)}\n  font-family: var(--cocart-font-family);\n}`;
  const rulesBlock = theme.rules ? rulesToCss(theme.rules, scopeSelector) : '';

  return rulesBlock ? `${varBlock}\n${rulesBlock}` : varBlock;
}

export function getPresetVariables(preset: 'modern' | 'tailwind' | 'shadcn'): CheckoutThemeVariables {
  return { ...(PRESET_VARIABLES[preset] ?? MODERN_VARIABLES) };
}

export { MODERN_VARIABLES, TAILWIND_VARIABLES, SHADCN_VARIABLES, MODERN_VARIABLES_DARK, TAILWIND_VARIABLES_DARK, SHADCN_VARIABLES_DARK };
