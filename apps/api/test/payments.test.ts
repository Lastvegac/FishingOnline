import { randomUUID, createHmac } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import {
  paymentOrderInputSchema,
  paymentProductInputSchema,
} from '@fwo/contracts';
import {
  MoMoGateway,
  VNPayGateway,
  BankCardGateway,
  hmac,
  validSignature,
  vnDate,
} from '../src/modules/payments/gateways.js';
import type {
  GatewayFetch,
  GatewayOrder,
} from '../src/modules/payments/gateways.js';
import {
  loadPaymentConfig,
  enabledPaymentMethods,
} from '../src/modules/payments/config.js';
import {
  testPaymentConfig as config,
  signVnpay,
  momoIpn,
} from './payment-fixtures.js';

const order: GatewayOrder = {
  orderCode: 'FW123',
  transactionId: randomUUID(),
  amount: 10000n,
  method: 'VNPAY',
  createdAt: new Date('2026-11-07T01:00:00Z'),
  expiresAt: new Date('2026-11-07T01:15:00Z'),
  ip: '127.0.0.1',
};
describe('payment contracts and configuration', () => {
  it('rejects client prices, status, fractional quantities and invalid product bundles', () => {
    expect(
      paymentOrderInputSchema.safeParse({
        productId: randomUUID(),
        quantity: 1,
        method: 'VNPAY',
        amount: 1,
      }).success,
    ).toBe(false);
    expect(
      paymentOrderInputSchema.safeParse({
        productId: randomUUID(),
        quantity: 1.1,
        method: 'VNPAY',
      }).success,
    ).toBe(false);
    expect(
      paymentProductInputSchema.safeParse({
        name: 'Gói',
        description: 'Đồ câu',
        amountVnd: '10000',
        active: true,
        items: [{ itemId: randomUUID(), kind: 'ROD', quantity: 2 }],
        reason: 'Test configuration',
      }).success,
    ).toBe(false);
  });
  it('defaults disabled, refuses partial or mixed live configuration, and gates card capabilities', () => {
    expect(enabledPaymentMethods(loadPaymentConfig({}))).toEqual([]);
    expect(() =>
      loadPaymentConfig({
        PAYMENT_ENVIRONMENT: 'sandbox',
        MOMO_PARTNER_CODE: 'test',
      }),
    ).toThrow('Incomplete');
    expect(() =>
      loadPaymentConfig({
        PAYMENT_ENVIRONMENT: 'production',
        NODE_ENV: 'test',
      }),
    ).toThrow('Live payments');
    expect(
      enabledPaymentMethods({
        ...config,
        vnpay: { ...config.vnpay!, atm: false, international: false },
      }),
    ).toEqual(['MOMO', 'VNPAY']);
  });
});
describe('provider cryptography and hosted checkout', () => {
  it('matches RFC 4231 HMAC SHA256 test case and rejects malformed signatures', () => {
    expect(hmac('sha256', 'Jefe', 'what do ya want for nothing?')).toBe(
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    );
    expect(validSignature('zz', '00')).toBe(false);
    expect(validSignature('ab', 'abcd')).toBe(false);
  });
  it('verifies MoMo IPN and rejects altered amount, account and signature', () => {
    const gateway = new MoMoGateway(config.momo!, config);
    const payload = momoIpn(order.orderCode, order.transactionId, 12345);
    expect(gateway.verifyWebhook(payload)).toMatchObject({
      amount: 10000n,
      status: 'SUCCESS',
      requestId: order.transactionId,
    });
    for (const change of [
      { amount: 1 },
      { partnerCode: 'OTHER' },
      { signature: '0'.repeat(64) },
    ])
      expect(() => gateway.verifyWebhook({ ...payload, ...change })).toThrow();
    expect(
      gateway.verifyWebhook(
        momoIpn(order.orderCode, order.transactionId, 12345, 1006),
      ).status,
    ).toBe('CANCELLED');
  });
  it('signs backend MoMo request and handles provider outages without a live transaction', async () => {
    let sent: Record<string, unknown> = {};
    const fetcher: GatewayFetch = async (_url, init) => {
      sent = JSON.parse(String(init!.body));
      return new Response(
        JSON.stringify({
          resultCode: 0,
          payUrl: 'https://test-payment.momo.vn/checkout/test',
        }),
      );
    };
    expect(
      await new MoMoGateway(config.momo!, config, fetcher).createCheckout({
        ...order,
        method: 'MOMO',
      }),
    ).toContain('momo.vn');
    expect(sent).toMatchObject({
      amount: 10000,
      orderId: 'FW123',
      requestId: order.transactionId,
      autoCapture: true,
    });
    const raw = `accessKey=test-access&amount=10000&extraData=&ipnUrl=${config.momo!.ipnUrl}&orderId=FW123&orderInfo=Thanh toan FW123&partnerCode=TESTPARTNER&redirectUrl=${config.successUrl}&requestId=${order.transactionId}&requestType=captureWallet`;
    expect(sent.signature).toBe(
      createHmac('sha256', 'test-secret').update(raw).digest('hex'),
    );
    await expect(
      new MoMoGateway(config.momo!, config, async () => {
        throw new Error('secret-containing-provider-error');
      }).createCheckout(order),
    ).rejects.toThrow('Cổng thanh toán');
  });
  it('builds VNPay URL with exact VND scaling, form encoding and VN time', async () => {
    const url = new URL(
      await new VNPayGateway(config.vnpay!).createCheckout(order),
    );
    expect(url.searchParams.get('vnp_Amount')).toBe('1000000');
    expect(url.searchParams.get('vnp_CreateDate')).toBe('20261107080000');
    expect(vnDate(order.expiresAt)).toBe('20261107081500');
    const signature = url.searchParams.get('vnp_SecureHash');
    url.searchParams.delete('vnp_SecureHash');
    expect(signature).toBe(
      createHmac('sha512', config.vnpay!.hashSecret)
        .update(url.searchParams.toString())
        .digest('hex'),
    );
  });
  it('requires both VNPay result codes, authenticates all fields and rejects amount rounding', () => {
    const gateway = new VNPayGateway(config.vnpay!);
    const base = {
      vnp_TmnCode: 'TESTTMN1',
      vnp_TxnRef: 'FW123',
      vnp_Amount: '1000000',
      vnp_TransactionNo: '12345',
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
    };
    expect(gateway.verifyWebhook(signVnpay(base)).status).toBe('SUCCESS');
    expect(
      gateway.verifyWebhook(signVnpay({ ...base, vnp_TransactionStatus: '01' }))
        .status,
    ).toBe('PROCESSING');
    expect(() =>
      gateway.verifyWebhook({ ...signVnpay(base), vnp_TxnRef: 'OTHER' }),
    ).toThrow();
    expect(() =>
      gateway.verifyWebhook(signVnpay({ ...base, vnp_Amount: '1000001' })),
    ).toThrow();
    expect(() =>
      gateway.verifyWebhook({ ...base, vnp_Amount: ['1000000', '1'] }),
    ).toThrow();
  });
  it('routes ATM and international cards exclusively to enabled VNPay hosted rails', async () => {
    const gateway = new BankCardGateway(config.vnpay!);
    expect(
      new URL(
        await gateway.createCheckout({ ...order, method: 'ATM' }),
      ).searchParams.get('vnp_BankCode'),
    ).toBe('VNBANK');
    expect(
      new URL(
        await gateway.createCheckout({
          ...order,
          method: 'INTERNATIONAL_CARD',
        }),
      ).searchParams.get('vnp_BankCode'),
    ).toBe('INTCARD');
    await expect(
      new BankCardGateway({
        ...config.vnpay!,
        international: false,
      }).createCheckout({ ...order, method: 'INTERNATIONAL_CARD' }),
    ).rejects.toThrow();
  });
  it('verifies the pipe-delimited VNPay query response before accepting a receipt', async () => {
    const r: Record<string, string> = {
      vnp_ResponseId: 'QUERY123',
      vnp_Command: 'querydr',
      vnp_ResponseCode: '00',
      vnp_Message: 'Success',
      vnp_TmnCode: 'TESTTMN1',
      vnp_TxnRef: 'FW123',
      vnp_Amount: '1000000',
      vnp_BankCode: 'NCB',
      vnp_PayDate: '20261107080100',
      vnp_TransactionNo: '12345',
      vnp_TransactionType: '01',
      vnp_TransactionStatus: '00',
      vnp_OrderInfo: 'Truy van FW123',
      vnp_PromotionCode: '',
      vnp_PromotionAmount: '',
    };
    const raw = Object.values(r).join('|');
    r.vnp_SecureHash = createHmac('sha512', config.vnpay!.hashSecret)
      .update(raw)
      .digest('hex');
    const fetcher: GatewayFetch = async () => new Response(JSON.stringify(r));
    expect(
      (await new VNPayGateway(config.vnpay!, fetcher).query(order)).status,
    ).toBe('SUCCESS');
    r.vnp_Amount = '1';
    await expect(
      new VNPayGateway(config.vnpay!, fetcher).query(order),
    ).rejects.toThrow();
  });
});
