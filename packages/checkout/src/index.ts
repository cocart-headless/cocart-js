export { CheckoutClient } from './checkout.js';
export { createCheckout, createGatewayAdapter } from './extension.js';
export {
  createAuthorizeNetGateway,
  createBankTransferGateway,
  createCashOnDeliveryGateway,
  createCheckPaymentGateway,
  createPayPalGateway,
  createStripeExpressGateway,
  createStripeGateway,
} from './gateways.js';
export {
  createCheckoutTheme,
  createModernCheckoutTheme,
  createTailwindCheckoutTheme,
  createShadcnCheckoutTheme,
  MODERN_VARIABLES,
  TAILWIND_VARIABLES,
  SHADCN_VARIABLES,
} from './presets.js';
export { resolveTheme, getPresetVariables, MODERN_VARIABLES_DARK, TAILWIND_VARIABLES_DARK, SHADCN_VARIABLES_DARK } from './theme-engine.js';

export type {
  AuthorizeNetGatewayOptions,
  BankTransferGatewayOptions,
  CashOnDeliveryGatewayOptions,
  CheckPaymentGatewayOptions,
  CheckoutExpressBar,
  CheckoutExpressBarGateway,
  CheckoutOrderSummary,
  CheckoutShippingPackage,
  CheckoutShippingRate,
  CheckoutSummaryCoupon,
  CheckoutSummaryItem,
  CheckoutSummaryTotals,
  OfflineGatewayOptions,
  StripeExpressGatewayOptions,
  StripeInstance,
  StripeElementsInstance,
  CheckoutAddressInput,
  CheckoutExtension,
  CheckoutOptions,
  CheckoutFieldType,
  CheckoutFormDefinition,
  CheckoutFormField,
  CheckoutFormFieldOption,
  CheckoutFormSection,
  CheckoutGatewayAdapter,
  CheckoutGatewayPresentation,
  CheckoutGatewayRenderContext,
  CheckoutGatewayTokenizeContext,
  CheckoutPaymentContextRequest,
  CheckoutPaymentMethod,
  CheckoutPaymentMethodsResponse,
  CheckoutProcessInput,
  CheckoutSDK,
  CheckoutSDKOptions,
  CheckoutState,
  CheckoutSubmitInput,
  CheckoutSubmitResult,
  CheckoutTheme,
  CheckoutThemeVariables,
  CheckoutThemeRules,
  CheckoutUpdateInput,
  PayPalGatewayOptions,
  StripeGatewayOptions,
} from './types.js';

declare module '@cocartheadless/sdk' {
  interface CoCartExtensionRegistry {
    checkout: import('./types.js').CheckoutSDK;
  }
}
