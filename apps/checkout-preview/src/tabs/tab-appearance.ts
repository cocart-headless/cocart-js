import type { CheckoutTheme } from '@cocartheadless/checkout';
import { createModernCheckoutTheme, createTailwindCheckoutTheme, createShadcnCheckoutTheme, getPresetVariables } from '@cocartheadless/checkout';
import type { CheckoutThemeVariables } from '@cocartheadless/checkout';
import type { StateStore } from '../state-types.js';

const THEME_PRESETS = [
  {
    id: 'modern' as const,
    name: 'Modern',
    description: 'Clean two-column layout inspired by Shopify checkout',
    badge: 'Default',
    badgeClass: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'tailwind' as const,
    name: 'daisyUI',
    description: 'Responsive 2-column grid with slate palette',
    badge: 'Popular',
    badgeClass: 'bg-violet-100 text-violet-700',
  },
  {
    id: 'shadcn' as const,
    name: 'shadcn/ui',
    description: 'Uses CSS variables for full theme compatibility',
    badge: 'CSS Vars',
    badgeClass: 'bg-blue-100 text-blue-700',
  },
];

const THEME_KEYS: (keyof CheckoutTheme)[] = [
  'containerClassName',
  'sectionClassName',
  'fieldClassName',
  'inputClassName',
  'labelClassName',
  'helperTextClassName',
  'submitButtonClassName',
  'paymentContainerClassName',
  'orderSummaryClassName',
  'expressCheckoutBarClassName',
];

const KEY_LABELS: Partial<Record<keyof CheckoutTheme, string>> = {
  containerClassName:          'Container',
  sectionClassName:            'Section card',
  fieldClassName:              'Field wrapper',
  inputClassName:              'Input element',
  labelClassName:              'Label',
  helperTextClassName:         'Helper text',
  submitButtonClassName:       'Submit button',
  paymentContainerClassName:   'Payment container',
  orderSummaryClassName:       'Order summary',
  expressCheckoutBarClassName: 'Express checkout bar',
};

type LayoutPresetId = 'modern' | 'tailwind' | 'shadcn';

function presetTheme(id: LayoutPresetId): CheckoutTheme {
  const variables = getPresetVariables(id);
  if (id === 'tailwind') return createTailwindCheckoutTheme({ variables });
  if (id === 'shadcn')   return createShadcnCheckoutTheme({ variables });
  return createModernCheckoutTheme({ variables });
}

function hasCustomisedClasses(store: StateStore): boolean {
  return store.get().themeClassesEdited;
}

function showResetModal(presetName: string, onConfirm: () => void): void {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm';

  const dialog = document.createElement('div');
  dialog.className = 'bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 grid gap-4';

  const title = document.createElement('p');
  title.className = 'text-sm font-semibold text-slate-900';
  title.textContent = `Switch to ${presetName}?`;

  const body = document.createElement('p');
  body.className = 'text-xs text-slate-500 leading-relaxed';
  body.textContent = 'This will reset all CSS class customisations to the preset defaults. Your custom CSS will not be affected.';

  const btnRow = document.createElement('div');
  btnRow.className = 'flex gap-2 justify-end';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition';
  cancelBtn.textContent = 'Cancel';

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'button';
  confirmBtn.className = 'px-3.5 py-2 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition';
  confirmBtn.textContent = 'Reset & switch';

  cancelBtn.addEventListener('click', () => overlay.remove());
  confirmBtn.addEventListener('click', () => { overlay.remove(); onConfirm(); });

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(confirmBtn);
  dialog.appendChild(title);
  dialog.appendChild(body);
  dialog.appendChild(btnRow);
  overlay.appendChild(dialog);

  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  document.body.appendChild(overlay);
}

// ── Color picker row ──────────────────────────────────────────────────────────

interface ColorRowOptions {
  label: string;
  varKey: keyof CheckoutThemeVariables;
  value: string;
  onChange: (val: string) => void;
}

