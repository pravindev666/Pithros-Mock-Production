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
  const [careInterval, setCareInterval] = React.useState<'monthly' | 'half_yearly' | 'annual'>('annual');

  const displayPlans = pricingPlans.filter(
    (p) => !['plan_care_monthly', 'plan_care_half_yearly'].includes(p.id)
  );

  return (
    <div
      className={`min-h-screen py-8 sm:py-12 md:py-16 px-4 sm:px-6 lg:px-8 transition-colors ${
        isDark ? 'bg-[#111820] text-[#F8F5EE]' : 'bg-[#F3EEE4] text-[#20242A]'
      }`}
    >
      <div className="max-w-6xl mx-auto space-y-10 sm:space-y-12 md:space-y-16">
        {/* Title */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span
            className={`text-[11px] uppercase tracking-widest font-medium ${
              isDark ? 'text-[#B99452]' : 'text-[#23324A]'
            }`}
          >
            Thoughtful Remembrance & Digital Longevity
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
            Every family can remember a loved one with story, photographs, and visitor tributes for free. Memorial Care preserves their voice, spoken histories, and the family's growing archive.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 md:gap-8">
          {displayPlans.map((plan) => {
            const isCare = plan.id === 'plan_care_annual';
            const price = isCare
              ? careInterval === 'monthly'
                ? '₹249'
                : careInterval === 'half_yearly'
                ? '₹649'
                : '₹999'
              : plan.price;

            const period = isCare
              ? careInterval === 'monthly'
                ? 'per month'
                : careInterval === 'half_yearly'
                ? 'for 6 months'
                : 'per year'
              : plan.period;

            const savings = isCare
              ? careInterval === 'monthly'
                ? null
                : careInterval === 'half_yearly'
                ? 'Save ₹845'
                : 'Save ₹1,989'
              : null;

            const targetPlanId = isCare
              ? careInterval === 'monthly'
                ? 'plan_care_monthly'
                : careInterval === 'half_yearly'
                ? 'plan_care_half_yearly'
                : 'plan_care_annual'
              : plan.id;

            return (
              <div
                key={plan.id}
                className={`p-5 sm:p-6 md:p-8 rounded-3xl border flex flex-col justify-between transition-all ${
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
                  <div className="flex items-baseline justify-between gap-2">
                    <h3
                      className={`text-2xl font-serif ${
                        isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                      }`}
                    >
                      {plan.name}
                    </h3>
                    {plan.subtitle && (
                      <span
                        className={`text-[11px] font-mono uppercase tracking-wider ${
                          plan.popular
                            ? isDark ? 'text-[#B99452]' : 'text-[#8C5C0F]'
                            : isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                        }`}
                      >
                        {plan.subtitle}
                      </span>
                    )}
                  </div>

                  {/* Choice Architecture & Payment Options for Memorial Care */}
                  {isCare && (
                    <div className="mt-4 space-y-2">
                      <div
                        className={`p-1 rounded-xl border flex items-center justify-between text-[11px] font-medium ${
                          isDark
                            ? 'bg-[#182337] border-[#202C40]'
                            : 'bg-[#E5DED2] border-[#E5DED2]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setCareInterval('annual')}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                            careInterval === 'annual'
                              ? isDark
                                ? 'bg-[#16120E] text-[#B99452] font-bold shadow-xs'
                                : 'bg-[#FCFAF5] text-[#23324A] font-bold shadow-xs'
                              : isDark
                              ? 'text-[#9EA3AA] hover:text-[#F8F5EE]'
                              : 'text-[#7D766D] hover:text-[#20242A]'
                          }`}
                        >
                          Annual (Best Value)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCareInterval('half_yearly')}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                            careInterval === 'half_yearly'
                              ? isDark
                                ? 'bg-[#16120E] text-[#B99452] font-bold shadow-xs'
                                : 'bg-[#FCFAF5] text-[#23324A] font-bold shadow-xs'
                              : isDark
                              ? 'text-[#9EA3AA] hover:text-[#F8F5EE]'
                              : 'text-[#7D766D] hover:text-[#20242A]'
                          }`}
                        >
                          6 Months
                        </button>
                        <button
                          type="button"
                          onClick={() => setCareInterval('monthly')}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                            careInterval === 'monthly'
                              ? isDark
                                ? 'bg-[#16120E] text-[#B99452] font-bold shadow-xs'
                                : 'bg-[#FCFAF5] text-[#23324A] font-bold shadow-xs'
                              : isDark
                              ? 'text-[#9EA3AA] hover:text-[#F8F5EE]'
                              : 'text-[#7D766D] hover:text-[#20242A]'
                          }`}
                        >
                          Monthly
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono px-1">
                        <span className={isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}>
                          {careInterval === 'annual' && '₹83/mo equiv. • Save ₹1,989 vs monthly'}
                          {careInterval === 'half_yearly' && 'Flexible commitment • Save ₹845 vs monthly'}
                          {careInterval === 'monthly' && 'Maximum flexibility • ₹2,988/yr reference'}
                        </span>
                        {careInterval === 'half_yearly' && (
                          <button
                            type="button"
                            onClick={() => setCareInterval('annual')}
                            className="text-[#B99452] font-medium hover:underline cursor-pointer"
                          >
                            +₹350 gets 12 mos →
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 mb-2 flex items-baseline gap-2">
                    <span
                      className={`text-4xl font-serif ${
                        isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                      }`}
                    >
                      {price}
                    </span>
                    <span className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                      / {period}
                    </span>
                    {savings && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-semibold">
                        {savings}
                      </span>
                    )}
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

                <div className="mt-8 pt-4 space-y-2">
                  <Button
                    variant={plan.popular ? 'primary' : 'outline'}
                    size="md"
                    className="w-full"
                    onClick={() => {
                      if (targetPlanId === 'plan_free') {
                        onNavigate('/create-memorial');
                      } else {
                        onNavigate(`/checkout?plan=${targetPlanId}`);
                      }
                    }}
                  >
                    {isCare
                      ? careInterval === 'monthly'
                        ? 'Start Monthly (₹249)'
                        : careInterval === 'half_yearly'
                        ? 'Start 6 Months (₹649)'
                        : 'Preserve Memorial (₹999/yr)'
                      : plan.ctaText}
                  </Button>
                  {isCare && careInterval === 'annual' && (
                    <div className="text-center">
                      <span className={`text-[10px] font-mono ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                        Other options:{' '}
                        <button
                          type="button"
                          onClick={() => setCareInterval('half_yearly')}
                          className="hover:underline text-[#B99452] cursor-pointer"
                        >
                          ₹649 / 6 mos
                        </button>
                        {' · '}
                        <button
                          type="button"
                          onClick={() => setCareInterval('monthly')}
                          className="hover:underline text-[#B99452] cursor-pointer"
                        >
                          ₹249 / mo
                        </button>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Feature Comparison Table */}
        <div className="space-y-6">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span
              className={`text-[11px] uppercase tracking-widest font-mono font-medium ${
                isDark ? 'text-[#B99452]' : 'text-[#23324A]'
              }`}
            >
              Side-by-Side Inclusions
            </span>
            <h2
              className={`text-2xl sm:text-3xl font-serif ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Detailed Tier Comparison
            </h2>
            <p
              className={`text-xs sm:text-sm leading-relaxed ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
              }`}
            >
              Authoritative limits and feature entitlements across all PITHROS plans.
            </p>
          </div>

          <div
            className={`rounded-3xl border overflow-hidden shadow-sm ${
              isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
            }`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr
                    className={`border-b ${
                      isDark ? 'border-[#202C40] bg-[#141B2D]' : 'border-[#E5DED2] bg-[#F2ECE1]'
                    }`}
                  >
                    <th className="py-4 px-6 font-serif text-sm font-semibold">Capability</th>
                    <th className="py-4 px-6 font-mono text-[11px] uppercase tracking-wider font-semibold">
                      Free Memorial
                    </th>
                    <th
                      className={`py-4 px-6 font-mono text-[11px] uppercase tracking-wider font-semibold ${
                        isDark ? 'text-[#B99452]' : 'text-[#8C5C0F]'
                      }`}
                    >
                      Memorial Care (₹999/yr)
                    </th>
                    <th className="py-4 px-6 font-mono text-[11px] uppercase tracking-wider font-semibold">
                      Family Archive (₹2,999/yr)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-current/10">
                  {/* Category: Identity & Media */}
                  <tr className={isDark ? 'bg-[#141B2D]/70' : 'bg-[#EFE8DC]/70'}>
                    <td
                      colSpan={4}
                      className={`py-2.5 px-6 font-mono text-[10px] uppercase font-bold tracking-widest ${
                        isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                      }`}
                    >
                      Core Memorial & Media
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-medium">Memorial Pages</td>
                    <td className="py-3.5 px-6">1 memorial</td>
                    <td className="py-3.5 px-6 font-semibold">1 memorial</td>
                    <td className="py-3.5 px-6 font-semibold">Up to 5 memorials</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-medium">Photographs Allowed</td>
                    <td className="py-3.5 px-6">3 curated photos</td>
                    <td className="py-3.5 px-6 font-semibold">30 photographs</td>
                    <td className="py-3.5 px-6 font-semibold">150 photos total (shared pool)</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-medium">Total Media Allowance</td>
                    <td className="py-3.5 px-6">15 MB</td>
                    <td className="py-3.5 px-6 font-semibold">300 MB</td>
                    <td className="py-3.5 px-6 font-semibold">1.5 GB shared</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-medium">Per-Photo Size Ceiling</td>
                    <td className="py-3.5 px-6">5 MB max</td>
                    <td className="py-3.5 px-6 font-semibold">10 MB max</td>
                    <td className="py-3.5 px-6 font-semibold">10 MB max</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-medium">Voice & Spoken Memories</td>
                    <td className="py-3.5 px-6 text-[#9EA3AA]">None</td>
                    <td className="py-3.5 px-6 font-semibold">
                      Up to 60 minutes (100 MB)
                    </td>
                    <td className="py-3.5 px-6 font-semibold">500 MB total across family</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-medium">Per-Audio Recording Ceiling</td>
                    <td className="py-3.5 px-6 text-[#9EA3AA]">—</td>
                    <td className="py-3.5 px-6 font-semibold">50 MB max per recording</td>
                    <td className="py-3.5 px-6 font-semibold">50 MB max per recording</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-medium">Life Timeline Milestones</td>
                    <td className="py-3.5 px-6">5 milestones</td>
                    <td className="py-3.5 px-6 font-semibold">50 milestones</td>
                    <td className="py-3.5 px-6 font-semibold">250 milestones</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-medium">Family Collaborators</td>
                    <td className="py-3.5 px-6">Owner + 1</td>
                    <td className="py-3.5 px-6 font-semibold">Owner + 10 with custom roles</td>
                    <td className="py-3.5 px-6 font-semibold">Owner + 10 per memorial (50 total)</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-medium">Condolences & Tributes</td>
                    <td className="py-3.5 px-6 font-semibold">Unlimited</td>
                    <td className="py-3.5 px-6 font-semibold">Unlimited</td>
                    <td className="py-3.5 px-6 font-semibold">Unlimited</td>
                  </tr>

                  {/* Category: Archival & Legacy */}
                  <tr className={isDark ? 'bg-[#141B2D]/70' : 'bg-[#EFE8DC]/70'}>
                    <td
                      colSpan={4}
                      className={`py-2.5 px-6 font-mono text-[10px] uppercase font-bold tracking-widest ${
                        isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                      }`}
                    >
                      Archival Preservation & Export
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-medium">Archival Book PDF Export</td>
                    <td className="py-3.5 px-6 text-[#9EA3AA]">—</td>
                    <td className="py-3.5 px-6 font-semibold">High-res print-ready PDF</td>
                    <td className="py-3.5 px-6 font-semibold">High-res print-ready PDF</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-medium">Raw Media ZIP Vault</td>
                    <td className="py-3.5 px-6 text-[#9EA3AA]">—</td>
                    <td className="py-3.5 px-6 font-semibold">Included</td>
                    <td className="py-3.5 px-6 font-semibold">Included</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-medium">Digital Legacy Links</td>
                    <td className="py-3.5 px-6 text-[#9EA3AA]">—</td>
                    <td className="py-3.5 px-6 font-semibold">Included</td>
                    <td className="py-3.5 px-6 font-semibold">Included</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-medium">Anniversary & Milestone Reminders</td>
                    <td className="py-3.5 px-6 text-[#9EA3AA]">—</td>
                    <td className="py-3.5 px-6 font-semibold">Automated SMS & Email</td>
                    <td className="py-3.5 px-6 font-semibold">Automated SMS & Email</td>
                  </tr>

                  {/* Category: Privacy & Abuse Controls */}
                  <tr className={isDark ? 'bg-[#141B2D]/70' : 'bg-[#EFE8DC]/70'}>
                    <td
                      colSpan={4}
                      className={`py-2.5 px-6 font-mono text-[10px] uppercase font-bold tracking-widest ${
                        isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                      }`}
                    >
                      Security, Privacy & Longevity
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-medium">EXIF Privacy Sanitization</td>
                    <td className="py-3.5 px-6">GPS & device serials stripped</td>
                    <td className="py-3.5 px-6 font-semibold">GPS & device serials stripped</td>
                    <td className="py-3.5 px-6 font-semibold">GPS & device serials stripped</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-medium">Daily Upload Attempt Quota</td>
                    <td className="py-3.5 px-6">10 attempts / day</td>
                    <td className="py-3.5 px-6 font-semibold">50 attempts / day</td>
                    <td className="py-3.5 px-6 font-semibold">100 attempts / day</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-medium">Zero Deletion Guarantee</td>
                    <td className="py-3.5 px-6 font-semibold">Never deleted</td>
                    <td className="py-3.5 px-6 font-semibold">Never deleted on expiry</td>
                    <td className="py-3.5 px-6 font-semibold">Never deleted on expiry</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-medium">Third-Party Advertising</td>
                    <td className="py-3.5 px-6 font-semibold text-emerald-500">Zero ads forever</td>
                    <td className="py-3.5 px-6 font-semibold text-emerald-500">Zero ads forever</td>
                    <td className="py-3.5 px-6 font-semibold text-emerald-500">Zero ads forever</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Honest FAQ Section */}
        <div className="space-y-8 max-w-4xl mx-auto">
          <div className="text-center space-y-2">
            <span
              className={`text-[11px] uppercase tracking-widest font-mono font-medium ${
                isDark ? 'text-[#B99452]' : 'text-[#23324A]'
              }`}
            >
              Common Inquiries
            </span>
            <h2
              className={`text-2xl sm:text-3xl font-serif ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Frequently Asked Questions
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className={`p-6 rounded-2xl border space-y-2 ${
                isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
              }`}
            >
              <h3 className="font-serif text-sm font-semibold">
                Why does the Free tier include 3 photographs?
              </h3>
              <p
                className={`text-xs leading-relaxed ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                }`}
              >
                A dignified memorial fundamentally needs a portrait, a beloved family photograph, and a key life milestone. Keeping Free at 3 photographs ensures genuine remembrance without turning PITHROS into an uncontrolled arbitrary file-hosting service. When your archive grows, Memorial Care provides an archival home for up to 30 curated photographs.
              </p>
            </div>

            <div
              className={`p-6 rounded-2xl border space-y-2 ${
                isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
              }`}
            >
              <h3 className="font-serif text-sm font-semibold">
                Can I pay monthly or for 6 months instead of annually?
              </h3>
              <p
                className={`text-xs leading-relaxed ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                }`}
              >
                Yes. Memorial Care is one identical product available across three commitments: Monthly at ₹249/month for maximum flexibility, 6 Months at ₹649 (saving ₹845 vs monthly), or Annual at ₹999/year (our recommended plan at just ₹83/month equivalent, saving ₹1,989). All commitments share the exact same features and allowances.
              </p>
            </div>

            <div
              className={`p-6 rounded-2xl border space-y-2 ${
                isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
              }`}
            >
              <h3 className="font-serif text-sm font-semibold">
                How is voice memory storage measured?
              </h3>
              <p
                className={`text-xs leading-relaxed ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                }`}
              >
                We display voice storage as actual time: up to 60 minutes of spoken memories (100 MB audio allowance). Individual recordings can be up to 50 MB, which allows high-fidelity spoken preservation while protecting the family archive from accidental uncompressed file dumps.
              </p>
            </div>

            <div
              className={`p-6 rounded-2xl border space-y-2 ${
                isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
              }`}
            >
              <h3 className="font-serif text-sm font-semibold">
                What happens if our subscription expires? (Zero Deletion)
              </h3>
              <p
                className={`text-xs leading-relaxed ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                }`}
              >
                We never delete a family's memories. If a subscription lapses, the memorial transitions to an immutable read-only preserved state. Every photo, biography, timeline milestone, and voice memory remains 100% accessible to family and visitors forever.
              </p>
            </div>

            <div
              className={`p-6 rounded-2xl border space-y-2 md:col-span-2 ${
                isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
              }`}
            >
              <h3 className="font-serif text-sm font-semibold">
                Can relatives or friends sponsor a memorial?
              </h3>
              <p
                className={`text-xs leading-relaxed ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                }`}
              >
                Yes. Any memorial steward can generate a secure Family Sponsorship Link. Extended family, friends, or community members can sponsor Memorial Care directly via UPI, NetBanking, or card without needing steward login credentials.
              </p>
            </div>
          </div>
        </div>

        {/* Zero Ads Guarantee */}
        <div
          className={`rounded-3xl border p-6 sm:p-8 text-center max-w-3xl mx-auto space-y-3 ${
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
