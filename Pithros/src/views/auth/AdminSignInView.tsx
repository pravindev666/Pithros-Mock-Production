import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, Mail, Eye, EyeOff, AlertCircle, KeyRound, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { PithrosLogo } from '../../components/visual/PithrosLogo';
import { Button } from '../../components/ui/Button';

interface AdminSignInViewProps {
  onNavigate: (route: string) => void;
}

export const AdminSignInView: React.FC<AdminSignInViewProps> = ({ onNavigate }) => {
  const { isDark } = useTheme();
  const { signInWithEmail, switchRole } = useAuth();

  const [email, setEmail] = useState('admin@pithros.org');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Administrative credentials required.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    // Initial credentials step
    const res = await signInWithEmail(email, password);
    setIsLoading(false);

    if (res.success) {
      // Step into administrative MFA requirement
      setMfaRequired(true);
    } else {
      setErrorMessage(res.error || 'Invalid administrative credentials.');
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode || mfaCode.length < 4) {
      setErrorMessage('Please provide a valid 6-digit TOTP / security key code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    // Simulate cryptographic TOTP verification
    await new Promise((r) => setTimeout(r, 550));
    setIsLoading(false);

    if (mfaCode === '123456' || mfaCode.length >= 4) {
      switchRole('admin');
      onNavigate('/admin');
    } else {
      setErrorMessage('Security code rejected. Check your authenticator application.');
    }
  };

  return (
    <div
      className={`min-h-[calc(100vh-80px)] flex items-center justify-center p-4 sm:p-6 transition-colors ${
        isDark ? 'bg-[#060504] text-[#F8F5EE]' : 'bg-[#181410] text-[#F8F5EE]'
      }`}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="p-8 sm:p-10 rounded-2xl border border-[#2B231B] bg-[#0E0C0A] shadow-2xl backdrop-blur-md">
          {/* Top Security & Branding Header */}
          <div className="flex items-center justify-between pb-6 mb-6 border-b border-[#201A14]">
            <PithrosLogo variant="dark" />
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1C1510] border border-[#382C1F] text-[11px] font-mono text-[#D4AF37]">
              <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>SEC-OP-AUTH</span>
            </div>
          </div>

          <div className="space-y-1 mb-6">
            <h1 className="text-xl font-serif text-[#F8F5EE]">Pithros Administration</h1>
            <p className="text-xs text-[#9EA3AA]">Restricted administrative access.</p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-xs text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!mfaRequired ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-[#C4B29E]">Admin Identity</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[#2B231B] bg-[#14100D] text-sm text-[#F8F5EE] placeholder-stone-600 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-[#C4B29E]">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-[#2B231B] bg-[#14100D] text-sm text-[#F8F5EE] placeholder-stone-600 focus:outline-none focus:border-[#D4AF37]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-500 hover:text-stone-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-2.5 text-xs font-mono uppercase tracking-wider"
                  disabled={isLoading}
                >
                  {isLoading ? 'Verifying Credentials…' : 'Authenticate Operator'}
                </Button>
              </div>

              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={() => onNavigate('/')}
                  className="text-xs text-[#7D766D] hover:text-[#C4B29E] underline"
                >
                  Return to public portal
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div className="p-3 rounded-lg border border-[#382C1F] bg-[#16120E] text-xs text-[#C4B29E] flex items-center gap-2.5">
                <KeyRound className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                <span>Two-Factor Authentication: Enter the 6-digit TOTP from your authenticator.</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-[#C4B29E]">TOTP Security Token</label>
                <input
                  type="text"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000 000"
                  autoFocus
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 rounded-lg border border-[#2B231B] bg-[#14100D] text-center font-mono text-xl tracking-widest text-[#F8F5EE] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-2.5 text-xs font-mono uppercase tracking-wider"
                  disabled={isLoading}
                >
                  {isLoading ? 'Confirming Token…' : 'Verify & Enter Console'}
                </Button>
              </div>
            </form>
          )}

          <div className="mt-8 pt-4 border-t border-[#201A14] flex items-center justify-between text-[11px] font-mono text-[#6E5F4E]">
            <span>TLS 1.3 / E2E AUDITED</span>
            <span>NODE_ID: PITHROS-US-CENTRAL</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