function buildColorRow({ label, value, onChange }: ColorRowOptions): HTMLElement {
  const row = document.createElement('div');
  row.className = 'flex items-center justify-between gap-3';

  const labelEl = document.createElement('span');
  labelEl.className = 'text-xs text-slate-600 min-w-0 flex-1';
  labelEl.textContent = label;

  const right = document.createElement('div');
  right.className = 'flex items-center gap-2 shrink-0';

  const swatch = document.createElement('div');
  swatch.className = 'h-6 w-6 rounded-md border border-slate-200 cursor-pointer overflow-hidden';
  swatch.style.backgroundColor = value;

  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = toHex(value);
  colorInput.className = 'absolute opacity-0 w-0 h-0 pointer-events-none';

  const hexInput = document.createElement('input');
  hexInput.type = 'text';
  hexInput.value = value;
  hexInput.className = 'h-6 w-40 rounded border border-slate-200 bg-slate-50 px-2 text-xs font-mono text-slate-800 outline-none focus:border-violet-500';
  hexInput.spellcheck = false;

  swatch.addEventListener('click', () => colorInput.click());

  colorInput.addEventListener('input', () => {
    const hex = colorInput.value;
    swatch.style.backgroundColor = hex;
    hexInput.value = hex;
    onChange(hex);
  });

  let hexDebounce: ReturnType<typeof setTimeout>;
  hexInput.addEventListener('input', () => {
    clearTimeout(hexDebounce);
    hexDebounce = setTimeout(() => {
      const v = hexInput.value.trim();
      swatch.style.backgroundColor = v;
      colorInput.value = toHex(v);
      onChange(v);
    }, 300);
  });

  right.appendChild(colorInput);
  right.appendChild(swatch);
  right.appendChild(hexInput);
  row.appendChild(labelEl);
  row.appendChild(right);
  return row;
}

function toHex(val: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(val)) return val;
  if (/^#[0-9a-fA-F]{3}$/.test(val)) {
    const [, r, g, b] = val;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return '#000000';
}

// ── Slider row ────────────────────────────────────────────────────────────────

interface SliderRowOptions {
  label: string;
  value: string;
  unit: string;
  min: number;
  max: number;
  step?: number;
  onChange: (val: string) => void;
}

function buildSliderRow({ label, value, unit, min, max, step = 1, onChange }: SliderRowOptions): HTMLElement {
  const row = document.createElement('div');
  row.className = 'grid gap-1.5';

  const top = document.createElement('div');
  top.className = 'flex items-center justify-between';

  const labelEl = document.createElement('span');
  labelEl.className = 'text-xs text-slate-600';
  labelEl.textContent = label;

  const valueEl = document.createElement('span');
  valueEl.className = 'text-xs font-mono text-slate-500';
  valueEl.textContent = value;

  top.appendChild(labelEl);
  top.appendChild(valueEl);

  const numeric = parseFloat(value) || 0;

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(numeric);
  slider.className = 'w-full accent-violet-600 h-1.5';

  slider.addEventListener('input', () => {
    const v = `${slider.value}${unit}`;
    valueEl.textContent = v;
    onChange(v);
  });

  row.appendChild(top);
  row.appendChild(slider);
  return row;
}

// ── Select row ────────────────────────────────────────────────────────────────

interface SelectRowOptions {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
}

function buildSelectRow({ label, value, options, onChange }: SelectRowOptions): HTMLElement {
  const row = document.createElement('div');
  row.className = 'flex items-center justify-between gap-3';

  const labelEl = document.createElement('span');
  labelEl.className = 'text-xs text-slate-600 min-w-0 flex-1';
  labelEl.textContent = label;

  const select = document.createElement('select');
  select.className = 'h-7 rounded border border-slate-200 bg-slate-50 px-2 text-xs text-slate-800 outline-none focus:border-violet-500 shrink-0';

  options.forEach(opt => {
    const el = document.createElement('option');
    el.value = opt.value;
    el.textContent = opt.label;
    if (opt.value === value) el.selected = true;
    select.appendChild(el);
  });

  select.addEventListener('change', () => onChange(select.value));

  row.appendChild(labelEl);
  row.appendChild(select);
  return row;
}

// ── Section heading ───────────────────────────────────────────────────────────

function buildSectionHeading(text: string): HTMLElement {
  const h = document.createElement('h4');
  h.className = 'text-xs font-semibold uppercase tracking-wider text-slate-400 mt-2';
  h.textContent = text;
  return h;
}

// ── Main render ───────────────────────────────────────────────────────────────

export function renderAppearanceTab(container: HTMLElement, store: StateStore): void {
  let el: HTMLElement | null = null;
  let lastPreset = '';

  store.subscribe(state => {
    if (state.activeTab !== 'appearance') {
      el?.remove();
      el = null;
      lastPreset = '';
      return;
    }
    if (!el) {
      el = buildAppearanceTab(store);
      lastPreset = state.themePreset;
      container.appendChild(el);
    } else {
      syncPresetCards(el, state.themePreset);
      if (state.themePreset !== lastPreset) {
        syncVariableControls(el, state.theme);
        syncClassInputs(el, state.theme);
        lastPreset = state.themePreset;
      }
    }
  });
}

