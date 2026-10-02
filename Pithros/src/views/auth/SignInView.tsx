import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, Smartphone, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { PithrosLogo } from '../../components/visual/PithrosLogo';
import { AuthAtmosphereVisual } from '../../components/visual/AuthAtmosphereVisual';
import { Button } from '../../components/ui/Button';
import { UserRole } from '../../types';

interface SignInViewProps {
  onNavigate: (route: string) => void;
  onSelectRole?: (role: UserRole) => void;
}

export const SignInView: React.FC<SignInViewProps> = ({ onNavigate, onSelectRole }) => {
  const { isDark } = useTheme();
  const { signInWithEmail, signInWithGoogle, role, returnUrl, setReturnUrl } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resolveRedirect = (userRole: UserRole) => {
    if (returnUrl) {
      const dest = returnUrl;
      setReturnUrl(null);
      onNavigate(dest);
      return;
    }

    switch (userRole) {
      case 'admin':
        onNavigate('/admin');
        break;
      case 'partner':
        onNavigate('/partner/dashboard');
        break;
      case 'family_steward':
      case 'family_contributor':
        onNavigate('/dashboard');
        break;
      default:
        onNavigate('/dashboard');
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const res = await signInWithEmail(email, password);
    setIsLoading(false);

    if (res.success) {
      const targetRole = res.role || role;
      if (onSelectRole) onSelectRole(targetRole);
      resolveRedirect(targetRole);
    } else {
      const safeMsg =
        res.error && res.error !== 'undefined' && !res.error.includes('undefined')
          ? res.error
          : "The email or password doesn't match. Please try again.";
      setErrorMessage(safeMsg);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);

    const res = await signInWithGoogle();
    setIsGoogleLoading(false);

    if (res.success) {
      const targetRole = res.role || role;
      if (onSelectRole) onSelectRole(targetRole);
      resolveRedirect(targetRole);
    } else {
      setErrorMessage(res.error || 'Google sign-in could not be completed. Please try again.');
    }
  };

  return (
    <div
      className={`min-h-[calc(100vh-80px)] flex items-center justify-center p-4 sm:p-6 md:p-10 transition-colors ${
        isDark ? 'bg-[#111820] text-[#F8F5EE]' : 'bg-[#F3EEE4] text-[#20242A]'
      }`}
    >
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Atmospheric Pithros Visual (Desktop) */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-6 h-full">
          <AuthAtmosphereVisual tagline="Your memories, your family, your space." />
        </div>

        {/* Right Column: Authentication Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7 xl:col-span-6 w-full max-w-md mx-auto"
        >
          <div
            className={`p-7 sm:p-9 rounded-3xl border shadow-2xl backdrop-blur-md transition-colors ${
              isDark
                ? 'bg-[#182337]/95 border-[#202C40]'
                : 'bg-[#FCFAF5]/95 border-[#E5DED2]'
            }`}
          >
            {/* Header */}
            <div className="text-center sm:text-left space-y-2 mb-7">
              <div className="lg:hidden inline-block mb-2">
                <PithrosLogo variant={isDark ? 'dark' : 'light'} />
              </div>
              <h1
                className={`text-2xl sm:text-3xl font-serif font-normal tracking-tight ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                Welcome back to Pithros.
              </h1>
              <p
                className={`text-sm ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                Your memories, your family, your space.
              </p>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-5 p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-400 flex items-start gap-2.5"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </motion.div>
            )}

            {/* Email + Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
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
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    disabled={isLoading || isGoogleLoading}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-1 ${
                      isDark
                        ? 'border-[#202C40] bg-[#182337] text-[#F8F5EE] placeholder-[#6E5F4E] focus:border-[#B99452] focus:ring-[#B99452]/30'
                        : 'border-[#E5DED2] bg-white text-[#20242A] placeholder-[#A09585] focus:border-[#23324A] focus:ring-[#23324A]/30'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className={`block text-xs font-medium ${
                      isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                    }`}
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => onNavigate('/forgot-password')}
                    className={`text-xs transition-colors hover:underline ${
                      isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                    }`}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isLoading || isGoogleLoading}
                    className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-1 ${
                      isDark
                        ? 'border-[#202C40] bg-[#182337] text-[#F8F5EE] placeholder-[#6E5F4E] focus:border-[#B99452] focus:ring-[#B99452]/30'
                        : 'border-[#E5DED2] bg-white text-[#20242A] placeholder-[#A09585] focus:border-[#23324A] focus:ring-[#23324A]/30'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-2.5 text-sm font-medium shadow-lg"
                  disabled={isLoading || isGoogleLoading}
                >
                  {isLoading ? 'Signing in…' : 'Sign In'}
                </Button>
              </div>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div
                  className={`w-full border-t ${
                    isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
                  }`}
                />
              </div>
              <div className="relative flex justify-center text-xs">
                <span
                  className={`px-3 ${
                    isDark ? 'bg-[#182337] text-[#9EA3AA]' : 'bg-[#FCFAF5] text-[#7D766D]'
                  }`}
                >
                  or continue with
                </span>
              </div>
            </div>

            {/* Alternative Auth Methods */}
            <div className="space-y-2.5">
              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading || isGoogleLoading}
                className={`w-full py-2.5 px-4 rounded-xl border flex items-center justify-center gap-3 text-xs font-medium transition-all ${
                  isDark
                    ? 'border-[#202C40] bg-[#182337] text-[#F8F5EE] hover:bg-[#202C40] hover:border-[#382F24]'
                    : 'border-[#E5DED2] bg-white text-[#20242A] hover:bg-[#E5DED2] hover:border-[#C4B9A8]'
                }`}
              >
                {/* Standard Google Multi-color 'G' icon */}
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isGoogleLoading ? 'Opening Google…' : 'Continue with Google'}</span>
              </button>

              {/* Phone OTP Link */}
              <button
                type="button"
                onClick={() => onNavigate('/auth/phone')}
                disabled={isLoading || isGoogleLoading}
                className={`w-full py-2.5 px-4 rounded-xl border flex items-center justify-center gap-2.5 text-xs font-medium transition-all ${
                  isDark
                    ? 'border-[#202C40] bg-transparent text-[#D9D2C6] hover:bg-[#182337]'
                    : 'border-[#E5DED2] bg-transparent text-[#554F48] hover:bg-[#E5DED2]'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 opacity-70" />
                <span>Continue with phone</span>
              </button>
            </div>

            {/* Bottom Create Account Link */}
            <div className="mt-8 pt-5 border-t border-inherit text-center text-xs space-y-2">
              <p className={isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}>
                New to Pithros?{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('/signup')}
                  className={`font-medium hover:underline inline-flex items-center gap-1 ${
                    isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                  }`}
                >
                  Create an account
                  <ArrowRight className="w-3 h-3" />
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
