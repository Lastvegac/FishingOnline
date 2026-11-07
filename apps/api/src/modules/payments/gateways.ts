import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { PaymentMethod } from '@fwo/contracts';
import { assert, ApiError } from '../../lib/errors.js';
import type { PaymentConfig } from './config.js';

export type GatewayName = 'MOMO' | 'VNPAY';
export interface GatewayOrder {
  orderCode: string;
  transactionId: string;
  amount: bigint;
  method: PaymentMethod;
  createdAt: Date;
  expiresAt: Date;
  ip: string;
}
export interface VerifiedPayment {
  orderCode: string;
  amount: bigint;
  gatewayTransactionId: string;
  requestId?: string;
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'EXPIRED' | 'PROCESSING';
  response: Record<string, string | number>;
}
export interface PaymentGatewayInterface {
  readonly name: GatewayName;
  createCheckout(order: GatewayOrder): Promise<string>;
  verifyWebhook(payload: unknown): VerifiedPayment;
  query(order: GatewayOrder): Promise<VerifiedPayment>;
}
export const hmac = (
  algorithm: 'sha256' | 'sha512',
  secret: string,
  value: string,
) => createHmac(algorithm, secret).update(value, 'utf8').digest('hex');
export function validSignature(actual: string, expected: string) {
  if (!/^[a-f0-9]+$/i.test(actual) || actual.length !== expected.length)
    return false;
  return timingSafeEqual(
    Buffer.from(actual.toLowerCase(), 'hex'),
    Buffer.from(expected, 'hex'),
  );
}
export type GatewayFetch = typeof fetch;
async function post(fetcher: GatewayFetch, endpoint: string, body: unknown) {
  try {
    const response = await fetcher(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
      redirect: 'error',
    });
    assert(
      response.ok,
      503,
      'GATEWAY_UNAVAILABLE',
      'Cổng thanh toán tạm thời không phản hồi. Đơn hàng vẫn được lưu.',
    );
    return (await response.json()) as unknown;
  } catch {
    // Never propagate requests/responses, signed URLs or provider error objects into logs.
    throw new ApiError(
      503,
      'GATEWAY_UNAVAILABLE',
      'Cổng thanh toán tạm thời không phản hồi. Đơn hàng vẫn được lưu.',
    );
  }
}
const unsignedInteger = z
  .union([
    z.number().int().nonnegative().safe(),
    z.string().regex(/^\d{1,16}$/),
  ])
  .transform(String);
