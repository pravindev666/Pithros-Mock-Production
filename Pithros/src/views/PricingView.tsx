import React from 'react';
import { Check, Shield, ArrowRight } from 'lucide-react';
import { pricingPlans } from '../data/mockData';
import { Button } from '../components/ui/Button';
import { useTheme } from '../context/ThemeContext';

interface PricingViewProps {
  onNavigate: (route: string) => void;
}

export const PricingView: React.FC<PricingViewProps> = ({ onNavigate }) => {
  const { isDark } = useTheme();

  return (
    <div
      className={`min-h-screen py-16 px-4 sm:px-6 lg:px-8 transition-colors ${
        isDark ? 'bg-[#111820] text-[#F8F5EE]' : 'bg-[#F3EEE4] text-[#20242A]'
      }`}
    >
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Title */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span
            className={`text-[11px] uppercase tracking-widest font-medium ${
              isDark ? 'text-[#B99452]' : 'text-[#23324A]'
            }`}
          >
            Permanent Preservation
          </span>
          <h1
            className={`text-3xl sm:text-5xl font-serif ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Simple, Dignified Pricing
          </h1>
          <p
            className={`text-sm sm:text-base leading-relaxed ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
            }`}
          >
            Every family can create a beautiful memorial with stories, photos, and privacy for free. Optional upgrades support multi-decade preservation and physical plaque craft.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricingPlans.map((plan) => (
            <div
              key={plan.id}
              className={`p-8 rounded-3xl border flex flex-col justify-between transition-all ${
                plan.popular
                  ? isDark
                    ? 'border-[#B99452] bg-[#16120E] shadow-2xl shadow-black/80'
                    : 'border-[#23324A] bg-[#FCFAF5] shadow-xl shadow-amber-900/10'
                  : isDark
                  ? 'border-[#202C40] bg-[#182337]'
                  : 'border-[#E5DED2] bg-[#FCFAF5]'
              }`}
            >
              <div>
                {plan.popular && (
                  <span
                    className={`text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full inline-block mb-3 ${
                      isDark
                        ? 'text-[#B99452] bg-[#B99452]/15'
                        : 'text-[#8C5C0F] bg-[#E5DED2] border border-[#D9941E]/40'
                    }`}
                  >
                    Recommended for Families
                  </span>
                )}
                <h3
                  className={`text-2xl font-serif ${
                    isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                  }`}
                >
                  {plan.name}
                </h3>
                <div className="mt-4 mb-2 flex items-baseline gap-1">
                  <span
                    className={`text-4xl font-serif ${
                      isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                    }`}
                  >
                    {plan.price}
                  </span>
                  <span className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                    / {plan.period}
                  </span>
                </div>
                <p
                  className={`text-xs mb-6 leading-relaxed ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                  }`}
                >
                  {plan.description}
                </p>

                <div
                  className={`space-y-3 pt-4 border-t ${
                    isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
                  }`}
                >
                  {plan.features.map((f, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2.5 text-xs ${
                        isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                      }`}
                    >
                      <Check
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                        }`}
                      />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-4">
                <Button
                  variant={plan.popular ? 'primary' : 'outline'}
                  size="md"
                  className="w-full"
                  onClick={() => onNavigate('/create-memorial')}
                >
                  {plan.ctaText}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Zero Ads Guarantee */}
        <div
          className={`rounded-3xl border p-8 text-center max-w-3xl mx-auto space-y-3 ${
            isDark
              ? 'border-[#202C40] bg-[#182337]'
              : 'border-[#E5DED2] bg-[#FCFAF5]'
          }`}
        >
          <Shield
            className={`w-8 h-8 mx-auto ${
              isDark ? 'text-[#B99452]' : 'text-[#23324A]'
            }`}
          />
          <h3
            className={`text-xl font-serif ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Our Non-Commercial Commitment
          </h3>
          <p
            className={`text-xs leading-relaxed max-w-2xl mx-auto ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
            }`}
          >
            We will never display third-party advertisements, sell family email addresses to data brokers, or place sponsored content next to a loved one’s memory. Pithros is funded entirely through transparent family plans and physical craft products.
          </p>
        </div>
      </div>
    </div>
  );
};
