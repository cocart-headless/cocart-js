// Core
export { CoCart } from './cocart.js';
export { Response } from './response.js';
export { Paginator } from './paginator.js';
export { JwtManager } from './jwt-manager.js';
export { SessionManager } from './session-manager.js';

// Endpoints
export { Account } from './endpoints/account.js';
export { Endpoint } from './endpoints/endpoint.js';
export { Cart } from './endpoints/cart.js';
export { Products } from './endpoints/products.js';
export { Store } from './endpoints/store.js';
export { Sessions } from './endpoints/sessions.js';

// Exceptions
export { CoCartError } from './exceptions/cocart-error.js';
export { AuthenticationError } from './exceptions/authentication-error.js';
export { TwoFactorAuthRequiredError } from './exceptions/two-factor-auth-required-error.js';
export { ValidationError } from './exceptions/validation-error.js';
export { VersionError } from './exceptions/version-error.js';

// Utilities
export { CurrencyFormatter } from './currency-formatter.js';
export { TimezoneHelper } from './timezone.js';
export { validateProductId, validateQuantity, validateEmail } from './validation.js';

// i18n
export { registerLocale, setLocale, getLocale, t } from './i18n/i18n.js';
export type { MessageKey, MessageParams, MessageCatalog } from './i18n/i18n.js';

// Storage
export type { StorageInterface } from './storage/storage.interface.js';
export { MemoryStorage } from './storage/memory-storage.js';
export { LocalStorage } from './storage/local-storage.js';
export { EncryptedStorage } from './storage/encrypted-storage.js';
export { CookieStorage, readCookie } from './storage/cookie-storage.js';
export type { CookieStorageOptions } from './storage/cookie-storage.js';

// Types
export type {
  CoCartOptions, JwtOptions, TwoFactorAuthChallenge, CartItemData, AuthCredentials, CoCartExtension, CoCartExtensionRegistry,
  // Response types
  CurrencyInfo, CartItem, CartItemImage, CartTotals, CartCustomer, CustomerAddress,
  CartCoupon, CartFee, ShippingRate, ShippingPackage, CrossSellProduct, CartResponse,
  Product, ProductImage, ProductCategory, ProductTag, ProductAttribute, ProductPrices,
  ProductVariation, ProductReview, StockStatus, StoreInfo, SessionItem,
  CoCartSchemas, CartTotalsBreakdown, CartBillingAddress, CartShippingAddress, CartShipping, CartTax,
  ProductAttributeDetail, ProductVariationSummary, ProductCategoryDetail,
  // Parameter types
  PaginationParams, SortOrder, ProductOrderBy, ProductListParams, ProductParams, CartGetParams, AddItemOptions,
  // Event types
  RequestEvent, ResponseEvent, ErrorEvent, RetryEvent, CoCartEventMap, CoCartEventListener,
  // Account types
  AccountAddress, AccountUser, AccountProfile, AccountOrderSummary, AccountOrdersResponse,
  AccountOrderDetail, AccountDownload, AccountUpdateInput, AccountChangePasswordInput, AccountOrdersParams,
  RegisterCustomerInput, RegisteredCustomer,
  AccountAddressUpdateInput, AccountCancelOrderResult, AccountSubscriptionPaymentMethodInput, OrderWithdrawalInput,
  ProductShippingRatesParams, ProductReviewInput, RateLimitInfo,
} from './cocart.types.js';

// Extension data (CoCart Plus integrations). The three location interfaces can be augmented.
export type {
  CartExtensions, CartItemExtensions, ProductExtensions, MinorUnitAmount,
  SubscriptionData, SubscriptionSchemeOption, CartItemSubscriptionSchemeOption, RecurringTotal,
  BookingCartItemData, BookingProductData, AccommodationBookingCartItemData, AccommodationBookingProductData,
  ChildItemQuantity, CompositeCartItemComponent, CompositeCartItemData, CompositeProductData,
  BundleCartItemData, BundleProductData, AddonCartItemField, AddonProductField,
  DiscountData, DynamicPricingCartItemData, MsrpData, PointsProductData, PointsCartData,
  QuantityRulesData, VendorData, ProductConditionData, WarrantyCartItemData, WarrantyProductData,
} from './extensions.types.js';
