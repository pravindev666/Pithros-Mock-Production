import React from 'react';
import {
  Lock,
  ShieldCheck,
  Users,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useTheme } from '../context/ThemeContext';

interface HowItWorksViewProps {
  onNavigate: (route: string) => void;
}

export const HowItWorksView: React.FC<HowItWorksViewProps> = ({ onNavigate }) => {
  const { isDark } = useTheme();

  return (
    <div
      className={`min-h-screen py-16 px-4 sm:px-6 lg:px-8 transition-colors ${
        isDark ? 'bg-[#111820] text-[#F8F5EE]' : 'bg-[#F3EEE4] text-[#20242A]'
      }`}
    >
      <div className="max-w-4xl mx-auto space-y-16">
        {/* Title */}
        <div className="text-center space-y-4">
          <span
            className={`text-[11px] uppercase tracking-widest font-medium ${
              isDark ? 'text-[#B99452]' : 'text-[#23324A]'
            }`}
          >
            Platform Principles
          </span>
          <h1
            className={`text-3xl sm:text-5xl font-serif ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            How Pithros Works
          </h1>
          <p
            className={`text-sm sm:text-base max-w-2xl mx-auto leading-relaxed ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
            }`}
          >
            A permanent sanctuary for memory designed with emotional restraint, absolute family control, and no distracting social metrics.
          </p>
        </div>

        {/* 1. Four Privacy Tiers */}
        <div
          className={`rounded-3xl border p-8 space-y-6 ${
            isDark
              ? 'border-[#202C40] bg-[#182337]'
              : 'border-[#E5DED2] bg-[#FCFAF5]'
          }`}
        >
          <div className="space-y-1">
            <span
              className={`text-xs uppercase tracking-wider font-medium ${
                isDark ? 'text-[#B99452]' : 'text-[#23324A]'
              }`}
            >
              Privacy First
            </span>
            <h2
              className={`text-2xl font-serif ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Your Story, Your Audience
            </h2>
            <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
              Unlike open social networks where algorithms distribute personal memories, Pithros guarantees four distinct boundary tiers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {[
              {
                title: 'Strictly Private',
                desc: 'Only users specifically invited with credentials can view. Ideal for intimate family journals.',
                icon: Lock,
              },
              {
                title: 'Family Circle',
                desc: 'Restricted to confirmed relatives, children, and close kin who sign in to contribute.',
                icon: Users,
              },
              {
                title: 'Unlisted (Link Only)',
                desc: 'Accessible by anyone with the private URL, but completely omitted from search engine indices.',
                icon: Compass,
              },
              {
                title: 'Public Memorial',
                desc: 'Searchable in the Pithros registry for extended colleagues, alumni, and distant community members.',
                icon: ShieldCheck,
              },
            ].map((p, i) => {
              const Icon = p.icon;
              return (
                <div
                  key={i}
                  className={`p-4 rounded-xl border ${
                    isDark
                      ? 'border-[#202C40] bg-[#182337]/60'
                      : 'border-[#E5DED2] bg-[#E5DED2]'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 mb-2 ${
                      isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                    }`}
                  />
                  <h3
                    className={`text-sm font-serif mb-1 ${
                      isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                    }`}
                  >
                    {p.title}
                  </h3>
                  <p
                    className={`text-xs leading-relaxed ${
                      isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                    }`}
                  >
                    {p.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Verification Protocol */}
        <div
          className={`rounded-3xl border p-8 space-y-6 ${
            isDark
              ? 'border-[#202C40] bg-[#182337]'
              : 'border-[#E5DED2] bg-[#FCFAF5]'
          }`}
        >
          <div className="space-y-1">
            <span
              className={`text-xs uppercase tracking-wider font-medium ${
                isDark ? 'text-[#6EE7B7]' : 'text-[#245C45]'
              }`}
            >
              Trust & Authenticity
            </span>
            <h2
              className={`text-2xl font-serif ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              The Document Reviewed Verification Process
            </h2>
            <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
              Ensuring remembrance records are authentic while safeguarding sensitive personal records.
            </p>
          </div>

          <div
            className={`space-y-4 text-xs leading-relaxed ${
              isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
            }`}
          >
            <p>
              1. <strong>Confidential Vault Upload:</strong> When a family steward chooses to verify their memorial, they upload an official municipal death registration or certificate into an encrypted vault.
            </p>
            <p>
              2. <strong>Zero Public Display:</strong> These certificates are never displayed on the public memorial page or exposed to search engines.
            </p>
            <p>
              3. <strong>Discretionary Review:</strong> A credentialed verification officer checks the dates, full name, and jurisdiction to prevent impersonation or misleading records.
            </p>
            <p>
              4. <strong>Badge Granted:</strong> Once confirmed, the memorial is awarded the permanent "Document Reviewed" authenticity badge.
            </p>
          </div>
        </div>

        {/* 3. Quiet Remembrance Offerings */}
        <div
          className={`rounded-3xl border p-8 space-y-4 ${
            isDark
              ? 'border-[#202C40] bg-[#182337]'
              : 'border-[#E5DED2] bg-[#FCFAF5]'
          }`}
        >
          <h2
            className={`text-2xl font-serif ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            No Likes, No Algorithms
          </h2>
          <p
            className={`text-xs leading-relaxed ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
            }`}
          >
            Grief is not content to be ranked. Pithros has deliberately eliminated numerical counters, trending leaderboards, and viral mechanisms. In their place are quiet remembrance offerings: kindling a light, leaving a flower, placing a star, or writing a heartfelt memory.
          </p>
        </div>

        {/* Bottom CTA */}
        <div className="text-center pt-8">
          <Button
            variant="primary"
            size="lg"
            onClick={() => onNavigate('/create-memorial')}
            icon={ArrowRight}
            iconPosition="right"
          >
            Create a Memorial
          </Button>
        </div>
      </div>
    </div>
  );
};
