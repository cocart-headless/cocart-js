import type { CheckoutTheme } from '@cocartheadless/checkout';
import { createModernCheckoutTheme, createTailwindCheckoutTheme, createShadcnCheckoutTheme, getPresetVariables } from '@cocartheadless/checkout';
import type { CheckoutThemeVariables } from '@cocartheadless/checkout';
import type { StateStore } from '../state-types.js';

const THEME_PRESETS = [
  {
    id: 'modern' as const,
    name: 'Modern',
    description: 'Clean two-column layout inspired by Shopify',
    badge: 'Default',
    badgeClass: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'tailwind' as const,
    name: 'daisyUI',
    description: 'Responsive grid with slate palette',
    badge: 'Alternative',
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

// ── Color picker ──────────────────────────────────────────────────────────────

function toHex(val: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(val)) return val;
  if (/^#[0-9a-fA-F]{3}$/.test(val)) {
    const [, r, g, b] = val;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return '#000000';
}


function hexLuminance(hex: string): number {
  const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
  const lin = (c: number) => c <= 0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
  return 0.2126*lin(r) + 0.7152*lin(g) + 0.0722*lin(b);
}

function contrastHex(bg: string): string {
  return hexLuminance(bg) > 0.35 ? '#1a1a1a' : '#ffffff';
}

function daisyThemeVariables(t: { bg: string; p: string; s: string; a: string }): Partial<import('@cocartheadless/checkout').CheckoutThemeVariables> {
  return {
    colorBackground:      t.bg,
    colorBackgroundAlt:   t.bg,
    colorBackgroundHover: t.bg,
    colorSurface:         t.bg,
    colorPrimary:         t.p,
    colorButton:          t.p,
    colorButtonText:      contrastHex(t.p),
    colorText:            contrastHex(t.bg),
    colorTextMuted:       contrastHex(t.bg) === '#ffffff' ? '#999999' : '#6b6b6b',
    colorBorder:          contrastHex(t.bg) === '#ffffff' ? '#333333' : '#d9d9d9',
  };
}

function hasManuallyCustomisedDaisyColors(store: StateStore): boolean {
  const state = store.get();
  const vars = state.theme.variables ?? {};
  const colorKeys = ['colorBackground','colorPrimary','colorButton','colorText','colorBorder'] as const;
  // If none of the tracked keys are set as hex values, no manual customisation
  if (!colorKeys.some(k => /^#[0-9a-fA-F]{6}$/.test(vars[k] ?? ''))) return false;
  // Compare against what the current daisyTheme entry would inject
  const entry = DAISY_THEMES.find(t => t.name === state.daisyTheme);
  if (!entry) return false;
  const expected = daisyThemeVariables(entry);
  return colorKeys.some(k => k in vars && vars[k] !== expected[k]);
}

let activePopover: HTMLElement | null = null;

function resolveColorToHex(val: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(val)) return val;
  if (/^#[0-9a-fA-F]{3}$/.test(val)) return toHex(val);
  // For CSS values (hsl, oklch, var(...)) resolve via canvas
  try {
    const tmp = document.createElement('div');
    tmp.style.cssText = `position:absolute;width:1px;height:1px;opacity:0;background:${val}`;
    document.body.appendChild(tmp);
    const computed = getComputedStyle(tmp).backgroundColor;
    tmp.remove();
    const m = computed.match(/\d+/g);
    if (m && m.length >= 3) {
      return '#' + m.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
    }
  } catch { /* ignore */ }
  return '#808080';
}

// Palette: lightness steps × hue steps dot grid (matches daisyUI theme generator style)
const PALETTE_HUES = [0,15,30,45,60,75,90,105,120,135,150,165,180,195,210,225,240,255,270,285,300,315,330,345];
const PALETTE_LIGHTS = [97,93,87,80,70,60,50,40,30,20,13,8];

function buildColorPopover(initialHex: string, onChange: (hex: string) => void, _anchorEl: HTMLElement): HTMLElement {
  // Full-screen backdrop — the returned element IS the backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/20';

  backdrop.addEventListener('click', () => { backdrop.remove(); if (activePopover === backdrop) activePopover = null; });

  const modal = document.createElement('div');
  modal.className = 'rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden';
  modal.style.width = '550px';
  modal.addEventListener('click', e => e.stopPropagation());

  let currentHex = toHex(initialHex);
  let [ch, cs, cl] = hexToHsl(currentHex);

  // ── Shared hex input ref (declared early, assigned below) ─────────────────
  let hexInput: HTMLInputElement;

  function emit(hex: string): void {
    currentHex = hex;
    [ch, cs, cl] = hexToHsl(hex);
    onChange(hex);
    updatePreview(hex);
    syncSliders();
    if (hexInput) hexInput.value = hex;
  }

  // ── Header ────────────────────────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between px-4 py-3 border-b border-slate-100';

  const preview = document.createElement('div');
  preview.style.cssText = 'width:36px;height:36px;border-radius:10px;border:1px solid rgba(0,0,0,0.12);flex-shrink:0;';
  preview.style.backgroundColor = currentHex;
  function updatePreview(hex: string): void { preview.style.backgroundColor = hex; }

  function closeModal(): void {
    backdrop.remove();
    if (activePopover === backdrop) activePopover = null;
  }

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.style.cssText = 'width:28px;height:28px;border-radius:8px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#94a3b8;flex-shrink:0;';
  closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/></svg>';
  closeBtn.addEventListener('click', e => { e.stopPropagation(); closeModal(); });

  const tabBar = document.createElement('div');
  tabBar.className = 'flex items-center gap-1 rounded-lg bg-slate-100 p-0.5';

  let activeTab: 'palette' | 'picker' = 'palette';
  const palettePane = document.createElement('div');
  const pickerPane  = document.createElement('div');

  const tabSyncs: (() => void)[] = [];
  function syncTabs(): void { tabSyncs.forEach(fn => fn()); }

  function makeTab(label: string, id: 'palette' | 'picker'): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    function sync(): void {
      btn.className = `px-3 py-1 rounded-md text-xs font-medium transition ${
        activeTab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`;
      palettePane.style.display = activeTab === 'palette' ? 'block' : 'none';
      pickerPane.style.display  = activeTab === 'picker'  ? 'block' : 'none';
    }
    btn.addEventListener('click', e => { e.stopPropagation(); activeTab = id; syncTabs(); });
    tabSyncs.push(sync);
    return btn;
  }

  tabBar.appendChild(makeTab('Palette', 'palette'));
  tabBar.appendChild(makeTab('Picker', 'picker'));
  header.appendChild(preview);
  header.appendChild(tabBar);
  header.appendChild(closeBtn);
  modal.appendChild(header);

  // ── Palette tab ───────────────────────────────────────────────────────────
  palettePane.style.cssText = 'padding:12px;';

  const greyRow = document.createElement('div');
  greyRow.style.cssText = 'display:flex;gap:4px;margin-bottom:4px;flex-wrap:wrap;';
  const greySteps = [100,97,93,87,80,70,60,50,40,30,20,13,8,3,0];
  greySteps.forEach(l => {
    const hex = hslToHex(0, 0, l);
    const dot = makeDot(hex);
    dot.addEventListener('click', e => { e.stopPropagation(); emit(hex); });
    greyRow.appendChild(dot);
  });
  palettePane.appendChild(greyRow);

  const grid = document.createElement('div');
  grid.style.cssText = `display:grid;grid-template-columns:repeat(${PALETTE_HUES.length},1fr);gap:4px;`;
  PALETTE_LIGHTS.forEach(l => {
    PALETTE_HUES.forEach(hue => {
      const hex = hslToHex(hue, 100, l);
      const dot = makeDot(hex);
      dot.addEventListener('click', e => { e.stopPropagation(); emit(hex); });
      grid.appendChild(dot);
    });
  });
  palettePane.appendChild(grid);
  modal.appendChild(palettePane);

  // ── Picker tab ────────────────────────────────────────────────────────────
  pickerPane.style.cssText = 'padding:16px;display:none;';

  const hueTrack  = makeSliderTrack();
  const satTrack  = makeSliderTrack();
  const lightTrack = makeSliderTrack();

  hueTrack.style.background = 'linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)';

  function syncSliders(): void {
    satTrack.style.background  = `linear-gradient(to right,hsl(${ch} 0% ${cl}%),hsl(${ch} 100% ${cl}%))`;
    lightTrack.style.background = `linear-gradient(to right,hsl(${ch} ${cs}% 0%),hsl(${ch} ${cs}% 50%),hsl(${ch} ${cs}% 100%))`;
    setThumb(hueTrack,   ch / 360);
    setThumb(satTrack,   cs / 100);
    setThumb(lightTrack, cl / 100);
    updateSliderLabels();
  }

  function buildSliderRow(label: string, track: HTMLElement, valId: string): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = 'display:grid;gap:6px;margin-bottom:12px;';
    const top = document.createElement('div');
    top.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
    const lbl = document.createElement('span');
    lbl.style.cssText = 'font-size:11px;color:#64748b;';
    lbl.textContent = label;
    const valEl = document.createElement('span');
    valEl.id = valId;
    valEl.style.cssText = 'font-size:11px;font-family:monospace;color:#334155;';
    top.appendChild(lbl); top.appendChild(valEl);
    row.appendChild(top); row.appendChild(track);
    return row;
  }

  function updateSliderLabels(): void {
    const hEl = pickerPane.querySelector<HTMLElement>('#sl-h');
    const sEl = pickerPane.querySelector<HTMLElement>('#sl-s');
    const lEl = pickerPane.querySelector<HTMLElement>('#sl-l');
    if (hEl) hEl.textContent = String(ch);
    if (sEl) sEl.textContent = `${cs}%`;
    if (lEl) lEl.textContent = `${cl}%`;
  }

  wireSlider(hueTrack,   (pct) => { ch = Math.round(pct * 360); emit(hslToHex(ch, cs, cl)); syncSliders(); });
  wireSlider(satTrack,   (pct) => { cs = Math.round(pct * 100); emit(hslToHex(ch, cs, cl)); syncSliders(); });
  wireSlider(lightTrack, (pct) => { cl = Math.round(pct * 100); emit(hslToHex(ch, cs, cl)); syncSliders(); });

  pickerPane.appendChild(buildSliderRow('Hue',        hueTrack,   'sl-h'));
  pickerPane.appendChild(buildSliderRow('Saturation', satTrack,   'sl-s'));
  pickerPane.appendChild(buildSliderRow('Lightness',  lightTrack, 'sl-l'));
  modal.appendChild(pickerPane);

  // ── Hex input (shared footer) ─────────────────────────────────────────────
  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 16px 14px;border-top:1px solid #f1f5f9;';

  const hexLabel = document.createElement('span');
  hexLabel.style.cssText = 'font-size:10px;font-family:monospace;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;flex-shrink:0;';
  hexLabel.textContent = 'Hex';

  hexInput = document.createElement('input');
  hexInput.type = 'text';
  hexInput.value = currentHex;
  hexInput.className = 'flex-1 h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-mono text-slate-800 outline-none focus:border-violet-500';
  hexInput.spellcheck = false;
  hexInput.maxLength = 7;

  let hexDebounce: ReturnType<typeof setTimeout>;
  hexInput.addEventListener('input', () => {
    clearTimeout(hexDebounce);
    hexDebounce = setTimeout(() => {
      const raw = hexInput.value.trim();
      const full = toHex(raw.startsWith('#') ? raw : `#${raw}`);
      if (!/^#[0-9a-fA-F]{6}$/.test(full)) return;
      emit(full);
    }, 250);
  });
  hexInput.addEventListener('click', e => e.stopPropagation());

  const doneBtn = document.createElement('button');
  doneBtn.type = 'button';
  doneBtn.textContent = 'Done';
  doneBtn.style.cssText = 'flex-shrink:0;height:32px;padding:0 14px;border-radius:8px;border:none;background:#7c3aed;color:#fff;font-size:12px;font-weight:500;cursor:pointer;';
  doneBtn.addEventListener('click', e => { e.stopPropagation(); closeModal(); });

  footer.appendChild(hexLabel);
  footer.appendChild(hexInput);
  footer.appendChild(doneBtn);
  modal.appendChild(footer);

  backdrop.appendChild(modal);

  requestAnimationFrame(() => { syncTabs(); syncSliders(); });

  return backdrop;
}

function makeDot(hex: string): HTMLButtonElement {
  const dot = document.createElement('button');
  dot.type = 'button';
  dot.title = hex;
  dot.style.cssText = `width:18px;height:18px;border-radius:50%;background:${hex};border:1px solid rgba(0,0,0,0.08);cursor:pointer;flex-shrink:0;transition:transform 0.1s;`;
  dot.addEventListener('mouseenter', () => { dot.style.transform = 'scale(1.25)'; });
  dot.addEventListener('mouseleave', () => { dot.style.transform = ''; });
  return dot;
}

function makeSliderTrack(): HTMLElement {
  const track = document.createElement('div');
  track.style.cssText = 'position:relative;height:14px;border-radius:7px;cursor:pointer;';
  const thumb = document.createElement('div');
  thumb.style.cssText = 'position:absolute;top:50%;width:18px;height:18px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,0.25);transform:translate(-50%,-50%);pointer-events:none;';
  track.appendChild(thumb);
  return track;
}

function setThumb(track: HTMLElement, pct: number): void {
  const thumb = track.querySelector<HTMLElement>('div');
  if (thumb) thumb.style.left = `${Math.max(0, Math.min(100, pct * 100))}%`;
}

function wireSlider(track: HTMLElement, onPct: (pct: number) => void): void {
  let dragging = false;
  function handle(clientX: number): void {
    const rect = track.getBoundingClientRect();
    onPct(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)));
  }
  track.addEventListener('mousedown', e => { e.stopPropagation(); dragging = true; handle(e.clientX); });
  document.addEventListener('mousemove', e => { if (dragging) handle(e.clientX); });
  document.addEventListener('mouseup', () => { dragging = false; });
}

// HSL helpers
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b), l = (max+min)/2;
  if (max === min) return [0, 0, Math.round(l*100)];
  const d = max - min, s = l > 0.5 ? d/(2-max-min) : d/(max+min);
  let h = 0;
  if (max === r) h = ((g-b)/d + (g<b?6:0))/6;
  else if (max === g) h = ((b-r)/d + 2)/6;
  else h = ((r-g)/d + 4)/6;
  return [Math.round(h*360), Math.round(s*100), Math.round(l*100)];
}

