import type { StateStore } from '../state-types.js';

export interface LayoutParts {
  builderPanel: HTMLElement;
  tabBar: HTMLElement;
  tabContent: HTMLElement;
  previewContainer: HTMLElement;
  codeContainer: HTMLElement;
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
  docsLink.href = 'https://cocart.io/docs/checkout';
  docsLink.target = '_blank';
  docsLink.rel = 'noopener noreferrer';
  docsLink.className = 'inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition';
  docsLink.textContent = 'Docs ↗';

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

  return { builderPanel, tabBar, tabContent, previewContainer, codeContainer };
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
