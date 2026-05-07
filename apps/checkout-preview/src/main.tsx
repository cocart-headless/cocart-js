import './styles/app.css';
import './styles/preview-utils.css';
import { store } from './state.js';
import { buildLayout } from './ui/layout.js';
import { makeCopyButton } from './ui/copy-button.js';
import { renderDataTab } from './tabs/tab-data.js';
import { renderAppearanceTab } from './tabs/tab-appearance.js';
import { renderPaymentsTab } from './tabs/tab-payments.js';
import { PreviewPane } from './preview/PreviewPane.js';
import { generateCode, generateLLMPrompt, highlightCode } from './codegen/codegen.js';

const TABS: { id: 'data' | 'appearance' | 'payments'; label: string }[] = [
  { id: 'data',       label: 'Data' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'payments',   label: 'Payments' },
];

function main(): void {
  const appEl = document.getElementById('app');
  if (!appEl) throw new Error('Missing #app element');

  const { tabBar, tabContent, previewContainer, previewOuter, previewLabel, codeContainer } = buildLayout(appEl, store);

  // ── Tab bar ────────────────────────────────────────────────────────────
  const tabButtons = new Map<string, HTMLButtonElement>();

  TABS.forEach(tab => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset['tab'] = tab.id;
    btn.className = 'px-4 py-3 text-sm font-medium border-b-2 transition -mb-px';
    btn.textContent = tab.label;
    btn.addEventListener('click', () => store.update({ activeTab: tab.id }));
    tabBar.appendChild(btn);
    tabButtons.set(tab.id, btn);
  });

  function syncTabButtons(activeTab: string): void {
    tabButtons.forEach((btn, id) => {
      btn.className = id === activeTab
        ? 'px-4 py-3 text-sm font-medium border-b-2 border-violet-600 text-violet-600 transition -mb-px'
        : 'px-4 py-3 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-900 transition -mb-px';
    });
  }

  // Register tab content renderers
  renderDataTab(tabContent, store);
  renderAppearanceTab(tabContent, store);
  renderPaymentsTab(tabContent, store);

  // ── Preview pane ───────────────────────────────────────────────────────
  const preview = new PreviewPane(previewContainer);

  // ── Code panel ─────────────────────────────────────────────────────────
  let codeVisible = false;
  const codePanel = codeContainer.parentElement!;

  const codePanelHeader = document.createElement('div');
  codePanelHeader.className = 'flex items-center justify-between border-b border-slate-800 px-4 py-2 shrink-0';

  const headerLeft = document.createElement('div');
  headerLeft.className = 'flex items-center gap-3';

  const codePanelTitle = document.createElement('span');
  codePanelTitle.className = 'text-xs font-semibold text-slate-400 uppercase tracking-wider';
  codePanelTitle.textContent = 'Implementation';

  const toggleCodeBtn = document.createElement('button');
  toggleCodeBtn.type = 'button';
  toggleCodeBtn.className = 'inline-flex items-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-400 hover:border-slate-500 hover:text-slate-200 transition';
  toggleCodeBtn.textContent = 'Show Code';

  headerLeft.appendChild(codePanelTitle);
  headerLeft.appendChild(toggleCodeBtn);

  const codeBtnGroup = document.createElement('div');
  codeBtnGroup.className = 'flex items-center gap-2';

  const copyCodeBtn = makeCopyButton(
    'Copy Code',
    () => generateCode(store.get()),
    'bg-slate-700 text-slate-200 hover:bg-slate-600',
  );
  const copyLLMBtn = makeCopyButton(
    'Copy for LLM',
    () => generateLLMPrompt(store.get()),
    'bg-violet-700 text-violet-100 hover:bg-violet-600',
  );

  codeBtnGroup.appendChild(copyCodeBtn);
  codeBtnGroup.appendChild(copyLLMBtn);
  codePanelHeader.appendChild(headerLeft);
  codePanelHeader.appendChild(codeBtnGroup);

  const guideEl = buildGetStartedGuide();

  const codeHighlightContainer = document.createElement('div');
  codeHighlightContainer.className = 'overflow-auto border-t border-slate-800';
  codeHighlightContainer.style.display = 'none';

  codeContainer.appendChild(guideEl);
  codeContainer.appendChild(codeHighlightContainer);
  codePanel.insertBefore(codePanelHeader, codeContainer);

  toggleCodeBtn.addEventListener('click', () => {
    codeVisible = !codeVisible;
    codeHighlightContainer.style.display = codeVisible ? 'block' : 'none';
    toggleCodeBtn.textContent = codeVisible ? 'Hide Code' : 'Show Code';
    codePanel.style.maxHeight = codeVisible ? '340px' : '160px';
  });

  codePanel.style.maxHeight = '160px';

  // ── Reactive subscriptions ─────────────────────────────────────────────
  store.subscribe(state => {
    syncTabButtons(state.activeTab);
    preview.render(state);
    codeHighlightContainer.replaceChildren(highlightCode(generateCode(state)));

    // Apply dark mode and daisyUI theme to the whole preview area
    const isDark = state.colorScheme === 'dark'
      || (state.colorScheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const daisyTheme = state.themePreset === 'tailwind' ? state.daisyTheme : null;

    // Only set data-theme on the outer wrapper for daisyUI — shadcn manages its own data-theme on the inner wrapper
    if (state.themePreset === 'tailwind') {
      previewOuter.setAttribute('data-theme', daisyTheme ?? 'light');
    } else {
      previewOuter.removeAttribute('data-theme');
    }
    const previewBg = isDark ? 'bg-zinc-950' : (state.themePreset === 'shadcn' ? 'bg-white' : 'bg-slate-100');
    previewOuter.className = `flex flex-1 flex-col overflow-hidden transition-colors ${previewBg}`;
    previewLabel.className = `flex items-center justify-between border-b px-4 py-2 text-xs font-medium shrink-0 transition-colors ${
      isDark ? 'border-zinc-800 bg-zinc-900 text-zinc-400' : 'border-slate-200 bg-white text-slate-500'
    }`;
  });

  store.update({});
}