function hslToHex(h: number, s: number, l: number): string {
  const sl = s/100, ll = l/100;
  const a = sl * Math.min(ll, 1-ll);
  function f(n: number): string {
    const k = (n + h/30) % 12;
    const color = ll - a * Math.max(-1, Math.min(k-3, 9-k, 1));
    return Math.round(color*255).toString(16).padStart(2,'0');
  }
  return `#${f(0)}${f(8)}${f(4)}`;
}

// ── Color picker row ──────────────────────────────────────────────────────────

interface ColorRowOptions {
  label: string;
  varKey: keyof CheckoutThemeVariables;
  value: string;
  onChange: (val: string) => void;
}

function buildColorRow({ label, varKey, value, onChange }: ColorRowOptions): HTMLElement {
  const row = document.createElement('div');
  row.className = 'flex items-center justify-between gap-3';

  const labelEl = document.createElement('span');
  labelEl.className = 'text-xs text-slate-600 min-w-0 flex-1';
  labelEl.textContent = label;

  const right = document.createElement('div');
  right.className = 'flex items-center gap-2 shrink-0 relative';

  const swatch = document.createElement('div');
  swatch.className = 'h-6 w-6 rounded-md border border-slate-200 cursor-pointer shrink-0';
  swatch.style.backgroundColor = value;
  swatch.dataset['varSwatch'] = varKey;

  const hexDisplay = document.createElement('span');
  hexDisplay.className = 'text-xs font-mono text-slate-500 w-16 truncate';
  hexDisplay.textContent = value.startsWith('var(') ? '—' : value;
  hexDisplay.dataset['varDisplay'] = varKey;

  let popoverEl: HTMLElement | null = null;

  swatch.addEventListener('click', (e) => {
    e.stopPropagation();
    if (popoverEl) { popoverEl.remove(); popoverEl = null; activePopover = null; return; }
    if (activePopover) { activePopover.remove(); activePopover = null; }

    const currentHex = resolveColorToHex(value);
    popoverEl = buildColorPopover(currentHex, (hex) => {
      swatch.style.backgroundColor = hex;
      hexDisplay.textContent = hex;
      value = hex;
      onChange(hex);
    }, swatch);
    document.body.appendChild(popoverEl);
    activePopover = popoverEl;
  });

  document.addEventListener('click', () => {
    if (popoverEl) {
      const el = popoverEl;
      popoverEl = null;
      el.remove();
      if (activePopover === el) activePopover = null;
    }
  });

  right.appendChild(swatch);
  right.appendChild(hexDisplay);
  row.appendChild(labelEl);
  row.appendChild(right);
  return row;
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
  let lastDaisyTheme = '';

  store.subscribe(state => {
    if (state.activeTab !== 'appearance') {
      el?.remove();
      el = null;
      lastPreset = '';
      lastDaisyTheme = '';
      return;
    }
    if (!el) {
      el = buildAppearanceTab(store);
      lastPreset = state.themePreset;
      lastDaisyTheme = state.daisyTheme;
      container.appendChild(el);
    } else {
      syncPresetCards(el, state.themePreset);
      syncDaisyThemeSelect(el, state.daisyTheme);
      if (state.themePreset !== lastPreset || state.daisyTheme !== lastDaisyTheme) {
        syncVariableControls(el, state.theme);
        syncClassInputs(el, state.theme);
        lastPreset = state.themePreset;
        lastDaisyTheme = state.daisyTheme;
      }
    }
  });
}

