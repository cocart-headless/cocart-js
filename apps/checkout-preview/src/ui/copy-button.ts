const COPY_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
const CHECK_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

function buildButtonContent(icon: string, text: string): DocumentFragment {
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(icon, 'image/svg+xml');
  const svgEl = svgDoc.documentElement;
  const frag = document.createDocumentFragment();
  frag.appendChild(document.adoptNode(svgEl));
  const span = document.createElement('span');
  span.textContent = text;
  frag.appendChild(span);
  return frag;
}

export function makeCopyButton(label: string, getText: () => string, extraClass = ''): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${extraClass}`;
  btn.appendChild(buildButtonContent(COPY_ICON, label));

  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(getText());
      btn.replaceChildren(buildButtonContent(CHECK_ICON, 'Copied!'));
      btn.classList.add('copy-success');
      setTimeout(() => {
        btn.replaceChildren(buildButtonContent(COPY_ICON, label));
        btn.classList.remove('copy-success');
      }, 1800);
    } catch {
      // clipboard access denied — silent fail
    }
  });

  return btn;
}
