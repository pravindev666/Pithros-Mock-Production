import { useState, useEffect, useCallback } from 'react';
import { BillingInvoice, PaymentStatus } from '../types';
import { api } from '../services/api';

export const useBilling = () => {
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [paymentState, setPaymentState] = useState<PaymentStatus | 'idle'>('idle');
  const [activePlanProcessing, setActivePlanProcessing] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getBillingInvoices();
      setInvoices(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const processPlanContribution = useCallback(
    async (planName: string, amount: string, paymentMethod: string): Promise<BillingInvoice> => {
      setActivePlanProcessing(planName);
      setPaymentState('pending');

      // Async step simulating payment gateway handshake
      await new Promise((r) => setTimeout(r, 1400));

      const newInvoice = await api.createBillingInvoice({
        invoiceNumber: `PTH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        planName,
        amount,
        currency: 'INR',
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        status: 'success',
        paymentMethodMasked: paymentMethod,
        receiptUrl: `#receipt_${Date.now()}`,
      });

      setPaymentState('success');
      setActivePlanProcessing(null);
      await fetchInvoices();
      return newInvoice;
    },
    [fetchInvoices]
  );

  const cancelTransaction = useCallback(() => {
    setPaymentState('cancelled');
    setActivePlanProcessing(null);
  }, []);

  const resetPaymentState = useCallback(() => {
    setPaymentState('idle');
    setActivePlanProcessing(null);
  }, []);

  return {
    invoices,
    isLoading,
    paymentState,
    activePlanProcessing,
    processPlanContribution,
    cancelTransaction,
    resetPaymentState,
    refetch: fetchInvoices,
  };
};
