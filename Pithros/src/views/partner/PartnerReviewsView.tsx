import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  MessageSquare,
  Heart,
  CheckCircle2,
  Calendar,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import {
  FlowerSymbol,
  FoldedHandsSymbol,
  DoveSymbol,
} from '../../components/visual/PithrosVisualSymbols';

interface ReviewItem {
  id: string;
  family: string;
  service: string;
  date: string;
  feedback: string;
  verifiedMemorialSlug?: string;
  deceasedName: string;
}

export const PartnerReviewsView: React.FC = () => {
  const { isDark } = useTheme();

  const [reviews] = useState<ReviewItem[]>([
    {
      id: 'rev-1',
      family: 'The Krishnan Family',
      service: 'Native Tree Planting Memorial',
      date: 'March 16, 2026',
      deceasedName: 'Dr. Arun Krishnan',
      feedback:
        'Rajesh and the team at Shanti Care handled Arun’s sacred grove ceremony with supreme dignity. Every sapling was selected with care, and the GPS coordinates are forever preserved in our family sanctuary.',
      verifiedMemorialSlug: 'arun-krishnan',
    },
    {
      id: 'rev-2',
      family: 'Mehra Family',
      service: 'Sanctuary Lamp & Vigil Setup',
      date: 'February 24, 2026',
      deceasedName: 'Smt. Kamla Mehra',
      feedback:
        'In our moment of deepest grief, their quiet efficiency and reverence brought peace to our home. Thank you for your kindness.',
    },
    {
      id: 'rev-3',
      family: 'Thomas Family',
      service: 'Granite Plaque Inscription',
      date: 'January 28, 2026',
      deceasedName: 'Mary Thomas',
      feedback:
        'The memorial tablet engraving was executed with meticulous attention to Mary’s favourite hymn lyrics. We are deeply grateful.',
      verifiedMemorialSlug: 'mary-thomas',
    },
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-inherit">
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-serif ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Family Bereavement Feedback & Testimonials
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Reflections shared by families assisted through the Pithros Farewell Network.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            100% Verified Family Feedback
          </span>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((rev) => (
          <div
            key={rev.id}
            className={`p-6 rounded-2xl border space-y-3 transition-colors ${
              isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2
                    className={`text-sm font-medium ${
                      isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                    }`}
                  >
                    {rev.family}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    Verified Memorial Service
                  </span>
                </div>
                <p
                  className={`text-[11px] mt-0.5 ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                  }`}
                >
                  Service: {rev.service} • In honor of{' '}
                  <span className="font-serif italic font-medium">{rev.deceasedName}</span> • {rev.date}
                </p>
              </div>
            </div>

            <p
              className={`text-xs sm:text-sm font-serif leading-relaxed italic ${
                isDark ? 'text-[#D9D2C6]' : 'text-[#3E3831]'
              }`}
            >
              "{rev.feedback}"
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
