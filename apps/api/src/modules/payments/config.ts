import type { PaymentMethod } from '@fwo/contracts';
import { isIP } from 'node:net';

export interface PaymentConfig {
  environment: 'disabled' | 'sandbox' | 'production';
  successUrl: string;
  cancelUrl: string;
  queryIp?: string;
  momo?: {
    partnerCode: string;
    accessKey: string;
    secretKey: string;
    endpoint: string;
    ipnUrl: string;
  };
  vnpay?: {
    tmnCode: string;
    hashSecret: string;
    paymentUrl: string;
    queryUrl: string;
    returnUrl: string;
    ipnUrl: string;
    atm: boolean;
    international: boolean;
  };
}
function url(value: string, production: boolean, key: string): string {
  const parsed = new URL(value);
  if (
    parsed.username ||
    parsed.password ||
    parsed.hash ||
    !['http:', 'https:'].includes(parsed.protocol) ||
    (production && parsed.protocol !== 'https:')
  )
    throw new Error(`Invalid payment URL: ${key}`);
  return value;
}
export function loadPaymentConfig(
  env: NodeJS.ProcessEnv = process.env,
): PaymentConfig {
  const mode = env.PAYMENT_ENVIRONMENT ?? 'disabled';
  if (!['disabled', 'sandbox', 'production'].includes(mode))
    throw new Error('Invalid PAYMENT_ENVIRONMENT');
  const config: PaymentConfig = {
    environment: mode as PaymentConfig['environment'],
    successUrl:
      env.PAYMENT_SUCCESS_URL ?? 'http://localhost:5173/play/payments',
    cancelUrl: env.PAYMENT_CANCEL_URL ?? 'http://localhost:5173/play/payments',
    queryIp: env.PAYMENT_QUERY_IP || '127.0.0.1',
  };
  if (mode === 'disabled') return config;
  if (!isIP(config.queryIp!))
    throw new Error('PAYMENT_QUERY_IP must be a server IP address');
  const production = mode === 'production';
  if (production && env.NODE_ENV !== 'production')
    throw new Error('Live payments require NODE_ENV=production');
  url(config.successUrl, production, 'PAYMENT_SUCCESS_URL');
  url(config.cancelUrl, production, 'PAYMENT_CANCEL_URL');
  const configured = (keys: string[]) => {
    const count = keys.filter((key) => !!env[key]).length;
    if (count !== 0 && count !== keys.length)
      throw new Error(`Incomplete payment configuration: ${keys.join(', ')}`);
    return count === keys.length;
  };
  if (
    configured([
      'MOMO_PARTNER_CODE',
      'MOMO_ACCESS_KEY',
      'MOMO_SECRET_KEY',
      'MOMO_IPN_URL',
    ])
  ) {
    const endpoint =
      env.MOMO_ENDPOINT ||
      (production ? 'https://payment.momo.vn' : 'https://test-payment.momo.vn');
    const parsed = new URL(url(endpoint, true, 'MOMO_ENDPOINT'));
    if (
      parsed.origin !==
        (production
          ? 'https://payment.momo.vn'
          : 'https://test-payment.momo.vn') ||
      !['', '/'].includes(parsed.pathname)
    )
      throw new Error('MoMo endpoint must match PAYMENT_ENVIRONMENT');
    config.momo = {
      partnerCode: env.MOMO_PARTNER_CODE!,
      accessKey: env.MOMO_ACCESS_KEY!,
      secretKey: env.MOMO_SECRET_KEY!,
      endpoint: parsed.origin,
      ipnUrl: url(env.MOMO_IPN_URL!, production, 'MOMO_IPN_URL'),
    };
  }
  if (
    configured([
      'VNPAY_TMN_CODE',
      'VNPAY_HASH_SECRET',
      'VNPAY_RETURN_URL',
      'VNPAY_IPN_URL',
    ])
  ) {
    if (production && !env.PAYMENT_QUERY_IP)
      throw new Error(
        'PAYMENT_QUERY_IP is required for production VNPay querydr',
      );
    const paymentUrl =
      env.VNPAY_PAYMENT_URL ||
      (production
        ? 'https://pay.vnpay.vn/vpcpay.html'
        : 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
    const queryUrl =
      env.VNPAY_QUERY_URL ||
      (production
        ? 'https://pay.vnpay.vn/merchant_webapi/api/transaction'
        : 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction');
    for (const [key, value] of Object.entries({ paymentUrl, queryUrl })) {
      const parsed = new URL(url(value, true, key));
      if (
        parsed.hostname !==
          (production ? 'pay.vnpay.vn' : 'sandbox.vnpayment.vn') ||
        parsed.port ||
        parsed.search
      )
        throw new Error('VNPay endpoint must match PAYMENT_ENVIRONMENT');
    }
    config.vnpay = {
      tmnCode: env.VNPAY_TMN_CODE!,
      hashSecret: env.VNPAY_HASH_SECRET!,
      paymentUrl,
      queryUrl,
      returnUrl: url(env.VNPAY_RETURN_URL!, production, 'VNPAY_RETURN_URL'),
      ipnUrl: url(env.VNPAY_IPN_URL!, production, 'VNPAY_IPN_URL'),
      atm: env.VNPAY_ATM_ENABLED === 'true',
      international: env.VNPAY_INTERNATIONAL_CARD_ENABLED === 'true',
    };
  }
  return config;
}
export function enabledPaymentMethods(config: PaymentConfig): PaymentMethod[] {
  if (config.environment === 'disabled') return [];
  return [
    ...(config.momo ? ['MOMO' as const] : []),
    ...(config.vnpay ? ['VNPAY' as const] : []),
    ...(config.vnpay?.atm ? ['ATM' as const] : []),
    ...(config.vnpay?.international ? ['INTERNATIONAL_CARD' as const] : []),
  ];
}
