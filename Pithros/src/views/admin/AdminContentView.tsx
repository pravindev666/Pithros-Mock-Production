import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Eye,
  Shield,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';

interface ContentItem {
  id: string;
  type: 'condolence' | 'image' | 'voice_recording';
  memorialName: string;
  author: string;
  snippet: string;
  flagReason: string;
  date: string;
  status: 'pending' | 'resolved' | 'dismissed';
}

export const AdminContentView: React.FC = () => {
  const { isDark } = useTheme();

  const [items, setItems] = useState<ContentItem[]>([
    {
      id: 'cnt-1',
      type: 'condolence',
      memorialName: 'Dr. Arun Krishnan',
      author: 'Unknown Guest',
      snippet: 'Advertising irrelevant commercial services on tribute wall.',
      flagReason: 'Automated Spam Detection',
      date: 'March 21, 2026',
      status: 'pending',
    },
    {
      id: 'cnt-2',
      type: 'condolence',
      memorialName: 'Mary Thomas',
      author: 'Distant Relative',
      snippet: 'Contested statement regarding estate inheritance in guestbook.',
      flagReason: 'Reported by Family Steward',
      date: 'March 19, 2026',
      status: 'pending',
    },
  ]);

  const [search, setSearch] = useState('');

  const handleResolve = (id: string, action: 'dismissed' | 'resolved') => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: action } : item))
    );
  };

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
            Memorial Content & Tribute Review Desk
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Safeguard family sanctuaries against spam, harassment, and defamatory submissions.
          </p>
        </div>

        <span className="text-xs font-mono px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-400">
          {items.filter((i) => i.status === 'pending').length} Content Flags Pending
        </span>
      </div>

      <div
        className={`p-5 rounded-2xl border space-y-3 ${
          isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
        }`}
      >
        {items.length === 0 || items.every((i) => i.status !== 'pending') ? (
          <p
            className={`py-8 text-center text-xs ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            All flagged content items have been reviewed and resolved.
          </p>
        ) : (
          items
            .filter((i) => i.status === 'pending')
            .map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDark ? 'border-[#202C40] bg-[#16120D]' : 'border-[#E5DED2] bg-white'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.memorialName}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-red-500/10 text-red-400 border border-red-500/20">
                      {item.flagReason}
                    </span>
                  </div>
                  <p
                    className={`italic text-[11px] ${
                      isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                    }`}
                  >
                    "{item.snippet}"
                  </p>
                  <span className="text-[10px] font-mono opacity-60 block">
                    Author: {item.author} • {item.date}
                  </span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleResolve(item.id, 'dismissed')}
                    className="px-3 py-1.5 rounded-lg border border-stone-600 text-stone-300 hover:bg-stone-800 text-xs"
                  >
                    Dismiss Flag
                  </button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleResolve(item.id, 'resolved')}
                  >
                    Remove Content
                  </Button>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
};