function syncPresetCards(panel: HTMLElement, activePreset: string): void {
  panel.querySelectorAll<HTMLButtonElement>('[data-preset-id]').forEach(card => {
    const isActive = card.dataset['presetId'] === activePreset;
    card.className = `flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
      isActive
        ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500'
        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
    }`;
  });
  const sgRow = panel.querySelector<HTMLElement>('[data-section-gap-row]');
  if (sgRow) sgRow.hidden = activePreset === 'modern';
}

function syncVariableControls(panel: HTMLElement, theme: { preset?: string; variables?: Partial<CheckoutThemeVariables> }): void {
  const basePreset = (theme.preset === 'custom' || !theme.preset ? 'modern' : theme.preset) as 'modern' | 'tailwind' | 'shadcn';
  const vars: CheckoutThemeVariables = { ...getPresetVariables(basePreset), ...theme.variables };

  panel.querySelectorAll<HTMLInputElement>('[data-var-key]').forEach(input => {
    const key = input.dataset['varKey'] as keyof CheckoutThemeVariables;
    const val = vars[key] ?? '';
    input.value = val;
    // Update swatch — the div immediately before the hex text input
    const swatch = input.previousElementSibling as HTMLElement | null;
    if (swatch && swatch.tagName === 'DIV') {
      swatch.style.backgroundColor = val;
    }
  });
}

function syncClassInputs(panel: HTMLElement, theme: CheckoutTheme): void {
  panel.querySelectorAll<HTMLInputElement>('[data-theme-key]').forEach(input => {
    const key = input.dataset['themeKey'] as keyof CheckoutTheme;
    input.value = (theme[key] as string) ?? '';
  });
}

