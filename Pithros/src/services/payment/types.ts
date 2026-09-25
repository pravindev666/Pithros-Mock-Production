import { PaymentRecord, PaymentStatus } from '../../types';

export interface CreateGatewayOrderParams {
  internalPaymentId: string;
  amount: number;
  currency: string;
  planId: string;
  planName: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  memorialId: string;
  memorialName: string;
}

export interface GatewayOrderResult {
  gateway: 'razorpay' | 'cashfree';
  gatewayOrderId: string;
  paymentSessionId?: string; // Cashfree uses payment_session_id
  currency: string;
  amount: number;
  keyId?: string; // Public key for client invocation
}

export interface VerifyGatewayPaymentParams {
  internalPaymentId: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  gatewaySignature: string;
}

export interface VerifyPaymentResult {
  verified: boolean;
  gatewayPaymentId: string;
  paymentMethodMasked?: string;
  error?: string;
}

export interface ProcessGatewayRefundParams {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  refundAmount: number;
  currency: string;
  reason: string;
}

export interface GatewayRefundResult {
  success: boolean;
  refundId: string;
  amountRefunded: number;
  status: 'processed' | 'pending' | 'failed';
  error?: string;
}

export interface WebhookEventPayload {
  event: string;
  gateway: 'razorpay' | 'cashfree';
  gatewayOrderId: string;
  gatewayPaymentId?: string;
  amount?: number;
  status?: string;
  rawPayload: string;
  signature: string;
  timestamp: string;
}

export interface PaymentGateway {
  readonly name: 'razorpay' | 'cashfree';
  readonly displayName: string;

  createOrder(params: CreateGatewayOrderParams): Promise<GatewayOrderResult>;
  verifyPayment(params: VerifyGatewayPaymentParams): Promise<VerifyPaymentResult>;
  processRefund(params: ProcessGatewayRefundParams): Promise<GatewayRefundResult>;
  verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean>;
}
