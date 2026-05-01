import { useState } from 'react';
import type { CheckoutFormSection, CheckoutFormField, CheckoutTheme } from '@cocartheadless/checkout';
import { COUNTRIES, countryFlag } from './countries.js';

interface AddressProps {
  type: 'contact' | 'billing' | 'shipping';
  section: CheckoutFormSection;
  theme: CheckoutTheme;
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

const INPUT_CLASS = 'h-12 w-full rounded-lg border border-[#d9d9d9] bg-white px-3.5 text-sm text-[#1a1a1a] placeholder:text-[#999] outline-none transition focus:border-[#1a1a1a]';

interface SelectOption { value: string; label: string; }

function CountrySelect({ field, options }: { field: CheckoutFormField; options: SelectOption[] }) {
  const [open, setOpen] = useState(false);
  const defaultCode = typeof field.defaultValue === 'string' ? field.defaultValue : 'US';
  const defaultOption = options.find(o => o.value === defaultCode)
    ?? { value: defaultCode, label: `${countryFlag(defaultCode)}  ${defaultCode}` };
  const [selected, setSelected] = useState<SelectOption>(defaultOption);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`${INPUT_CLASS} text-left flex items-center justify-between pr-9`}
      >
        <span>{selected.label}</span>
      </button>
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#999]">
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </span>
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-[#d9d9d9] bg-white shadow-lg">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`w-full px-3.5 py-2.5 text-left text-sm hover:bg-[#f6f6f1] transition ${selected.value === opt.value ? 'bg-[#f0f0f0] font-medium' : ''}`}
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

  const helperClass = theme.helperTextClassName ?? '';

  if (field.type === 'textarea') {
    return (
      <div>
        <textarea
          name={field.name}
          autoComplete={field.autoComplete}
          required={field.required}
          placeholder={field.placeholder ?? field.label}
          className="w-full rounded-lg border border-[#d9d9d9] bg-white px-3.5 py-3 text-sm text-[#1a1a1a] placeholder:text-[#999] outline-none transition focus:border-[#1a1a1a] resize-none min-h-[80px]"
        />
        {field.description && <p className={helperClass}>{field.description}</p>}
      </div>
    );
  }

  if (field.type === 'select') {
    const isCountry = field.autoComplete?.includes('country') || field.name.includes('country');
    const options = isCountry
      ? COUNTRIES.map(c => ({ value: c.code, label: `${countryFlag(c.code)}  ${c.name}` }))
      : (field.options ?? []).map(o => ({ value: o.value, label: o.label }));
    return <CountrySelect field={field} options={options} />;
  }

  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2.5 text-sm cursor-pointer py-1">
        <input
          type="checkbox"
          name={field.name}
          required={field.required}
          defaultChecked={field.defaultValue === true}
          className="h-4 w-4 rounded border-[#d9d9d9] accent-[#1a1a1a]"
        />
        <span className="text-[#1a1a1a]">{field.label}</span>
      </label>
    );
  }

  if (field.type === 'radio') {
    return (
      <div>
        <p className="text-xs font-medium text-[#6b6b6b] mb-1.5">{field.label}</p>
        <div className="grid gap-1.5">
          {field.options?.map(opt => (
            <label key={opt.value} className="flex items-center gap-2.5 text-sm cursor-pointer">
              <input type="radio" name={field.name} value={opt.value} className="h-4 w-4 accent-[#1a1a1a]" />
              <span className="text-[#1a1a1a]">{opt.label}</span>
              {opt.description && <span className={helperClass}>{opt.description}</span>}
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === 'gateway-element') {
    return (
      <div className="flex items-center justify-center min-h-[80px] rounded-lg border border-dashed border-[#d9d9d9] bg-[#fafafa]">
        <span className="text-sm text-[#6b6b6b]">[{field.label}]</span>
      </div>
    );
  }

  return (
    <div>
      <input
        type={field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : 'text'}
        name={field.name}
        autoComplete={field.autoComplete}
        required={field.required}
        placeholder={field.placeholder ?? field.label}
        className={INPUT_CLASS}
      />
      {field.description && <p className={helperClass}>{field.description}</p>}
    </div>
  );
}

export function Address({ section, theme }: AddressProps) {
  const isAddress = section.id === 'billing' || section.id === 'shipping';
  const visibleFields = section.fields.filter(f => !f.hidden);

  return (
    <div className={theme.sectionClassName ?? ''}>
      {section.title && (
        <h2 className="mb-3 text-sm font-bold text-[#1a1a1a]">{section.title}</h2>
      )}
      {isAddress ? (
        <div className="grid grid-cols-2 gap-2">
          {visibleFields.map(field => (
            <div key={field.name} className={isFullWidth(field) ? 'col-span-2' : ''}>
              <Field field={field} theme={theme} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-2">
          {visibleFields.map(field => (
            <Field key={field.name} field={field} theme={theme} />
          ))}
        </div>
      )}
    </div>
  );
}
