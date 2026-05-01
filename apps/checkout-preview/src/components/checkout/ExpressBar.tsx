import type { CheckoutTheme } from '@cocartheadless/checkout';
import type { GatewayConfig } from '../../state.js';

interface ExpressBarProps {
  gateways: GatewayConfig[];
  theme: CheckoutTheme;
  expressOnly?: boolean;
}

export function ExpressBar({ gateways, theme, expressOnly = false }: ExpressBarProps) {
  if (gateways.length === 0) return null;

  return (
    <div className={expressOnly ? 'max-w-sm mx-auto' : (theme.sectionClassName ?? '')}>
      {expressOnly ? (
        <p className="mb-4 text-center text-xs text-slate-400">
          Customer completes checkout via the wallet — no form fields required.
        </p>
      ) : (
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Express Checkout
        </p>
      )}

      <div className={`${theme.expressCheckoutBarClassName ?? 'flex gap-3'}${expressOnly ? ' justify-center' : ''}`}>
        {gateways.map(gw => (
          <div
            key={gw.id}
            className={`flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-500${expressOnly ? ' min-w-[160px]' : ' min-w-[120px]'}`}
          >
            [ {gw.label} ]
          </div>
        ))}
      </div>

      {!expressOnly && (
        <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
          <span className="flex-1 border-t border-slate-200" />
          <span>or</span>
          <span className="flex-1 border-t border-slate-200" />
        </div>
      )}
    </div>
  );
}
