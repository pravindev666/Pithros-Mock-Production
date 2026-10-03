import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Pin,
  Clock,
  Sparkles,
  MessageSquare,
  Shield,
  Eye,
  Trash2,
  Plus,
} from 'lucide-react';
import { Memorial } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { tributesApi, type ModerationTribute } from '../../services/api/tributes';
import {
  DoveSymbol,
  FlowerSymbol,
  FoldedHandsSymbol,
  OfferingLightSymbol,
  StarSymbol,
  HeartSymbol,
  WreathSymbol,
  MemorySymbol,
} from '../../components/visual/PithrosVisualSymbols';

interface DashboardTributesViewProps {
  memorial: Memorial;
  onUpdate?: () => void;
}

interface TributeItem {
  id: string;
  author: string;
  relationship: string;
  date: string;
  gesture: 'dove' | 'flower' | 'hands' | 'light' | 'star' | 'heart' | 'wreath' | 'memory';
  gestureLabel: string;
  content: string;
  status: 'approved' | 'pending' | 'pinned';
  isFamilyVerified?: boolean;
}

function toTributeItem(row: ModerationTribute): TributeItem {
  return {
    id: row.id,
    author: row.authorName,
    relationship: row.relationship || 'Family & Friend',
    date: row.date,
    gesture: 'memory',
    gestureLabel: 'Remembrance',
    content: row.message,
    status: row.isPinned ? 'pinned' : row.status === 'pending_moderation' ? 'pending' : 'approved',
    isFamilyVerified: false,
  };
}

