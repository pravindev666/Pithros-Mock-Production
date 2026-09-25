import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { PithrosLogo } from '../../components/visual/PithrosLogo';
import { Button } from '../../components/ui/Button';

interface ResetPasswordViewProps {
  onNavigate: (route: string) => void;
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({ onNavigate }) => {
  const { isDark } = useTheme();
  const { confirmPasswordReset } = useAuth();

  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const res = await confirmPasswordReset(resetCode || 'demo_code', newPassword);
    setIsLoading(false);

    if (res.success) {
      setSuccess(true);
    } else {
      setErrorMessage(res.error || 'Failed to update password. Code may have expired.');
    }
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
              Set new password
            </h1>
            <p
              className={`text-xs sm:text-sm ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
              }`}
            >
              Choose a strong, memorable passphrase for your account.
            </p>
          </div>

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="reset-code"
                  className={`block text-xs font-medium ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  Reset authorization code <span className="opacity-60 font-normal">(from email)</span>
                </label>
                <input
                  id="reset-code"
                  type="text"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="Paste reset token or code"
                  disabled={isLoading}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-1 ${
                    isDark
                      ? 'border-[#202C40] bg-[#182337] text-[#F8F5EE] placeholder-[#6E5F4E] focus:border-[#B99452] focus:ring-[#B99452]/30'
                      : 'border-[#E5DED2] bg-white text-[#20242A] placeholder-[#A09585] focus:border-[#23324A] focus:ring-[#23324A]/30'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="new-pass"
                  className={`block text-xs font-medium ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  New password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="new-pass"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    disabled={isLoading}
                    className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-1 ${
                      isDark
                        ? 'border-[#202C40] bg-[#182337] text-[#F8F5EE] placeholder-[#6E5F4E] focus:border-[#B99452] focus:ring-[#B99452]/30'
                        : 'border-[#E5DED2] bg-white text-[#20242A] placeholder-[#A09585] focus:border-[#23324A] focus:ring-[#23324A]/30'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="confirm-pass"
                  className={`block text-xs font-medium ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  Confirm new password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="confirm-pass"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
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

              {/* Password requirement checklist */}
              <div
                className={`p-3 rounded-xl border text-[11px] space-y-1 ${
                  isDark
                    ? 'border-[#202C40] bg-[#16120D] text-[#9EA3AA]'
                    : 'border-[#E5DED2] bg-[#F4ECE1] text-[#7D766D]'
                }`}
              >
                <p className="font-medium text-inherit">Security requirements:</p>
                <p className={newPassword.length >= 8 ? 'text-emerald-500' : ''}>
                  • Minimum 8 characters
                </p>
                <p className={newPassword && newPassword === confirmPassword ? 'text-emerald-500' : ''}>
                  • Passwords must match
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-2.5 text-sm font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? 'Updating password…' : 'Update Password'}
                </Button>
              </div>
            </form>
          ) : (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center space-y-5"
            >
              <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center border border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h3
                  className={`text-lg font-serif ${
                    isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                  }`}
                >
                  Password updated.
                </h3>
                <p
                  className={`text-xs ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                  }`}
                >
                  Your credentials have been securely updated. Please sign in with your new password.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  className="w-full py-2.5 text-sm"
                  onClick={() => onNavigate('/signin')}
                >
                  Continue to Sign In
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