function buildAppearanceTab(store: StateStore): HTMLElement {
  const state = store.get();
  const panel = document.createElement('div');
  panel.className = 'tab-panel grid gap-4';

  // ── Preset selector ───────────────────────────────────────────────────────
  panel.appendChild(buildSectionHeading('Theme Preset'));

  const presetGrid = document.createElement('div');
  presetGrid.className = 'grid gap-2';

  THEME_PRESETS.forEach(preset => {
    const card = document.createElement('button');
    card.type = 'button';
    card.dataset['presetId'] = preset.id;
    const isActive = state.themePreset === preset.id;
    card.className = `flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
      isActive
        ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500'
        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
    }`;

    const left = document.createElement('div');
    const nameEl = document.createElement('p');
    nameEl.className = 'text-sm font-medium text-slate-900';
    nameEl.textContent = preset.name;
    const descEl = document.createElement('p');
    descEl.className = 'text-xs text-slate-500 mt-0.5';
    descEl.textContent = preset.description;
    left.appendChild(nameEl);
    left.appendChild(descEl);

    const badge = document.createElement('span');
    badge.className = `rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${preset.badgeClass}`;
    badge.textContent = preset.badge;

    card.appendChild(left);
    card.appendChild(badge);

    card.addEventListener('click', () => {
      const current = store.get();
      if (current.themePreset === preset.id) return;

      const doSwitch = (): void => {
        const newTheme = presetTheme(preset.id);
        store.update({ themePreset: preset.id, themeClassesEdited: false, theme: newTheme });
        syncVariableControls(panel, newTheme);
        syncClassInputs(panel, newTheme);
      };

      if (hasCustomisedClasses(store)) {
        showResetModal(preset.name, doSwitch);
      } else {
        doSwitch();
      }
    });

    presetGrid.appendChild(card);
  });

  panel.appendChild(presetGrid);

  // ── Colors ────────────────────────────────────────────────────────────────
  panel.appendChild(buildSectionHeading('Colors'));

  const colorGrid = document.createElement('div');
  colorGrid.className = 'grid gap-2';

  const colorFields: { label: string; key: keyof CheckoutThemeVariables }[] = [
    { label: 'Focus / Accent',         key: 'colorPrimary' },
    { label: 'Page background',        key: 'colorBackground' },
    { label: 'Order summary',          key: 'colorBackgroundAlt' },
    { label: 'Row hover / selected',   key: 'colorBackgroundHover' },
    { label: 'Input & card fill',      key: 'colorSurface' },
    { label: 'Button background',      key: 'colorButton' },
    { label: 'Button text',            key: 'colorButtonText' },
    { label: 'Body text',              key: 'colorText' },
    { label: 'Helper text',            key: 'colorTextMuted' },
    { label: 'Input & card border',    key: 'colorBorder' },
    { label: 'Error text',             key: 'colorError' },
  ];

  const basePreset = (state.themePreset === 'custom' ? 'modern' : state.themePreset) as 'modern' | 'tailwind' | 'shadcn';
  const vars: CheckoutThemeVariables = { ...getPresetVariables(basePreset), ...state.theme.variables };

  colorFields.forEach(({ label, key }) => {
    const value = (vars[key] as string | undefined) ?? '#000000';
    const row = buildColorRow({
      label,
      varKey: key,
      value,
      onChange: (val) => {
        const merged: Partial<CheckoutThemeVariables> = { ...(store.get().theme.variables ?? {}), [key]: val };
        store.update({ theme: { ...store.get().theme, variables: merged } });
      },
    });
    // Tag the hex input for sync
    const hexInput = row.querySelector<HTMLInputElement>('input[type="text"]');
    if (hexInput) hexInput.dataset['varKey'] = key;
    colorGrid.appendChild(row);
  });

  panel.appendChild(colorGrid);

  // ── Typography ────────────────────────────────────────────────────────────
  panel.appendChild(buildSectionHeading('Typography'));

  const typoGrid = document.createElement('div');
  typoGrid.className = 'grid gap-3';

  const fontFamilyRow = buildSelectRow({
    label: 'Font family',
    value: (vars.fontFamily as string | undefined) ?? "'Inter', system-ui, sans-serif",
    options: [
      { value: "'Inter', system-ui, sans-serif",       label: 'Inter (default)' },
      { value: 'system-ui, sans-serif',                label: 'System UI' },
      { value: "'Georgia', 'Times New Roman', serif",  label: 'Georgia (serif)' },
      { value: "'ui-monospace', 'Courier New', monospace", label: 'Monospace' },
    ],
    onChange: (val) => {
      const merged: Partial<CheckoutThemeVariables> = { ...(store.get().theme.variables ?? {}), fontFamily: val };
      store.update({ theme: { ...store.get().theme, variables: merged } });
    },
  });
  typoGrid.appendChild(fontFamilyRow);

  const fontSizeRow = buildSelectRow({
    label: 'Base font size',
    value: (vars.fontSizeBase as string | undefined) ?? '14px',
    options: [
      { value: '12px', label: '12px — compact' },
      { value: '14px', label: '14px — default' },
      { value: '16px', label: '16px — large' },
    ],
    onChange: (val) => {
      const merged: Partial<CheckoutThemeVariables> = { ...(store.get().theme.variables ?? {}), fontSizeBase: val };
      store.update({ theme: { ...store.get().theme, variables: merged } });
    },
  });
  typoGrid.appendChild(fontSizeRow);

  panel.appendChild(typoGrid);

  // ── Shape ─────────────────────────────────────────────────────────────────
  panel.appendChild(buildSectionHeading('Shape'));

  const shapeGrid = document.createElement('div');
  shapeGrid.className = 'grid gap-3';

  const borderRadiusVal = (vars.borderRadius as string | undefined) ?? '8px';
  const brRow = buildSliderRow({
    label: 'Border radius',
    value: borderRadiusVal,
    unit: 'px',
    min: 0,
    max: 24,
    step: 1,
    onChange: (val) => {
      const merged: Partial<CheckoutThemeVariables> = { ...(store.get().theme.variables ?? {}), borderRadius: val };
      store.update({ theme: { ...store.get().theme, variables: merged } });
    },
  });
  shapeGrid.appendChild(brRow);

  const inputHeightRow = buildSelectRow({
    label: 'Input height',
    value: (vars.inputHeight as string | undefined) ?? '48px',
    options: [
      { value: '40px', label: '40px — compact' },
      { value: '44px', label: '44px — normal' },
      { value: '48px', label: '48px — default' },
      { value: '56px', label: '56px — large' },
    ],
    onChange: (val) => {
      const merged: Partial<CheckoutThemeVariables> = { ...(store.get().theme.variables ?? {}), inputHeight: val };
      store.update({ theme: { ...store.get().theme, variables: merged } });
    },
  });
  shapeGrid.appendChild(inputHeightRow);

  panel.appendChild(shapeGrid);

  // ── Spacing ───────────────────────────────────────────────────────────────
  panel.appendChild(buildSectionHeading('Spacing'));

  const spacingGrid = document.createElement('div');
  spacingGrid.className = 'grid gap-3';

  const fieldGapVal = (vars.fieldGap as string | undefined) ?? '8px';
  const fgRow = buildSliderRow({
    label: 'Field gap',
    value: fieldGapVal,
    unit: 'px',
    min: 0,
    max: 24,
    step: 2,
    onChange: (val) => {
      const merged: Partial<CheckoutThemeVariables> = { ...(store.get().theme.variables ?? {}), fieldGap: val };
      store.update({ theme: { ...store.get().theme, variables: merged } });
    },
  });
  spacingGrid.appendChild(fgRow);

  const sectionGapVal = (vars.sectionGap as string | undefined) ?? '0px';
  const sgRow = buildSliderRow({
    label: 'Section gap',
    value: sectionGapVal,
    unit: 'px',
    min: 0,
    max: 48,
    step: 4,
    onChange: (val) => {
      const merged: Partial<CheckoutThemeVariables> = { ...(store.get().theme.variables ?? {}), sectionGap: val };
      store.update({ theme: { ...store.get().theme, variables: merged } });
    },
  });
  sgRow.dataset['sectionGapRow'] = '';
  sgRow.hidden = state.themePreset === 'modern';
  spacingGrid.appendChild(sgRow);

  panel.appendChild(spacingGrid);

  // ── Advanced: CSS class overrides (collapsible) ───────────────────────────
  const details = document.createElement('details');
  details.className = 'group border border-slate-200 rounded-xl overflow-hidden';

  const summary = document.createElement('summary');
  summary.className = 'flex items-center gap-2 cursor-pointer select-none px-4 py-3 text-xs font-medium text-slate-600 hover:bg-slate-50 list-none';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'h-3 w-3 transition group-open:rotate-90 shrink-0');
  svg.setAttribute('viewBox', '0 0 12 12');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M4 2l4 4-4 4');
  svg.appendChild(path);
  summary.appendChild(svg);
  summary.appendChild(document.createTextNode('Advanced — CSS Class Overrides'));

  details.appendChild(summary);

  const advancedBody = document.createElement('div');
  advancedBody.className = 'px-4 pb-4 grid gap-3 border-t border-slate-200 pt-3';

  const advancedNote = document.createElement('p');
  advancedNote.className = 'text-xs text-slate-400 leading-relaxed';
  advancedNote.textContent = 'Override Tailwind class strings directly. Changes apply live to the preview and generated code.';
  advancedBody.appendChild(advancedNote);

  const classTable = document.createElement('div');
  classTable.className = 'grid gap-2';

  THEME_KEYS.forEach(key => {
    const row = document.createElement('div');
    row.className = 'grid gap-1';

    const label = document.createElement('label');
    label.className = 'text-xs font-medium text-slate-600';
    label.textContent = KEY_LABELS[key] ?? key;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-mono text-slate-800 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10';
    input.value = (state.theme[key] as string) ?? '';
    input.dataset['themeKey'] = key;
    input.spellcheck = false;

    let debounceTimer: ReturnType<typeof setTimeout>;
    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        store.update({
          themeClassesEdited: true,
          theme: { ...store.get().theme, [key]: input.value },
        });
      }, 300);
    });

    row.appendChild(label);
    row.appendChild(input);
    classTable.appendChild(row);
  });

  advancedBody.appendChild(classTable);
  details.appendChild(advancedBody);
  panel.appendChild(details);

  // ── Custom CSS ─────────────────────────────────────────────────────────────
  panel.appendChild(buildSectionHeading('Custom CSS'));

  const cssNote = document.createElement('p');
  cssNote.className = 'text-xs text-slate-400 leading-relaxed -mt-2';
  cssNote.textContent = 'Injected into the preview as a <style> tag. Use #checkout-preview-root selectors to override theme styles.';
  panel.appendChild(cssNote);

  const cssTextarea = document.createElement('textarea');
  cssTextarea.className = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-800 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 resize-y min-h-[120px]';
  cssTextarea.placeholder = '#checkout-preview-root {\n  /* your custom styles */\n}';
  cssTextarea.spellcheck = false;
  cssTextarea.value = state.customCss;

  let cssDebounce: ReturnType<typeof setTimeout>;
  cssTextarea.addEventListener('input', () => {
    clearTimeout(cssDebounce);
    cssDebounce = setTimeout(() => {
      store.update({ customCss: cssTextarea.value });
    }, 300);
  });

  panel.appendChild(cssTextarea);

  return panel;
}