function buildGetStartedGuide(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'px-4 py-4';

  const title = document.createElement('p');
  title.className = 'text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3';
  title.textContent = 'Get Started';

  const steps: { num: string; text: string; code?: string }[] = [
    { num: '1', text: 'Install the checkout package',          code: 'npm install @cocartheadless/checkout' },
    { num: '2', text: 'Import and create the extension',       code: "import { createCheckout } from '@cocartheadless/checkout';" },
    { num: '3', text: 'Pass the extension to your CoCart client', code: 'const client = new CoCart(url).use(checkout);' },
    { num: '4', text: 'Use the checkout components to render your form' },
  ];

  const list = document.createElement('ol');
  list.className = 'grid grid-cols-2 gap-x-6 gap-y-2.5';

  steps.forEach(step => {
    const item = document.createElement('li');
    item.className = 'flex items-start gap-3 text-xs';

    const num = document.createElement('span');
    num.className = 'flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-700 text-white text-xs font-bold';
    num.textContent = step.num;

    const textWrap = document.createElement('div');
    textWrap.className = 'flex flex-col gap-1';

    const textEl = document.createElement('span');
    textEl.className = 'text-slate-300';
    textEl.textContent = step.text;
    textWrap.appendChild(textEl);

    if (step.code) {
      const codeEl = document.createElement('code');
      codeEl.className = 'font-mono text-slate-400 bg-slate-800 rounded px-1.5 py-0.5';
      codeEl.textContent = step.code;
      textWrap.appendChild(codeEl);
    }

    item.appendChild(num);
    item.appendChild(textWrap);
    list.appendChild(item);
  });

  el.appendChild(title);
  el.appendChild(list);
  return el;
}

main();
