import { useState, useEffect, useRef } from 'react';
import type { CheckoutFormSection, CheckoutFormField, CheckoutTheme } from '../types.js';
import { COUNTRIES, countryFlag, detectCountryFromPhone } from './countries.js';
import { Sk } from './skeleton.js';

interface AddressProps {
  type: 'contact' | 'billing' | 'shipping';
  section?: CheckoutFormSection;
  theme: CheckoutTheme;
  loading?: boolean;
  /** Whether the customer is already authenticated. When false (default) the contact section shows a Sign in toggle. */
  isAuthorized?: boolean;
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

const DEFAULT_INPUT = 'h-(--cocart-input-height) w-full rounded-(--cocart-border-radius) border border-(--cocart-color-border) bg-(--cocart-color-surface) px-3.5 text-[length:var(--cocart-font-size-base)] text-(--cocart-color-text) placeholder:text-(--cocart-color-text-muted) outline-none transition focus:border-(--cocart-color-primary) focus-visible:ring-2 focus-visible:ring-(--cocart-color-primary) focus-visible:ring-offset-1';
const DEFAULT_HELPER = 'text-xs text-(--cocart-color-text-muted)';

interface SelectOption { value: string; label: string; }

function CountrySelect({ field, inputClass }: { field: CheckoutFormField; inputClass: string }) {
  const [open, setOpen] = useState(false);
  const options = COUNTRIES.map(c => ({ value: c.code, label: `${countryFlag(c.code)}  ${c.name}` }));
  const defaultCode = typeof field.defaultValue === 'string' ? field.defaultValue : 'US';
  const defaultOption = options.find(o => o.value === defaultCode)
    ?? { value: defaultCode, label: `${countryFlag(defaultCode)}  ${defaultCode}` };
  const [selected, setSelected] = useState<SelectOption>(defaultOption);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = `listbox-${field.name}`;
  const labelId = `label-${field.name}`;

  useEffect(() => {
    if (open) {
      // Focus the selected option or the first option
      const activeBtn = listRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')
        ?? listRef.current?.querySelector<HTMLButtonElement>('button');
      activeBtn?.focus();
    }
  }, [open]);

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
    }
  }

  function handleOptionKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, opt: SelectOption) {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = e.currentTarget.parentElement?.nextElementSibling?.querySelector('button') as HTMLButtonElement | null;
      next?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = e.currentTarget.parentElement?.previousElementSibling?.querySelector('button') as HTMLButtonElement | null;
      if (prev) {
        prev.focus();
      } else {
        setOpen(false);
        triggerRef.current?.focus();
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelected(opt);
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        id={`trigger-${field.name}`}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-labelledby={`${labelId} trigger-${field.name}`}
        onClick={() => setOpen(o => !o)}
        onKeyDown={handleTriggerKeyDown}
        className={`${inputClass} text-left flex items-center justify-between pr-9`}
      >
        <span>{selected.label}</span>
      </button>
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 opacity-40" aria-hidden="true">
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </span>
      {open && (
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-labelledby={labelId}
          className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-(--cocart-border-radius) border border-(--cocart-color-border) bg-(--cocart-color-surface) shadow-lg"
        >
          {options.map(opt => (
            <div key={opt.value} role="option" aria-selected={selected.value === opt.value}>
              <button
                type="button"
                tabIndex={0}
                className={`w-full px-3.5 py-2.5 text-left text-sm text-(--cocart-color-text) transition hover:bg-(--cocart-color-background-hover) focus:outline-none focus:bg-(--cocart-color-background-hover) ${selected.value === opt.value ? 'bg-(--cocart-color-background-hover) font-medium' : ''}`}
                onClick={() => { setSelected(opt); setOpen(false); triggerRef.current?.focus(); }}
                onKeyDown={e => handleOptionKeyDown(e, opt)}
              >
                {opt.label}
              </button>
            </div>
          ))}
        </div>
      )}
      <input type="hidden" name={field.name} value={selected.value} />
    </div>
  );
}

function PhoneInput({ field, inputClass }: { field: CheckoutFormField; inputClass: string }) {
  const [value, setValue] = useState('');
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const inputId = `field-${field.name}`;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setValue(val);
    if (val.startsWith('+')) {
      setCountryCode(detectCountryFromPhone(val));
    } else {
      setCountryCode(null);
    }
  }

  return (
    <div className="relative">
      {countryCode && (
        <span
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-lg leading-none select-none"
          style={{ left: '14px' }}
          aria-label={`Country code: ${countryCode}`}
        >
          {countryFlag(countryCode)}
        </span>
      )}
      <input
        id={inputId}
        type="tel"
        name={field.name}
        autoComplete={field.autoComplete}
        required={field.required}
        aria-required={field.required}
        placeholder={field.placeholder ?? field.label}
        value={value}
        onChange={handleChange}
        className={inputClass}
        style={countryCode ? { paddingLeft: '2.25rem' } : undefined}
      />
    </div>
  );
}

