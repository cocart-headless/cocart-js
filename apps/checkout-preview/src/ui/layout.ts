import type { StateStore } from '../state-types.js';

export interface LayoutParts {
  builderPanel: HTMLElement;
  tabBar: HTMLElement;
  tabContent: HTMLElement;
  previewContainer: HTMLElement;
  previewOuter: HTMLElement;
  previewLabel: HTMLElement;
  codeContainer: HTMLElement;
  implBtn: HTMLButtonElement;
  setOnReset: (fn: () => void) => void;
}

export function buildLayout(root: HTMLElement, store: StateStore): LayoutParts {
  root.className = 'flex flex-col h-full overflow-hidden';

  // ── Header ──────────────────────────────────────────────────────────────
  const header = document.createElement('header');
  header.className = 'flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shrink-0';

  const brand = document.createElement('div');
  brand.className = 'flex items-center gap-2.5';

  const logo = document.createElement('div');
  logo.className = 'flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white text-xs font-bold';
  logo.textContent = 'CC';

  const title = document.createElement('span');
  title.className = 'text-sm font-semibold text-slate-900';
  title.textContent = 'Checkout Builder';

  const badge = document.createElement('span');
  badge.className = 'rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700';
  badge.textContent = 'Preview';

  brand.appendChild(logo);
  brand.appendChild(title);
  brand.appendChild(badge);

  const headerRight = document.createElement('div');
  headerRight.className = 'flex items-center gap-2';

  // Color scheme toggle
  const schemeToggle = document.createElement('div');
  schemeToggle.className = 'flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5';

  const lightBtn = document.createElement('button');
  lightBtn.type = 'button';
  lightBtn.title = 'Light mode';

  const darkBtn = document.createElement('button');
  darkBtn.type = 'button';
  darkBtn.title = 'Dark mode';

  const systemBtn = document.createElement('button');
  systemBtn.type = 'button';
  systemBtn.title = 'System preference';

  // Sun icon
  lightBtn.appendChild(makeIcon('M12 3v1m0 16v1m8.66-13l-.87.5M4.21 16.5l-.87.5M19.79 16.5l.87.5M4.21 7.5l.87.5M21 12h-1M4 12H3m15.36-5.64l-.7.7M6.34 17.66l-.7.7M17.66 17.66l.7.7M6.34 6.36l.7.7M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 16));
  // Moon icon
  darkBtn.appendChild(makeIcon('M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z', 16));
  // Monitor/system icon
  systemBtn.appendChild(makeIcon('M9 17H5a2 2 0 0 0-2 2M15 17h4a2 2 0 0 1 2 2M12 17v2m-7-7h14M3 7h18a1 1 0 0 1 1 1v7H2V8a1 1 0 0 1 1-1z', 16));

  schemeToggle.appendChild(lightBtn);
  schemeToggle.appendChild(darkBtn);
  schemeToggle.appendChild(systemBtn);

  const schemeBase = 'flex items-center justify-center rounded-md px-2 py-1.5 transition';
  function syncSchemeButtons(scheme: 'light' | 'dark' | 'system') {
    lightBtn.className  = `${schemeBase} ${scheme === 'light'   ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`;
    darkBtn.className   = `${schemeBase} ${scheme === 'dark'    ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`;
    systemBtn.className = `${schemeBase} ${scheme === 'system'  ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`;
  }

  lightBtn.addEventListener('click', () => { store.update({ colorScheme: 'light' }); syncSchemeButtons('light'); });
  darkBtn.addEventListener('click', () => { store.update({ colorScheme: 'dark' }); syncSchemeButtons('dark'); });
  systemBtn.addEventListener('click', () => { store.update({ colorScheme: 'system' }); syncSchemeButtons('system'); });

  // Viewport toggle
  const viewportToggle = document.createElement('div');
  viewportToggle.className = 'flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5';

  const desktopBtn = document.createElement('button');
  desktopBtn.type = 'button';
  desktopBtn.title = 'Desktop view';
  desktopBtn.dataset['viewport'] = 'desktop';
  desktopBtn.className = 'flex items-center justify-center rounded-md px-2 py-1.5 text-slate-600 transition';

  const mobileBtn = document.createElement('button');
  mobileBtn.type = 'button';
  mobileBtn.title = 'Mobile view';
  mobileBtn.dataset['viewport'] = 'mobile';
  mobileBtn.className = 'flex items-center justify-center rounded-md px-2 py-1.5 text-slate-400 transition';

  desktopBtn.appendChild(makeIcon('M20 3H4a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1zM4 13h16V5H4v8zm0 0h16', 16));
  mobileBtn.appendChild(makeIcon('M12 18h.01M8 21h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z', 16));

  viewportToggle.appendChild(desktopBtn);
  viewportToggle.appendChild(mobileBtn);

  function syncViewportButtons(viewport: 'desktop' | 'mobile') {
    const activeClass = 'bg-white shadow-sm text-slate-900';
    const inactiveClass = 'text-slate-400';
    if (viewport === 'desktop') {
      desktopBtn.className = desktopBtn.className.replace(inactiveClass, activeClass);
      mobileBtn.className = mobileBtn.className.replace(activeClass, inactiveClass);
    } else {
      mobileBtn.className = mobileBtn.className.replace(inactiveClass, activeClass);
      desktopBtn.className = desktopBtn.className.replace(activeClass, inactiveClass);
    }
  }
  syncSchemeButtons('light');
  syncViewportButtons('desktop');

  desktopBtn.addEventListener('click', () => {
    store.update({ previewViewport: 'desktop' });
    syncViewportButtons('desktop');
  });
  mobileBtn.addEventListener('click', () => {
    store.update({ previewViewport: 'mobile' });
    syncViewportButtons('mobile');
  });

  const docsLink = document.createElement('a');
  docsLink.href = 'https://github.com/cocart-headless/cocart-js/blob/checkout/packages/checkout/docs/components.md';
  docsLink.target = '_blank';
  docsLink.rel = 'noopener noreferrer';
  docsLink.className = 'inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition';
  docsLink.textContent = 'Docs ↗';

  // ── Reset confirmation modal ────────────────────────────────────────────
  let onResetFn: (() => void) | null = null;

  const modalBackdrop = document.createElement('div');
  modalBackdrop.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm';
  modalBackdrop.style.display = 'none';

  const modalBox = document.createElement('div');
  modalBox.className = 'bg-white rounded-xl border border-slate-200 shadow-2xl w-80 p-6 flex flex-col gap-4';

  const modalTitle = document.createElement('p');
  modalTitle.className = 'text-sm font-semibold text-slate-900';
  modalTitle.textContent = 'Reset builder?';

  const modalBody = document.createElement('p');
  modalBody.className = 'text-xs text-slate-500 leading-relaxed';
  modalBody.textContent = 'This will restore all settings to their defaults. Your changes cannot be undone.';

  const modalActions = document.createElement('div');
  modalActions.className = 'flex justify-end gap-2';

  const modalCancel = document.createElement('button');
  modalCancel.type = 'button';
  modalCancel.textContent = 'Cancel';
  modalCancel.className = 'rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition';

  const modalConfirm = document.createElement('button');
  modalConfirm.type = 'button';
  modalConfirm.textContent = 'Reset';
  modalConfirm.className = 'rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition';

  modalActions.appendChild(modalCancel);
  modalActions.appendChild(modalConfirm);
  modalBox.appendChild(modalTitle);
  modalBox.appendChild(modalBody);
  modalBox.appendChild(modalActions);
  modalBackdrop.appendChild(modalBox);
  document.body.appendChild(modalBackdrop);

  function openModal() { modalBackdrop.style.display = 'flex'; }
  function closeModal() { modalBackdrop.style.display = 'none'; }

  modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) closeModal(); });
  modalCancel.addEventListener('click', closeModal);
  modalConfirm.addEventListener('click', () => { closeModal(); onResetFn?.(); });

  const implBtn = document.createElement('button');
  implBtn.type = 'button';
  implBtn.textContent = 'Implementation';
  implBtn.className = 'inline-flex items-center rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 transition';

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.textContent = 'Reset';
  resetBtn.className = 'inline-flex items-center rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 hover:text-red-700 transition';
  resetBtn.addEventListener('click', openModal);

  headerRight.appendChild(implBtn);
  headerRight.appendChild(resetBtn);
  headerRight.appendChild(schemeToggle);
  headerRight.appendChild(viewportToggle);
  headerRight.appendChild(docsLink);
  header.appendChild(brand);
  header.appendChild(headerRight);

  // ── Main area ───────────────────────────────────────────────────────────
  const main = document.createElement('div');
  main.className = 'flex flex-1 overflow-hidden min-h-0';

  // Builder panel
  const builderPanel = document.createElement('aside');
  builderPanel.className = 'flex flex-col w-[400px] shrink-0 border-r border-slate-200 bg-white overflow-hidden';

  // Tab bar
  const tabBar = document.createElement('div');
  tabBar.className = 'flex border-b border-slate-200 px-4 shrink-0';

  // Tab content
  const tabContent = document.createElement('div');
  tabContent.className = 'flex-1 overflow-y-auto scrollbar-thin p-4';

  builderPanel.appendChild(tabBar);
  builderPanel.appendChild(tabContent);

  // Preview pane
  const previewOuter = document.createElement('div');
  previewOuter.className = 'flex flex-1 flex-col overflow-hidden bg-slate-100';

  const previewLabel = document.createElement('div');
  previewLabel.className = 'flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-500 shrink-0';
  previewLabel.textContent = 'Live Preview';

  const previewScroll = document.createElement('div');
  previewScroll.className = 'flex-1 overflow-auto p-6';

  const previewContainer = document.createElement('div');
  previewContainer.id = 'preview-container';
  previewScroll.appendChild(previewContainer);

  previewOuter.appendChild(previewLabel);
  previewOuter.appendChild(previewScroll);

  main.appendChild(builderPanel);
  main.appendChild(previewOuter);

  // ── Code panel ──────────────────────────────────────────────────────────
  const codePanel = document.createElement('div');
  codePanel.className = 'border-t border-slate-200 bg-slate-950 shrink-0 max-h-80 overflow-hidden flex flex-col';

  const codeContainer = document.createElement('div');
  codeContainer.className = 'flex-1 overflow-auto';

  codePanel.appendChild(codeContainer);

  root.appendChild(header);
  root.appendChild(main);
  root.appendChild(codePanel);

  return { builderPanel, tabBar, tabContent, previewContainer, previewOuter, previewLabel, codeContainer, implBtn, setOnReset: (fn: () => void) => { onResetFn = fn; } };
}

function makeIcon(pathD: string, size: number): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathD);
  svg.appendChild(path);
  return svg;
}

export { makeIcon };
