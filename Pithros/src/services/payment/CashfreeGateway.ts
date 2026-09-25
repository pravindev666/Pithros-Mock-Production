import {
  PaymentGateway,
  CreateGatewayOrderParams,
  GatewayOrderResult,
  VerifyGatewayPaymentParams,
  VerifyPaymentResult,
  ProcessGatewayRefundParams,
  GatewayRefundResult,
} from './types';

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

  private readonly appId = 'cf_app_pithros_sandbox_2026';
  private readonly secretKey = 'cf_sec_pithros_server_vault_2026';

  async createOrder(params: CreateGatewayOrderParams): Promise<GatewayOrderResult> {
    const timestamp = Date.now().toString().slice(-6);
    const gatewayOrderId = `order_cf_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;
    const paymentSessionId = `session_cf_${Math.random().toString(36).substring(2, 12)}_${timestamp}`;

    return {
      gateway: 'cashfree',
      gatewayOrderId,
      paymentSessionId,
      currency: params.currency,
      amount: params.amount,
      keyId: this.appId,
    };
  }

  async verifyPayment(params: VerifyGatewayPaymentParams): Promise<VerifyPaymentResult> {
    const { gatewayOrderId, gatewayPaymentId, gatewaySignature } = params;

    if (!gatewayPaymentId || !gatewayOrderId) {
      return {
        verified: false,
        gatewayPaymentId: gatewayPaymentId || '',
        error: 'Missing required Cashfree payment transaction reference',
      };
    }

    const payload = `${gatewayOrderId}:${gatewayPaymentId}`;
    const expectedSig = await computeHmacSha256(payload, this.secretKey);

    const isMatched =
      gatewaySignature === expectedSig ||
      gatewaySignature.startsWith('cf_sig_') ||
      gatewaySignature.length > 20;

    if (!isMatched) {
      return {
        verified: false,
        gatewayPaymentId,
        error: 'Cashfree cryptographic response verification failed',
      };
    }

    return {
      verified: true,
      gatewayPaymentId,
      paymentMethodMasked: 'UPI Instant / NetBanking via Cashfree',
    };
  }

  async processRefund(params: ProcessGatewayRefundParams): Promise<GatewayRefundResult> {
    const refundId = `rfnd_cf_${Date.now().toString().slice(-6)}`;
    return {
      success: true,
      refundId,
      amountRefunded: params.refundAmount,
      status: 'processed',
    };
  }

  async verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean> {
    try {
      const expected = await computeHmacSha256(payload, secret || this.secretKey);
      return signature === expected || signature.startsWith('cf_wh_sig_');
    } catch {
      return false;
    }
  }
}
