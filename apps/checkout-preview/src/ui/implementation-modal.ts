import type { BuilderState } from '../state.js';
import { generateFullCode, generateMarkdownGuide, generateFullLLMPrompt, highlightCode } from '../codegen/codegen.js';
import { makeCopyButton } from './copy-button.js';
import { makeIcon } from './layout.js';

// clipboard icon path
const CLIPBOARD_PATH = 'M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2M8 4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2H8zM8 4v1h8V4';
const CHECK_PATH = 'M20 6 9 17 4 12';

function makeIconCopyButton(getText: () => string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.title = 'Copy code';
  btn.className = 'inline-flex items-center justify-center rounded-md w-7 h-7 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition';
  btn.appendChild(makeIcon(CLIPBOARD_PATH, 14));

  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(getText());
      btn.replaceChildren(makeIcon(CHECK_PATH, 14));
      btn.classList.add('text-emerald-400', 'copy-success');
      setTimeout(() => {
        btn.replaceChildren(makeIcon(CLIPBOARD_PATH, 14));
        btn.classList.remove('text-emerald-400', 'copy-success');
      }, 1800);
    } catch {
      // silent fail
    }
  });

  return btn;
}

function makeCodeBlock(snippet: string, filename?: string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'impl-code-block rounded-lg overflow-hidden border border-slate-800 mt-4';

  const topBar = document.createElement('div');
  topBar.className = 'flex items-center justify-between bg-slate-900 px-3 py-2 border-b border-slate-800';

  if (filename) {
    const fileLabel = document.createElement('span');
    fileLabel.className = 'text-xs text-slate-400 font-mono flex items-center gap-1.5';

    const tsIcon = document.createElement('span');
    tsIcon.className = 'inline-flex items-center justify-center w-4 h-4 rounded text-[10px] font-bold bg-blue-600 text-white shrink-0';
    tsIcon.textContent = filename.endsWith('.tsx') ? 'X' : 'TS';

    fileLabel.appendChild(tsIcon);
    fileLabel.appendChild(document.createTextNode(filename));
    topBar.appendChild(fileLabel);
  } else {
    topBar.appendChild(document.createElement('span'));
  }

  topBar.appendChild(makeIconCopyButton(() => snippet));

  const codeEl = highlightCode(snippet);
  codeEl.className = 'font-mono text-xs leading-relaxed p-4 text-slate-300 overflow-auto max-h-96';

  wrapper.appendChild(topBar);
  wrapper.appendChild(codeEl);
  return wrapper;
}

function makeInstallTabs(pkg: string): HTMLElement {
  const managers = ['npm', 'yarn', 'pnpm', 'bun'] as const;
  const commands: Record<string, string> = {
    npm:  `npm install ${pkg}`,
    yarn: `yarn add ${pkg}`,
    pnpm: `pnpm add ${pkg}`,
    bun:  `bun add ${pkg}`,
  };

  const wrapper = document.createElement('div');
  wrapper.className = 'impl-code-block rounded-lg overflow-hidden border border-slate-800 mt-4';

  const tabBar = document.createElement('div');
  tabBar.className = 'flex items-center bg-slate-900 border-b border-slate-800 px-3 pt-2 gap-1';

  const cmdDisplay = document.createElement('div');
  cmdDisplay.className = 'flex items-center justify-between bg-slate-900 px-4 py-3';

  const cmdText = document.createElement('code');
  cmdText.className = 'font-mono text-xs text-violet-300';

  let active = 'npm';
  cmdText.textContent = commands[active];

  const tabBtns = new Map<string, HTMLButtonElement>();

  managers.forEach(m => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = m;
    btn.className = 'px-3 py-1.5 text-xs font-medium rounded-t border-b-2 transition';
    btn.addEventListener('click', () => {
      active = m;
      cmdText.textContent = commands[m];
      tabBtns.forEach((b, id) => {
        b.className = `px-3 py-1.5 text-xs font-medium rounded-t border-b-2 transition ${id === active ? 'border-violet-500 text-violet-300' : 'border-transparent text-slate-500 hover:text-slate-300'}`;
      });
    });
    tabBtns.set(m, btn);
    tabBar.appendChild(btn);
  });

  tabBtns.forEach((b, id) => {
    b.className = `px-3 py-1.5 text-xs font-medium rounded-t border-b-2 transition ${id === active ? 'border-violet-500 text-violet-300' : 'border-transparent text-slate-500 hover:text-slate-300'}`;
  });

  cmdDisplay.appendChild(cmdText);
  cmdDisplay.appendChild(makeIconCopyButton(() => commands[active]));

  wrapper.appendChild(tabBar);
  wrapper.appendChild(cmdDisplay);
  return wrapper;
}

interface Step {
  num: number;
  title: string;
  prose: string[];
  build: () => HTMLElement[];
}

