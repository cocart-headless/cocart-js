import { useState } from 'react';
import type { CheckoutFormSection, CheckoutFormField, CheckoutTheme } from '../types.js';
import { COUNTRIES, countryFlag } from './countries.js';
import { Sk } from './skeleton.js';

interface AddressProps {
  type: 'contact' | 'billing' | 'shipping';
  section?: CheckoutFormSection;
  theme: CheckoutTheme;
  loading?: boolean;
}

const FULL_WIDTH_FIELDS = new Set(['email', 'tel']);
function isFullWidth(field: CheckoutFormField): boolean {
  return (
    FULL_WIDTH_FIELDS.has(field.type) ||
    field.name.includes('address_1') ||
    field.name.includes('address_2') ||
    field.name.includes('country') ||
    field.name.includes('customer_note')
  );
}

const DEFAULT_INPUT = 'h-(--cocart-input-height) w-full rounded-(--cocart-border-radius) border border-(--cocart-color-border) bg-(--cocart-color-surface) px-3.5 text-[length:var(--cocart-font-size-base)] text-(--cocart-color-text) placeholder:text-(--cocart-color-text-muted) outline-none transition focus:border-(--cocart-color-primary)';
const DEFAULT_HELPER = 'text-xs text-(--cocart-color-text-muted)';

interface SelectOption { value: string; label: string; }

function CountrySelect({ field, inputClass }: { field: CheckoutFormField; inputClass: string }) {
  const [open, setOpen] = useState(false);
  const options = COUNTRIES.map(c => ({ value: c.code, label: `${countryFlag(c.code)}  ${c.name}` }));
  const defaultCode = typeof field.defaultValue === 'string' ? field.defaultValue : 'US';
  const defaultOption = options.find(o => o.value === defaultCode)
    ?? { value: defaultCode, label: `${countryFlag(defaultCode)}  ${defaultCode}` };
  const [selected, setSelected] = useState<SelectOption>(defaultOption);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`${inputClass} text-left flex items-center justify-between pr-9`}
      >
        <span>{selected.label}</span>
      </button>
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 opacity-40">
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </span>
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-(--cocart-border-radius) border border-(--cocart-color-border) bg-(--cocart-color-surface) shadow-lg">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`w-full px-3.5 py-2.5 text-left text-sm transition hover:bg-(--cocart-color-background-hover) ${selected.value === opt.value ? 'bg-(--cocart-color-background-hover) font-medium' : ''}`}
              onClick={() => { setSelected(opt); setOpen(false); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      <input type="hidden" name={field.name} value={selected.value} />
    </div>
  );
}

function Field({ field, theme }: { field: CheckoutFormField; theme: CheckoutTheme }) {
  if (field.hidden) return null;

  const inputClass = theme.inputClassName ?? DEFAULT_INPUT;
  const helperClass = theme.helperTextClassName ?? DEFAULT_HELPER;

  if (field.type === 'textarea') {
    return (
      <textarea
        name={field.name}
        autoComplete={field.autoComplete}
        required={field.required}
        placeholder={field.placeholder ?? field.label}
        className={`${inputClass} resize-none min-h-20 py-3 h-auto`}
      />
    );
  }

  if (field.type === 'select') {
    const isCountry = field.autoComplete?.includes('country') || field.name.includes('country');
    if (isCountry) return <CountrySelect field={field} inputClass={inputClass} />;
    return (
      <select name={field.name} className={inputClass}>
        {(field.options ?? []).map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2.5 text-sm cursor-pointer py-1">
        <input type="checkbox" name={field.name} required={field.required} defaultChecked={field.defaultValue === true} className="h-4 w-4 rounded accent-(--cocart-color-primary)" />
        <span className="text-(--cocart-color-text)">{field.label}</span>
      </label>
    );
  }

  if (field.type === 'radio') {
    return (
      <div className="grid gap-1.5">
        {field.options?.map(opt => (
          <label key={opt.value} className="flex items-center gap-2.5 text-sm cursor-pointer">
            <input type="radio" name={field.name} value={opt.value} className="h-4 w-4 accent-(--cocart-color-primary)" />
            <span className="text-(--cocart-color-text)">{opt.label}</span>
            {opt.description && <span className={helperClass}>{opt.description}</span>}
          </label>
        ))}
      </div>
    );
  }

  if (field.type === 'gateway-element') {
    return (
      <div className="flex items-center justify-center min-h-20 rounded-(--cocart-border-radius) border border-dashed border-(--cocart-color-border) bg-(--cocart-color-background-hover)">
        <span className="text-sm text-(--cocart-color-text-muted)">[{field.label}]</span>
      </div>
    );
  }

  return (
    <>
      <input
        type={field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : 'text'}
        name={field.name}
        autoComplete={field.autoComplete}
        required={field.required}
        placeholder={field.placeholder ?? field.label}
        className={inputClass}
      />
      {field.description && <p className={helperClass}>{field.description}</p>}
    </>
  );
}

export function Address({ type, section, theme, loading = false }: AddressProps) {
  const sectionClass = theme.sectionClassName ?? '';

  if (loading || !section) {
    const isAddress = type === 'billing' || type === 'shipping';
    return (
      <div className={sectionClass}>
        <Sk className="mb-4 h-5 w-32" />
        {isAddress ? (
          <div className="grid grid-cols-2 gap-(--cocart-field-gap)">
            <div className="col-span-2"><Sk className="h-(--cocart-input-height) w-full" /></div>
            <Sk className="h-(--cocart-input-height) w-full" />
            <Sk className="h-(--cocart-input-height) w-full" />
            <div className="col-span-2"><Sk className="h-(--cocart-input-height) w-full" /></div>
            <div className="col-span-2"><Sk className="h-(--cocart-input-height) w-full" /></div>
            <Sk className="h-(--cocart-input-height) w-full" />
            <Sk className="h-(--cocart-input-height) w-full" />
          </div>
        ) : (
          <div className="grid gap-(--cocart-field-gap)">
            <Sk className="h-(--cocart-input-height) w-full" />
            <Sk className="h-(--cocart-input-height) w-full" />
          </div>
        )}
      </div>
    );
  }

  const isAddress = section.id === 'billing' || section.id === 'shipping';
  const visibleFields = section.fields.filter(f => !f.hidden);

  return (
    <div className={sectionClass}>
      {section.title && (
        <h2 className="mb-4 text-base font-bold text-(--cocart-color-text)">{section.title}</h2>
      )}
      {isAddress ? (
        <div className="grid grid-cols-2 gap-(--cocart-field-gap)">
          {visibleFields.map(field => (
            <div key={field.name} className={isFullWidth(field) ? 'col-span-2' : ''}>
              <Field field={field} theme={theme} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-(--cocart-field-gap)">
          {visibleFields.map(field => (
            <Field key={field.name} field={field} theme={theme} />
          ))}
        </div>
      )}
    </div>
  );
}
