interface TopBarProps {
  storeName?: string;
  logoUrl?: string;
  bgColor?: string;
  cartCount?: number;
}

export function TopBar({ storeName = 'CoCart Checkout', logoUrl, bgColor = '#000000', cartCount }: TopBarProps) {
  const textColor = isLightColor(bgColor) ? '#000000' : '#ffffff';

  return (
    <header className="h-14 shrink-0" style={{ backgroundColor: bgColor }}>
      <div className="mx-auto max-w-5xl h-full flex items-center justify-between px-6" style={{ color: textColor }}>
        <div className="flex items-center gap-3 min-w-0">
          {logoUrl ? (
            <img src={logoUrl} alt={storeName} className="h-8 w-auto object-contain shrink-0" />
          ) : (
            <span className="text-sm font-semibold tracking-wide truncate">{storeName}</span>
          )}
        </div>
        <button
          type="button"
          aria-label={`Cart, ${cartCount ?? 0} items`}
          className="relative p-2 rounded shrink-0"
          style={{ color: textColor }}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          {cartCount ? (
            <span
              className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full text-[10px] font-bold flex items-center justify-center leading-none"
              style={{ backgroundColor: textColor, color: bgColor }}
            >
              {cartCount}
            </span>
          ) : null}
        </button>
      </div>
    </header>
  );
}

function isLightColor(hex: string): boolean {
  const h = hex.replace('#', '');
  if (h.length < 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // Perceived luminance
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}