export const DashboardTributesView: React.FC<DashboardTributesViewProps> = ({
  memorial,
}) => {
  const { isDark } = useTheme();
  const { showToast } = useToast();

  const [tributes, setTributes] = useState<TributeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTributes = async () => {
    try {
      const rows = await tributesApi.listForModeration(memorial.id);
      // The moderation queue returns every status; only live ones are shown.
      const visible = rows.filter(
        (row) => row.status === 'pending_moderation' || row.status === 'approved',
      );
      setTributes(visible.map(toTributeItem));
    } catch {
      showToast('The tributes could not be loaded. Please try again.', { type: 'warning' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTributes();
    // Reload whenever the steward switches to a different memorial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memorial.id]);

  const [filterGesture, setFilterGesture] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTribute, setSelectedTribute] = useState<TributeItem | null>(null);
  const [replyText, setReplyText] = useState('');

  const renderGestureIcon = (gesture: TributeItem['gesture'], size = 20) => {
    switch (gesture) {
      case 'dove':
        return <DoveSymbol size={size} />;
      case 'flower':
        return <FlowerSymbol size={size} />;
      case 'hands':
        return <FoldedHandsSymbol size={size} />;
      case 'light':
        return <OfferingLightSymbol size={size} />;
      case 'star':
        return <StarSymbol size={size} />;
      case 'heart':
        return <HeartSymbol size={size} />;
      case 'wreath':
        return <WreathSymbol size={size} />;
      case 'memory':
      default:
        return <MemorySymbol size={size} />;
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await tributesApi.moderate(memorial.id, id, { status: 'approved' });
      await loadTributes();
    } catch {
      showToast('That tribute could not be approved. Please try again.', { type: 'warning' });
    }
  };

  const handlePin = async (id: string) => {
    const item = tributes.find((t) => t.id === id);
    try {
      await tributesApi.moderate(memorial.id, id, {
        status: 'approved',
        isPinned: item?.status !== 'pinned',
      });
      await loadTributes();
    } catch {
      showToast('That tribute could not be updated. Please try again.', { type: 'warning' });
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await tributesApi.remove(memorial.id, id);
      await loadTributes();
    } catch {
      showToast('That tribute could not be removed. Please try again.', { type: 'warning' });
    }
  };

  const filtered = tributes.filter((item) => {
    const matchesSearch =
      item.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.relationship.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGesture = filterGesture === 'all' || item.gesture === filterGesture;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesGesture && matchesStatus;
  });

  const gestureTypes = [
    { key: 'all', label: 'All Gestures', icon: null },
    { key: 'flower', label: 'Flowers', icon: <FlowerSymbol size={18} /> },
    { key: 'light', label: 'Sanctuary Light', icon: <OfferingLightSymbol size={18} /> },
    { key: 'dove', label: 'Peace Doves', icon: <DoveSymbol size={18} /> },
    { key: 'hands', label: 'Prayers', icon: <FoldedHandsSymbol size={18} /> },
    { key: 'heart', label: 'Love', icon: <HeartSymbol size={18} /> },
    { key: 'star', label: 'Stars', icon: <StarSymbol size={18} /> },
    { key: 'wreath', label: 'Wreaths', icon: <WreathSymbol size={18} /> },
    { key: 'memory', label: 'Stories', icon: <MemorySymbol size={18} /> },
  ];

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
            Tributes & Remembrance Offerings
          </h1>
          <p
            className={`text-xs sm:text-sm mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Review condolences, sacred offerings, and remembrances shared in honor of{' '}
            <span className="font-medium">{memorial.fullName}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              isDark
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                : 'border-[#23324A]/30 bg-[#23324A]/10 text-[#23324A]'
            }`}
          >
            {tributes.filter((t) => t.status === 'pending').length} Pending Review
          </span>
        </div>
      </div>

      {/* Remembrance Gestures Bar (Non-social, Sacred Symbols) */}
      <div
        className={`p-4 rounded-2xl border ${
          isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
        }`}
      >
        <p
          className={`text-xs uppercase tracking-wider font-mono mb-3 ${
            isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
          }`}
        >
          Sacred Remembrance Gestures
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {gestureTypes.slice(1).map((g) => {
            const count = tributes.filter((t) => t.gesture === g.key).length;
            const isSelected = filterGesture === g.key;
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => setFilterGesture(isSelected ? 'all' : g.key)}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? isDark
                      ? 'border-[#B99452] bg-[#182337] text-[#B99452]'
                      : 'border-[#23324A] bg-[#E5DED2] text-[#23324A]'
                    : isDark
                    ? 'border-[#202C40] bg-[#16120D] text-[#D9D2C6] hover:border-[#382F24]'
                    : 'border-[#E5DED2] bg-white text-[#20242A] hover:border-[#C4B9A8]'
                }`}
              >
                {g.icon}
                <span className="text-[11px] font-medium">{g.label}</span>
                <span className="text-[10px] opacity-70 font-mono">{count} offered</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tributes by author or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 rounded-xl border text-xs transition-colors focus:outline-none ${
              isDark
                ? 'border-[#202C40] bg-[#16120D] text-[#F8F5EE] focus:border-[#B99452]'
                : 'border-[#E5DED2] bg-white text-[#20242A] focus:border-[#23324A]'
            }`}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'pinned', 'approved', 'pending'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all whitespace-nowrap ${
                filterStatus === status
                  ? isDark
                    ? 'bg-[#B99452] text-[#111820] font-medium'
                    : 'bg-[#23324A] text-white font-medium'
                  : isDark
                  ? 'border border-[#202C40] text-[#9EA3AA] hover:text-[#F8F5EE]'
                  : 'border border-[#E5DED2] text-[#7D766D] hover:text-[#20242A]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Tributes List */}
      <div className="space-y-3">
        {isLoading ? (
          <div
            className={`p-10 text-center rounded-2xl border ${
              isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
            }`}
          >
            <p className={isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}>Loading tributes…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div
            className={`p-10 text-center rounded-2xl border ${
              isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
            }`}
          >
            <p className={isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}>
              No tributes match your criteria.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <motion.div
              key={item.id}
              layout
              className={`p-5 rounded-2xl border transition-colors ${
                item.status === 'pinned'
                  ? isDark
                    ? 'border-[#B99452]/40 bg-[#1A150F]'
                    : 'border-[#23324A]/50 bg-[#F9F5EC]'
                  : item.status === 'pending'
                  ? isDark
                    ? 'border-amber-500/20 bg-amber-500/5'
                    : 'border-[#23324A]/20 bg-[#23324A]/5'
                  : isDark
                  ? 'border-[#202C40] bg-[#182337]'
                  : 'border-[#E5DED2] bg-[#FCFAF5]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl border border-amber-500/20 bg-amber-500/10 flex items-center justify-center flex-shrink-0 shadow-sm">
                    {renderGestureIcon(item.gesture, 32)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className={`text-sm font-medium ${
                          isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                        }`}
                      >
                        {item.author}
                      </h3>
                      {item.isFamilyVerified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Family Verified
                        </span>
                      )}
                      {item.status === 'pinned' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <Pin className="w-2.5 h-2.5" />
                          Pinned
                        </span>
                      )}
                      {item.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <Clock className="w-2.5 h-2.5" />
                          Pending Review
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-[11px] ${
                        isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                      }`}
                    >
                      {item.relationship} • {item.date} • {item.gestureLabel}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  {item.status === 'pending' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={CheckCircle2}
                      onClick={() => handleApprove(item.id)}
                    >
                      Approve
                    </Button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handlePin(item.id)}
                      className={`p-1.5 rounded-lg border text-xs transition-colors ${
                        item.status === 'pinned'
                          ? isDark
                            ? 'bg-[#B99452] text-[#111820] border-[#B99452]'
                            : 'bg-[#23324A] text-white border-[#23324A]'
                          : isDark
                          ? 'border-[#202C40] text-[#9EA3AA] hover:text-[#F8F5EE]'
                          : 'border-[#E5DED2] text-[#7D766D] hover:text-[#20242A]'
                      }`}
                      title={item.status === 'pinned' ? 'Unpin' : 'Pin to top'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remove tribute"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Message Content */}
              <p
                className={`text-xs sm:text-sm mt-3 leading-relaxed font-serif ${
                  isDark ? 'text-[#D9D2C6]' : 'text-[#3E3831]'
                }`}
              >
                "{item.content}"
              </p>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
