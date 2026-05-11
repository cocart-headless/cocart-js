import type { CheckoutTheme } from '../index.js';

export interface CrossSellProduct {
  name: string;
  variant?: string;
  price: string;
}

export interface CrossSellProductsProps {
  theme: CheckoutTheme;
  products: CrossSellProduct[];
  onAdd: (product: CrossSellProduct) => void;
}

export function CrossSellProducts({ theme, products, onAdd }: CrossSellProductsProps) {
  if (!products.length) return null;

  const btnClass = 'shrink-0 rounded-(--cocart-border-radius) bg-(--cocart-color-button) px-3 py-1.5 text-sm font-semibold text-(--cocart-color-button-text) transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-(--cocart-color-primary)';

  return (
    <ul className="grid gap-3 list-none m-0 p-0 mb-4">
      {products.map(product => (
        <li key={product.name} className="flex items-center gap-3 min-w-0">
          <div
            className="relative h-12 w-12 shrink-0 rounded-(--cocart-border-radius) border border-(--cocart-color-border) bg-(--cocart-color-surface) flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="text-xs text-(--cocart-color-text-muted)">img</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-(--cocart-color-text) truncate leading-tight">{product.name}</p>
            {product.variant && (
              <p className="text-xs text-(--cocart-color-text-muted) truncate">{product.variant}</p>
            )}
            <p className="text-xs text-(--cocart-color-text-muted)">{product.price}</p>
          </div>
          <button
            type="button"
            onClick={() => onAdd(product)}
            aria-label={`Add ${product.name} to cart`}
            className={btnClass}
          >
            Add
          </button>
        </li>
      ))}
    </ul>
  );
}
