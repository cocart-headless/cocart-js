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

const TAILWIND_VARIABLES: CheckoutThemeVariables = {
  colorPrimary:         '#0f172a',
  colorBackground:      '#f8fafc',
  colorBackgroundAlt:   '#f1f5f9',
  colorBackgroundHover: '#f1f5f9',
  colorSurface:         '#ffffff',
  colorText:            '#0f172a',
  colorTextMuted:       '#64748b',
  colorBorder:          '#cbd5e1',
  colorError:           '#ef4444',
  colorButton:          '#0f172a',
  colorButtonText:      '#ffffff',
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

export { MODERN_VARIABLES, TAILWIND_VARIABLES, SHADCN_VARIABLES };
