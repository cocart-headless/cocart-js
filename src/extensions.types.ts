// ---------------------------------------------------------------------------
// Extension data: what plugins add under `extensions` on the cart, cart items and products.
//
// CoCart Plus adds data for the plugins it supports, only where it applies (a subscription
// product, a bundle in the cart…). The shapes below follow the Plus 2.0 integrations. Amounts
// are minor-unit strings, like the rest of CoCart (`"1800"` for 18.00).
//
// The three interfaces at the end can be extended for any other plugin's data:
//
//   declare module '@cocartheadless/sdk' {
//     interface CartItemExtensions {
//       my_plugin?: { engraving: string };
//     }
//   }
//
// Every key is optional: a plugin's data is there only when the plugin is active and it applies.
// ---------------------------------------------------------------------------

import type { CartCoupon, CartFee, CartShipping, CartTax } from './cocart.types.js';

/** An amount in the currency's minor units (`"1800"` for 18.00). */
export type MinorUnitAmount = string;

// --- Subscriptions (WooCommerce Subscriptions, its Storewide plans, Milo Subscriptions) ---

/** `subscription_data` on a subscription product or cart item. */
export interface SubscriptionData {
  billing_period: {
    interval: string | number;
    period: string;
    length: string | number;
    trial_period: string;
    trial_length: string | number;
    /** When the free trial ends, `Y-m-d H:i:s` (GMT) for a subscription started now, or `0` when there is no trial. */
    trial_expiration_date: string | number;
    /** When the subscription ends, `Y-m-d H:i:s` (GMT) for a subscription started now, or `0` when it never expires. */
    expiration_date: string | number;
  };
  sign_up_fee: MinorUnitAmount;
  /**
   * What is paid at checkout, as WooCommerce Subscriptions charges it: the sign-up fee alone during a trial or
   * when the first payment waits for a synchronised renewal day, the prorated price plus the sign-up fee when the
   * store prorates, otherwise the price plus the sign-up fee.
   */
  pay_now: MinorUnitAmount;
  needs_one_time_shipping: boolean;
  price_string: string;
  first_renewal: {
    /** `Y-m-d H:i:s` (GMT), or `0` when there is no renewal. */
    date: string | number;
    timestamp: number;
    /** "First renewal: …", ready to display. */
    html: string;
  };
}

/**
 * One choice in a product's `subscription_schemes` (subscription plans): one-time or a plan. Listed only when
 * there is a choice to make.
 */
export interface SubscriptionSchemeOption {
  price: MinorUnitAmount;
  period: string;
  /** Scheme key to send as `convert_to_sub` (`"0"` for one-time). */
  value: string;
  /** Ready-made request: on a product, adds it to the cart with this option; on a cart item, switches to it. */
  rest_url: string;
}

/** One choice in a cart item's `subscription_schemes`, with the option the item has now marked `selected`. */
export interface CartItemSubscriptionSchemeOption extends SubscriptionSchemeOption {
  selected: boolean;
}

/**
 * One recurring cart in `recurring_totals`, keyed by the subscription's item key. Its amounts follow the cart's
 * `formatted` option: minor units by default, display strings with `formatted=true`.
 */
export interface RecurringTotal {
  /** WooCommerce Subscriptions and All Products for Subscriptions; not Milo Subscriptions. */
  coupons?: CartCoupon[];
  shipping?: CartShipping;
  fees?: Record<string, CartFee>;
  taxes?: CartTax[];
  totals: {
    period: string;
    subtotal: MinorUnitAmount;
    total: MinorUnitAmount;
    /** The recurring total as WooCommerce displays it (not Milo Subscriptions). */
    label?: string;
    /** `date` is `Y-m-d H:i:s` (GMT), or `0` when there is no renewal; the others are `""` then. */
    first_renewal: { date: string | number; formatted_date: string; labelled: string };
  };
}

// --- Bookings and accommodation ---

export interface BookingCartItemData {
  start_date: string;
  end_date: string;
  all_day: boolean;
  resource_id: number;
  persons: number[];
  cost: MinorUnitAmount;
}

export interface BookingProductData {
  duration_type: string;
  duration_unit: string;
  duration: number;
  has_persons: boolean;
  min_persons: number;
  max_persons: number;
  has_resources: boolean;
  resource_label: string;
  booking_location: string;
}

export interface AccommodationBookingCartItemData {
  check_in: string;
  check_out: string;
}

export interface AccommodationBookingProductData {
  min_nights: number;
  max_nights: number;
  check_in_time: string;
  check_out_time: string;
}

// --- Composite Products and Product Bundles ---

export interface ChildItemQuantity {
  value: number;
  minimum: number;
  maximum: number | null;
}

export interface CompositeCartItemComponent {
  id: number;
  quantity: ChildItemQuantity;
  variation: Record<string, string>;
  discount: number | null;
  optional: boolean;
  priced_individually: boolean;
  shipped_individually: boolean;
  title: string;
}

export interface CompositeCartItemData {
  /** Keyed by component ID. */
  components: Record<string, CompositeCartItemComponent>;
  child_item_keys: string[];
}

export interface CompositeProductData {
  layout: string;
  components: Array<{
    id: string;
    title: string;
    optional: boolean;
    quantity_min: number;
    quantity_max: number | null;
    priced_individually: boolean;
    discount: number | null;
    default_option_id: number;
    options_style: string;
  }>;
}

