import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, ArrowLeft, Home, LayoutDashboard } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { PithrosLogo } from '../../components/visual/PithrosLogo';
import { Button } from '../../components/ui/Button';

interface ForbiddenViewProps {
  onNavigate: (route: string) => void;
}

export const ForbiddenView: React.FC<ForbiddenViewProps> = ({ onNavigate }) => {
  const { isDark } = useTheme();

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
        className="w-full max-w-md text-center"
      >
        <div
          className={`p-8 sm:p-10 rounded-3xl border shadow-2xl backdrop-blur-md transition-colors ${
            isDark
              ? 'bg-[#182337] border-[#202C40]'
              : 'bg-[#FCFAF5] border-[#E5DED2]'
          }`}
        >
          <div className="inline-block mb-6">
            <PithrosLogo variant={isDark ? 'dark' : 'light'} />
          </div>

          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center border border-amber-500/20 bg-amber-500/10 text-amber-500 mb-5">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h1
            className={`text-2xl font-serif font-normal mb-2 ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            You don't have access to this area.
          </h1>

          <p
            className={`text-xs sm:text-sm leading-relaxed mb-6 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            This section is restricted to authorized family stewards or platform operators. If you believe this is in error, please reach out to your memorial's lead steward.
          </p>

          <div className="space-y-3">
            <Button
              variant="primary"
              className="w-full py-2.5 text-sm"
              icon={LayoutDashboard}
              onClick={() => onNavigate('/dashboard')}
            >
              Go to Dashboard
            </Button>

            <Button
              variant="outline"
              className="w-full py-2.5 text-xs"
              icon={Home}
              onClick={() => onNavigate('/')}
            >
              Return to Pithros
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
