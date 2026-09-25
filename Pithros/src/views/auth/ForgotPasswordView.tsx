import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { PithrosLogo } from '../../components/visual/PithrosLogo';
import { Button } from '../../components/ui/Button';

interface ForgotPasswordViewProps {
  onNavigate: (route: string) => void;
}

export const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({ onNavigate }) => {
  const { isDark } = useTheme();
  const { sendPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    await sendPasswordReset(email);
    setIsLoading(false);
    // Neutral success response prevents email enumeration
    setSubmitted(true);
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
              Forgot your password?
            </h1>
            <p
              className={`text-xs sm:text-sm ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
              }`}
            >
              Enter your email and we'll send you a secure reset link.
            </p>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="forgot-email"
                  className={`block text-xs font-medium ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    disabled={isLoading}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-1 ${
                      isDark
                        ? 'border-[#202C40] bg-[#182337] text-[#F8F5EE] placeholder-[#6E5F4E] focus:border-[#B99452] focus:ring-[#B99452]/30'
                        : 'border-[#E5DED2] bg-white text-[#20242A] placeholder-[#A09585] focus:border-[#23324A] focus:ring-[#23324A]/30'
                    }`}
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-2.5 text-sm font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending reset link…' : 'Send Reset Link'}
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
                  Return to Sign In
                </button>
              </div>
            </form>
          ) : (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center space-y-5"
            >
              <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center border border-amber-500/30 bg-amber-500/10 text-amber-500">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h3
                  className={`text-lg font-serif ${
                    isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                  }`}
                >
                  Check your inbox for the reset link.
                </h3>
                <p
                  className={`text-xs leading-relaxed max-w-xs mx-auto ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                  }`}
                >
                  If an account is associated with <span className="font-medium">{email}</span>, a secure recovery link has been delivered. Please review your email within 15 minutes.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <Button
                  variant="outline"
                  className="w-full py-2.5 text-xs"
                  onClick={() => onNavigate('/reset-password')}
                >
                  Have a reset code? Set new password
                </Button>
                <button
                  type="button"
                  onClick={() => onNavigate('/signin')}
                  className={`block w-full text-center text-xs hover:underline pt-1 ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                  }`}
                >
                  Back to Sign In
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