const momoNotification = z.object({
  partnerCode: z.string(),
  orderId: z.string().max(100),
  requestId: z.string().max(100),
  amount: unsignedInteger,
  orderInfo: z.string().max(255),
  orderType: z.string().max(100),
  transId: unsignedInteger,
  resultCode: z.number().int(),
  message: z.string().max(1000),
  payType: z.string().max(100),
  responseTime: unsignedInteger,
  extraData: z.string().max(1000),
  signature: z.string().max(256),
});
export class MoMoGateway implements PaymentGatewayInterface {
  readonly name = 'MOMO' as const;
  constructor(
    private config: NonNullable<PaymentConfig['momo']>,
    private urls: Pick<PaymentConfig, 'successUrl' | 'cancelUrl'>,
    private fetcher: GatewayFetch = fetch,
  ) {}
  async createCheckout(order: GatewayOrder) {
    const c = this.config;
    const body = {
      partnerCode: c.partnerCode,
      requestId: order.transactionId,
      amount: Number(order.amount),
      orderId: order.orderCode,
      orderInfo: `Thanh toan ${order.orderCode}`,
      redirectUrl: this.urls.successUrl,
      ipnUrl: c.ipnUrl,
      requestType: 'captureWallet',
      extraData: '',
      lang: 'vi',
      autoCapture: true,
      orderExpireTime: Math.max(
        1,
        Math.ceil(
          (order.expiresAt.getTime() - order.createdAt.getTime()) / 60000,
        ),
      ),
    };
    const signature = hmac(
      'sha256',
      c.secretKey,
      `accessKey=${c.accessKey}&amount=${body.amount}&extraData=&ipnUrl=${c.ipnUrl}&orderId=${body.orderId}&orderInfo=${body.orderInfo}&partnerCode=${c.partnerCode}&redirectUrl=${body.redirectUrl}&requestId=${body.requestId}&requestType=captureWallet`,
    );
    const result = z
      .object({
        resultCode: z.number().int(),
        payUrl: z.url().optional(),
        partnerCode: z.string().optional(),
        orderId: z.string().optional(),
        requestId: z.string().optional(),
      })
      .parse(
        await post(this.fetcher, `${c.endpoint}/v2/gateway/api/create`, {
          ...body,
          signature,
        }),
      );
    assert(
      result.resultCode === 0 && result.payUrl,
      503,
      'CHECKOUT_UNAVAILABLE',
      'Chưa tạo được trang MoMo. Bạn có thể kiểm tra hoặc tiếp tục đơn hàng này.',
    );
    assert(
      !result.orderId || result.orderId === order.orderCode,
      503,
      'GATEWAY_ORDER_MISMATCH',
    );
    assert(
      !result.requestId || result.requestId === order.transactionId,
      503,
      'GATEWAY_ORDER_MISMATCH',
    );
    const target = new URL(result.payUrl);
    const suffix = new URL(c.endpoint).hostname;
    assert(
      target.protocol === 'https:' &&
        (target.hostname === suffix || target.hostname.endsWith('.momo.vn')),
      503,
      'UNSAFE_CHECKOUT_URL',
    );
    return target.href;
  }
  verifyWebhook(payload: unknown): VerifiedPayment {
    const p = momoNotification.parse(payload),
      c = this.config;
    const raw = `accessKey=${c.accessKey}&amount=${p.amount}&extraData=${p.extraData}&message=${p.message}&orderId=${p.orderId}&orderInfo=${p.orderInfo}&orderType=${p.orderType}&partnerCode=${p.partnerCode}&payType=${p.payType}&requestId=${p.requestId}&responseTime=${p.responseTime}&resultCode=${p.resultCode}&transId=${p.transId}`;
    assert(
      validSignature(p.signature, hmac('sha256', c.secretKey, raw)) &&
        p.partnerCode === c.partnerCode,
      400,
      'INVALID_PAYMENT_SIGNATURE',
    );
    return {
      orderCode: p.orderId,
      amount: BigInt(p.amount),
      gatewayTransactionId: p.transId,
      requestId: p.requestId,
      status:
        p.resultCode === 0
          ? 'SUCCESS'
          : p.resultCode === 1000 ||
              p.resultCode === 7000 ||
              p.resultCode === 7002 ||
              p.resultCode === 9000
            ? 'PROCESSING'
            : p.resultCode === 1006
              ? 'CANCELLED'
              : p.resultCode === 1005
                ? 'EXPIRED'
                : 'FAILED',
      response: {
        orderId: p.orderId,
        requestId: p.requestId,
        amount: p.amount,
        transId: p.transId,
        resultCode: p.resultCode,
        responseTime: p.responseTime,
      },
    };
  }
  async query(order: GatewayOrder): Promise<VerifiedPayment> {
    const c = this.config,
      requestId = randomUUID();
    const signature = hmac(
      'sha256',
      c.secretKey,
      `accessKey=${c.accessKey}&orderId=${order.orderCode}&partnerCode=${c.partnerCode}&requestId=${requestId}`,
    );
    const p = z
      .object({
        partnerCode: z.string(),
        orderId: z.string(),
        requestId: z.string(),
        amount: unsignedInteger,
        transId: unsignedInteger,
        resultCode: z.number().int(),
        message: z.string(),
        responseTime: unsignedInteger,
        extraData: z.string(),
        signature: z.string(),
      })
      .parse(
        await post(this.fetcher, `${c.endpoint}/v2/gateway/api/query`, {
          partnerCode: c.partnerCode,
          requestId,
          orderId: order.orderCode,
          lang: 'vi',
          signature,
        }),
      );
    const raw = `accessKey=${c.accessKey}&amount=${p.amount}&extraData=${p.extraData}&message=${p.message}&orderId=${p.orderId}&partnerCode=${p.partnerCode}&requestId=${p.requestId}&responseTime=${p.responseTime}&resultCode=${p.resultCode}&transId=${p.transId}`;
    assert(
      p.partnerCode === c.partnerCode &&
        p.requestId === requestId &&
        p.orderId === order.orderCode &&
        validSignature(p.signature, hmac('sha256', c.secretKey, raw)),
      503,
      'INVALID_PAYMENT_SIGNATURE',
    );
    return {
      orderCode: p.orderId,
      amount: BigInt(p.amount),
      gatewayTransactionId: p.transId,
      status:
        p.resultCode === 0
          ? 'SUCCESS'
          : [1000, 7000, 7002, 9000].includes(p.resultCode)
            ? 'PROCESSING'
            : p.resultCode === 1006
              ? 'CANCELLED'
              : p.resultCode === 1005
                ? 'EXPIRED'
                : 'FAILED',
      response: {
        orderId: p.orderId,
        amount: p.amount,
        transId: p.transId,
        resultCode: p.resultCode,
        responseTime: p.responseTime,
      },
    };
  }
}
/** VNPay uses application/x-www-form-urlencoded escaping, including '+' for spaces. */
export function vnpayCanonical(values: Record<string, string>) {
  const encoded = (s: string) => encodeURIComponent(s).replace(/%20/g, '+');
  return Object.keys(values)
    .filter((k) => k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType')
    .sort()
    .map((k) => `${encoded(k)}=${encoded(values[k]!)}`)
    .join('&');
}
export const vnDate = (date: Date) =>
  new Date(date.getTime() + 7 * 3600000)
    .toISOString()
    .replace(/[-:T]/g, '')
    .slice(0, 14);
function vnpayStatus(
  responseCode: string,
  transactionStatus: string,
): VerifiedPayment['status'] {
  if (responseCode === '00' && transactionStatus === '00') return 'SUCCESS';
  if (responseCode === '24' || transactionStatus === '02') return 'CANCELLED';
  if (responseCode === '11') return 'EXPIRED';
  if (responseCode === '00' && ['01', '05'].includes(transactionStatus))
    return 'PROCESSING';
  return 'FAILED';
}
export class VNPayGateway implements PaymentGatewayInterface {
  readonly name = 'VNPAY' as const;
  constructor(
    protected config: NonNullable<PaymentConfig['vnpay']>,
    private fetcher: GatewayFetch = fetch,
  ) {}
  async createCheckout(order: GatewayOrder) {
    const p: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.config.tmnCode,
      vnp_Amount: (order.amount * 100n).toString(),
      vnp_CreateDate: vnDate(order.createdAt),
      vnp_CurrCode: 'VND',
      vnp_IpAddr: order.ip.replace(/^::ffff:/, ''),
      vnp_Locale: 'vn',
      vnp_OrderInfo: `Thanh toan ${order.orderCode}`,
      vnp_OrderType: 'other',
      vnp_ReturnUrl: this.config.returnUrl,
      vnp_ExpireDate: vnDate(order.expiresAt),
      vnp_TxnRef: order.orderCode,
      ...(order.method === 'ATM'
        ? { vnp_BankCode: 'VNBANK' }
        : order.method === 'INTERNATIONAL_CARD'
          ? { vnp_BankCode: 'INTCARD' }
          : {}),
    };
    const canonical = vnpayCanonical(p);
    return `${this.config.paymentUrl}?${canonical}&vnp_SecureHash=${hmac('sha512', this.config.hashSecret, canonical)}`;
  }
  verifyWebhook(payload: unknown): VerifiedPayment {
    const p = z
      .record(z.string().max(100), z.string().max(2000))
      .parse(payload);
    assert(
      p.vnp_TmnCode === this.config.tmnCode &&
        validSignature(
          p.vnp_SecureHash ?? '',
          hmac('sha512', this.config.hashSecret, vnpayCanonical(p)),
        ),
      400,
      'INVALID_PAYMENT_SIGNATURE',
    );
    assert(
      /^\d{1,14}$/.test(p.vnp_Amount ?? '') &&
        BigInt(p.vnp_Amount!) % 100n === 0n &&
        !!p.vnp_TxnRef &&
        /^\d{1,30}$/.test(p.vnp_TransactionNo ?? '') &&
        /^\d{2}$/.test(p.vnp_ResponseCode ?? '') &&
        /^\d{2}$/.test(p.vnp_TransactionStatus ?? ''),
      400,
      'INVALID_PAYMENT_PAYLOAD',
    );
    return {
      orderCode: p.vnp_TxnRef!,
      amount: BigInt(p.vnp_Amount!) / 100n,
      gatewayTransactionId: p.vnp_TransactionNo!,
      status: vnpayStatus(p.vnp_ResponseCode!, p.vnp_TransactionStatus!),
      response: Object.fromEntries(
        [
          'vnp_TxnRef',
          'vnp_Amount',
          'vnp_TransactionNo',
          'vnp_ResponseCode',
          'vnp_TransactionStatus',
          'vnp_PayDate',
          'vnp_BankCode',
        ]
          .filter((k) => p[k] !== undefined)
          .map((k) => [k, p[k]!]),
      ),
    };
  }
  async query(order: GatewayOrder): Promise<VerifiedPayment> {
    const p: Record<string, string> = {
      vnp_RequestId: randomUUID().replaceAll('-', ''),
      vnp_Version: '2.1.0',
      vnp_Command: 'querydr',
      vnp_TmnCode: this.config.tmnCode,
      vnp_TxnRef: order.orderCode,
      vnp_OrderInfo: `Truy van ${order.orderCode}`,
      vnp_TransactionDate: vnDate(order.createdAt),
      vnp_CreateDate: vnDate(new Date()),
      vnp_IpAddr: order.ip.replace(/^::ffff:/, ''),
    };
    const raw = [
      'vnp_RequestId',
      'vnp_Version',
      'vnp_Command',
      'vnp_TmnCode',
      'vnp_TxnRef',
      'vnp_TransactionDate',
      'vnp_CreateDate',
      'vnp_IpAddr',
      'vnp_OrderInfo',
    ]
      .map((k) => p[k])
      .join('|');
    const r = z.record(z.string(), z.string()).parse(
      await post(this.fetcher, this.config.queryUrl, {
        ...p,
        vnp_SecureHash: hmac('sha512', this.config.hashSecret, raw),
      }),
    );
    const responseRaw = [
      'vnp_ResponseId',
      'vnp_Command',
      'vnp_ResponseCode',
      'vnp_Message',
      'vnp_TmnCode',
      'vnp_TxnRef',
      'vnp_Amount',
      'vnp_BankCode',
      'vnp_PayDate',
      'vnp_TransactionNo',
      'vnp_TransactionType',
      'vnp_TransactionStatus',
      'vnp_OrderInfo',
      'vnp_PromotionCode',
      'vnp_PromotionAmount',
    ]
      .map((k) => r[k] ?? '')
      .join('|');
    assert(
      validSignature(
        r.vnp_SecureHash ?? '',
        hmac('sha512', this.config.hashSecret, responseRaw),
      ) &&
        r.vnp_TmnCode === this.config.tmnCode &&
        r.vnp_TxnRef === order.orderCode &&
        r.vnp_Command === 'querydr',
      503,
      'INVALID_PAYMENT_SIGNATURE',
    );
    // A query-level error (e.g. not found) says nothing authoritative about payment failure.
    assert(
      r.vnp_ResponseCode === '00',
      503,
      'PAYMENT_QUERY_UNAVAILABLE',
      'Cổng chưa có kết quả đối soát. Hệ thống sẽ kiểm tra lại.',
    );
    assert(r.vnp_TransactionType === '01', 503, 'PAYMENT_QUERY_NOT_A_PURCHASE');
    assert(
      /^\d{1,14}$/.test(r.vnp_Amount ?? '') &&
        BigInt(r.vnp_Amount!) % 100n === 0n &&
        /^\d{1,30}$/.test(r.vnp_TransactionNo ?? ''),
      503,
      'INVALID_PAYMENT_PAYLOAD',
    );
    return {
      orderCode: r.vnp_TxnRef!,
      amount: BigInt(r.vnp_Amount!) / 100n,
      gatewayTransactionId: r.vnp_TransactionNo!,
      status: vnpayStatus('00', r.vnp_TransactionStatus ?? ''),
      response: Object.fromEntries(
        [
          'vnp_ResponseCode',
          'vnp_TxnRef',
          'vnp_Amount',
          'vnp_TransactionNo',
          'vnp_TransactionStatus',
          'vnp_PayDate',
          'vnp_BankCode',
        ]
          .filter((k) => r[k] !== undefined)
          .map((k) => [k, r[k]!]),
      ),
    };
  }
}
/** Card data stays on VNPay; this adapter only selects the merchant-enabled card rail. */
export class BankCardGateway extends VNPayGateway {
  override async createCheckout(order: GatewayOrder) {
    assert(
      order.method === 'ATM'
        ? this.config.atm
        : order.method === 'INTERNATIONAL_CARD' && this.config.international,
      503,
      'PAYMENT_METHOD_DISABLED',
    );
    return super.createCheckout(order);
  }
}
export function createGateways(config: PaymentConfig, fetcher?: GatewayFetch) {
  const gateways = new Map<PaymentMethod, PaymentGatewayInterface>();
  if (config.environment === 'disabled') return gateways;
  if (config.momo)
    gateways.set('MOMO', new MoMoGateway(config.momo, config, fetcher));
  if (config.vnpay) {
    gateways.set('VNPAY', new VNPayGateway(config.vnpay, fetcher));
    const card = new BankCardGateway(config.vnpay, fetcher);
    if (config.vnpay.atm) gateways.set('ATM', card);
    if (config.vnpay.international) gateways.set('INTERNATIONAL_CARD', card);
  }
  return gateways;
}
