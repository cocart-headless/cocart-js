import type { StateStore } from '../state-types.js';
import type { GatewayConfig } from '../state.js';

export function renderPaymentsTab(container: HTMLElement, store: StateStore): void {
  let el: HTMLElement | null = null;
  let prevGateways: GatewayConfig[] | null = null;
  let prevDefaultGateway: string | null = null;

  store.subscribe(state => {
    if (state.activeTab !== 'payments') {
      el?.remove();
      el = null;
      prevGateways = null;
      prevDefaultGateway = null;
      return;
    }

    // If only label/description changed (and defaultGateway is unchanged), skip
    // the rebuild — the debounced input already holds the current value.
    if (el && prevGateways && prevDefaultGateway === state.defaultGateway) {
      const prev = prevGateways;
      const curr = state.gateways;
      const onlyTextChanged = prev.length === curr.length &&
        curr.every((gw, i) =>
          gw.id === prev[i].id &&
          gw.enabled === prev[i].enabled &&
          gw.isExpress === prev[i].isExpress &&
          gw.isOffline === prev[i].isOffline
        );
      if (onlyTextChanged) {
        prevGateways = curr;
        return;
      }
    }

    const next = buildPaymentsTab(store);
    if (el) {
      el.replaceWith(next);
    } else {
      container.appendChild(next);
    }
    el = next;
    prevGateways = store.get().gateways;
    prevDefaultGateway = store.get().defaultGateway;
  });
}

function buildPaymentsTab(store: StateStore): HTMLElement {
  const state = store.get();
  const panel = document.createElement('div');
  panel.className = 'tab-panel grid gap-6';

  // ── Default gateway ─────────────────────────────────────────────────────
  const enabledGateways = state.gateways.filter(g => g.enabled);
  const regularEnabled = enabledGateways.filter(g => !g.isExpress);

  const heading = document.createElement('h4');
  heading.className = 'text-xs font-semibold uppercase tracking-wider text-slate-400';
  heading.textContent = 'Payment Gateways';
  panel.appendChild(heading);

  const intro = document.createElement('p');
  intro.className = 'text-xs text-slate-400 leading-relaxed -mt-4';
  intro.textContent = 'Enable the gateways you want to support. The default gateway is pre-selected when the form loads.';
  panel.appendChild(intro);

  // Gateway list
  const list = document.createElement('div');
  list.className = 'grid gap-3';

  state.gateways.forEach((gw, idx) => {
    list.appendChild(buildGatewayRow(gw, idx, store));
  });
  panel.appendChild(list);

  // ── Default gateway selector ───────────────────────────────────────────
  if (regularEnabled.length > 1) {
    panel.appendChild(buildDefaultGatewaySelector(regularEnabled, state.defaultGateway, store));
  }

  // ── Info ───────────────────────────────────────────────────────────────
  const infoBox = document.createElement('div');
  infoBox.className = 'rounded-xl border border-blue-100 bg-blue-50 p-4';
  const infoTitle = document.createElement('p');
  infoTitle.className = 'text-xs font-semibold text-blue-800 mb-1';
  infoTitle.textContent = 'Payment elements are placeholder-only in preview';
  const infoDesc = document.createElement('p');
  infoDesc.className = 'text-xs text-blue-600 leading-relaxed';
  infoDesc.textContent = 'In your app, you pass real Stripe, PayPal, or Authorize.Net instances to the gateway factories. The preview shows the form structure only.';
  infoBox.appendChild(infoTitle);
  infoBox.appendChild(infoDesc);
  panel.appendChild(infoBox);

  return panel;
}

