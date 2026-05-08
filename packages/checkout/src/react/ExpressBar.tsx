import type React from 'react';
import type { CheckoutTheme, CheckoutGatewayPresentation, CheckoutFormField } from '../index.js';
import { Sk } from './skeleton.js';

export interface ExpressFieldRenderContext {
  field: CheckoutFormField;
  gatewayId: string;
  gatewayLabel: string;
}

interface ExpressBarProps {
  gateways: CheckoutGatewayPresentation[];
  theme: CheckoutTheme;
  expressOnly?: boolean;
  loading?: boolean;
  /**
   * Fields from `getExpressFields()` that have `type: 'gateway-element'` are passed here
   * instead of rendering a placeholder. Mount the provider's express button (e.g.
   * Stripe `ExpressCheckoutElement`) inside this render prop.
   *
   * ```tsx
   * <ExpressBar
   *   gateways={expressGateways}
   *   theme={theme}
   *   renderExpressField={({ field, gatewayId }) =>
   *     field.component === 'StripeExpressCheckoutElement' ? (
   *       <div id="stripe-express-checkout-element" />
   *     ) : null
   *   }
   * />
   * ```
   */
  renderExpressField?: (ctx: ExpressFieldRenderContext) => React.ReactNode;
  /** Express bar fields from `client.checkout.createExpressCheckoutBar()`. When provided, gateway-element fields are rendered via `renderExpressField`. */
  expressFields?: Array<{ id: string; label: string; fields: CheckoutFormField[] }>;
}

const btnBase: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: '6px', width: '100%', height: '40px',
  border: 'none', cursor: 'default', userSelect: 'none', pointerEvents: 'none',
  fontFamily: 'inherit', fontSize: '15px', fontWeight: 500,
};

// Google G mark SVG (18×18)
const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
  </svg>
);

// Apple  mark SVG (15×18) — clean simplified path
const AppleMark = () => (
  <svg width="15" height="18" viewBox="0 0 15 18" fill="white" aria-hidden="true">
    <path d="M14.04 13.29c-.28.65-.42.94-.78 1.52-.51.77-1.22 1.73-2.11 1.74-.79.01-1-.51-2.07-.51-1.07 0-1.31.52-2.1.52-.89 0-1.56-.88-2.07-1.66C3.26 12.7 3 9.76 4.06 8.17c.74-1.13 1.91-1.79 3.01-1.79 1.12 0 1.83.52 2.75.52.9 0 1.44-.52 2.73-.52 1 0 2.06.55 2.79 1.49-2.45 1.34-2.05 4.82.7 5.42zM9.99 4.75C10.49 4.1 10.87 3.19 10.74 2.25c-.85.06-1.84.6-2.42 1.28-.53.62-.95 1.54-.79 2.44.93.03 1.89-.52 2.46-1.22z"/>
  </svg>
);

const BtnGooglePay = () => (
  <div style={{ ...btnBase, background: '#000', borderRadius: '4px', color: 'white', letterSpacing: '0.25px' }} role="img" aria-label="Google Pay">
    <GoogleG />
    <span style={{ fontFamily: "'Google Sans', Roboto, Arial, sans-serif", fontSize: '14px', fontWeight: 500 }}>Pay</span>
  </div>
);

const BtnApplePay = () => (
  <div style={{ ...btnBase, background: '#000', borderRadius: '4px', color: 'white' }} role="img" aria-label="Apple Pay">
    <AppleMark />
    <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif", fontSize: '15px', fontWeight: 500, letterSpacing: '0.3px' }}>Pay</span>
  </div>
);