function renderStep(step: Step, isLast: boolean): HTMLElement {
  const row = document.createElement('div');
  row.className = 'impl-step flex gap-6';

  const left = document.createElement('div');
  left.className = 'flex flex-col items-center';

  const badge = document.createElement('div');
  badge.className = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-slate-200 text-sm font-bold';
  badge.textContent = String(step.num);
  left.appendChild(badge);

  if (!isLast) {
    const line = document.createElement('div');
    line.className = 'flex-1 w-px bg-slate-800 mt-2';
    left.appendChild(line);
  }

  const right = document.createElement('div');
  right.className = 'flex-1 pb-10';

  const heading = document.createElement('h2');
  heading.className = 'text-base font-semibold text-slate-100 mb-3';
  heading.textContent = step.title;
  right.appendChild(heading);

  step.prose.forEach(text => {
    const p = document.createElement('p');
    p.className = 'text-sm text-slate-400 leading-relaxed mb-2';
    p.textContent = text;
    right.appendChild(p);
  });

  step.build().forEach(el => right.appendChild(el));

  row.appendChild(left);
  row.appendChild(right);
  return row;
}

export function buildImplementationModal(): {
  open: (state: BuilderState) => void;
  update: (state: BuilderState) => void;
  close: () => void;
} {
  let currentState: BuilderState | null = null;
  let isOpen = false;

  const backdrop = document.createElement('div');
  backdrop.className = 'impl-modal-backdrop fixed inset-0 z-50 flex flex-col overflow-hidden';
  backdrop.style.display = 'none';

  const modalHeader = document.createElement('div');
  modalHeader.className = 'flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-3 shrink-0';

  const headerLeft = document.createElement('div');
  headerLeft.className = 'flex items-center gap-3';

  const modalTitle = document.createElement('span');
  modalTitle.className = 'text-sm font-semibold text-slate-100';
  modalTitle.textContent = 'Implementation';
  headerLeft.appendChild(modalTitle);

  const headerRight = document.createElement('div');
  headerRight.className = 'flex items-center gap-2';

  const mdBtn = makeCopyButton(
    'Copy Markdown',
    () => currentState ? generateMarkdownGuide(currentState) : '',
    'bg-slate-700 text-slate-200 hover:bg-slate-600',
  );
  const llmBtn = makeCopyButton(
    'Copy for LLM',
    () => currentState ? generateFullLLMPrompt(currentState) : '',
    'bg-violet-700 text-violet-100 hover:bg-violet-600',
  );

  headerRight.appendChild(mdBtn);
  headerRight.appendChild(llmBtn);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.title = 'Close';
  closeBtn.className = 'ml-2 inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', close);
  headerRight.appendChild(closeBtn);

  modalHeader.appendChild(headerLeft);
  modalHeader.appendChild(headerRight);

  const body = document.createElement('div');
  body.className = 'impl-modal-panel flex-1 overflow-y-auto bg-slate-950';

  const inner = document.createElement('div');
  inner.className = 'max-w-3xl mx-auto px-8 py-10';

  const pageTitle = document.createElement('h1');
  pageTitle.className = 'text-2xl font-bold text-slate-100 mb-2';
  pageTitle.textContent = 'Get started';

  const pageSubtitle = document.createElement('p');
  pageSubtitle.className = 'text-sm text-slate-400 mb-10';
  pageSubtitle.textContent = 'Install CoCart Checkout, configure your client, and wire the React components to your Next.js app.';

  const stepsContainer = document.createElement('div');

  inner.appendChild(pageTitle);
  inner.appendChild(pageSubtitle);
  inner.appendChild(stepsContainer);
  body.appendChild(inner);

  backdrop.appendChild(modalHeader);
  backdrop.appendChild(body);
  document.body.appendChild(backdrop);

  function rebuildSteps(state: BuilderState): void {
    const { clientTs, mappersTs, pageTsx } = generateFullCode(state);

    const steps: Step[] = [
      {
        num: 1,
        title: 'Install the package',
        prose: ['Add the CoCart SDK and checkout package to your project.'],
        build: () => [makeInstallTabs('@cocartheadless/sdk @cocartheadless/checkout')],
      },
      {
        num: 2,
        title: 'Set up the client',
        prose: [
          'Create a shared client module that your pages import.',
          'This wires your CoCart URL, gateway adapters, and checkout theme into a single instance.',
        ],
        build: () => [makeCodeBlock(clientTs, 'lib/checkout-client.ts')],
      },
      {
        num: 3,
        title: 'Add data mappers',
        prose: [
          'The CoCart API returns monetary values as integer minor units (e.g. 2000 = $20.00 USD).',
          'These helpers map API types to the shapes expected by the React components.',
        ],
        build: () => [makeCodeBlock(mappersTs, 'lib/checkout-mappers.ts')],
      },
      {
        num: 4,
        title: 'Build the checkout page',
        prose: [
          'A complete checkout page wiring live API data to the React components.',
          'Fetch order summary, shipping rates, and currency metadata on mount, then pass them as props.',
        ],
        build: () => [makeCodeBlock(pageTsx, 'app/checkout/page.tsx')],
      },
    ];

    stepsContainer.replaceChildren();
    steps.forEach((step, i) => {
      stepsContainer.appendChild(renderStep(step, i === steps.length - 1));
    });
  }

  function open(state: BuilderState): void {
    currentState = state;
    isOpen = true;
    rebuildSteps(state);
    backdrop.classList.remove('closing');
    backdrop.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function update(state: BuilderState): void {
    currentState = state;
    if (isOpen) rebuildSteps(state);
  }

  function close(): void {
    isOpen = false;
    backdrop.classList.add('closing');
    backdrop.addEventListener('animationend', () => {
      if (!isOpen) {
        backdrop.style.display = 'none';
        backdrop.classList.remove('closing');
        document.body.style.overflow = '';
      }
    }, { once: true });
  }

  return { open, update, close };
}
