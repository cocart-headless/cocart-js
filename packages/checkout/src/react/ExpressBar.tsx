import type { CheckoutTheme, CheckoutGatewayPresentation } from '../index.js';

interface ExpressBarProps {
  gateways: CheckoutGatewayPresentation[];
  theme: CheckoutTheme;
  expressOnly?: boolean;
}

export function ExpressBar({ gateways, theme, expressOnly = false }: ExpressBarProps) {
  if (gateways.length === 0) return null;

  return (
    <div className={expressOnly ? 'max-w-sm mx-auto' : (theme.sectionClassName ?? '')}>
      {expressOnly ? (
        <p className="mb-4 text-center text-xs text-(--cocart-color-text-muted)">
          Customer completes checkout via the wallet — no form fields required.
        </p>
      ) : (
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-(--cocart-color-text-muted)">
          Express Checkout
        </p>
      )}

      <div className={`${theme.expressCheckoutBarClassName ?? 'flex gap-2.5 flex-wrap'}${expressOnly ? ' justify-center' : ''}`}>
        {gateways.map(gw => (
          <div
            key={gw.id}
            className={`flex items-center justify-center gap-2 rounded-(--cocart-border-radius) border-2 border-dashed border-(--cocart-color-border) bg-(--cocart-color-surface) px-4 py-2.5 text-xs font-medium text-(--cocart-color-text-muted)${expressOnly ? ' min-w-40' : ' min-w-30'}`}
          >
            [ {gw.label} ]
          </div>
        ))}
      </div>

      {!expressOnly && (
        <div className="mt-2 flex items-center gap-3 text-xs text-(--cocart-color-text-muted)">
          <span className="flex-1 border-t border-(--cocart-color-border)" />
          <span>or</span>
          <span className="flex-1 border-t border-(--cocart-color-border)" />
        </div>
      )}
    </div>
  );
}
