import type { CheckoutFormDefinition } from '@cocartheadless/checkout';

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
    <div className={className}>
      {children}
    </div>
  );
}
