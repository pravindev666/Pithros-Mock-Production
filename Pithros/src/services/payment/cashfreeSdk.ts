/**
 * Cashfree JS SDK loader.
 *
 * The payment sheet belongs to Cashfree's own script. It is fetched on demand —
 * never on first paint — and the mode defaults to **sandbox**, so a build can
 * never open a live payment sheet by accident.
 *
 * This is the seam the checkout uses to hand a real `paymentSessionId` to the
 * gateway. The server remains the only party that can declare a payment
 * successful (`/billing/verify` re-checks with Cashfree), so nothing in this file
 * decides whether money moved.
 */

const SDK_URL = 'https://sdk.cashfree.com/js/v3/cashfree.js';

export type CashfreeMode = 'sandbox' | 'production';

export interface CashfreeCheckoutResult {
  error?: { message?: string; code?: string };
  redirect?: boolean;
  paymentDetails?: { paymentMessage?: string; paymentStatus?: string };
}

export interface CashfreeInstance {
  checkout(options: {
    paymentSessionId: string;
    redirectTarget?: '_self' | '_blank' | '_modal' | '_top';
  }): Promise<CashfreeCheckoutResult>;
}

export type CashfreeConstructor = (options: { mode: CashfreeMode }) => CashfreeInstance;

declare global {
  interface Window {
    Cashfree?: CashfreeConstructor;
  }
}

let pending: Promise<CashfreeConstructor> | null = null;

export function loadCashfreeSdk(): Promise<CashfreeConstructor> {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('The payment SDK needs a browser.'));
  }
  if (window.Cashfree) {
    return Promise.resolve(window.Cashfree);
  }
  if (pending) {
    return pending;
  }

  pending = new Promise<CashfreeConstructor>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => {
      if (window.Cashfree) {
        resolve(window.Cashfree);
      } else {
        pending = null;
        reject(new Error('The payment SDK loaded but did not initialise.'));
      }
    };
    script.onerror = () => {
      pending = null;
      reject(new Error('The payment SDK could not be loaded.'));
    };
    document.head.appendChild(script);
  });

  return pending;
}

/**
 * Open the Cashfree sheet for a server-created order.
 *
 * Resolves with whatever the SDK reports — the caller treats only a completed,
 * server-verified payment as success.
 */
export async function openCashfreeCheckout(
  paymentSessionId: string,
  options: { mode?: CashfreeMode; redirectTarget?: '_self' | '_modal' } = {},
): Promise<CashfreeCheckoutResult> {
  if (!paymentSessionId) {
    throw new Error('A payment session is required before checkout can open.');
  }
  const create = await loadCashfreeSdk();
  const cashfree = create({ mode: options.mode ?? 'sandbox' });
  return cashfree.checkout({
    paymentSessionId,
    redirectTarget: options.redirectTarget ?? '_modal',
  });
}
