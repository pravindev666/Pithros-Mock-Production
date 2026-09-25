import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Smartphone, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { PithrosLogo } from '../../components/visual/PithrosLogo';
import { Button } from '../../components/ui/Button';
import { COUNTRY_CODES } from '../../data/countryCodes';

interface PhoneAuthViewProps {
  onNavigate: (route: string) => void;
  initialStep?: 'enter_phone' | 'enter_otp';
}

export const PhoneAuthView: React.FC<PhoneAuthViewProps> = ({
  onNavigate,
  initialStep = 'enter_phone',
}) => {
  const { isDark } = useTheme();
  const { sendPhoneOtp, verifyPhoneOtp } = useAuth();

  const [step, setStep] = useState<'enter_phone' | 'enter_otp' | 'verified'>(initialStep);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]); // Default India (+91)
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const fullNumber = `${selectedCountry.dialCode} ${phoneNumber}`.trim();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim() || phoneNumber.length < 5) {
      setErrorMessage('Please enter a valid phone number.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const targetFormattedNumber = `${selectedCountry.dialCode}${phoneNumber.replace(/\D/g, '')}`;
    const res = await sendPhoneOtp(targetFormattedNumber);
    setIsLoading(false);

    if (res.success) {
      setStep('enter_otp');
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    } else {
      setErrorMessage(res.error || 'Unable to dispatch verification code. Please check the number.');
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    // Only accept numeric digit
    const cleaned = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];

    if (cleaned.length > 1) {
      // Pasted string
      const pasted = cleaned.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setOtpDigits(newDigits);
      const nextIndex = Math.min(pasted.length, 5);
      otpInputsRef.current[nextIndex]?.focus();
      if (pasted.length === 6) {
        triggerVerification(newDigits.join(''));
      }
      return;
    }

    newDigits[index] = cleaned;
    setOtpDigits(newDigits);

    if (cleaned && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // Auto submit when 6 digits are complete
    if (newDigits.every((d) => d !== '')) {
      triggerVerification(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const triggerVerification = async (code: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    const res = await verifyPhoneOtp(code);
    setIsLoading(false);

    if (res.success) {
      setStep('verified');
      setTimeout(() => {
        onNavigate('/dashboard');
      }, 1200);
    } else {
      setErrorMessage(res.error || 'The verification code entered is incorrect. Please try again.');
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);

    const targetFormattedNumber = `${selectedCountry.dialCode}${phoneNumber.replace(/\D/g, '')}`;
    const res = await sendPhoneOtp(targetFormattedNumber);
    setIsLoading(false);

    if (res.success) {
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      otpInputsRef.current[0]?.focus();
    } else {
      setErrorMessage(res.error || 'Unable to re-send code right now.');
    }
  };

  return (
    <div
      className={`min-h-[calc(100vh-80px)] flex items-center justify-center p-4 sm:p-6 transition-colors ${
        isDark ? 'bg-[#111820] text-[#F8F5EE]' : 'bg-[#F3EEE4] text-[#20242A]'
      }`}
    >
      {/* Invisible Recaptcha Container for Firebase */}
      <div id="recaptcha-container" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div
          className={`p-7 sm:p-9 rounded-3xl border shadow-2xl backdrop-blur-md transition-colors ${
            isDark
              ? 'bg-[#182337] border-[#202C40]'
              : 'bg-[#FCFAF5] border-[#E5DED2]'
          }`}
        >
          {/* Header */}
          <div className="text-center space-y-2 mb-7">
            <div className="inline-block mb-2">
              <PithrosLogo variant={isDark ? 'dark' : 'light'} />
            </div>
            <h1
              className={`text-2xl font-serif font-normal ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              {step === 'enter_otp'
                ? 'Enter verification code'
                : step === 'verified'
                ? 'Phone verified'
                : 'Phone sign-in'}
            </h1>
            <p
              className={`text-xs sm:text-sm ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
              }`}
            >
              {step === 'enter_otp'
                ? `Enter the 6-digit verification code sent to ${fullNumber}`
                : step === 'verified'
                ? 'Welcome back to your Pithros space.'
                : 'Sign in securely with a one-time verification code.'}
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Enter Phone Number */}
          {step === 'enter_phone' && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="phone-input"
                  className={`block text-xs font-medium ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  Phone number
                </label>
                <div className="flex gap-2">
                  {/* Country Selector */}
                  <select
                    value={selectedCountry.code}
                    onChange={(e) => {
                      const found = COUNTRY_CODES.find((c) => c.code === e.target.value);
                      if (found) setSelectedCountry(found);
                    }}
                    aria-label="Country Code"
                    className={`py-2.5 px-3 rounded-xl border text-xs transition-colors focus:outline-none ${
                      isDark
                        ? 'border-[#202C40] bg-[#182337] text-[#F8F5EE] focus:border-[#B99452]'
                        : 'border-[#E5DED2] bg-white text-[#20242A] focus:border-[#23324A]'
                    }`}
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.dialCode} ({c.name})
                      </option>
                    ))}
                  </select>

                  {/* Phone digits input */}
                  <div className="relative flex-1">
                    <input
                      id="phone-input"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="98765 43210"
                      required
                      autoFocus
                      disabled={isLoading}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-1 ${
                        isDark
                          ? 'border-[#202C40] bg-[#182337] text-[#F8F5EE] placeholder-[#6E5F4E] focus:border-[#B99452] focus:ring-[#B99452]/30'
                          : 'border-[#E5DED2] bg-white text-[#20242A] placeholder-[#A09585] focus:border-[#23324A] focus:ring-[#23324A]/30'
                      }`}
                    />
                  </div>
                </div>
                <p
                  className={`text-[11px] pt-1 ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                  }`}
                >
                  Standard operator SMS rates may apply. A 6-digit verification code will be sent.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-2.5 text-sm font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending code…' : 'Send Verification Code'}
                </Button>
              </div>

              <div className="pt-3 text-center">
                <button
                  type="button"
                  onClick={() => onNavigate('/signin')}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium hover:underline ${
                    isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Return to email sign-in
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Enter 6-digit OTP */}
          {step === 'enter_otp' && (
            <div className="space-y-6">
              {/* 6 OTP boxes */}
              <div className="flex justify-center gap-2 sm:gap-3">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpInputsRef.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={isLoading}
                    className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-serif font-semibold rounded-xl border transition-all focus:outline-none focus:ring-2 ${
                      isDark
                        ? 'border-[#202C40] bg-[#182337] text-[#F8F5EE] focus:border-[#B99452] focus:ring-[#B99452]/30'
                        : 'border-[#E5DED2] bg-white text-[#20242A] focus:border-[#23324A] focus:ring-[#23324A]/30'
                    }`}
                  />
                ))}
              </div>

              <div className="space-y-3">
                <Button
                  variant="primary"
                  className="w-full py-2.5 text-sm font-medium"
                  disabled={isLoading || otpDigits.some((d) => d === '')}
                  onClick={() => triggerVerification(otpDigits.join(''))}
                >
                  {isLoading ? 'Verifying…' : 'Verify & Continue'}
                </Button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setStep('enter_phone')}
                    className={`hover:underline ${
                      isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                    }`}
                  >
                    Change phone number
                  </button>

                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendCooldown > 0 || isLoading}
                    className={`font-medium transition-colors hover:underline ${
                      resendCooldown > 0
                        ? 'opacity-50 cursor-not-allowed text-stone-500'
                        : isDark
                        ? 'text-[#B99452]'
                        : 'text-[#23324A]'
                    }`}
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Verified */}
          {step === 'verified' && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center space-y-4 py-4"
            >
              <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center border border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <p
                className={`text-sm ${
                  isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                }`}
              >
                Verification code accepted. Entering your dashboard…
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
