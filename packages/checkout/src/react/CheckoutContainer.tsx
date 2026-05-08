import type { CheckoutFormDefinition } from '../index.js';

interface CheckoutContainerProps {
  form: CheckoutFormDefinition;
  layout?: 'stacked' | 'two-column';
  children: React.ReactNode;
}

export function CheckoutContainer({ form, layout = 'two-column', children }: CheckoutContainerProps) {
  const className = layout === 'two-column'
    ? form.theme.containerClassName
    : 'grid gap-6';

  return (
    <form className={className} noValidate>
      <h1 className="sr-only">Checkout</h1>
      {children}
    </form>
  );
}
