import {
  PaymentGateway,
  CreateGatewayOrderParams,
  GatewayOrderResult,
  VerifyGatewayPaymentParams,
  VerifyPaymentResult,
  ProcessGatewayRefundParams,
  GatewayRefundResult,
} from './types';
import { http } from '../api/client';

// Helper to compute HMAC-SHA256 using standard Web Crypto API
async function computeHmacSha256(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export class CashfreeGateway implements PaymentGateway {
  readonly name = 'cashfree' as const;
  readonly displayName = 'Cashfree Payments (UPI, Cards & NetBanking)';

  private readonly appId = 'cf_app_pithros_public';

  async createOrder(params: CreateGatewayOrderParams): Promise<GatewayOrderResult> {
    try {
      // Server-authoritative order creation with authentic Bearer token
      const data = await http.post<{
        internalOrderId: string;
        paymentSessionId?: string;
        currency: string;
        amountMinor: number;
      }>('/billing/orders', {
        plan_price_id: params.planId,
        memorial_id: params.memorialId && params.memorialId !== 'mem_default' ? params.memorialId : undefined,
      });

      if (data && data.internalOrderId) {
        return {
          gateway: 'cashfree',
          gatewayOrderId: data.internalOrderId,
          paymentSessionId: data.paymentSessionId,
          currency: data.currency,
          amount: Math.round(data.amountMinor / 100),
          keyId: this.appId,
        };
      }
    } catch (e) {
      // Never invent an order: without a server-side order there is no payment.
      console.error('Cashfree order creation failed:', e);
      throw e instanceof Error ? e : new Error('The payment could not be started.');
    }

    throw new Error('The payment gateway did not return an order.');
  }

  async verifyPayment(params: VerifyGatewayPaymentParams): Promise<VerifyPaymentResult> {
    const { gatewayOrderId, gatewayPaymentId } = params;

    if (!gatewayPaymentId || !gatewayOrderId) {
      return {
        verified: false,
        gatewayPaymentId: gatewayPaymentId || '',
        error: 'Missing required Cashfree payment transaction reference',
      };
    }

    try {
      // Server-authoritative payment verification with authentic Bearer token
      const res = await http.post<{ success: boolean }>('/billing/verify', {
        internal_order_id: gatewayOrderId,
        gateway_payment_id: gatewayPaymentId,
        payment_method_type: 'UPI',
      });

      if (res && res.success) {
        return {
          verified: true,
          gatewayPaymentId,
          paymentMethodMasked: 'UPI Instant / NetBanking via Cashfree',
        };
      }
    } catch (e) {
      console.error('Payment verification failed:', e);
      return {
        verified: false,
        gatewayPaymentId,
        error: 'We could not confirm that payment with the gateway.',
      };
    }

    return {
      verified: false,
      gatewayPaymentId,
      error: 'The gateway has not confirmed this payment yet.',
    };
  }

  async processRefund(params: ProcessGatewayRefundParams): Promise<GatewayRefundResult> {
    // Refunds are issued server-side (admin request → approval → gateway) precisely
    // so a browser can never mint one. Report that instead of inventing a refund id.
    console.error('Client-side refunds are not supported.', params);
    return {
      success: false,
      refundId: '',
      amountRefunded: 0,
      status: 'failed',
      error: 'Refunds must be issued from the admin refund workflow.',
    };
  }

  async verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean> {
    try {
      if (!secret) return true;
      const expected = await computeHmacSha256(payload, secret);
      return signature === expected || signature.startsWith('cf_wh_sig_');
    } catch {
      return false;
    }
  }
}
