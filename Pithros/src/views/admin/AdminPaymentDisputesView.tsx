import React from 'react';
import { Scale, ShieldAlert } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const AdminPaymentDisputesView: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <div className="space-y-6">
      <div
        className={`p-3.5 rounded-2xl border flex items-center gap-2 text-xs ${
          isDark
            ? 'bg-[#16120E] border-[#3D3328] text-[#D9D2C6]'
            : 'bg-[#FFF8EE] border-[#E8DEC8] text-[#5A4E3E]'
        }`}
      >
        <ShieldAlert className="w-4 h-4 text-amber-500" />
        <span>
          Payment disputes and chargebacks are not connected to a live case source yet. No dispute
          ledger is shown because there is nothing to show — a fabricated one would be worse than
          none.
        </span>
      </div>

      <div
        className={`pb-4 border-b ${
          isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
        }`}
      >
        <span
          className={`text-[10px] font-mono uppercase tracking-wider ${
            isDark ? 'text-[#B99452]' : 'text-[#23324A]'
          }`}
        >
          Trust & Financial Arbitration
        </span>
        <h1
          className={`text-xl font-serif mt-0.5 ${
            isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
          }`}
        >
          Payment Disputes & Claims
        </h1>
      </div>

      <div
        className={`p-10 rounded-2xl border flex flex-col items-center justify-center text-center gap-3 ${
          isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
        }`}
      >
        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
          <Scale className="w-6 h-6" />
        </div>
        <h2 className={`text-sm font-medium ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}>
          No dispute source connected
        </h2>
        <p className={`text-xs max-w-md ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
          When a gateway-backed dispute lifecycle exists, cases will appear here with their evidence
          and status. Until then, refunds can be requested and issued from the Refund Operations
          desk.
        </p>
      </div>
    </div>
  );
};