function EmailInput({ field, inputClass, helperClass }: { field: CheckoutFormField; inputClass: string; helperClass: string }) {
  const [value, setValue] = useState('');
  const [showError, setShowError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const inputId = `field-${field.name}`;
  const errorId = `error-${field.name}`;
  const helperId = `helper-${field.name}`;

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (value.length === 0) { setShowError(false); return; }
    timerRef.current = setTimeout(() => setShowError(!isValid), 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [value, isValid]);

  return (
    <>
      <input
        id={inputId}
        type="email"
        name={field.name}
        autoComplete={field.autoComplete}
        required={field.required}
        aria-required={field.required}
        aria-invalid={showError || undefined}
        aria-describedby={showError ? errorId : field.description ? helperId : undefined}
        placeholder={field.placeholder ?? field.label}
        value={value}
        onChange={e => { setValue(e.target.value); if (showError && isValid) setShowError(false); }}
        className={`${inputClass}${showError ? ' border-(--cocart-color-error) focus:border-(--cocart-color-error)' : ''}`}
      />
      {showError && (
        <p id={errorId} role="alert" className="text-xs mt-1" style={{ color: 'var(--cocart-color-error)' }}>
          Please enter a valid email address.
        </p>
      )}
      {!showError && field.description && <p id={helperId} className={helperClass}>{field.description}</p>}
    </>
  );
}

function Field({ field, theme }: { field: CheckoutFormField; theme: CheckoutTheme }) {
  if (field.hidden) return null;

  const inputClass = theme.inputClassName ?? DEFAULT_INPUT;
  const helperClass = theme.helperTextClassName ?? DEFAULT_HELPER;
  const inputId = `field-${field.name}`;
  const helperId = `helper-${field.name}`;
  const labelId = `label-${field.name}`;

  if (field.type === 'textarea') {
    return (
      <div className="grid gap-1">
        <label id={labelId} htmlFor={inputId} className="text-sm font-medium text-(--cocart-color-text)">
          {field.label}{field.required && <span aria-hidden="true" className="ml-0.5 text-(--cocart-color-error)">*</span>}
        </label>
        <textarea
          id={inputId}
          name={field.name}
          autoComplete={field.autoComplete}
          required={field.required}
          aria-required={field.required}
          placeholder={field.placeholder}
          className={`${inputClass} resize-none min-h-20 py-3 h-auto`}
        />
      </div>
    );
  }

  if (field.type === 'select') {
    const isCountry = field.autoComplete?.includes('country') || field.name.includes('country');
    if (isCountry) {
      return (
        <div className="grid gap-1">
          <span id={labelId} className="text-sm font-medium text-(--cocart-color-text)">
            {field.label}{field.required && <span aria-hidden="true" className="ml-0.5 text-(--cocart-color-error)">*</span>}
          </span>
          <CountrySelect field={field} inputClass={inputClass} />
        </div>
      );
    }
    return (
      <div className="grid gap-1">
        <label htmlFor={inputId} className="text-sm font-medium text-(--cocart-color-text)">
          {field.label}{field.required && <span aria-hidden="true" className="ml-0.5 text-(--cocart-color-error)">*</span>}
        </label>
        <select id={inputId} name={field.name} required={field.required} aria-required={field.required} className={inputClass}>
          {(field.options ?? []).map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2.5 text-sm cursor-pointer py-1">
        <input
          id={inputId}
          type="checkbox"
          name={field.name}
          required={field.required}
          aria-required={field.required}
          defaultChecked={field.defaultValue === true}
          className="h-4 w-4 rounded accent-(--cocart-color-primary) focus-visible:ring-2 focus-visible:ring-(--cocart-color-primary)"
        />
        <span className="text-(--cocart-color-text)">{field.label}</span>
      </label>
    );
  }

  if (field.type === 'radio') {
    return (
      <fieldset className="grid gap-1.5 border-0 p-0 m-0">
        <legend className="text-sm font-medium text-(--cocart-color-text) mb-1">
          {field.label}{field.required && <span aria-hidden="true" className="ml-0.5 text-(--cocart-color-error)">*</span>}
        </legend>
        {field.options?.map(opt => (
          <label key={opt.value} className="flex items-center gap-2.5 text-sm cursor-pointer">
            <input
              type="radio"
              name={field.name}
              value={opt.value}
              className="h-4 w-4 accent-(--cocart-color-primary) focus-visible:ring-2 focus-visible:ring-(--cocart-color-primary)"
            />
            <span className="text-(--cocart-color-text)">{opt.label}</span>
            {opt.description && <span className={helperClass}>{opt.description}</span>}
          </label>
        ))}
      </fieldset>
    );
  }

  if (field.type === 'gateway-element') {
    return (
      <div className="flex items-center justify-center min-h-20 rounded-(--cocart-border-radius) border border-dashed border-(--cocart-color-border) bg-(--cocart-color-background-hover)">
        <span className="text-sm text-(--cocart-color-text-muted)">[{field.label}]</span>
      </div>
    );
  }

  if (field.type === 'tel') {
    return (
      <div className="grid gap-1">
        <label htmlFor={inputId} className="text-sm font-medium text-(--cocart-color-text)">
          {field.label}{field.required && <span aria-hidden="true" className="ml-0.5 text-(--cocart-color-error)">*</span>}
        </label>
        <PhoneInput field={field} inputClass={inputClass} />
      </div>
    );
  }

  if (field.type === 'email') {
    return (
      <div className="grid gap-1">
        <label htmlFor={inputId} className="text-sm font-medium text-(--cocart-color-text)">
          {field.label}{field.required && <span aria-hidden="true" className="ml-0.5 text-(--cocart-color-error)">*</span>}
        </label>
        <EmailInput field={field} inputClass={inputClass} helperClass={helperClass} />
      </div>
    );
  }

  return (
    <div className="grid gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-(--cocart-color-text)">
        {field.label}{field.required && <span aria-hidden="true" className="ml-0.5 text-(--cocart-color-error)">*</span>}
      </label>
      <input
        id={inputId}
        type="text"
        name={field.name}
        autoComplete={field.autoComplete}
        required={field.required}
        aria-required={field.required}
        aria-describedby={field.description ? helperId : undefined}
        placeholder={field.placeholder}
        className={inputClass}
      />
      {field.description && <p id={helperId} className={helperClass}>{field.description}</p>}
    </div>
  );
}

export function Address({ type, section, theme, loading = false, isAuthorized = false }: AddressProps) {
  const [signInOpen, setSignInOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const sectionClass = theme.sectionClassName ?? '';
  const signInEmailRef = useRef<HTMLInputElement>(null);
  const signInBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (signInOpen && !loggedIn) {
      signInEmailRef.current?.focus();
    }
  }, [signInOpen, loggedIn]);

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
  const isContact = type === 'contact' && section.id === 'contact';
  const visibleFields = section.fields.filter(f => !f.hidden);
  const showSignIn = isContact && !isAuthorized;
  const inputClass = theme.inputClassName ?? DEFAULT_INPUT;
  const btnClass = 'h-(--cocart-input-height) w-full rounded-(--cocart-border-radius-full) bg-(--cocart-color-button) px-4 text-[length:var(--cocart-font-size-base)] font-medium text-(--cocart-color-button-text) transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-(--cocart-color-primary)';

  if (showSignIn && signInOpen && !loggedIn) {
    const emailField = visibleFields.find(f => f.type === 'email');
    return (
      <div className={sectionClass}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-(--cocart-color-text)">Login</h2>
          <button
            ref={signInBtnRef}
            type="button"
            className="text-xs text-(--cocart-color-text) underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--cocart-color-primary) rounded"
            onClick={() => setSignInOpen(false)}
          >
            Cancel
          </button>
        </div>
        <div className="grid gap-(--cocart-field-gap)">
          {emailField && (
            <div className="grid gap-1">
              <label htmlFor={`field-${emailField.name}`} className="text-sm font-medium text-(--cocart-color-text)">
                {emailField.label}
              </label>
              <input
                ref={signInEmailRef}
                id={`field-${emailField.name}`}
                type="email"
                name={emailField.name}
                autoComplete="email"
                placeholder={emailField.placeholder ?? emailField.label}
                className={inputClass}
              />
            </div>
          )}
          <div className="grid gap-1">
            <label htmlFor="signin-password" className="text-sm font-medium text-(--cocart-color-text)">Password</label>
            <input
              id="signin-password"
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              className={inputClass}
            />
          </div>
          <button type="button" className={btnClass} onClick={() => { setLoggedIn(true); setSignInOpen(false); }}>
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={sectionClass}>
      {section.title && (
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-(--cocart-color-text)">{section.title}</h2>
          {showSignIn && !loggedIn && (
            <button
              type="button"
              className="text-xs text-(--cocart-color-text) underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--cocart-color-primary) rounded"
              onClick={() => setSignInOpen(true)}
            >
              Sign in
            </button>
          )}
          {showSignIn && loggedIn && (
            <button
              type="button"
              className="text-xs text-(--cocart-color-text-muted) underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--cocart-color-primary) rounded"
              onClick={() => setLoggedIn(false)}
            >
              Sign out
            </button>
          )}
        </div>
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
