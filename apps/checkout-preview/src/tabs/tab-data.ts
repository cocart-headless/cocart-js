import type { StateStore } from '../state-types.js';

export function renderDataTab(container: HTMLElement, store: StateStore): void {
  let el: HTMLElement | null = null;

  store.subscribe(state => {
    if (state.activeTab !== 'data') {
      el?.remove();
      el = null;
      return;
    }
    const next = buildDataTab(store);
    if (el) {
      el.replaceWith(next);
    } else {
      container.appendChild(next);
    }
    el = next;
  });
}

function buildDataTab(store: StateStore): HTMLElement {
  const state = store.get();
  const panel = document.createElement('div');
  panel.className = 'tab-panel grid gap-6';

  // ── Form Sections ──────────────────────────────────────────────────────
  panel.appendChild(buildGroupHeading('Form Sections'));

  panel.appendChild(makeToggleRow(
    'Collect Shipping Address',
    'Show a separate shipping address section when toggled on.',
    state.collectShippingAddress,
    checked => store.update({ collectShippingAddress: checked }),
  ));

  if (state.collectShippingAddress) {
    panel.appendChild(makeToggleRow(
      'Shipping Same as Billing',
      'When on, hides the shipping address form — billing address is used for both.',
      state.shippingSameAsBilling,
      checked => store.update({ shippingSameAsBilling: checked }),
    ));
  }

  panel.appendChild(makeToggleRow(
    'Order Notes',
    'Show a free-text field for delivery instructions.',
    state.includeNotes,
    checked => store.update({ includeNotes: checked }),
  ));

  panel.appendChild(makeToggleRow(
    'Order Summary',
    'Show a live order summary section alongside the form.',
    state.includeOrderSummary,
    checked => store.update({ includeOrderSummary: checked }),
  ));

  if (state.includeOrderSummary) {
    panel.appendChild(makeToggleRow(
      'Mobile Order Summary Drawer',
      'On mobile, show the order summary as a bottom sheet drawer instead of inline.',
      state.mobileOrderSummaryDrawer,
      checked => store.update({ mobileOrderSummaryDrawer: checked }),
    ));
  }

  // ── Redirect URLs ──────────────────────────────────────────────────────
  panel.appendChild(buildGroupHeading('Redirect URLs'));

  panel.appendChild(makeUrlInput(
    'Success URL',
    'Redirect after a successful order. Use {CHECKOUT_ID} as a placeholder.',
    state.successUrl,
    'https://your-store.com/order-complete?id={CHECKOUT_ID}',
    val => store.update({ successUrl: val }),
  ));

  panel.appendChild(makeUrlInput(
    'Return URL',
    'Redirect if payment fails or the customer cancels.',
    state.returnUrl,
    'https://your-store.com/checkout',
    val => store.update({ returnUrl: val }),
  ));

  // ── Field editors ──────────────────────────────────────────────────────
  panel.appendChild(buildGroupHeading('Contact Fields'));
  panel.appendChild(buildFieldList(store, 'contact'));

  panel.appendChild(buildGroupHeading('Billing Fields'));
  panel.appendChild(buildFieldList(store, 'billing'));

  // Only show shipping field editor when a separate shipping section is active
  if (state.collectShippingAddress && !state.shippingSameAsBilling) {
    panel.appendChild(buildGroupHeading('Shipping Fields'));
    panel.appendChild(buildFieldList(store, 'shipping'));
  }

  if (state.includeNotes) {
    panel.appendChild(buildGroupHeading('Notes Fields'));
    panel.appendChild(buildFieldList(store, 'notes'));
  }

  return panel;
}

function buildGroupHeading(text: string): HTMLElement {
  const h = document.createElement('h4');
  h.className = 'text-xs font-semibold uppercase tracking-wider text-slate-400';
  h.textContent = text;
  return h;
}

