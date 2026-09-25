import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Mail, Lock, Eye, EyeOff, Phone, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { PithrosLogo } from '../../components/visual/PithrosLogo';
import { AuthAtmosphereVisual } from '../../components/visual/AuthAtmosphereVisual';
import { Button } from '../../components/ui/Button';

interface SignUpViewProps {
  onNavigate: (route: string) => void;
}

export const SignUpView: React.FC<SignUpViewProps> = ({ onNavigate }) => {
  const { isDark } = useTheme();
  const { signUpWithEmail, signInWithGoogle } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMessage('Please complete all required fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Please choose a password with at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('The passwords do not match. Please re-enter.');
      return;
    }

    if (!agreeTerms) {
      setErrorMessage('Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const res = await signUpWithEmail({
      fullName,
      email,
      password,
      phone: phone.trim() || undefined,
      agreeTerms,
    });

    setIsLoading(false);

    if (res.success) {
      // After sign-up: redirect to verify-email
      onNavigate('/verify-email');
    } else {
      setErrorMessage(res.error || 'Unable to create your account. Please try again.');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    const res = await signInWithGoogle();
    setIsLoading(false);
    if (res.success) {
      onNavigate('/dashboard');
    } else {
      setErrorMessage(res.error || 'Google sign-up could not be completed.');
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
          <AuthAtmosphereVisual tagline="Begin creating a place to preserve the stories that matter." />
        </div>

        {/* Right Column: Sign Up Card */}
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
            <div className="text-center sm:text-left space-y-2 mb-6">
              <div className="lg:hidden inline-block mb-2">
                <PithrosLogo variant={isDark ? 'dark' : 'light'} />
              </div>
              <h1
                className={`text-2xl sm:text-3xl font-serif font-normal tracking-tight ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                Create your Pithros account.
              </h1>
              <p
                className={`text-xs sm:text-sm ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                Begin creating a place to preserve the stories and memories that matter.
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

            {/* Google Quick Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className={`w-full py-2.5 px-4 mb-5 rounded-xl border flex items-center justify-center gap-3 text-xs font-medium transition-all ${
                isDark
                  ? 'border-[#202C40] bg-[#182337] text-[#F8F5EE] hover:bg-[#202C40]'
                  : 'border-[#E5DED2] bg-white text-[#20242A] hover:bg-[#E5DED2]'
              }`}
            >
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
              <span>Continue with Google</span>
            </button>

            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center">
                <div
                  className={`w-full border-t ${
                    isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
                  }`}
                />
              </div>
              <div className="relative flex justify-center text-[11px]">
                <span
                  className={`px-2.5 ${
                    isDark ? 'bg-[#182337] text-[#9EA3AA]' : 'bg-[#FCFAF5] text-[#7D766D]'
                  }`}
                >
                  or sign up with email
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label
                  htmlFor="fullName"
                  className={`block text-xs font-medium ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  Full name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Anita Krishnan"
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

              <div className="space-y-1">
                <label
                  htmlFor="signup-email"
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
                    id="signup-email"
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

              <div className="space-y-1">
                <label
                  htmlFor="signup-phone"
                  className={`block text-xs font-medium ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  Phone number <span className="opacity-60 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id="signup-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98450 11223"
                    disabled={isLoading}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-1 ${
                      isDark
                        ? 'border-[#202C40] bg-[#182337] text-[#F8F5EE] placeholder-[#6E5F4E] focus:border-[#B99452] focus:ring-[#B99452]/30'
                        : 'border-[#E5DED2] bg-white text-[#20242A] placeholder-[#A09585] focus:border-[#23324A] focus:ring-[#23324A]/30'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="signup-password"
                  className={`block text-xs font-medium ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="confirm-password"
                  className={`block text-xs font-medium ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  Confirm password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
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

              {/* Terms Checkbox */}
              <div className="pt-1.5 flex items-start gap-2.5">
                <input
                  id="agreeTerms"
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  required
                  className="mt-0.5 rounded border-[#202C40] text-[#B99452] focus:ring-[#B99452]"
                />
                <label
                  htmlFor="agreeTerms"
                  className={`text-xs leading-relaxed ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                  }`}
                >
                  I agree to the Terms of Service and Privacy Policy, and understand that family memorials are maintained with permanent archival stewardship.
                </label>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-2.5 text-sm font-medium shadow-lg"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating account…' : 'Create Account'}
                </Button>
              </div>
            </form>

            {/* Bottom Sign In Link */}
            <div className="mt-6 pt-4 border-t border-inherit text-center text-xs">
              <p className={isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('/signin')}
                  className={`font-medium hover:underline ${
                    isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                  }`}
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
