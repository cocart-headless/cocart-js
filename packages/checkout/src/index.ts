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
export { bareCheckoutTheme, createTailwindCheckoutTheme, shadcnCheckoutTheme } from './presets.js';

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
  CheckoutUpdateInput,
  PayPalGatewayOptions,
  StripeGatewayOptions,
} from './types.js';

declare module '@cocartheadless/sdk' {
  interface CoCartExtensionRegistry {
    checkout: import('./types.js').CheckoutSDK;
  }
}