function makeToggleRow(
  label: string,
  description: string,
  checked: boolean,
  onChange: (v: boolean) => void,
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'flex items-start justify-between gap-4';

  const textWrap = document.createElement('div');
  const labelEl = document.createElement('p');
  labelEl.className = 'text-sm font-medium text-slate-900';
  labelEl.textContent = label;
  const descEl = document.createElement('p');
  descEl.className = 'text-xs text-slate-500 mt-0.5 leading-relaxed';
  descEl.textContent = description;
  textWrap.appendChild(labelEl);
  textWrap.appendChild(descEl);

  const toggle = makeToggle(checked, onChange);

  row.appendChild(textWrap);
  row.appendChild(toggle);
  return row;
}

function makeToggle(checked: boolean, onChange: (v: boolean) => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.role = 'switch';
  btn.setAttribute('aria-checked', String(checked));
  btn.dataset['checked'] = String(checked);
  btn.className = 'toggle-track relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors';

  const knob = document.createElement('span');
  knob.className = `pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`;
  btn.appendChild(knob);

  btn.addEventListener('click', () => {
    const next = btn.dataset['checked'] !== 'true';
    btn.dataset['checked'] = String(next);
    btn.setAttribute('aria-checked', String(next));
    knob.className = `pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${next ? 'translate-x-5' : 'translate-x-0'}`;
    onChange(next);
  });

  return btn;
}

function makeUrlInput(
  label: string,
  description: string,
  value: string,
  placeholder: string,
  onChange: (v: string) => void,
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'grid gap-1.5';

  const labelEl = document.createElement('label');
  labelEl.className = 'text-sm font-medium text-slate-900';
  labelEl.textContent = label;

  const input = document.createElement('input');
  input.type = 'url';
  input.className = 'h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-mono text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10';
  input.placeholder = placeholder;
  input.value = value;

  // Debounce: update state only after user stops typing (300ms), not on every keystroke
  let debounceTimer: ReturnType<typeof setTimeout>;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => onChange(input.value), 300);
  });

  const desc = document.createElement('p');
  desc.className = 'text-xs text-slate-400 leading-relaxed';
  desc.textContent = description;

  wrap.appendChild(labelEl);
  wrap.appendChild(input);
  wrap.appendChild(desc);
  return wrap;
}

function buildFieldList(
  store: StateStore,
  section: 'contact' | 'billing' | 'shipping' | 'notes',
): HTMLElement {
  const state = store.get();
  const fields = state.fields[section];

  const list = document.createElement('div');
  list.className = 'rounded-xl border border-slate-200 overflow-hidden';

  fields.forEach((field, idx) => {
    const row = document.createElement('div');
    row.className = `flex items-center gap-3 px-3 py-2.5 text-sm ${idx > 0 ? 'border-t border-slate-100' : ''}`;

    const reqBadge = document.createElement('span');
    reqBadge.className = `rounded-full px-1.5 py-0.5 text-xs font-medium ${field.required ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`;
    reqBadge.textContent = field.required ? 'req' : 'opt';

    const name = document.createElement('span');
    name.className = 'flex-1 font-medium text-slate-900 text-xs truncate';
    name.textContent = field.label;

    const typeBadge = document.createElement('span');
    typeBadge.className = 'rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 font-mono';
    typeBadge.textContent = field.type;

    const hiddenToggle = document.createElement('button');
    hiddenToggle.type = 'button';
    hiddenToggle.title = field.hidden ? 'Show field' : 'Hide field';
    hiddenToggle.className = `text-slate-400 hover:text-slate-700 transition ${field.hidden ? 'opacity-40' : ''}`;
    hiddenToggle.textContent = field.hidden ? '🙈' : '👁';
    hiddenToggle.addEventListener('click', () => {
      const currentState = store.get();
      const newFields = [...currentState.fields[section]];
      newFields[idx] = { ...newFields[idx], hidden: !newFields[idx].hidden };
      store.update({ fields: { ...currentState.fields, [section]: newFields } });
    });

    row.appendChild(reqBadge);
    row.appendChild(name);
    row.appendChild(typeBadge);
    row.appendChild(hiddenToggle);
    list.appendChild(row);
  });

  if (fields.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'px-3 py-4 text-xs text-slate-400 text-center';
    empty.textContent = 'No fields configured.';
    list.appendChild(empty);
  }

  return list;
}