// bg / primary / secondary / accent swatches for each daisyUI theme
const DAISY_THEMES: { name: string; bg: string; p: string; s: string; a: string }[] = [
  { name: 'light',      bg: '#ffffff', p: '#4506cb', s: '#1bb2af', a: '#c148ac' },
  { name: 'dark',       bg: '#1d232a', p: '#1eb854', s: '#d99330', a: '#d99330' },
  { name: 'cupcake',    bg: '#faf7f5', p: '#65c3c8', s: '#ef9fbc', a: '#eeaf3a' },
  { name: 'bumblebee',  bg: '#ffffff', p: '#e0a82e', s: '#f9d72f', a: '#181830' },
  { name: 'emerald',    bg: '#ffffff', p: '#66cc8a', s: '#377cfb', a: '#f68067' },
  { name: 'corporate',  bg: '#ffffff', p: '#4b6bfb', s: '#7b92b2', a: '#67cba0' },
  { name: 'synthwave',  bg: '#1a1033', p: '#e779c1', s: '#58c7f3', a: '#f3cc30' },
  { name: 'retro',      bg: '#e4d8b4', p: '#ef9995', s: '#a4cbb4', a: '#ebdc99' },
  { name: 'cyberpunk',  bg: '#ffee00', p: '#ff7598', s: '#75d1f0', a: '#c07eec' },
  { name: 'valentine',  bg: '#fae8e8', p: '#e96d7b', s: '#a991f7', a: '#70acc7' },
  { name: 'halloween',  bg: '#212121', p: '#f28c18', s: '#6d3a9c', a: '#51a800' },
  { name: 'garden',     bg: '#e9e7e7', p: '#5c7f67', s: '#ecf4e7', a: '#fc7f7f' },
  { name: 'forest',     bg: '#171212', p: '#1eb854', s: '#1fd65f', a: '#d99330' },
  { name: 'aqua',       bg: '#345da7', p: '#09ecf3', s: '#966fb3', a: '#ffe999' },
  { name: 'lofi',       bg: '#ffffff', p: '#0d0d0d', s: '#1a1a1a', a: '#262626' },
  { name: 'pastel',     bg: '#ffffff', p: '#d1c1d7', s: '#f6cbd1', a: '#b4e9d6' },
  { name: 'fantasy',    bg: '#ffffff', p: '#6e0b75', s: '#007ebd', a: '#f15b26' },
  { name: 'wireframe',  bg: '#ffffff', p: '#b8b8b8', s: '#b8b8b8', a: '#b8b8b8' },
  { name: 'black',      bg: '#000000', p: '#343232', s: '#343232', a: '#343232' },
  { name: 'luxury',     bg: '#09090b', p: '#ffffff', s: '#152747', a: '#513448' },
  { name: 'dracula',    bg: '#282a36', p: '#ff79c6', s: '#bd93f9', a: '#ffb86c' },
  { name: 'cmyk',       bg: '#ffffff', p: '#45aeee', s: '#e8488a', a: '#f6d860' },
  { name: 'autumn',     bg: '#f1e2c9', p: '#8c0327', s: '#d85251', a: '#d59b6a' },
  { name: 'business',   bg: '#1b1b1b', p: '#1c4f82', s: '#7c909a', a: '#e4d308' },
  { name: 'acid',       bg: '#d0fb84', p: '#ff00f4', s: '#ff7400', a: '#00e8ff' },
  { name: 'lemonade',   bg: '#ffffff', p: '#519903', s: '#e9e92e', a: '#e9e92e' },
  { name: 'night',      bg: '#0f1729', p: '#38bdf8', s: '#818cf8', a: '#f471b5' },
  { name: 'coffee',     bg: '#20161f', p: '#db924b', s: '#263e3f', a: '#10576d' },
  { name: 'winter',     bg: '#ffffff', p: '#047aed', s: '#463aa1', a: '#c148ac' },
  { name: 'dim',        bg: '#2a303c', p: '#9ca3af', s: '#6d28d9', a: '#d97706' },
  { name: 'nord',       bg: '#e5e9f0', p: '#5e81ac', s: '#81a1c1', a: '#b48ead' },
  { name: 'sunset',     bg: '#1a1109', p: '#fd5f00', s: '#d8872b', a: '#b45a05' },
  { name: 'caramellatte', bg: '#f6e7d5', p: '#8c5a2e', s: '#c4855a', a: '#7c9b6e' },
  { name: 'abyss',      bg: '#030712', p: '#3b82f6', s: '#1d4ed8', a: '#7c3aed' },
  { name: 'silk',       bg: '#f5f0eb', p: '#8b6f4e', s: '#b08d72', a: '#7a9e87' },
];

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
  const daisyRow = panel.querySelector<HTMLElement>('[data-daisy-theme-row]');
  if (daisyRow) daisyRow.hidden = activePreset !== 'tailwind';
  const typoSection = panel.querySelector<HTMLElement>('[data-typo-section]');
  if (typoSection) typoSection.hidden = activePreset === 'tailwind';
  const shapeSection = panel.querySelector<HTMLElement>('[data-shape-section]');
  if (shapeSection) shapeSection.hidden = activePreset === 'tailwind';
}

