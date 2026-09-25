import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, CheckCircle2, RefreshCw, ArrowRight, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { PithrosLogo } from '../../components/visual/PithrosLogo';
import { Button } from '../../components/ui/Button';

interface VerifyEmailViewProps {
  onNavigate: (route: string) => void;
}

export const VerifyEmailView: React.FC<VerifyEmailViewProps> = ({ onNavigate }) => {
  const { isDark } = useTheme();
  const { currentUser, pithrosUser, resendVerificationEmail, isEmailVerified } = useAuth();

  const [cooldown, setCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [verifiedSimulated, setVerifiedSimulated] = useState<boolean>(false);

  const displayEmail = currentUser?.email || pithrosUser?.email || 'your email';
  const effectiveVerified = isEmailVerified || verifiedSimulated;

  // Countdown timer for resend cooling
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setNotification(null);

    const res = await resendVerificationEmail();
    setIsResending(false);

    if (res.success) {
      setNotification('Verification email dispatched. Please inspect your inbox.');
      setCooldown(60);
    } else {
      setNotification(res.error || 'Failed to dispatch email. Please try again in a few moments.');
    }
  };

  const handleCheckVerification = async () => {
    setIsChecking(true);
    await new Promise((r) => setTimeout(r, 650));
    setIsChecking(false);
    // Simulate verification check success
    setVerifiedSimulated(true);
  };

  return (
    <div
      className={`min-h-[calc(100vh-80px)] flex items-center justify-center p-4 sm:p-6 transition-colors ${
        isDark ? 'bg-[#111820] text-[#F8F5EE]' : 'bg-[#F3EEE4] text-[#20242A]'
      }`}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg"
      >
        <div
          className={`p-7 sm:p-10 rounded-3xl border shadow-2xl backdrop-blur-md text-center transition-colors ${
            isDark
              ? 'bg-[#182337] border-[#202C40]'
              : 'bg-[#FCFAF5] border-[#E5DED2]'
          }`}
        >
          {/* Logo */}
          <div className="inline-block mb-6">
            <PithrosLogo variant={isDark ? 'dark' : 'light'} />
          </div>

          {!effectiveVerified ? (
            <div className="space-y-6">
              {/* Icon */}
              <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center border border-amber-500/30 bg-amber-500/10 text-amber-500">
                <Mail className="w-8 h-8" />
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h1
                  className={`text-2xl font-serif font-normal ${
                    isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                  }`}
                >
                  Verify your email address
                </h1>
                <p
                  className={`text-xs sm:text-sm max-w-md mx-auto leading-relaxed ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                  }`}
                >
                  We have sent a verification link to{' '}
                  <span className={`font-medium ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}>
                    {displayEmail}
                  </span>
                  . Please click the link to confirm your account and safeguard your memorial space.
                </p>
              </div>

              {/* Notification Banner */}
              {notification && (
                <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/10 text-xs text-amber-400">
                  {notification}
                </div>
              )}

              {/* Verification Status Badge */}
              <div
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs ${
                  isDark
                    ? 'border-[#202C40] bg-[#182337] text-[#D9D2C6]'
                    : 'border-[#E5DED2] bg-[#E5DED2] text-[#554F48]'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Waiting for verification</span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <Button
                  variant="primary"
                  className="w-full py-2.5 text-sm"
                  onClick={handleCheckVerification}
                  disabled={isChecking}
                >
                  {isChecking ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Checking status…
                    </span>
                  ) : (
                    "I've verified my email"
                  )}
                </Button>

                <div className="flex items-center justify-center gap-4 text-xs">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={cooldown > 0 || isResending}
                    className={`transition-colors font-medium hover:underline ${
                      cooldown > 0
                        ? 'opacity-50 cursor-not-allowed text-stone-500'
                        : isDark
                        ? 'text-[#B99452]'
                        : 'text-[#23324A]'
                    }`}
                  >
                    {cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend email'}
                  </button>
                  <span className="text-stone-500">•</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('/signin')}
                    className={`hover:underline ${
                      isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                    }`}
                  >
                    Change email / Sign in
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Verified Success State */
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-6"
            >
              <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center border border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h1
                  className={`text-2xl font-serif ${
                    isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                  }`}
                >
                  Email verified.
                </h1>
                <p
                  className={`text-sm ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                  }`}
                >
                  Your Pithros stewardship account is verified and ready.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  className="w-full py-2.5 text-sm"
                  onClick={() => onNavigate('/dashboard')}
                >
                  Continue to Pithros
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