export interface BundleCartItemData {
  /** Keyed by bundled item ID. */
  items: Record<string, {
    id: number;
    quantity: ChildItemQuantity;
    variation: Record<string, string>;
    discount: number | null;
    optional_selected: boolean;
  }>;
  /** The bundled items, which CoCart removes from the cart's own `items` list. */
  child_items: Array<{
    item_key: string;
    bundled_item_id: number;
    id: number;
    name: string;
    quantity: ChildItemQuantity;
    price: MinorUnitAmount;
    variation: Record<string, string>;
  }>;
  child_item_keys: string[];
}

export interface BundleProductData {
  layout: string;
  items: Array<{
    id: number;
    optional: boolean;
    quantity: ChildItemQuantity;
    priced_individually: boolean;
    discount: number | null;
  }>;
}

// --- Product Add-Ons ---

export interface AddonCartItemField {
  field_label: string;
  field_type: string;
  value: string;
  price: MinorUnitAmount;
  price_type: string;
}

export interface AddonProductField {
  id: number;
  name: string;
  type: string;
  description: string;
  required: boolean;
  position: number;
  display: string;
  adjust_price: boolean;
  price: MinorUnitAmount;
  price_type: string;
  restrictions: boolean;
  min: number;
  max: number;
  limit_file_types: boolean;
  allowed_file_types: string[];
  options: Array<{ label: string; price: MinorUnitAmount; price_type: string; image: string }>;
}

// --- Pricing and discounts ---

/** Discount Rules (Flycart). `is_free_item` is on cart items only. */
export interface DiscountData {
  original_price: MinorUnitAmount;
  saved_amount: MinorUnitAmount;
  is_free_item?: boolean;
}

/** Advanced Dynamic Pricing (AlgolPlus). */
export interface DynamicPricingCartItemData {
  original_price: MinorUnitAmount;
  saved_amount: MinorUnitAmount;
  is_free_item: boolean;
  /** Titles of the rules applied. */
  rules: string[];
}

/** MSRP Pricing. A simple product has `msrp_price`; a variable one the min and max; the rest are `""`. */
export interface MsrpData {
  msrp_price: MinorUnitAmount | '';
  msrp_price_min: MinorUnitAmount | '';
  msrp_price_max: MinorUnitAmount | '';
}

// --- Other integrations ---

export interface PointsProductData {
  points_earned: number;
  /** `""` when the product sets no maximum. */
  max_discount: MinorUnitAmount | '';
}

export interface PointsCartData {
  points_balance: number;
  points_to_earn: number;
  /** The applied points redemption coupon, or `""`. */
  redemption_coupon: string;
}

/** Min/Max Quantities. */
export interface QuantityRulesData {
  minimum: number;
  maximum: number | null;
  group_of: number;
  combine_variations: boolean;
}

/** Dokan: the product's vendor (`id` 0 and empty values when the seller isn't a vendor). */
export interface VendorData {
  id: number;
  store_name: string;
  store_url: string;
  avatar: string;
  rating: { average: string; count: number };
}

/** Product Condition. */
export interface ProductConditionData {
  slug: string;
  label: string;
  schema_condition: string;
  custom_label: string;
}

/** WooCommerce Warranty: the warranty chosen for, or included with, a cart item. */
export interface WarrantyCartItemData {
  label: string;
  type: 'included' | 'addon';
  duration: string;
  cost: MinorUnitAmount;
}

/** WooCommerce Warranty: the warranty a product offers. */
export interface WarrantyProductData {
  type: 'included' | 'addon';
  label: string;
  options: Array<{ key: string; duration: string; cost: MinorUnitAmount }>;
}

// --- Where each one appears. Extend these for other plugins (see the top of this file). ---

/** `extensions` on the cart. */
export interface CartExtensions {
  /** Subscriptions: one entry per recurring cart, keyed by the subscription's item key. */
  recurring_totals?: Record<string, RecurringTotal>;
  points_and_rewards?: PointsCartData;
}

/** `extensions` on a cart item. */
export interface CartItemExtensions {
  subscription_data?: SubscriptionData;
  subscription_schemes?: CartItemSubscriptionSchemeOption[];
  /** Gifting for WooCommerce Subscriptions. */
  gift_recipient?: { email: string };
  booking_data?: BookingCartItemData;
  accommodation_booking_data?: AccommodationBookingCartItemData;
  composite_data?: CompositeCartItemData;
  bundle_data?: BundleCartItemData;
  addons?: AddonCartItemField[];
  discount?: DiscountData;
  adp?: DynamicPricingCartItemData;
  warranty?: WarrantyCartItemData;
}

/** `extensions` on a product. */
export interface ProductExtensions {
  subscription_data?: SubscriptionData;
  subscription_schemes?: SubscriptionSchemeOption[];
  /** Gifting for WooCommerce Subscriptions. */
  gifting?: { giftable: boolean };
  booking_data?: BookingProductData;
  accommodation_booking_data?: AccommodationBookingProductData;
  composite_data?: CompositeProductData;
  bundle_data?: BundleProductData;
  addons?: AddonProductField[];
  discount?: DiscountData;
  msrp_data?: MsrpData;
  points_and_rewards?: PointsProductData;
  quantity_rules?: QuantityRulesData;
  vendor?: VendorData;
  condition?: ProductConditionData;
  warranty?: WarrantyProductData;
}
