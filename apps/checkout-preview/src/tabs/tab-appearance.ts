import type { CheckoutTheme } from '@cocartheadless/checkout';
import { createTailwindCheckoutTheme, shadcnCheckoutTheme } from '@cocartheadless/checkout';
import { createModernCheckoutTheme } from '../components/checkout/themes.js';
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
    name: 'Tailwind CSS',
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
  {
    id: 'custom' as const,
    name: 'Custom',
    description: 'Edit every CSS class string directly — bring your own CSS',
    badge: 'Custom',
    badgeClass: 'bg-amber-100 text-amber-700',
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

type PresetId = 'modern' | 'tailwind' | 'shadcn' | 'custom';

function presetTheme(id: PresetId, current: CheckoutTheme): CheckoutTheme {
  if (id === 'modern')   return createModernCheckoutTheme();
  if (id === 'tailwind') return createTailwindCheckoutTheme();
  if (id === 'shadcn')   return { ...shadcnCheckoutTheme };
  return { ...current, name: 'custom' };
}

function hasCustomisedClasses(store: StateStore): boolean {
  const { themePreset, theme } = store.get();
  if (themePreset === 'custom') return true;
  // Compare current theme class strings against the clean preset
  const clean = presetTheme(themePreset, theme);
  return THEME_KEYS.some(k => theme[k] !== clean[k]);
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

  // Dismiss on backdrop click
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  document.body.appendChild(overlay);
}

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
      // Sync class inputs whenever the active preset changes
      if (state.themePreset !== lastPreset) {
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
  panel.className = 'tab-panel grid gap-6';

  // ── Theme selector ─────────────────────────────────────────────────────
  const heading = document.createElement('h4');
  heading.className = 'text-xs font-semibold uppercase tracking-wider text-slate-400';
  heading.textContent = 'Theme Preset';
  panel.appendChild(heading);

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
        const newTheme = presetTheme(preset.id, current.theme);
        store.update({ themePreset: preset.id, theme: newTheme });
        // Immediately sync inputs so they reflect the new theme
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

  // ── CSS class editor ───────────────────────────────────────────────────
  const classHeading = document.createElement('h4');
  classHeading.className = 'text-xs font-semibold uppercase tracking-wider text-slate-400';
  classHeading.textContent = 'CSS Classes';
  panel.appendChild(classHeading);

  const classNote = document.createElement('p');
  classNote.className = 'text-xs text-slate-400 leading-relaxed -mt-4';
  classNote.textContent = 'Edit any class string. Changes apply live to the preview and generated code.';
  panel.appendChild(classNote);

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
          themePreset: 'custom',
          theme: { ...store.get().theme, [key]: input.value },
        });
      }, 300);
    });

    row.appendChild(label);
    row.appendChild(input);
    classTable.appendChild(row);
  });

  panel.appendChild(classTable);

  // ── Custom CSS ─────────────────────────────────────────────────────────
  const cssHeading = document.createElement('h4');
  cssHeading.className = 'text-xs font-semibold uppercase tracking-wider text-slate-400';
  cssHeading.textContent = 'Custom CSS';
  panel.appendChild(cssHeading);

  const cssNote = document.createElement('p');
  cssNote.className = 'text-xs text-slate-400 leading-relaxed -mt-4';
  cssNote.textContent = 'Injected into the preview as a <style> tag. Use #checkout-preview-root selectors to override theme styles.';
  panel.appendChild(cssNote);

  const cssWrap = document.createElement('div');
  cssWrap.className = 'grid gap-1';

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

  cssWrap.appendChild(cssTextarea);
  panel.appendChild(cssWrap);

  return panel;
}