function syncDaisyThemeSelect(panel: HTMLElement, daisyTheme: string): void {
  panel.querySelectorAll<HTMLButtonElement>('[data-daisy-theme]').forEach(btn => {
    const active = btn.dataset['daisyTheme'] === daisyTheme;
    btn.style.outline = active ? '2px solid #7c3aed' : 'none';
    btn.style.outlineOffset = '2px';
  });
}

function syncVariableControls(panel: HTMLElement, theme: { preset?: string; variables?: Partial<CheckoutThemeVariables> }): void {
  const basePreset = (theme.preset === 'custom' || !theme.preset ? 'modern' : theme.preset) as 'modern' | 'tailwind' | 'shadcn';
  const vars: CheckoutThemeVariables = { ...getPresetVariables(basePreset), ...theme.variables };

  panel.querySelectorAll<HTMLElement>('[data-var-swatch]').forEach(swatch => {
    const key = swatch.dataset['varSwatch'] as keyof CheckoutThemeVariables;
    const val = (vars[key] as string) ?? '';
    swatch.style.backgroundColor = val.startsWith('var(') ? '' : val;
    const display = swatch.nextElementSibling as HTMLElement | null;
    if (display && display.dataset['varDisplay']) {
      display.textContent = val.startsWith('var(') ? '—' : val;
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

  // ── Container layout ──────────────────────────────────────────────────────
  panel.appendChild(buildSectionHeading('Layout'));

  const layoutGrid = document.createElement('div');
  layoutGrid.className = 'grid grid-cols-2 gap-2';

  const layouts: { id: 'two-column' | 'stacked'; name: string; desc: string; icon: string }[] = [
    { id: 'two-column', name: 'Two Column', desc: 'Form left, summary right', icon: '⬜⬛' },
    { id: 'stacked',    name: 'Stacked',    desc: 'Single column, top to bottom', icon: '⬜' },
  ];

  layouts.forEach(layout => {
    const card = document.createElement('button');
    card.type = 'button';
    card.dataset['layoutId'] = layout.id;
    const isActive = state.containerLayout === layout.id;
    card.className = `flex flex-col items-start rounded-xl border px-3 py-3 text-left transition gap-1 ${
      isActive
        ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500'
        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
    }`;

    const nameEl = document.createElement('p');
    nameEl.className = 'text-xs font-medium text-slate-900';
    nameEl.textContent = layout.name;

    const descEl = document.createElement('p');
    descEl.className = 'text-xs text-slate-400 leading-snug';
    descEl.textContent = layout.desc;

    card.appendChild(nameEl);
    card.appendChild(descEl);

    card.addEventListener('click', () => {
      if (store.get().containerLayout === layout.id) return;
      store.update({ containerLayout: layout.id });
      layoutGrid.querySelectorAll<HTMLButtonElement>('[data-layout-id]').forEach(c => {
        const active = c.dataset['layoutId'] === layout.id;
        c.className = `flex flex-col items-start rounded-xl border px-3 py-3 text-left transition gap-1 ${
          active
            ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
        }`;
      });
    });

    layoutGrid.appendChild(card);
  });

  panel.appendChild(layoutGrid);

  // ── Payment layout ────────────────────────────────────────────────────────
  panel.appendChild(buildSectionHeading('Payment Layout'));

  const paymentLayoutGrid = document.createElement('div');
  paymentLayoutGrid.className = 'grid grid-cols-3 gap-2';

  const paymentLayouts: { id: 'radio' | 'tabs' | 'accordion'; name: string; desc: string }[] = [
    { id: 'tabs',      name: 'Tabs',      desc: 'Displays horizontally' },
    { id: 'radio',     name: 'Accordion',     desc: 'Displays vertically' },
    { id: 'accordion', name: 'Accordion', desc: 'Displays vertically without buttons' },
  ];

  paymentLayouts.forEach(pl => {
    const card = document.createElement('button');
    card.type = 'button';
    card.dataset['paymentLayoutId'] = pl.id;
    const isActive = state.paymentLayout === pl.id;
    card.className = `flex flex-col items-start rounded-xl border px-3 py-3 text-left transition gap-1 ${
      isActive
        ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500'
        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
    }`;

    const nameEl = document.createElement('p');
    nameEl.className = 'text-xs font-medium text-slate-900';
    nameEl.textContent = pl.name;

    const descEl = document.createElement('p');
    descEl.className = 'text-xs text-slate-400 leading-snug';
    descEl.textContent = pl.desc;

    card.appendChild(nameEl);
    card.appendChild(descEl);

    card.addEventListener('click', () => {
      if (store.get().paymentLayout === pl.id) return;
      store.update({ paymentLayout: pl.id });
      paymentLayoutGrid.querySelectorAll<HTMLButtonElement>('[data-payment-layout-id]').forEach(c => {
        const active = c.dataset['paymentLayoutId'] === pl.id;
        c.className = `flex flex-col items-start rounded-xl border px-3 py-3 text-left transition gap-1 ${
          active
            ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
        }`;
      });
    });

    paymentLayoutGrid.appendChild(card);
  });

  panel.appendChild(paymentLayoutGrid);

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
        if (preset.id === 'tailwind') {
          const daisyEntry = DAISY_THEMES.find(t => t.name === store.get().daisyTheme) ?? DAISY_THEMES[0];
          newTheme.variables = { ...newTheme.variables, ...daisyThemeVariables(daisyEntry) };
        }
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

  // ── daisyUI theme picker ──────────────────────────────────────────────────
  const daisyRow = document.createElement('div');
  daisyRow.dataset['daisyThemeRow'] = '';
  daisyRow.hidden = state.themePreset !== 'tailwind';
  daisyRow.className = 'grid gap-2';

  const daisyHeading = buildSectionHeading('daisyUI Theme');
  daisyRow.appendChild(daisyHeading);

  const daisyGrid = document.createElement('div');
  daisyGrid.className = 'grid grid-cols-4 gap-1.5';

  DAISY_THEMES.forEach(t => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = t.name;
    btn.dataset['daisyTheme'] = t.name;
    btn.className = 'rounded-lg overflow-hidden border border-slate-200 cursor-pointer transition hover:scale-105';
    if (t.name === state.daisyTheme) {
      btn.style.outline = '2px solid #7c3aed';
      btn.style.outlineOffset = '2px';
    }

    // Swatch block
    const swatch = document.createElement('div');
    swatch.style.backgroundColor = t.bg;
    swatch.style.padding = '4px 5px 3px';
    swatch.className = 'flex gap-0.5';

    (['p', 's', 'a'] as const).forEach(key => {
      const dot = document.createElement('div');
      dot.style.cssText = `width:7px;height:7px;border-radius:50%;background:${t[key]}`;
      swatch.appendChild(dot);
    });

    // Label
    const label = document.createElement('div');
    label.style.backgroundColor = t.bg;
    label.style.color = t.p;
    label.style.borderTop = '1px solid rgba(0,0,0,0.08)';
    label.className = 'text-[9px] font-medium px-1 pb-1 truncate';
    label.textContent = t.name;

    btn.appendChild(swatch);
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      const doApply = (): void => {
        const newVars = daisyThemeVariables(t);
        store.update({ daisyTheme: t.name, theme: { ...store.get().theme, variables: newVars } });
      };
      if (hasManuallyCustomisedDaisyColors(store)) {
        showResetModal(`the ${t.name} theme`, doApply);
      } else {
        doApply();
      }
    });
    daisyGrid.appendChild(btn);
  });

  daisyRow.appendChild(daisyGrid);
  panel.appendChild(daisyRow);

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
    colorGrid.appendChild(buildColorRow({
      label,
      varKey: key,
      value,
      onChange: (val) => {
        const merged: Partial<CheckoutThemeVariables> = { ...(store.get().theme.variables ?? {}), [key]: val };
        store.update({ theme: { ...store.get().theme, variables: merged } });
      },
    }));
  });

  panel.appendChild(colorGrid);

  // ── Typography ────────────────────────────────────────────────────────────
  const typoSection = document.createElement('div');
  typoSection.dataset['typoSection'] = '';
  typoSection.hidden = state.themePreset === 'tailwind';
  typoSection.appendChild(buildSectionHeading('Typography'));

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

  typoSection.appendChild(typoGrid);
  panel.appendChild(typoSection);

  // ── Shape ─────────────────────────────────────────────────────────────────
  const shapeSection = document.createElement('div');
  shapeSection.dataset['shapeSection'] = '';
  shapeSection.hidden = state.themePreset === 'tailwind';
  shapeSection.appendChild(buildSectionHeading('Shape'));

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

  shapeSection.appendChild(shapeGrid);
  panel.appendChild(shapeSection);

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
