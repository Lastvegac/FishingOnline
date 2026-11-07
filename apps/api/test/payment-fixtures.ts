import { createHmac } from 'node:crypto';
import type { PaymentConfig } from '../src/modules/payments/config.js';

export const testPaymentConfig: PaymentConfig = {
  environment: 'sandbox',
  successUrl: 'http://localhost:5173/play/payments',
  cancelUrl: 'http://localhost:5173/play/payments',
  momo: {
    partnerCode: 'TESTPARTNER',
    accessKey: 'test-access',
    secretKey: 'test-secret',
    endpoint: 'https://test-payment.momo.vn',
    ipnUrl: 'https://merchant.example/api/v1/payments/webhooks/momo',
  },
  vnpay: {
    tmnCode: 'TESTTMN1',
    hashSecret: 'test-hash-secret',
    paymentUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    queryUrl: 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction',
    returnUrl: 'http://localhost:5173/play/payments',
    ipnUrl: 'https://merchant.example/api/v1/payments/webhooks/vnpay',
    atm: true,
    international: true,
  },
};
export function signVnpay(p: Record<string, string>): Record<string, string> {
  const params = new URLSearchParams();
  for (const key of Object.keys(p).sort()) params.set(key, p[key]!);
  return {
    ...p,
    vnp_SecureHash: createHmac('sha512', testPaymentConfig.vnpay!.hashSecret)
      .update(params.toString())
      .digest('hex'),
  };
}
export function momoIpn(
  orderCode: string,
  requestId: string,
  transId: number,
  resultCode = 0,
  amount = 10000,
) {
  const p = {
    partnerCode: 'TESTPARTNER',
    orderId: orderCode,
    requestId,
    amount,
    orderInfo: `Thanh toan ${orderCode}`,
    orderType: 'momo_wallet',
    transId,
    resultCode,
    message: 'Successful.',
    payType: 'qr',
    responseTime: 1794052800000,
    extraData: '',
  };
  const raw = `accessKey=test-access&amount=${p.amount}&extraData=&message=Successful.&orderId=${orderCode}&orderInfo=${p.orderInfo}&orderType=momo_wallet&partnerCode=TESTPARTNER&payType=qr&requestId=${requestId}&responseTime=1794052800000&resultCode=${resultCode}&transId=${transId}`;
  return {
    ...p,
    signature: createHmac('sha256', 'test-secret').update(raw).digest('hex'),
  };
}
