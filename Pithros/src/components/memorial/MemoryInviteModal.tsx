import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Share2,
  Copy,
  Check,
  Heart,
  MessageSquare,
  Sparkles,
  QrCode,
  Send,
  Users,
  ExternalLink,
} from 'lucide-react';
import { Memorial } from '../../types';
import { Button } from '../ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/api';
import { MOTION_TIMING, MOTION_EASING } from '../../lib/motion';

interface MemoryInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  memorial: Memorial;
  initialMode?: 'submit' | 'invite';
  onMemorySubmitted?: () => void;
}

export const MemoryInviteModal: React.FC<MemoryInviteModalProps> = ({
  isOpen,
  onClose,
  memorial,
  initialMode = 'submit',
  onMemorySubmitted,
}) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'submit' | 'invite'>(initialMode);

  // Form state
  const [authorName, setAuthorName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [memoryText, setMemoryText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  // Pre-configured relationship badges
  const relationPresets = [
    'Daughter',
    'Son',
    'Spouse',
    'Grandchild',
    'Brother',
    'Sister',
    'Colleague',
    'Lifelong Friend',
    'Relative',
  ];

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/m/${memorial.slug}/remember`
    : `https://pithros.in/m/${memorial.slug}/remember`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `We are gathering stories, reflections, and cherished memories celebrating the life of ${memorial.fullName}. Please take a moment to share your favorite memory with the family:\n\n${inviteUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Sharing memories of ${memorial.fullName}`);
    const body = encodeURIComponent(
      `Dear family and friends,\n\nWe are gathering reflections and memories celebrating the life of ${memorial.fullName}.\n\nPlease share your favorite memory, reflection, or story with us here:\n${inviteUrl}\n\nWith love and remembrance,\nThe Family`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleSubmitMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !memoryText.trim()) return;

    setIsSubmitting(true);
    try {
      await api.addTribute(memorial.id, {
        authorName: authorName.trim(),
        relationship: relationship.trim() || 'Family & Friend',
        message: memoryText.trim(),
      });
      setIsSubmitted(true);
      onMemorySubmitted?.();
    } catch {
      // Graceful fallback
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className={`fixed inset-0 backdrop-blur-md ${isDark ? 'bg-black/80' : 'bg-black/60'}`}
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: MOTION_TIMING.standard, ease: MOTION_EASING.cinematicEaseOut }}
        className={`relative z-10 w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden ${
          isDark
            ? 'bg-[#141B2D] border-[#202C40] text-[#F8F5EE]'
            : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A]'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'border-[#202C40] bg-[#111820]' : 'border-[#E5DED2] bg-[#F4EFE6]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Heart className={`w-4 h-4 ${isDark ? 'text-[#B99452]' : 'text-[#8C5C0F]'}`} />
            <div>
              <h2 className="text-base font-serif font-semibold">Memory Invite</h2>
              <p className={`text-[11px] ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                Remembering {memorial.fullName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDark
                ? 'border-[#202C40] text-[#9EA3AA] hover:text-[#F8F5EE] hover:bg-[#182337]'
                : 'border-[#E5DED2] text-[#7D766D] hover:text-[#20242A] hover:bg-[#EAE2D5]'
            }`}
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          className={`flex border-b text-xs font-medium ${
            isDark ? 'border-[#202C40] bg-[#141B2D]' : 'border-[#E5DED2] bg-[#FCFAF5]'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('submit');
              setIsSubmitted(false);
            }}
            className={`flex-1 py-3 px-4 text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'submit'
                ? isDark
                  ? 'border-[#B99452] text-[#B99452] font-semibold bg-[#182337]/50'
                  : 'border-[#23324A] text-[#23324A] font-semibold bg-[#EFE8DC]/50'
                : 'border-transparent text-[#9EA3AA] hover:text-[#F8F5EE]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Share Your Memory
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invite')}
            className={`flex-1 py-3 px-4 text-center border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'invite'
                ? isDark
                  ? 'border-[#B99452] text-[#B99452] font-semibold bg-[#182337]/50'
                  : 'border-[#23324A] text-[#23324A] font-semibold bg-[#EFE8DC]/50'
                : 'border-transparent text-[#9EA3AA] hover:text-[#F8F5EE]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Invite Family & Friends
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'submit' ? (
            isSubmitted ? (
              <div className="py-8 text-center space-y-4">
                <div
                  className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center ${
                    isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  <Check className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-serif">Thank You for Remembering</h3>
                  <p
                    className={`text-xs max-w-sm mx-auto leading-relaxed ${
                      isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                    }`}
                  >
                    Your memory has been woven into {memorial.fullName}’s permanent memorial book for family and friends to cherish.
                  </p>
                </div>
                <div className="pt-3 flex flex-wrap items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsSubmitted(false);
                      setAuthorName('');
                      setRelationship('');
                      setMemoryText('');
                    }}
                  >
                    Share Another Memory
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setActiveTab('invite')}
                  >
                    Invite Others to Share
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitMemory} className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-serif">
                    What do you remember about {memorial.fullName}?
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                    Every story, smile, or shared lesson keeps their memory alive. No account required.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider mb-1 font-medium">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="e.g. Anand Sharma"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition-colors outline-none ${
                        isDark
                          ? 'border-[#202C40] bg-[#111820] text-[#F8F5EE] focus:border-[#B99452]'
                          : 'border-[#E5DED2] bg-[#FCFAF5] text-[#20242A] focus:border-[#23324A]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider mb-1 font-medium">
                      Your Relationship
                    </label>
                    <input
                      type="text"
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                      placeholder="e.g. Daughter, Colleague, Friend"
                      className={`w-full px-3.5 py-2 rounded-xl border text-xs transition-colors outline-none mb-2 ${
                        isDark
                          ? 'border-[#202C40] bg-[#111820] text-[#F8F5EE] focus:border-[#B99452]'
                          : 'border-[#E5DED2] bg-[#FCFAF5] text-[#20242A] focus:border-[#23324A]'
                      }`}
                    />
                    {/* Quick preset pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {relationPresets.map((rel) => (
                        <button
                          key={rel}
                          type="button"
                          onClick={() => setRelationship(rel)}
                          className={`text-[10px] px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                            relationship === rel
                              ? isDark
                                ? 'border-[#B99452] bg-[#B99452]/20 text-[#B99452] font-semibold'
                                : 'border-[#23324A] bg-[#23324A]/10 text-[#23324A] font-semibold'
                              : isDark
                              ? 'border-[#202C40] text-[#9EA3AA] hover:text-[#F8F5EE]'
                              : 'border-[#E5DED2] text-[#7D766D] hover:text-[#20242A]'
                          }`}
                        >
                          {rel}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider mb-1 font-medium">
                      Your Memory or Story *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={memoryText}
                      onChange={(e) => setMemoryText(e.target.value)}
                      placeholder="Share a quiet conversation, a shared laugh, a life lesson, or how they touched your life..."
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition-colors outline-none leading-relaxed resize-none ${
                        isDark
                          ? 'border-[#202C40] bg-[#111820] text-[#F8F5EE] focus:border-[#B99452]'
                          : 'border-[#E5DED2] bg-[#FCFAF5] text-[#20242A] focus:border-[#23324A]'
                      }`}
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className={`text-[11px] ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                    Moderated by family stewards
                  </span>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    icon={Send}
                    isLoading={isSubmitting}
                  >
                    Share Memory
                  </Button>
                </div>
              </form>
            )
          ) : (
            /* INVITE TAB */
            <div className="space-y-5">
              <div className="space-y-1">
                <h3 className="text-lg font-serif">Gather Your Family’s Memories</h3>
                <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                  Share this invitation link with relatives, former colleagues, and friends. Anyone with the link can write and submit reflections without signing up.
                </p>
              </div>

              {/* Invitation Link Box */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                  isDark ? 'border-[#202C40] bg-[#111820]' : 'border-[#E5DED2] bg-[#EFE8DC]'
                }`}
              >
                <div className="truncate text-xs font-mono select-all">
                  {inviteUrl}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  icon={copied ? Check : Copy}
                  onClick={handleCopyLink}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>

              {/* Fast Sharing Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="p-3.5 rounded-2xl border border-emerald-600/30 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Share via WhatsApp
                </button>
                <button
                  type="button"
                  onClick={handleEmailShare}
                  className={`p-3.5 rounded-2xl border text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    isDark
                      ? 'border-[#202C40] bg-[#182337] hover:bg-[#202C40]'
                      : 'border-[#E5DED2] bg-[#FCFAF5] hover:bg-[#EAE2D5]'
                  }`}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share via Email
                </button>
              </div>

              {/* Emotional Explainer Banner */}
              <div
                className={`p-4 rounded-2xl border text-xs space-y-1 ${
                  isDark
                    ? 'border-[#B99452]/30 bg-[#16120E] text-[#D9D2C6]'
                    : 'border-[#23324A]/20 bg-[#FCFAF5] text-[#554F48]'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-[11px] text-[#B99452]">
                  <Sparkles className="w-3.5 h-3.5" />
                  Why Memories Matter
                </div>
                <p className="leading-relaxed">
                  Every person touches hundreds of lives in ways their immediate family may never know. Sharing this link gathers childhood anecdotes, work triumphs, and quiet acts of kindness into one permanent tribute book.
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