const BtnPayPal = () => (
  <div style={{ ...btnBase, background: '#FFC439', borderRadius: '4px' }} role="img" aria-label="PayPal">
    {/* PayPal logo SVG — wordmark paths on transparent bg, sized to fit */}
    <svg width="88" height="29" viewBox="14 26 92 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M76.2315 34.67C75.8559 37.1343 73.9727 37.1343 72.1505 37.1343H71.1141L71.8414 32.5332C71.8848 32.2553 72.1248 32.0508 72.4065 32.0508H72.8822C74.1224 32.0508 75.2934 32.0508 75.8975 32.7563C76.2589 33.1785 76.3679 33.8052 76.2315 34.67ZM75.4387 28.2401H68.5683C68.0979 28.2401 67.6984 28.5818 67.6249 29.0456L64.847 46.6499C64.7921 46.9969 65.0613 47.3112 65.4121 47.3112H68.9377C69.2663 47.3112 69.5462 47.0722 69.5976 46.7482L70.386 41.7567C70.4586 41.2929 70.859 40.9512 71.3285 40.9512H73.5023C78.0279 40.9512 80.6402 38.7631 81.3223 34.4248C81.6297 32.5288 81.3347 31.0382 80.4462 29.9945C79.4692 28.8474 77.7374 28.2401 75.4387 28.2401Z" fill="#009CDE"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M27.2281 34.67C26.8525 37.1343 24.9693 37.1343 23.1471 37.1343H22.1107L22.838 32.5332C22.8814 32.2553 23.1214 32.0508 23.4031 32.0508H23.8788C25.119 32.0508 26.29 32.0508 26.8941 32.7563C27.2556 33.1785 27.3645 33.8052 27.2281 34.67ZM26.4353 28.2401H19.5649C19.0945 28.2401 18.695 28.5818 18.6215 29.0456L15.8436 46.6499C15.7887 46.9969 16.0571 47.3112 16.4087 47.3112H19.6898C20.1593 47.3112 20.5588 46.9695 20.6323 46.5065L21.3826 41.7567C21.4552 41.2929 21.8556 40.9512 22.3251 40.9512H24.4989C29.0245 40.9512 31.6368 38.7631 32.3189 34.4248C32.6263 32.5288 32.3313 31.0382 31.4428 29.9945C30.4658 28.8474 28.734 28.2401 26.4353 28.2401Z" fill="#003087"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M42.3858 40.9899C42.0678 42.8683 40.5761 44.1296 38.6724 44.1296C37.7184 44.1296 36.954 43.8225 36.4632 43.2418C35.9769 42.6665 35.7935 41.8459 35.9477 40.9333C36.2435 39.0709 37.7601 37.7697 39.6344 37.7697C40.569 37.7697 41.3272 38.0795 41.8277 38.6655C42.3317 39.2559 42.5302 40.0809 42.3858 40.9899ZM46.9708 34.591H43.6808C43.3992 34.591 43.1591 34.7955 43.1148 35.0743L42.9704 35.9931L42.741 35.6603C42.0279 34.6273 40.4396 34.2812 38.854 34.2812C35.2195 34.2812 32.1147 37.0341 31.5106 40.8943C31.1961 42.8205 31.6426 44.6607 32.7357 45.9451C33.7393 47.1251 35.1717 47.6163 36.8787 47.6163C39.8089 47.6163 41.4335 45.7362 41.4335 45.7362L41.2865 46.6497C41.2316 46.9967 41.5 47.311 41.8525 47.311H44.8147C45.2851 47.311 45.6846 46.9702 45.7581 46.5063L47.5368 35.2523C47.5917 34.9053 47.3224 34.591 46.9708 34.591Z" fill="#003087"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M91.3887 40.9899C91.0707 42.8683 89.579 44.1296 87.6754 44.1296C86.7213 44.1296 85.9569 43.8225 85.4661 43.2418C84.9789 42.6665 84.7965 41.8459 84.9506 40.9333C85.2465 39.0709 86.763 37.7697 88.6374 37.7697C89.5719 37.7697 90.3302 38.0795 90.8306 38.6655C91.3347 39.2559 91.5331 40.0809 91.3887 40.9899ZM95.9737 34.591H92.6838C92.4021 34.591 92.162 34.7955 92.1177 35.0743L91.9734 35.9931L91.743 35.6603C91.0308 34.6273 89.4426 34.2812 87.857 34.2812C84.2225 34.2812 81.1177 37.0341 80.5135 40.8943C80.1991 42.8205 80.6455 44.6607 81.7386 45.9451C82.7423 47.1251 84.1746 47.6163 85.8816 47.6163C88.8119 47.6163 90.4365 45.7362 90.4365 45.7362L90.2894 46.6497C90.2345 46.9967 90.5029 47.311 90.8555 47.311H93.8176C94.288 47.311 94.6875 46.9702 94.761 46.5063L96.5397 35.2523C96.5947 34.9053 96.3254 34.591 95.9737 34.591Z" fill="#009CDE"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M64.4927 34.5911H61.186C60.8697 34.5911 60.5739 34.7478 60.3967 35.0098L55.8347 41.7229L53.9019 35.2718C53.7805 34.8682 53.4085 34.5911 52.9868 34.5911H49.7368C49.3444 34.5911 49.068 34.977 49.1947 35.3479L52.8354 46.0284L49.4108 50.857C49.1424 51.2359 49.4135 51.7599 49.8785 51.7599H53.1817C53.4944 51.7599 53.7876 51.6068 53.9665 51.3501L64.9631 35.4896C65.2262 35.1098 64.9551 34.5911 64.4927 34.5911Z" fill="#003087"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M99.8516 28.7239L97.0321 46.6504C96.9771 46.9973 97.2455 47.3116 97.5972 47.3116H100.434C100.903 47.3116 101.303 46.9699 101.376 46.5061L104.157 28.9018C104.212 28.5548 103.943 28.2406 103.591 28.2406H100.418C100.135 28.2406 99.895 28.445 99.8516 28.7239Z" fill="#009CDE"/>
    </svg>
  </div>
);