function buildGatewayRow(gw: GatewayConfig, idx: number, store: StateStore): HTMLElement {
  const state = store.get();

  const card = document.createElement('div');
  card.className = `rounded-xl border transition ${gw.enabled ? 'border-violet-200 bg-violet-50' : 'border-slate-200 bg-white'}`;

  // Header row
  const header = document.createElement('div');
  header.className = 'flex items-center gap-3 px-4 py-3';

  const toggle = makeSmallToggle(gw.enabled, checked => {
    const newGateways = [...store.get().gateways];
    newGateways[idx] = { ...newGateways[idx], enabled: checked };
    // If disabled, clear defaultGateway if it was this one
    let defaultGateway = store.get().defaultGateway;
    if (!checked && defaultGateway === gw.id) defaultGateway = '';
    store.update({ gateways: newGateways, defaultGateway });
  });

  const nameWrap = document.createElement('div');
  nameWrap.className = 'flex-1 min-w-0';

  const nameRow = document.createElement('div');
  nameRow.className = 'flex items-center gap-2';

  const nameEl = document.createElement('span');
  nameEl.className = 'text-sm font-medium text-slate-900';
  nameEl.textContent = gw.label;
  nameRow.appendChild(nameEl);

  if (gw.isExpress) {
    const badge = document.createElement('span');
    badge.className = 'rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700';
    badge.textContent = 'Express';
    nameRow.appendChild(badge);
  }
  if (gw.isOffline) {
    const badge = document.createElement('span');
    badge.className = 'rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600';
    badge.textContent = 'Offline';
    nameRow.appendChild(badge);
  }
  if (state.defaultGateway === gw.id) {
    const badge = document.createElement('span');
    badge.className = 'rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700';
    badge.textContent = 'Default';
    nameRow.appendChild(badge);
  }

  nameWrap.appendChild(nameRow);

  if (gw.description) {
    const desc = document.createElement('p');
    desc.className = 'text-xs text-slate-500 mt-0.5 truncate';
    desc.textContent = gw.description;
    nameWrap.appendChild(desc);
  }

  header.appendChild(toggle);
  header.appendChild(nameWrap);

  // Set-as-default button (only for enabled non-express gateways)
  if (gw.enabled && !gw.isExpress && state.defaultGateway !== gw.id) {
    const defaultBtn = document.createElement('button');
    defaultBtn.type = 'button';
    defaultBtn.className = 'text-xs text-violet-600 font-medium hover:underline shrink-0';
    defaultBtn.textContent = 'Set default';
    defaultBtn.addEventListener('click', () => store.update({ defaultGateway: gw.id }));
    header.appendChild(defaultBtn);
  }

  card.appendChild(header);

  // Label/description inputs (expanded when enabled)
  if (gw.enabled) {
    const fields = document.createElement('div');
    fields.className = 'px-4 pb-4 grid gap-3 border-t border-violet-100 pt-3';

    fields.appendChild(makeInlineInput('Label', gw.label, val => {
      const newGateways = [...store.get().gateways];
      newGateways[idx] = { ...newGateways[idx], label: val };
      store.update({ gateways: newGateways });
    }));

    fields.appendChild(makeInlineInput('Description', gw.description, val => {
      const newGateways = [...store.get().gateways];
      newGateways[idx] = { ...newGateways[idx], description: val };
      store.update({ gateways: newGateways });
    }));

    const labelNote = document.createElement('p');
    labelNote.className = 'text-xs text-slate-400 leading-relaxed';
    labelNote.textContent = 'Changes to label and description are passed to the gateway factory in the generated code.';
    fields.appendChild(labelNote);

    card.appendChild(fields);
  }

  return card;
}

function makeSmallToggle(checked: boolean, onChange: (v: boolean) => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.role = 'switch';
  btn.setAttribute('aria-checked', String(checked));
  btn.dataset['checked'] = String(checked);
  btn.className = `toggle-track relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors`;

  const knob = document.createElement('span');
  knob.className = `pointer-events-none absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`;
  btn.appendChild(knob);

  btn.addEventListener('click', () => {
    const next = btn.dataset['checked'] !== 'true';
    btn.dataset['checked'] = String(next);
    btn.setAttribute('aria-checked', String(next));
    knob.className = `pointer-events-none absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${next ? 'translate-x-4' : 'translate-x-0'}`;
    onChange(next);
  });

  return btn;
}

function makeInlineInput(label: string, value: string, onChange: (v: string) => void): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'grid gap-1';

  const labelEl = document.createElement('label');
  labelEl.className = 'text-xs font-medium text-slate-600';
  labelEl.textContent = label;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'h-8 w-full rounded-lg border border-violet-200 bg-white px-2.5 text-xs text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10';
  input.value = value;

  let timer: ReturnType<typeof setTimeout>;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => onChange(input.value), 200);
  });

  wrap.appendChild(labelEl);
  wrap.appendChild(input);
  return wrap;
}

function buildDefaultGatewaySelector(
  enabledGateways: GatewayConfig[],
  currentDefault: string,
  store: StateStore,
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'grid gap-1.5';

  const label = document.createElement('label');
  label.className = 'text-xs font-semibold uppercase tracking-wider text-slate-400';
  label.textContent = 'Default Gateway';

  const select = document.createElement('select');
  select.className = 'h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-violet-500';

  const blankOpt = document.createElement('option');
  blankOpt.value = '';
  blankOpt.textContent = '— First registered (auto) —';
  select.appendChild(blankOpt);

  enabledGateways.forEach(gw => {
    const opt = document.createElement('option');
    opt.value = gw.id;
    opt.textContent = gw.label;
    opt.selected = gw.id === currentDefault;
    select.appendChild(opt);
  });

  select.addEventListener('change', () => store.update({ defaultGateway: select.value }));

  wrap.appendChild(label);
  wrap.appendChild(select);
  return wrap;
}
