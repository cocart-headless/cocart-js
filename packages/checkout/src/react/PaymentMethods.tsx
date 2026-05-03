import { useState, useRef, useEffect } from 'react';
import type { CheckoutFormSection, CheckoutTheme, CheckoutGatewayPresentation } from '../index.js';
import { Address } from './Address.js';
import { Sk } from './skeleton.js';

// Card brand SVG icons — sourced from github.com/datatrans/payment-logos (CC-BY-SA-4.0)
const Icons = {
  visa: (
    <svg width="38" height="24" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Visa">
      <rect width="120" height="80" rx="4" fill="white"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M86.6666 44.9375L90.3239 35.0625L92.3809 44.9375H86.6666ZM100.952 52.8375L95.8086 27.1625H88.7383C86.3525 27.1625 85.7723 29.0759 85.7723 29.0759L76.1904 52.8375H82.8868L84.2269 49.0244H92.3947L93.1479 52.8375H100.952Z" fill="#1434CB"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M77.1866 33.5711L78.0952 28.244C78.0952 28.244 75.2896 27.1625 72.3648 27.1625C69.2031 27.1625 61.6955 28.5638 61.6955 35.3738C61.6955 41.7825 70.5071 41.8621 70.5071 45.2266C70.5071 48.5912 62.6034 47.9901 59.9955 45.8676L59.0476 51.4362C59.0476 51.4362 61.8919 52.8375 66.2397 52.8375C70.5869 52.8375 77.1467 50.5544 77.1467 44.3455C77.1467 37.8964 68.2552 37.296 68.2552 34.4921C68.2552 31.6882 74.4602 32.0484 77.1866 33.5711Z" fill="#1434CB"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M54.6517 52.8375H47.6191L52.0144 27.1625H59.0477L54.6517 52.8375Z" fill="#1434CB"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M42.3113 27.1625L35.9217 44.8213L35.1663 41.0185L32.9114 29.4749C32.9114 29.4749 32.6394 27.1625 29.7324 27.1625H19.1709L19.0476 27.5966C19.0476 27.5966 22.2782 28.2669 26.057 30.5326L31.8793 52.8375H38.8617L49.5238 27.1625H42.3113Z" fill="#1434CB"/>
    </svg>
  ),
  mastercard: (
    <svg width="38" height="24" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mastercard">
      <rect width="120" height="80" rx="4" fill="white"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M49.6521 58.595H70.3479V21.4044H49.6521V58.595Z" fill="#FF5F00"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M98.2675 40.0003C98.2675 53.063 87.6791 63.652 74.6171 63.652C69.0996 63.652 64.0229 61.7624 60 58.5956C65.5011 54.2646 69.0339 47.5448 69.0339 40.0003C69.0339 32.4552 65.5011 25.7354 60 21.4044C64.0229 18.2376 69.0996 16.348 74.6171 16.348C87.6791 16.348 98.2675 26.937 98.2675 40.0003Z" fill="#F79E1B"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M50.966 40.0003C50.966 32.4552 54.4988 25.7354 59.9999 21.4044C55.977 18.2376 50.9003 16.348 45.3828 16.348C32.3208 16.348 21.7324 26.937 21.7324 40.0003C21.7324 53.063 32.3208 63.652 45.3828 63.652C50.9003 63.652 55.977 61.7624 59.9999 58.5956C54.4988 54.2646 50.966 47.5448 50.966 40.0003Z" fill="#EB001B"/>
    </svg>
  ),
  amex: (
    <svg width="38" height="24" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="American Express">
      <rect x="40" width="80" height="80" rx="4" fill="#fff" fillRule="evenodd"/>
      <path d="m120 76v-8.6763h-9.651l-4.969-5.4944-4.994 5.4944h-31.822v-25.607h-10.27l12.74-28.831h12.286l4.3857 9.877v-9.877h15.208l2.64 7.4429 2.658-7.4429h11.789v-8.8854c0-2.2091-1.7909-4-4-4h-112c-2.2091 4.4409e-16 -4 1.7909-4 4v72c4.4409e-16 2.2091 1.7909 4 4 4h112c2.2091 0 4-1.7909 4-4zm-8.026-11.882h8.026l-10.616-11.258 10.616-11.13h-7.898l-6.556 7.1645-6.4935-7.1645h-8.0275l10.554 11.194-10.554 11.194h7.8041l6.5889-7.2283 6.556 7.2283zm1.878-11.249 6.148 6.5406v-13.027l-6.148 6.4861zm-35.78 6.0675v-3.4864h12.633v-5.0534h-12.633v-3.4859h12.953l5e-4 -5.1815h-19.062v22.388h19.062l-5e-4 -5.1813h-12.953zm35.883-20.456h6.045v-22.388h-9.403l-5.022 13.944-4.989-13.944h-9.5631v22.388h6.0446v-15.672l5.7575 15.672h5.373l5.757-15.704v15.704zm-29.809 0h6.8765l-9.8824-22.388h-7.8682l-9.8833 22.388h6.7166l1.8554-4.4776h10.298l1.887 4.4776zm-3.9976-9.4992h-6.0773l3.0387-7.3242 3.0386 7.3242z" fill="#0690FF"/>
    </svg>
  ),
  paypal: (
    <svg width="38" height="24" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="PayPal">
      <rect width="120" height="80" rx="4" fill="white"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M76.2315 34.67C75.8559 37.1343 73.9727 37.1343 72.1505 37.1343H71.1141L71.8414 32.5332C71.8848 32.2553 72.1248 32.0508 72.4065 32.0508H72.8822C74.1224 32.0508 75.2934 32.0508 75.8975 32.7563C76.2589 33.1785 76.3679 33.8052 76.2315 34.67ZM75.4387 28.2401H68.5683C68.0979 28.2401 67.6984 28.5818 67.6249 29.0456L64.847 46.6499C64.7921 46.9969 65.0613 47.3112 65.4121 47.3112H68.9377C69.2663 47.3112 69.5462 47.0722 69.5976 46.7482L70.386 41.7567C70.4586 41.2929 70.859 40.9512 71.3285 40.9512H73.5023C78.0279 40.9512 80.6402 38.7631 81.3223 34.4248C81.6297 32.5288 81.3347 31.0382 80.4462 29.9945C79.4692 28.8474 77.7374 28.2401 75.4387 28.2401Z" fill="#009CDE"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M27.2281 34.67C26.8525 37.1343 24.9693 37.1343 23.1471 37.1343H22.1107L22.838 32.5332C22.8814 32.2553 23.1214 32.0508 23.4031 32.0508H23.8788C25.119 32.0508 26.29 32.0508 26.8941 32.7563C27.2556 33.1785 27.3645 33.8052 27.2281 34.67ZM26.4353 28.2401H19.5649C19.0945 28.2401 18.695 28.5818 18.6215 29.0456L15.8436 46.6499C15.7887 46.9969 16.0571 47.3112 16.4087 47.3112H19.6898C20.1593 47.3112 20.5588 46.9695 20.6323 46.5065L21.3826 41.7567C21.4552 41.2929 21.8556 40.9512 22.3251 40.9512H24.4989C29.0245 40.9512 31.6368 38.7631 32.3189 34.4248C32.6263 32.5288 32.3313 31.0382 31.4428 29.9945C30.4658 28.8474 28.734 28.2401 26.4353 28.2401Z" fill="#003087"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M42.3858 40.9899C42.0678 42.8683 40.5761 44.1296 38.6724 44.1296C37.7184 44.1296 36.954 43.8225 36.4632 43.2418C35.9769 42.6665 35.7935 41.8459 35.9477 40.9333C36.2435 39.0709 37.7601 37.7697 39.6344 37.7697C40.569 37.7697 41.3272 38.0795 41.8277 38.6655C42.3317 39.2559 42.5302 40.0809 42.3858 40.9899ZM46.9708 34.591H43.6808C43.3992 34.591 43.1591 34.7955 43.1148 35.0743L42.9704 35.9931L42.741 35.6603C42.0279 34.6273 40.4396 34.2812 38.854 34.2812C35.2195 34.2812 32.1147 37.0341 31.5106 40.8943C31.1961 42.8205 31.6426 44.6607 32.7357 45.9451C33.7393 47.1251 35.1717 47.6163 36.8787 47.6163C39.8089 47.6163 41.4335 45.7362 41.4335 45.7362L41.2865 46.6497C41.2316 46.9967 41.5 47.311 41.8525 47.311H44.8147C45.2851 47.311 45.6846 46.9702 45.7581 46.5063L47.5368 35.2523C47.5917 34.9053 47.3224 34.591 46.9708 34.591Z" fill="#003087"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M91.3887 40.9899C91.0707 42.8683 89.579 44.1296 87.6754 44.1296C86.7213 44.1296 85.9569 43.8225 85.4661 43.2418C84.9789 42.6665 84.7965 41.8459 84.9506 40.9333C85.2465 39.0709 86.763 37.7697 88.6374 37.7697C89.5719 37.7697 90.3302 38.0795 90.8306 38.6655C91.3347 39.2559 91.5331 40.0809 91.3887 40.9899ZM95.9737 34.591H92.6838C92.4021 34.591 92.162 34.7955 92.1177 35.0743L91.9734 35.9931L91.743 35.6603C91.0308 34.6273 89.4426 34.2812 87.857 34.2812C84.2225 34.2812 81.1177 37.0341 80.5135 40.8943C80.1991 42.8205 80.6455 44.6607 81.7386 45.9451C82.7423 47.1251 84.1746 47.6163 85.8816 47.6163C88.8119 47.6163 90.4365 45.7362 90.4365 45.7362L90.2894 46.6497C90.2345 46.9967 90.5029 47.311 90.8555 47.311H93.8176C94.288 47.311 94.6875 46.9702 94.761 46.5063L96.5397 35.2523C96.5947 34.9053 96.3254 34.591 95.9737 34.591Z" fill="#009CDE"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M64.4927 34.5911H61.186C60.8697 34.5911 60.5739 34.7478 60.3967 35.0098L55.8347 41.7229L53.9019 35.2718C53.7805 34.8682 53.4085 34.5911 52.9868 34.5911H49.7368C49.3444 34.5911 49.068 34.977 49.1947 35.3479L52.8354 46.0284L49.4108 50.857C49.1424 51.2359 49.4135 51.7599 49.8785 51.7599H53.1817C53.4944 51.7599 53.7876 51.6068 53.9665 51.3501L64.9631 35.4896C65.2262 35.1098 64.9551 34.5911 64.4927 34.5911Z" fill="#003087"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M99.8516 28.7239L97.0321 46.6504C96.9771 46.9973 97.2455 47.3116 97.5972 47.3116H100.434C100.903 47.3116 101.303 46.9699 101.376 46.5061L104.157 28.9018C104.212 28.5548 103.943 28.2406 103.591 28.2406H100.418C100.135 28.2406 99.895 28.445 99.8516 28.7239Z" fill="#009CDE"/>
    </svg>
  ),
  card: (
    <svg width="38" height="24" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Credit card">
      <rect width="120" height="80" rx="4" fill="#E2E8F0"/>
      <rect x="12" y="22" width="96" height="14" rx="3" fill="#94A3B8"/>
      <rect x="12" y="46" width="26" height="10" rx="3" fill="#94A3B8"/>
      <rect x="44" y="46" width="18" height="10" rx="3" fill="#94A3B8"/>
    </svg>
  ),
  bank: (
    <svg width="38" height="24" viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Bank transfer">
      <rect width="38" height="24" rx="4" fill="#F8FAFC"/>
      <path d="M19 5L29 10H9L19 5Z" stroke="#64748B" strokeWidth="1.2" strokeLinejoin="round" fill="#E2E8F0"/>
      <rect x="11" y="11" width="2.5" height="7" rx="0.5" fill="#64748B"/>
      <rect x="15" y="11" width="2.5" height="7" rx="0.5" fill="#64748B"/>
      <rect x="19" y="11" width="2.5" height="7" rx="0.5" fill="#64748B"/>
      <rect x="23" y="11" width="2.5" height="7" rx="0.5" fill="#64748B"/>
      <rect x="9" y="18.5" width="20" height="1.5" rx="0.5" fill="#64748B"/>
    </svg>
  ),
  cheque: (
    <svg width="38" height="24" viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cheque">
      <rect width="38" height="24" rx="4" fill="#F8FAFC"/>
      <rect x="5" y="6" width="28" height="12" rx="2" stroke="#64748B" strokeWidth="1.2" fill="none"/>
      <rect x="8" y="9.5" width="8" height="1.5" rx="0.5" fill="#64748B"/>
      <rect x="8" y="12.5" width="14" height="1" rx="0.5" fill="#94A3B8"/>
      <rect x="8" y="14.5" width="10" height="1" rx="0.5" fill="#94A3B8"/>
      <rect x="25" y="8.5" width="5" height="4" rx="1" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="0.8"/>
    </svg>
  ),
  cod: (
    <svg width="38" height="24" viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cash on delivery">
      <rect width="38" height="24" rx="4" fill="#F8FAFC"/>
      <rect x="5" y="8" width="20" height="12" rx="2" stroke="#64748B" strokeWidth="1.2" fill="none"/>
      <circle cx="15" cy="14" r="3" stroke="#64748B" strokeWidth="1.2" fill="none"/>
      <circle cx="15" cy="14" r="1" fill="#64748B"/>
      <path d="M27 6c2 0 6 1.5 6 6s-4 6-6 6" stroke="#64748B" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
      <path d="M27 9.5c1 0 3 0.8 3 2.5s-2 2.5-3 2.5" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" fill="none"/>
    </svg>
  ),
};

