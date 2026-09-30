import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Lock,
  Sparkles,
  RotateCcw,
  Receipt,
  Heart,
  ChevronRight,
  CreditCard,
  Building2,
  Info,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { pricingPlans } from '../../data/mockData';
import { paymentService } from '../../services/payment/paymentService';
import { PaymentRecord, BillingInvoice, Memorial } from '../../types';
import { api } from '../../services/api';

interface CheckoutViewProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  memorials?: Memorial[];
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  currentRoute,
  onNavigate,
  memorials = [],
}) => {
  const { isDark } = useTheme();
  const { pithrosUser } = useAuth();

  // Selected plan state (reads query or defaults to plan_care_annual)
  const [selectedPlanId, setSelectedPlanId] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const qPlan = params.get('plan');
      if (qPlan && pricingPlans.some((p) => p.id === qPlan)) return qPlan;
    } catch {
      // fallback
    }
    return 'plan_care_annual';
  });
  const [selectedMemorialId, setSelectedMemorialId] = useState<string>('');
  const [loadedMemorials, setLoadedMemorials] = useState<Memorial[]>(memorials);

  // Active payment process state
  const [activePayment, setActivePayment] = useState<PaymentRecord | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<BillingInvoice | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Payment method selection (cards, UPI, netbanking)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');

  // Load memorials if not provided
  useEffect(() => {
    if (memorials.length === 0) {
      api.getMemorials().then((list) => {
        setLoadedMemorials(list);
        if (list.length > 0 && !selectedMemorialId) {
          setSelectedMemorialId(list[0].id);
        }
      });
    } else if (!selectedMemorialId && memorials.length > 0) {
      setSelectedMemorialId(memorials[0].id);
    }
  }, [memorials]);

  // Determine current checkout sub-route step
  const step = currentRoute.replace('/checkout', '').replace('/', '') || 'index';

  const plan = pricingPlans.find((p) => p.id === selectedPlanId) || pricingPlans[1];
  const activeMemorial =
    loadedMemorials.find((m) => m.id === selectedMemorialId) || loadedMemorials[0];
  const activeGateway = paymentService.getActiveGateway();

  // Price calculations
  const rawPrice = parseInt(plan.price.replace(/[^0-9]/g, ''), 10) || 0;
  const taxRate = 0.18;
  const subtotal = Math.round(rawPrice / (1 + taxRate));
  const taxAmount = rawPrice - subtotal;

  // 1. Start Payment: create internal order and navigate to /checkout/payment
  const handleProceedToPayment = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const { payment } = await paymentService.createPaymentSession({
        planId: plan.id,
        memorialId: activeMemorial?.id || 'mem_default',
        memorialName: activeMemorial?.fullName || 'Beloved Memorial',
        user: pithrosUser,
      });
      setActivePayment(payment);
      onNavigate('/checkout/payment');
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to initiate payment session. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Gateway Handshake & Verification: simulates payment completion and sends to server verification
  const handleCompleteGatewayPayment = async (simulateOutcome: 'success' | 'failed' | 'pending' = 'success') => {
    if (!activePayment) return;

    onNavigate('/checkout/processing');
    setIsProcessing(true);

    try {
      if (simulateOutcome === 'failed') {
        await paymentService.failPayment(activePayment.id, 'Transaction declined by bank authorization');
        onNavigate('/checkout/failed');
        return;
      }

      if (simulateOutcome === 'pending') {
        onNavigate('/checkout/pending');
        return;
      }

      // Simulate genuine client return with gateway payment ID and signature
      const gatewayPaymentId = `${activeGateway.name}_pay_${Date.now().toString().slice(-6)}`;
      const gatewaySignature = `${activeGateway.name}_sig_${Math.random().toString(36).substring(2, 16)}`;

      // Authoritative Server Verification Step
      const { payment, invoice } = await paymentService.verifyPayment({
        internalPaymentId: activePayment.id,
        gatewayOrderId: activePayment.gatewayOrderId,
        gatewayPaymentId,
        gatewaySignature,
      });

      setActivePayment(payment);
      setActiveInvoice(invoice);
      onNavigate('/checkout/success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment verification failed');
      onNavigate('/checkout/failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. User cancels checkout
  const handleCancelPayment = async () => {
    if (activePayment) {
      await paymentService.cancelPayment(activePayment.id, 'Steward cancelled in payment step');
    }
    onNavigate('/checkout/cancelled');
  };

  return (
    <div
      className={`min-h-[85vh] py-12 px-4 sm:px-6 lg:px-8 transition-colors ${
        isDark ? 'bg-[#111820] text-[#F8F5EE]' : 'bg-[#F3EEE4] text-[#20242A]'
      }`}
    >
      <div className="max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {/* ─────────────────────────────────────────────────────────────
              STEP 1: /checkout (Overview, Plan, Tax, Memorial selection)
              ───────────────────────────────────────────────────────────── */}
          {(step === 'index' || step === '') && (
            <motion.div
              key="step-index"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Header */}
              <div className="text-center space-y-2 max-w-xl mx-auto">
                <span
                  className={`text-[10px] uppercase font-mono tracking-widest ${
                    isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                  }`}
                >
                  Family Stewardship & Preservation
                </span>
                <h1
                  className={`text-2xl sm:text-4xl font-serif ${
                    isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                  }`}
                >
                  Complete Your Preservation Plan
                </h1>
                <p
                  className={`text-xs sm:text-sm leading-relaxed ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                  }`}
                >
                  Simple, transparent preservation plans. Complete voice memories, expanded media archives, and dignified digital care for your family.
                </p>
              </div>

              {/* Two Column Layout: Plan Details + Summary Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                {/* Left Column: Plan & Memorial selection (7 cols) */}
                <div className="md:col-span-7 space-y-6">
                  {/* Select Plan Switcher */}
                  <div
                    className={`p-6 rounded-3xl border ${
                      isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                    }`}
                  >
                    <label
                      className={`block text-[11px] uppercase tracking-wider font-mono mb-3 ${
                        isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                      }`}
                    >
                      Selected Preservation Tier
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {pricingPlans
                        .filter((p) => p.id !== 'plan_free')
                        .map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelectedPlanId(p.id)}
                            className={`p-4 rounded-2xl border text-left transition-all ${
                              selectedPlanId === p.id
                                ? isDark
                                  ? 'border-[#B99452] bg-[#B99452]/10 text-[#F8F5EE]'
                                  : 'border-[#23324A] bg-[#E5DED2] text-[#20242A]'
                                : isDark
                                ? 'border-[#202C40] hover:border-[#3D3328] text-[#9EA3AA]'
                                : 'border-[#E5DED2] hover:border-[#BFAF9B] text-[#554F48]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-semibold">{p.name}</span>
                              {p.id === 'plan_care_annual' && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-[#B99452]/20 text-[#B99452] font-bold uppercase">
                                  ★ Best Value
                                </span>
                              )}
                              {p.id === 'plan_care_half_yearly' && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-bold">
                                  Save ₹845
                                </span>
                              )}
                              {p.id === 'plan_care_monthly' && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-stone-500/15 text-stone-400 font-bold">
                                  Flexible
                                </span>
                              )}
                              {p.id === 'plan_archive' && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 font-bold">
                                  5 Memorials
                                </span>
                              )}
                            </div>
                            <div
                              className={`text-lg font-serif mt-1 font-bold ${
                                isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                              }`}
                            >
                              {p.price}
                            </div>
                            <div className="text-[10px] opacity-75 mt-0.5 truncate">{p.period}</div>
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Memorial Association */}
                  <div
                    className={`p-6 rounded-3xl border ${
                      isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                    }`}
                  >
                    <label
                      className={`block text-[11px] uppercase tracking-wider font-mono mb-3 ${
                        isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                      }`}
                    >
                      Memorial to Apply Plan To
                    </label>
                    {loadedMemorials.length > 0 ? (
                      <div className="space-y-2">
                        {loadedMemorials.map((mem) => (
                          <label
                            key={mem.id}
                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                              selectedMemorialId === mem.id
                                ? isDark
                                  ? 'border-[#B99452] bg-[#1A140E]'
                                  : 'border-[#23324A] bg-[#FFF8EE]'
                                : isDark
                                ? 'border-[#202C40]'
                                : 'border-[#E8DEC8]'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="memorial"
                                checked={selectedMemorialId === mem.id}
                                onChange={() => setSelectedMemorialId(mem.id)}
                                className="accent-[#B99452]"
                              />
                              <div>
                                <div
                                  className={`text-sm font-medium ${
                                    isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                                  }`}
                                >
                                  {mem.fullName}
                                </div>
                                <div
                                  className={`text-[11px] ${
                                    isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                                  }`}
                                >
                                  pithros.org/m/{mem.slug}
                                </div>
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                                isDark ? 'bg-[#202C40] text-[#D9D2C6]' : 'bg-[#EAE2D2] text-[#554F48]'
                              }`}
                            >
                              Current: Active
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-[#9EA3AA]">
                        You can create a new memorial immediately after completing preservation.
                      </div>
                    )}
                  </div>

                  {/* Payment Method Selector */}
                  <div
                    className={`p-6 rounded-3xl border ${
                      isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                    }`}
                  >
                    <label
                      className={`block text-[11px] uppercase tracking-wider font-mono mb-3 ${
                        isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                      }`}
                    >
                      Preferred Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {[
                        { id: 'upi', label: 'UPI / QR', desc: 'GPay, PhonePe, Paytm' },
                        { id: 'card', label: 'Cards', desc: 'Visa, Mastercard, RuPay' },
                        { id: 'netbanking', label: 'NetBanking', desc: 'All Indian Banks' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedPaymentMethod(m.id as any)}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            selectedPaymentMethod === m.id
                              ? isDark
                                ? 'border-[#B99452] bg-[#B99452]/10 text-[#B99452]'
                                : 'border-[#23324A] bg-[#E5DED2] text-[#8C5C0F]'
                              : isDark
                              ? 'border-[#202C40] text-[#9EA3AA]'
                              : 'border-[#E5DED2] text-[#554F48]'
                          }`}
                        >
                          <div className="font-medium">{m.label}</div>
                          <div className="text-[9px] opacity-75 mt-0.5">{m.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Order Summary & Transparent Tax Breakdown (5 cols) */}
                <div className="md:col-span-5 space-y-6">
                  <div
                    className={`p-6 rounded-3xl border space-y-5 ${
                      isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                    }`}
                  >
                    <h3
                      className={`text-lg font-serif border-b pb-3 ${
                        isDark ? 'border-[#202C40] text-[#F8F5EE]' : 'border-[#E5DED2] text-[#20242A]'
                      }`}
                    >
                      Preservation Summary
                    </h3>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between">
                        <span className={isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}>Plan</span>
                        <span className="font-medium">{plan.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}>Preservation Base</span>
                        <span>₹{subtotal.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}>GST (18% Applicable)</span>
                        <span>₹{taxAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="border-t pt-3 flex justify-between text-sm font-semibold">
                        <span>Total Due</span>
                        <span className={isDark ? 'text-[#B99452]' : 'text-[#23324A]'}>
                          {plan.price}
                        </span>
                      </div>
                    </div>

                    {/* Features list */}
                    <div
                      className={`pt-3 border-t space-y-2 text-[11px] ${
                        isDark ? 'border-[#202C40] text-[#D9D2C6]' : 'border-[#E5DED2] text-[#554F48]'
                      }`}
                    >
                      {plan.features.slice(0, 5).map((f, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2
                            className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                              isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                            }`}
                          />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>

                    {/* Gateway badge */}
                    <div
                      className={`p-3 rounded-xl border flex items-center justify-between text-[10px] ${
                        isDark ? 'bg-[#18130E] border-[#2E241A] text-[#9EA3AA]' : 'bg-[#F5EFE6] border-[#D8CABE] text-[#554F48]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Routed via {activeGateway.displayName}</span>
                      </div>
                      <span className="font-mono text-emerald-500 font-bold">256-BIT SSL</span>
                    </div>

                    {/* Error display if any */}
                    {errorMessage && (
                      <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs">
                        {errorMessage}
                      </div>
                    )}

                    {/* CTA Button */}
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full"
                      onClick={handleProceedToPayment}
                      isLoading={isProcessing}
                    >
                      Proceed to Secure Payment
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>

                    {/* Refund Notice */}
                    <div className="text-[11px] leading-relaxed text-center opacity-75">
                      <p>
                        <strong>14-Day Compassionate Refund Policy.</strong> If your family decides not to continue with the memorial expansion, you can request an instant full refund through your steward dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 2: /checkout/payment (Gateway Interface Modal/Screen)
              ───────────────────────────────────────────────────────────── */}
          {step === 'payment' && (
            <motion.div
              key="step-payment"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="max-w-md mx-auto space-y-6"
            >
              <div
                className={`p-6 sm:p-8 rounded-3xl border shadow-2xl relative ${
                  isDark ? 'bg-[#14100C] border-[#2E241A]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                }`}
              >
                {/* Gateway Header */}
                <div className="flex items-center justify-between border-b pb-4 mb-6">
                  <div>
                    <span
                      className={`text-[9px] uppercase font-mono tracking-wider ${
                        isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                      }`}
                    >
                      Authoritative Gateway Handshake
                    </span>
                    <h2
                      className={`text-lg font-serif mt-0.5 ${
                        isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                      }`}
                    >
                      {activeGateway.name === 'cashfree' ? 'Cashfree Payments' : 'Razorpay Gateway'}
                    </h2>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#9EA3AA] block">Order Amount</span>
                    <span
                      className={`text-base font-serif font-bold ${
                        isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                      }`}
                    >
                      {activePayment?.formattedAmount || plan.price}
                    </span>
                  </div>
                </div>

                {/* Gateway Order Reference */}
                <div
                  className={`p-3.5 rounded-xl border mb-6 text-xs space-y-1 font-mono ${
                    isDark ? 'bg-[#0E0B08] border-[#202C40] text-[#9EA3AA]' : 'bg-[#F5EFE6] border-[#D8CABE] text-[#554F48]'
                  }`}
                >
                  <div className="flex justify-between">
                    <span>Order Ref:</span>
                    <span className="text-emerald-500 font-bold truncate max-w-[180px]">
                      {activePayment?.gatewayOrderId || 'order_active'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Memorial:</span>
                    <span className="truncate max-w-[180px]">
                      {activePayment?.memorialName || activeMemorial?.fullName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Security:</span>
                    <span>HMAC-SHA256 Signed</span>
                  </div>
                </div>

                {/* Real Payment Simulation Triggers */}
                <div className="space-y-3">
                  <p
                    className={`text-xs text-center mb-2 ${
                      isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                    }`}
                  >
                    Select an action to test genuine payment reconciliation flows:
                  </p>

                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    onClick={() => handleCompleteGatewayPayment('success')}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirm Payment (Success Handshake)
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCompleteGatewayPayment('pending')}
                    >
                      <Clock className="w-3.5 h-3.5 mr-1.5" />
                      Simulate Pending
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCompleteGatewayPayment('failed')}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                      Simulate Failure
                    </Button>
                  </div>
                </div>

                {/* Cancel link */}
                <div className="mt-6 pt-4 border-t text-center">
                  <button
                    type="button"
                    onClick={handleCancelPayment}
                    className={`text-xs underline hover:no-underline ${
                      isDark ? 'text-[#9EA3AA] hover:text-[#F8F5EE]' : 'text-[#7D766D] hover:text-[#20242A]'
                    }`}
                  >
                    Cancel and return to memorial
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 3: /checkout/processing (Server Reconciliation)
              ───────────────────────────────────────────────────────────── */}
          {step === 'processing' && (
            <motion.div
              key="step-processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-md mx-auto text-center py-16 space-y-6"
            >
              <div
                className="w-16 h-16 border-3 border-t-transparent rounded-full animate-spin mx-auto"
                style={{
                  borderColor: isDark ? '#B99452' : '#23324A',
                  borderTopColor: 'transparent',
                }}
              />
              <div className="space-y-2">
                <h2
                  className={`text-2xl font-serif ${
                    isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                  }`}
                >
                  Verifying Transaction
                </h2>
                <p
                  className={`text-xs leading-relaxed max-w-sm mx-auto ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                  }`}
                >
                  Reconciling cryptographic signature with {activeGateway.name} server and activating preservation entitlements…
                </p>
              </div>
            </motion.div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 4: /checkout/success (UX as specified in prompt)
              ───────────────────────────────────────────────────────────── */}
          {step === 'success' && (
            <motion.div
              key="step-success"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              className="max-w-lg mx-auto text-center space-y-8"
            >
              <div
                className={`p-8 sm:p-10 rounded-3xl border shadow-xl space-y-6 ${
                  isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-3">
                  <span
                    className={`text-[10px] uppercase font-mono tracking-widest ${
                      isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                    }`}
                  >
                    Preservation Confirmed
                  </span>
                  <h1
                    className={`text-2xl sm:text-3xl font-serif ${
                      isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                    }`}
                  >
                    Their story now has more room to live.
                  </h1>
                  <p
                    className={`text-sm ${
                      isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                    }`}
                  >
                    Your plan is active.
                  </p>
                </div>

                {/* Receipt Quick Info */}
                <div
                  className={`p-4 rounded-2xl border text-xs text-left space-y-2 ${
                    isDark ? 'bg-[#0E0B08] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E8DEC8]'
                  }`}
                >
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}>Invoice Number:</span>
                    <span className="font-mono font-medium">{activeInvoice?.invoiceNumber || 'PTH-2026-0812'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}>Plan Enrolled:</span>
                    <span className="font-medium">{activePayment?.planName || plan.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}>Contribution:</span>
                    <span className="font-serif font-bold">{activePayment?.formattedAmount || plan.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}>Protected Memorial:</span>
                    <span className="font-medium">{activeMemorial?.fullName}</span>
                  </div>
                </div>

                {/* Primary Actions as specified in prompt */}
                <div className="space-y-3 pt-2">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={() => onNavigate(`/m/${activeMemorial?.slug || 'arun-krishnan'}`)}
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    View Memorial
                  </Button>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => onNavigate('/dashboard/billing')}
                    >
                      Go to Dashboard
                    </Button>
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() =>
                        onNavigate(
                          activeInvoice?.receiptUrl ||
                            `/payment/receipt/${activeInvoice?.invoiceNumber || 'PTH-2026-0812'}`
                        )
                      }
                    >
                      <Receipt className="w-4 h-4 mr-1.5" />
                      View Receipt
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 5: /checkout/pending (UX as specified in prompt)
              ───────────────────────────────────────────────────────────── */}
          {step === 'pending' && (
            <motion.div
              key="step-pending"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="max-w-md mx-auto text-center space-y-6"
            >
              <div
                className={`p-8 rounded-3xl border shadow-xl space-y-6 ${
                  isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8" />
                </div>

                <div className="space-y-3">
                  <h1
                    className={`text-2xl font-serif ${
                      isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                    }`}
                  >
                    Your payment is being confirmed.
                  </h1>
                  <p
                    className={`text-sm ${
                      isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                    }`}
                  >
                    You do not need to pay again.
                  </p>
                  <p
                    className={`text-xs ${
                      isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                    }`}
                  >
                    We'll update your account when confirmation arrives from your bank.
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    onClick={() => onNavigate('/dashboard/billing')}
                  >
                    Return to Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => onNavigate('/')}
                  >
                    Back to Home
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 6: /checkout/failed (UX as specified in prompt)
              ───────────────────────────────────────────────────────────── */}
          {step === 'failed' && (
            <motion.div
              key="step-failed"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="max-w-md mx-auto text-center space-y-6"
            >
              <div
                className={`p-8 rounded-3xl border shadow-xl space-y-6 ${
                  isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-8 h-8" />
                </div>

                <div className="space-y-3">
                  <h1
                    className={`text-2xl font-serif ${
                      isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                    }`}
                  >
                    The payment didn't go through.
                  </h1>
                  <p
                    className={`text-sm ${
                      isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                    }`}
                  >
                    Your memorial is safe. Nothing has been lost.
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    onClick={() => onNavigate('/checkout')}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => onNavigate('/dashboard')}
                  >
                    Return to Dashboard
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 7: /checkout/cancelled
              ───────────────────────────────────────────────────────────── */}
          {step === 'cancelled' && (
            <motion.div
              key="step-cancelled"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="max-w-md mx-auto text-center space-y-6"
            >
              <div
                className={`p-8 rounded-3xl border shadow-xl space-y-6 ${
                  isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-[#202C40] text-[#9EA3AA] flex items-center justify-center mx-auto">
                  <Info className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h1
                    className={`text-2xl font-serif ${
                      isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                    }`}
                  >
                    Checkout Cancelled
                  </h1>
                  <p
                    className={`text-xs ${
                      isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                    }`}
                  >
                    No charges were made. Your memorial remains active in its existing plan tier.
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    onClick={() => onNavigate('/pricing')}
                  >
                    Explore Preservation Plans
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => onNavigate(`/m/${activeMemorial?.slug || 'arun-krishnan'}`)}
                  >
                    Back to Memorial
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