// Map gateway id/provider to which placeholder button components to show
function getExpressPlaceholders(gw: CheckoutGatewayPresentation): Array<() => React.ReactElement> {
  const id = gw.id.toLowerCase();
  const provider = gw.provider.toLowerCase();

  if (id.includes('stripe') || provider.includes('stripe')) {
    // Stripe ExpressCheckoutElement renders Google Pay + Apple Pay + Link
    return [BtnGooglePay, BtnApplePay, BtnPayPal];
  }
  if (id.includes('paypal') || provider.includes('paypal')) {
    return [BtnPayPal];
  }
  return [];
}

export function ExpressBar({ gateways, theme, expressOnly = false, loading = false, renderExpressField, expressFields }: ExpressBarProps) {
  if (loading) {
    return (
      <div className={expressOnly ? 'max-w-sm mx-auto' : (theme.sectionClassName ?? '')}>
        <Sk className="mb-2 h-3 w-24" />
        <div className="flex gap-2.5">
          <Sk className={`h-10 flex-1${expressOnly ? ' min-w-40' : ' min-w-30'}`} />
          <Sk className={`h-10 flex-1${expressOnly ? ' min-w-40' : ' min-w-30'}`} />
        </div>
        {!expressOnly && <Sk className="mt-2 h-px w-full" />}
      </div>
    );
  }

  if (gateways.length === 0) return null;

  const fieldsByGateway = new Map<string, CheckoutFormField[]>();
  if (expressFields) {
    for (const gw of expressFields) {
      fieldsByGateway.set(gw.id, gw.fields);
    }
  }

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

      <fieldset className="border-0 p-0 m-0">
        <legend className="sr-only">Express checkout</legend>
      <div className={`${theme.expressCheckoutBarClassName ?? 'flex gap-2.5 flex-wrap'}${expressOnly ? ' justify-center' : ''}`}>
        {gateways.map(gw => {
          const gwFields = fieldsByGateway.get(gw.id) ?? [];
          const gatewayElementFields = gwFields.filter(f => f.type === 'gateway-element');

          // Real renderer provided — render actual gateway element(s)
          if (gatewayElementFields.length > 0 && renderExpressField) {
            return (
              <div key={gw.id} className={`flex-1${expressOnly ? ' min-w-40' : ' min-w-30'}`}>
                {gatewayElementFields.map(field =>
                  renderExpressField({ field, gatewayId: gw.id, gatewayLabel: gw.label })
                )}
              </div>
            );
          }

          // Placeholder mode — render realistic-looking brand buttons
          const placeholders = getExpressPlaceholders(gw);
          if (placeholders.length > 0) {
            return (
              <div key={gw.id} className={`flex gap-2 flex-1${expressOnly ? ' justify-center' : ''}`}>
                {placeholders.map((Btn, i) => (
                  <div key={i} className="flex-1 min-w-24 opacity-90 pointer-events-none"><Btn /></div>
                ))}
              </div>
            );
          }

          // Generic fallback for unknown gateways
          return (
            <div
              key={gw.id}
              aria-label={`Pay with ${gw.label}`}
              className={`flex items-center justify-center gap-2 rounded-(--cocart-border-radius) border-2 border-dashed border-(--cocart-color-border) bg-(--cocart-color-surface) px-4 py-2.5 text-xs font-medium text-(--cocart-color-text-muted)${expressOnly ? ' min-w-40' : ' min-w-30'}`}
            >
              [ {gw.label} ]
            </div>
          );
        })}
      </div>
      </fieldset>

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