type IconKey = keyof typeof Icons;

function gatewayIcons(gw: CheckoutGatewayPresentation): IconKey[] {
  const id = gw.id.toLowerCase();
  const provider = gw.provider.toLowerCase();

  if (id.includes('paypal') || provider.includes('paypal')) return ['paypal'];
  if (id.includes('stripe') || provider.includes('stripe')) return ['visa', 'mastercard', 'amex'];
  if (id.includes('square') || provider.includes('square')) return ['visa', 'mastercard', 'amex'];
  if (id.includes('braintree') || provider.includes('braintree')) return ['visa', 'mastercard', 'amex', 'paypal'];
  if (id.includes('visa')) return ['visa'];
  if (id.includes('mastercard')) return ['mastercard'];
  if (id.includes('amex') || id.includes('american')) return ['amex'];
  if (id.includes('bacs') || id.includes('bank')) return ['bank'];
  if (id.includes('cheque') || id.includes('check')) return ['cheque'];
  if (id.includes('cod') || id.includes('delivery') || id.includes('cash')) return ['cod'];
  if (gw.supports.includes('offline')) return ['bank'];
  return ['card'];
}

interface PaymentMethodsProps {
  gateways: CheckoutGatewayPresentation[];
  activeGatewayId?: string;
  theme: CheckoutTheme;
  paymentSection?: CheckoutFormSection;
  billingSection?: CheckoutFormSection;
  showBillingUnderPayment?: boolean;
  loading?: boolean;
  layout?: 'radio' | 'tabs' | 'accordion';
}

