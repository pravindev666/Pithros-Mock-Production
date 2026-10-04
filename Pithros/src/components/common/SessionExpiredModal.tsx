import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';
import { useDialogA11y } from '../../lib/useDialogA11y';

interface SessionExpiredModalProps {
  onReauthenticated: () => void;
  onNavigateToSignIn: () => void;
}

export const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({
  onReauthenticated,
  onNavigateToSignIn,
}) => {
  const { isDark } = useTheme();
  const { authState, currentUser, pithrosUser, signInWithEmail } = useAuth();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isExpired = authState === 'session_expired';
  const dialogRef = useDialogA11y(isExpired, onNavigateToSignIn);

  if (!isExpired) return null;

  const emailToUnlock = currentUser?.email || pithrosUser?.email || 'anita.k@example.com';

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('Please enter your password to resume.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const res = await signInWithEmail(emailToUnlock, password);
    setIsLoading(false);

    if (res.success) {
      onReauthenticated();
    } else {
      setErrorMessage(res.error || 'Password incorrect. Please re-enter.');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          ref={dialogRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="session-paused-title"
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`w-full max-w-md p-7 sm:p-9 rounded-3xl border shadow-2xl transition-colors focus:outline-none ${
            isDark
              ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE]'
              : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A]'
          }`}
        >
          <div className="text-center space-y-3 mb-6">
            <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center border border-amber-500/25 bg-amber-500/10 text-amber-500">
              <Clock className="w-7 h-7" />
            </div>

            <h2 id="session-paused-title" className="text-2xl font-serif">Session Paused</h2>
            <p
              className={`text-xs sm:text-sm leading-relaxed ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
              }`}
            >
              Your session timed out to safeguard memorial data. Your unfinished work has been preserved. Enter your password to continue.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium">Steward Account</label>
              <input
                type="email"
                value={emailToUnlock}
                disabled
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs opacity-75 cursor-not-allowed ${
                  isDark
                    ? 'border-[#202C40] bg-[#16120D] text-[#F8F5EE]'
                    : 'border-[#E5DED2] bg-[#F4ECE1] text-[#20242A]'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoFocus
                  required
                  disabled={isLoading}
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none ${
                    isDark
                      ? 'border-[#202C40] bg-[#182337] text-[#F8F5EE] focus:border-[#B99452]'
                      : 'border-[#E5DED2] bg-white text-[#20242A] focus:border-[#23324A]'
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

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full py-2.5 text-sm font-medium"
                disabled={isLoading}
              >
                {isLoading ? 'Verifying…' : 'Resume Session'}
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-inherit text-center">
            <button
              type="button"
              onClick={onNavigateToSignIn}
              className={`text-xs hover:underline ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
              }`}
            >
              Sign in with a different account
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