interface LayoutProps {
  gateways: CheckoutGatewayPresentation[];
  activeId: string;
  onSelect: (id: string) => void;
  paymentSection?: CheckoutFormSection;
  helperClass: string;
  paymentContainerClass: string;
}

function PaymentFields({ fields, helperClass, paymentContainerClass }: { fields: CheckoutFormSection['fields']; helperClass: string; paymentContainerClass: string }) {
  const visible = fields.filter(f => !f.hidden);
  if (visible.length === 0) return null;
  return (
    <div className={paymentContainerClass}>
      {visible.map(field => (
        <div key={field.name} className="flex items-center justify-center min-h-16">
          <span className={helperClass}>[{field.label}]</span>
        </div>
      ))}
    </div>
  );
}

function RadioLayout({ gateways, activeId, onSelect, paymentSection, helperClass, paymentContainerClass }: LayoutProps) {
  return (
    <div className="mb-4 rounded-(--cocart-border-radius) border border-(--cocart-color-border) overflow-hidden">
      {gateways.map((gw, i) => {
        const icons = gatewayIcons(gw);
        const selected = gw.id === activeId;
        return (
          <div key={gw.id} className={i > 0 ? 'border-t border-(--cocart-color-border)' : ''}>
            <label className={`flex items-start gap-3 px-4 py-3.5 text-sm cursor-pointer transition ${selected ? 'bg-(--cocart-color-background-hover)' : 'bg-(--cocart-color-surface) hover:bg-(--cocart-color-background-hover)'}`}>
              <input type="radio" name="payment_method" value={gw.id} checked={selected} onChange={() => onSelect(gw.id)} className="h-4 w-4 mt-0.5 shrink-0 accent-(--cocart-color-primary)" />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-medium text-(--cocart-color-text)">{gw.label}</span>
                {selected && gw.description && <span className={helperClass}>{gw.description}</span>}
              </div>
              {icons.length > 0 && (
                <span className="flex items-center gap-1 shrink-0">
                  {icons.map(key => <span key={key}>{Icons[key]}</span>)}
                </span>
              )}
            </label>
            {selected && !gw.supports.includes('offline') && paymentSection && (
              <div className="border-t border-(--cocart-color-border) px-4 py-4">
                <PaymentFields fields={paymentSection.fields} helperClass={helperClass} paymentContainerClass={paymentContainerClass} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TabsLayout({ gateways, activeId, onSelect, paymentSection, helperClass, paymentContainerClass }: LayoutProps) {
  const activeGw = gateways.find(g => g.id === activeId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ dragging: false, startX: 0, scrollLeft: 0, moved: false });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function onMouseMove(e: MouseEvent) {
      const d = dragRef.current;
      if (!d.dragging) return;
      e.preventDefault();
      const walk = e.pageX - d.startX;
      if (Math.abs(walk) > 4) d.moved = true;
      el!.scrollLeft = d.scrollLeft - walk;
    }

    function onMouseUp() {
      dragRef.current.dragging = false;
      el!.style.cursor = 'grab';
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  function onMouseDown(e: React.MouseEvent) {
    const el = scrollRef.current;
    if (!el) return;
    dragRef.current = { dragging: true, startX: e.pageX, scrollLeft: el.scrollLeft, moved: false };
    el.style.cursor = 'grabbing';
  }

  return (
    <div className="mb-4">
      <div
        ref={scrollRef}
        className="flex gap-2 pb-3 select-none"
        style={{ cursor: 'grab', WebkitOverflowScrolling: 'touch', overflowX: 'auto', width: '100%', msOverflowStyle: 'none', scrollbarWidth: 'none' } as React.CSSProperties}
        onMouseDown={onMouseDown}
      >
        {gateways.map(gw => {
          const icons = gatewayIcons(gw);
          const selected = gw.id === activeId;
          const icon = icons[0];
          return (
            <button
              key={gw.id}
              type="button"
              onClick={() => { if (!dragRef.current.moved) onSelect(gw.id); }}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-(--cocart-border-radius) border-2 px-4 py-3 text-xs font-medium whitespace-nowrap shrink-0 min-w-24 transition ${selected ? 'border-(--cocart-color-primary) text-(--cocart-color-text)' : 'border-(--cocart-color-border) text-(--cocart-color-text-muted) hover:border-(--cocart-color-text-muted)'}`}
            >
              {icon ? <span className="block">{Icons[icon]}</span> : <span className="h-6" />}
              <span>{gw.label}</span>
            </button>
          );
        })}
      </div>
      {(activeGw?.supports.includes('offline') || paymentSection) && (
        <div className="mt-2">
          {activeGw?.supports.includes('offline') ? (
            <p className={helperClass}>{activeGw.description ?? 'No additional details required.'}</p>
          ) : paymentSection ? (
            <PaymentFields fields={paymentSection.fields} helperClass={helperClass} paymentContainerClass={paymentContainerClass} />
          ) : null}
        </div>
      )}
    </div>
  );
}

function AccordionLayout({ gateways, activeId, onSelect, paymentSection, helperClass, paymentContainerClass }: LayoutProps) {
  return (
    <div className="mb-4 rounded-(--cocart-border-radius) border border-(--cocart-color-border) overflow-hidden">
      {gateways.map((gw, i) => {
        const icons = gatewayIcons(gw);
        const selected = gw.id === activeId;
        const hasFields = !gw.supports.includes('offline') && paymentSection && paymentSection.fields.some(f => !f.hidden);
        return (
          <div key={gw.id} className={`${i > 0 ? 'border-t border-(--cocart-color-border)' : ''} ${selected ? 'bg-(--cocart-color-background-hover)' : 'bg-(--cocart-color-surface)'}`}>
            <button
              type="button"
              onClick={() => onSelect(gw.id)}
              className="w-full flex items-start gap-3 px-4 py-3.5 text-sm text-left transition hover:bg-(--cocart-color-background-hover)"
            >
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-medium text-(--cocart-color-text)">{gw.label}</span>
                {selected && gw.description && <span className={helperClass}>{gw.description}</span>}
              </div>
              {icons.length > 0 && (
                <span className="flex items-center gap-1 shrink-0">
                  {icons.map(key => <span key={key}>{Icons[key]}</span>)}
                </span>
              )}
              {hasFields && (
                <svg className={`h-4 w-4 shrink-0 text-(--cocart-color-text-muted) transition-transform ${selected ? 'rotate-180' : ''}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6l4 4 4-4"/></svg>
              )}
            </button>
            {selected && hasFields && (
              <div className="px-4 pb-4">
                <PaymentFields fields={paymentSection!.fields} helperClass={helperClass} paymentContainerClass={paymentContainerClass} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PaymentMethods({
  gateways,
  activeGatewayId,
  theme,
  paymentSection,
  billingSection,
  showBillingUnderPayment = true,
  loading = false,
  layout = 'radio',
}: PaymentMethodsProps) {
  const [activeId, setActiveId] = useState(activeGatewayId ?? (gateways.length > 0 ? gateways[0].id : ''));
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);

  if (loading) {
    const helperClass = theme.helperTextClassName ?? 'text-xs text-(--cocart-color-text-muted)';
    return (
      <div className={theme.sectionClassName ?? ''}>
        <Sk className="mb-1 h-5 w-20" />
        <Sk className={`mb-4 h-3 w-56 ${helperClass}`} />
        <div className="mb-4 rounded-(--cocart-border-radius) border border-(--cocart-color-border) overflow-hidden">
          {[0, 1].map((i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-(--cocart-color-border)' : ''}`}>
              <Sk className="h-4 w-4 shrink-0 rounded-full" />
              <div className="flex flex-col flex-1 gap-1.5">
                <Sk className="h-3.5 w-28" />
                <Sk className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (gateways.length === 0 && !paymentSection) return null;

  const helperClass = theme.helperTextClassName ?? 'text-xs text-(--cocart-color-text-muted)';
  const paymentContainerClass = theme.paymentContainerClassName ?? 'rounded-(--cocart-border-radius) border border-dashed border-(--cocart-color-border) bg-(--cocart-color-background-hover) p-4';

  const layoutProps: LayoutProps = {
    gateways,
    activeId,
    onSelect: setActiveId,
    paymentSection,
    helperClass,
    paymentContainerClass,
  };

  return (
    <div className={`w-full overflow-hidden ${theme.sectionClassName ?? ''}`}>
      <h2 className="mb-1 text-base font-bold text-(--cocart-color-text)">Payment</h2>
      <p className={`mb-4 ${helperClass}`}>All transactions are secure and encrypted.</p>

      {gateways.length > 0 && layout === 'radio' && <RadioLayout {...layoutProps} />}
      {gateways.length > 0 && layout === 'tabs' && <TabsLayout {...layoutProps} />}
      {gateways.length > 0 && layout === 'accordion' && <AccordionLayout {...layoutProps} />}

      {gateways.length === 0 && paymentSection && (
        <div className={`mb-4 ${paymentContainerClass}`}>
          {paymentSection.fields.filter(f => !f.hidden).map(field => (
            <div key={field.name} className="flex items-center justify-center min-h-16">
              <span className={helperClass}>[{field.label}]</span>
            </div>
          ))}
        </div>
      )}

      {showBillingUnderPayment && billingSection && (
        <div className="mt-4">
          <label className="flex items-center gap-2.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={billingSameAsShipping}
              onChange={e => setBillingSameAsShipping(e.target.checked)}
              className="h-4 w-4 rounded accent-(--cocart-color-primary)"
            />
            <span className="text-sm text-(--cocart-color-text)">Use shipping address as billing address</span>
          </label>
          {!billingSameAsShipping && (
            <div className="mt-4">
              <Address type="billing" section={billingSection} theme={{ ...theme, sectionClassName: '' }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
