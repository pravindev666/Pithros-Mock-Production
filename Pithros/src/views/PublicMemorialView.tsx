import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Share2,
  Heart,
  Flame,
  Volume2,
  Calendar,
  Image as ImageIcon,
  BookOpen,
  Users,
  ExternalLink,
  Flag,
  Sparkles,
  Flower2,
  Sun,
  Plus,
  PenLine,
  CheckCircle,
  Scale,
  Eye,
  Clock,
} from 'lucide-react';
import { Memorial, RemembranceOffering } from '../types';
import { Button } from '../components/ui/Button';
import { VerificationBadge, PrivacyBadge } from '../components/ui/Badge';
import { MemorialHalo } from '../components/visual/MemorialHalo';
import { StarField, MemorialGlow, MemorialAtmosphere } from '../components/visual/VisualComponents';
import { Constellation } from '../components/visual/Constellation';
import { AudioPlayer } from '../components/ui/AudioPlayer';
import { Lightbox } from '../components/ui/Lightbox';
import { ShareModal } from '../components/ui/ShareModal';
import { ReportModal } from '../components/ui/ReportModal';
import { DisputeModal } from '../components/ui/DisputeModal';
import { OfferingModal } from '../components/ui/OfferingModal';
import {
  DoveSymbol,
  FlowerSymbol,
  FoldedHandsSymbol,
  OfferingLightSymbol,
  StarSymbol,
  HeartSymbol,
  WreathSymbol,
  MemorySymbol,
} from '../components/visual/PithrosVisualSymbols';
import { VerificationDrawer } from '../components/verification/VerificationDrawer';
import { AmbientOfferingStream } from '../components/memorial/AmbientOfferingStream';
import { MemorialBookModal } from '../components/memorial/MemorialBookModal';
import { MemoryInviteModal } from '../components/memorial/MemoryInviteModal';
import { MemoryMosaicModal } from '../components/memorial/MemoryMosaicModal';
import { CinematicRemembranceModal } from '../components/memorial/CinematicRemembranceModal';
import { ThemeSelectorModal } from '../components/memorial/ThemeSelectorModal';
import { getThemeConfig, MemorialThemeId } from '../lib/memorialThemes';
import { Book, Play, Grid, Palette, MessageSquareHeart } from 'lucide-react';
import { api } from '../services/api';
import { MOTION_TIMING, MOTION_EASING } from '../lib/motion';
import { useTheme } from '../context/ThemeContext';

interface PublicMemorialViewProps {
  memorial: Memorial;
  onRefreshMemorial?: () => void;
  onNavigate?: (route: string) => void;
}

const renderOfferingIcon = (type: string, size = 24) => {
  switch (type) {
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
    case 'honor':
    case 'wreath':
      return <WreathSymbol size={size} />;
    case 'memory':
    default:
      return <MemorySymbol size={size} />;
  }
};

export const PublicMemorialView: React.FC<PublicMemorialViewProps> = ({
  memorial,
  onRefreshMemorial,
  onNavigate,
}) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'story' | 'timeline' | 'photos' | 'voice' | 'family' | 'tributes' | 'legacy'>('story');
  const [previewMode, setPreviewMode] = useState<'visitor' | 'family'>('visitor');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    type: 'memorial' | 'tribute' | 'media';
    id: string;
    title: string;
  }>({
    type: 'memorial',
    id: memorial.id,
    title: memorial.fullName,
  });
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [offeringOpen, setOfferingOpen] = useState(false);
  const [verificationDrawerOpen, setVerificationDrawerOpen] = useState(false);
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [activeThemeId, setActiveThemeId] = useState<MemorialThemeId>(
    (memorial.theme as MemorialThemeId) || 'classic'
  );
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [memoryInviteOpen, setMemoryInviteOpen] = useState(false);
  const [memoryInviteMode, setMemoryInviteMode] = useState<'invite' | 'submit'>('invite');
  const [memoryMosaicOpen, setMemoryMosaicOpen] = useState(false);
  const [slideshowOpen, setSlideshowOpen] = useState(false);

  // Check URL for memory invite trigger (/m/<slug>/remember or ?action=remember or ?invite=true)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const search = window.location.search;
      if (
        path.endsWith('/remember') ||
        search.includes('action=remember') ||
        search.includes('invite=true')
      ) {
        setMemoryInviteMode('submit');
        setMemoryInviteOpen(true);
      }
    }
  }, []);

  const currentTheme = getThemeConfig(activeThemeId);

  // New Tribute state
  const [showTributeForm, setShowTributeForm] = useState(false);
  const [tributeAuthor, setTributeAuthor] = useState('');
  const [tributeRelation, setTributeRelation] = useState('');
  const [tributeMessage, setTributeMessage] = useState('');
  const [tributeSubmitting, setTributeSubmitting] = useState(false);
  const [tributeSuccess, setTributeSuccess] = useState(false);

  const photoMedia = memorial.media.filter((m) => m.type === 'photo');

  const handleOfferingSubmit = async (offering: Omit<RemembranceOffering, 'id' | 'timestamp'>) => {
    await api.addOffering(memorial.slug, offering);
    onRefreshMemorial?.();
  };

  const handleTributeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tributeAuthor.trim() || !tributeMessage.trim()) return;

    setTributeSubmitting(true);
    await api.addTribute(memorial.slug, {
      authorName: tributeAuthor.trim(),
      relationship: tributeRelation.trim() || 'Family & Friend',
      message: tributeMessage.trim(),
    });
    setTributeSubmitting(false);
    setTributeSuccess(true);
    setTimeout(() => {
      setShowTributeForm(false);
      setTributeSuccess(false);
      setTributeAuthor('');
      setTributeRelation('');
      setTributeMessage('');
    }, 2800);
    onRefreshMemorial?.();
  };

  const handleWriteTributeClick = () => {
    setActiveTab('tributes');
    setShowTributeForm(true);
  };

  return (
    <div
      className={`min-h-screen transition-colors ${currentTheme.fontClass} ${
        isDark
          ? `${currentTheme.bgDark} ${currentTheme.textDark}`
          : `${currentTheme.bgLight} ${currentTheme.textLight}`
      }`}
    >
      {/* Steward Preview Mode Banner (allows switching between Visitor View & Family View, and Theme Appearance) */}
      <div
        className={`w-full py-2.5 px-4 sm:px-6 border-b flex flex-wrap items-center justify-between gap-3 text-xs ${
          isDark ? 'bg-[#16120E] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
        }`}
      >
        <div className="flex items-center gap-2">
          <Eye className={`w-3.5 h-3.5 ${isDark ? 'text-[#B99452]' : 'text-[#23324A]'}`} />
          <span className={`font-medium ${isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'}`}>
            Viewing Memorial as:
          </span>
          <span className={isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}>
            {previewMode === 'visitor'
              ? 'Public Visitor View (Approved public stories & gestures)'
              : 'Family View (Includes private notes, unlisted audio & pending memories)'}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Appearance / Theme button */}
          <button
            type="button"
            onClick={() => setThemeModalOpen(true)}
            className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer text-[11px] font-sans ${
              isDark
                ? 'border-[#202C40] bg-[#182337] text-[#D9D2C6] hover:text-[#F8F5EE] hover:border-[#B99452]'
                : 'border-[#E5DED2] bg-[#FCFAF5] text-[#554F48] hover:text-[#20242A] hover:border-[#23324A]'
            }`}
            title="Choose how their memory is presented"
          >
            <Palette className="w-3 h-3" style={{ color: currentTheme.previewColor }} />
            <span>Theme: <strong className="font-semibold">{currentTheme.name}</strong></span>
          </button>

          <div className="flex rounded-lg border overflow-hidden text-[11px]">
          <button
            type="button"
            onClick={() => setPreviewMode('visitor')}
            className={`px-3 py-1 cursor-pointer transition-colors ${
              previewMode === 'visitor'
                ? isDark
                  ? 'bg-[#B99452] text-[#182337] font-semibold'
                  : 'bg-[#23324A] text-white font-semibold'
                : isDark
                ? 'text-[#9EA3AA] hover:text-[#F8F5EE]'
                : 'text-[#554F48] hover:text-[#20242A]'
            }`}
          >
            Visitor View
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode('family')}
            className={`px-3 py-1 cursor-pointer transition-colors ${
              previewMode === 'family'
                ? isDark
                  ? 'bg-[#B99452] text-[#182337] font-semibold'
                  : 'bg-[#23324A] text-white font-semibold'
                : isDark
                ? 'text-[#9EA3AA] hover:text-[#F8F5EE]'
                : 'text-[#554F48] hover:text-[#20242A]'
            }`}
          >
            Family View
          </button>
        </div>
        </div>
      </div>

      {/* 1. HERO SECTION */}
      <section
        className={`relative pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b overflow-hidden transition-colors ${
          isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
        }`}
      >
        <MemorialAtmosphere intensity="solemn" />

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center">
          {/* Portrait with Memorial Halo */}
          <div className="relative mb-6">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <MemorialHalo size={380} />
            </div>

            <motion.div
              className={`relative w-44 h-44 sm:w-52 sm:h-52 rounded-full overflow-hidden border-2 shadow-sm transition-colors ${
                isDark
                  ? 'border-[#B99452]/60 bg-[#182337] shadow-[0_0_35px_rgba(255,184,48,0.15)]'
                  : 'border-[#23324A]/70 bg-[#FCFAF5] shadow-[0_4px_24px_rgba(178,122,30,0.12)]'
              }`}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: MOTION_TIMING.emotional, ease: MOTION_EASING.easeOut }}
            >
              <img
                src={memorial.portraitUrl}
                alt={memorial.fullName}
                className="w-full h-full object-cover grayscale-[10%]"
              />
            </motion.div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
            <VerificationBadge
              type={memorial.verificationBadgeType}
              status={memorial.verificationStatus}
              onClick={() => setVerificationDrawerOpen(true)}
            />
            <PrivacyBadge privacy={memorial.privacy} />
          </div>

          {/* Full Name & Dates */}
          <h1
            className={`text-3xl sm:text-5xl font-serif tracking-tight mb-2 ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            {memorial.fullName}
          </h1>

          <p
            className={`text-xs sm:text-sm uppercase tracking-[0.25em] font-sans font-medium mb-4 ${
              isDark ? 'text-[#B99452]' : 'text-[#23324A]'
            }`}
          >
            {memorial.birthDate} — {memorial.deathDate}
          </p>

          {/* Short Epitaph */}
          <p
            className={`text-base sm:text-lg font-editorial italic max-w-xl leading-relaxed mb-4 ${
              isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
            }`}
          >
            “{memorial.shortEpitaph}”
          </p>

          {/* Informational Metadata (Non-Social) */}
          <p
            className={`text-xs mb-4 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            Preserved by custodian {memorial.stewardName} • Resting in {memorial.restingPlace || memorial.birthPlace}
          </p>

          {/* Ambient Remembrance Stream (Real placed offerings with fallback) */}
          <AmbientOfferingStream
            className="mb-7"
            events={
              memorial.offerings && memorial.offerings.length > 0
                ? memorial.offerings.map((o) => ({
                    id: o.id,
                    type: o.type,
                    message: o.message || `placed a gesture of remembrance`,
                    author: o.senderName,
                    timeAgo: o.timestamp,
                  }))
                : undefined
            }
          />

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {/* 1. Share a Memory (High leverage viral memory submission) */}
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setMemoryInviteMode('submit');
                setMemoryInviteOpen(true);
              }}
              icon={PenLine}
            >
              Share a Memory
            </Button>

            {/* 2. Enter Remembrance (Cinematic full-screen experience with Ken Burns and audio) */}
            <Button
              variant="secondary"
              size="md"
              onClick={() => setSlideshowOpen(true)}
              icon={Play}
            >
              Enter Remembrance
            </Button>

            {/* 3. Memory Mosaic (Life in 9 moments share card) */}
            <Button
              variant="outline"
              size="md"
              onClick={() => setMemoryMosaicOpen(true)}
              icon={Grid}
            >
              Memory Mosaic
            </Button>

            {/* 4. Memorial Keepsake Pack (Flagship 6-asset print-ready suite) */}
            <Button
              variant="outline"
              size="md"
              onClick={() => setBookModalOpen(true)}
              icon={BookOpen}
            >
              Keepsake Pack
            </Button>

            {/* 5. Invite Friends & Family */}
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setMemoryInviteMode('invite');
                setMemoryInviteOpen(true);
              }}
              icon={Users}
            >
              Invite Memories
            </Button>

            {/* 6. Leave an Offering */}
            <Button
              variant="outline"
              size="md"
              onClick={() => setOfferingOpen(true)}
              icon={Flame}
            >
              Leave Offering
            </Button>

            {/* 7. Share Memorial */}
            <Button
              variant="outline"
              size="md"
              onClick={() => setShareOpen(true)}
              icon={Share2}
            >
              Share
            </Button>
            <button
              onClick={() => {
                setReportTarget({
                  type: 'memorial',
                  id: memorial.id,
                  title: memorial.fullName,
                });
                setReportOpen(true);
              }}
              className={`p-2.5 rounded-xl border text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                isDark
                  ? 'border-[#202C40] text-[#9EA3AA] hover:text-[#F87171] hover:bg-[#182337]'
                  : 'border-[#E5DED2] text-[#7D766D] hover:text-[#B91C1C] hover:bg-[#E5DED2]'
              }`}
              title="Report content or policy concern to Trust & Safety"
              aria-label="Report content or policy concern to Trust & Safety"
            >
              <Flag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Report</span>
            </button>
            <button
              onClick={() => setDisputeOpen(true)}
              className={`p-2.5 rounded-xl border text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                isDark
                  ? 'border-[#202C40] text-[#9EA3AA] hover:text-[#F8F5EE] hover:bg-[#182337]'
                  : 'border-[#E5DED2] text-[#7D766D] hover:text-[#20242A] hover:bg-[#E5DED2]'
              }`}
              title="Family stewardship claim or ownership inquiry"
              aria-label="Family stewardship claim or ownership inquiry"
            >
              <Scale className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Stewardship</span>
            </button>
          </div>

          {/* Quiet Informational Status Line (Replacing vanity counters) */}
          <div
            className={`mt-7 inline-flex items-center gap-3 px-4 py-1.5 rounded-full border text-xs ${
              isDark
                ? 'bg-[#182337] border-[#202C40] text-[#9EA3AA]'
                : 'bg-[#FCFAF5] border-[#E5DED2] text-[#554F48]'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: isDark ? '#B99452' : '#23324A' }}
              />
              Family-governed sanctuary
            </span>
            {memorial.verificationStatus === 'approved' && (
              <>
                <span>•</span>
                <span>Archival record verified</span>
              </>
            )}
            <span>•</span>
            <span>Permanent preservation</span>
          </div>
        </div>
      </section>

      {/* 2. NAVIGATION TABS */}
      <div
        className={`sticky top-18 z-30 w-full border-b backdrop-blur-md transition-colors ${
          isDark
            ? 'border-[#202C40] bg-[#111820]/92'
            : 'border-[#E5DED2] bg-[#F3EEE4]/95'
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-start sm:justify-center overflow-x-auto py-2.5 gap-1 sm:gap-3 no-scrollbar">
          {[
            { id: 'story', label: 'Life Story', icon: BookOpen },
            { id: 'timeline', label: 'Timeline', icon: Calendar },
            { id: 'photos', label: `Photographs (${photoMedia.length})`, icon: ImageIcon },
            { id: 'voice', label: `Voice (${memorial.voiceMemories?.length || 0})`, icon: Volume2 },
            { id: 'family', label: 'Family Circle', icon: Users },
            { id: 'tributes', label: `Remembrance (${memorial.tributes.length})`, icon: Heart },
            { id: 'legacy', label: 'Digital Legacy', icon: ExternalLink },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-sans whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? isDark
                      ? 'text-[#B99452] font-semibold border-b-2 border-[#B99452] bg-[#182337]/70'
                      : 'text-[#23324A] font-semibold border-b-2 border-[#23324A] bg-[#FCFAF5]'
                    : isDark
                    ? 'text-[#9EA3AA] hover:text-[#F8F5EE] hover:bg-[#182337]'
                    : 'text-[#554F48] hover:text-[#20242A] hover:bg-[#E5DED2]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* On This Day / Memory Resurfacing (Calm remembrance resurfacing, not engagement bait) */}
      {memorial.timeline.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
          <div
            className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
              isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
            }`}
          >
            <div className="space-y-1">
              <span
                className={`text-[10px] uppercase font-mono tracking-widest ${
                  isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                }`}
              >
                On this day in {memorial.timeline[0].year} • From the Archive
              </span>
              <p className={`text-base font-serif ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}>
                {memorial.timeline[0].title}
              </p>
              <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
                {memorial.timeline[0].description}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('timeline')}
              >
                Read in Timeline
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleWriteTributeClick}
              >
                Add a Reflection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB CONTENT VIEWS */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* STORY TAB — Editorial Memorial Book */}
        {activeTab === 'story' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: MOTION_TIMING.standard, ease: MOTION_EASING.easeOut }}
            className="space-y-12"
          >
            {/* Overview / Introduction */}
            <article className="space-y-4">
              <span
                className={`text-[11px] uppercase tracking-widest font-medium ${
                  isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                }`}
              >
                The Chapter of Life
              </span>
              <h2
                className={`text-2xl sm:text-3xl font-serif ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                In Remembrance of {memorial.fullName}
              </h2>
              <p
                className={`text-base sm:text-lg leading-relaxed font-sans font-light ${
                  isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                }`}
              >
                {memorial.story.overview}
              </p>
            </article>

            {/* Early Life */}
            {memorial.story.earlyLife && (
              <article
                className={`space-y-3 pt-8 border-t ${
                  isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
                }`}
              >
                <h3
                  className={`text-xl font-serif ${
                    isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                  }`}
                >
                  Early Years & Roots
                </h3>
                <p
                  className={`text-sm sm:text-base leading-relaxed font-light ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  {memorial.story.earlyLife}
                </p>
              </article>
            )}

            {/* Passions & Values */}
            {memorial.story.passionsAndValues && (
              <article
                className={`space-y-3 pt-8 border-t ${
                  isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
                }`}
              >
                <h3
                  className={`text-xl font-serif ${
                    isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                  }`}
                >
                  Values, Work & Passions
                </h3>
                <p
                  className={`text-sm sm:text-base leading-relaxed font-light ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  {memorial.story.passionsAndValues}
                </p>
              </article>
            )}

            {/* Enduring Legacy */}
            {memorial.story.enduringLegacy && (
              <article
                className={`space-y-3 pt-8 border-t ${
                  isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
                }`}
              >
                <h3
                  className={`text-xl font-serif ${
                    isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                  }`}
                >
                  Enduring Legacy
                </h3>
                <p
                  className={`text-sm sm:text-base leading-relaxed font-light ${
                    isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                  }`}
                >
                  {memorial.story.enduringLegacy}
                </p>
              </article>
            )}

            {/* Favorite Quotes */}
            {memorial.story.favoriteQuotes && memorial.story.favoriteQuotes.length > 0 && (
              <blockquote
                className={`p-6 sm:p-8 rounded-2xl border space-y-3 transition-colors ${
                  isDark
                    ? 'bg-[#182337] border-[#202C40]'
                    : 'bg-[#FCFAF5] border-[#E5DED2]'
                }`}
              >
                <span
                  className={`text-[11px] uppercase tracking-widest block font-medium ${
                    isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                  }`}
                >
                  Words They Lived By
                </span>
                {memorial.story.favoriteQuotes.map((q, i) => (
                  <p
                    key={i}
                    className={`text-base sm:text-lg font-editorial italic leading-relaxed ${
                      isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                    }`}
                  >
                    “{q}”
                  </p>
                ))}
              </blockquote>
            )}
          </motion.div>
        )}

        {/* TIMELINE TAB — Chronological Spine */}
        {activeTab === 'timeline' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: MOTION_TIMING.standard, ease: MOTION_EASING.easeOut }}
            className="space-y-8"
          >
            <div
              className={`border-b pb-4 ${
                isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
              }`}
            >
              <span
                className={`text-[11px] uppercase tracking-widest font-medium ${
                  isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                }`}
              >
                Milestones & Chapters
              </span>
              <h3
                className={`text-2xl font-serif mt-1 ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                A Timeline of Moments
              </h3>
            </div>

            {memorial.timeline.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <p className={`text-sm ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                  Begin preserving the chapters of their life.
                </p>
              </div>
            ) : (
              <div
                className={`relative pl-6 sm:pl-8 border-l space-y-10 ${
                  isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
                }`}
              >
                {memorial.timeline.map((evt) => (
                  <div key={evt.id} className="relative group">
                    {/* Subtle Node Point */}
                    <div
                      className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-3.5 h-3.5 rounded-full border-2 transition-transform group-hover:scale-125 ${
                        isDark
                          ? 'bg-[#182337] border-[#B99452]'
                          : 'bg-[#FCFAF5] border-[#23324A]'
                      }`}
                    />

                    <div className="space-y-1">
                      <span
                        className={`text-xs font-mono font-semibold tracking-wider ${
                          isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                        }`}
                      >
                        {evt.dateStr || evt.year}
                      </span>
                      <h4
                        className={`text-lg font-serif ${
                          isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                        }`}
                      >
                        {evt.title}
                      </h4>
                      {evt.location && (
                        <span
                          className={`text-xs block ${
                            isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                          }`}
                        >
                          {evt.location}
                        </span>
                      )}
                      <p
                        className={`text-xs sm:text-sm leading-relaxed pt-1 font-light ${
                          isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                        }`}
                      >
                        {evt.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* PHOTOS TAB */}
        {activeTab === 'photos' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: MOTION_TIMING.standard, ease: MOTION_EASING.easeOut }}
            className="space-y-6"
          >
            <div
              className={`border-b pb-4 ${
                isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
              }`}
            >
              <span
                className={`text-[11px] uppercase tracking-widest font-medium ${
                  isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                }`}
              >
                Archival Gallery
              </span>
              <h3
                className={`text-2xl font-serif mt-1 ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                Preserved Photographs
              </h3>
            </div>

            {/* Memory Mosaic Callout */}
            {photoMedia.length > 0 && (
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
                  isDark ? 'bg-[#182337]/70 border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isDark ? 'bg-[#B99452]/20 text-[#B99452]' : 'bg-[#23324A]/10 text-[#23324A]'
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                  </div>
                  <div>
                    <p className={`font-serif text-sm font-medium ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}>
                      A Life in 9 Moments — Memory Mosaic
                    </p>
                    <p className={isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}>
                      Select 3–9 photographs to generate a framed keepsake share card for WhatsApp.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMemoryMosaicOpen(true)}
                  icon={Grid}
                  className="flex-shrink-0"
                >
                  Create Mosaic
                </Button>
              </div>
            )}

            {photoMedia.length === 0 ? (
              <div
                className={`py-16 text-center text-sm ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                No photographs have been added to this memorial yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {photoMedia.map((photo, idx) => (
                  <div
                    key={photo.id}
                    onClick={() => {
                      setLightboxIndex(idx);
                      setLightboxOpen(true);
                    }}
                    className={`group relative rounded-2xl overflow-hidden border cursor-pointer transition-all ${
                      isDark
                        ? 'border-[#202C40] bg-[#182337] hover:border-[#2D3D56]'
                        : 'border-[#E5DED2] bg-[#FCFAF5] hover:border-[#23324A]'
                    }`}
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden relative">
                      <img
                        src={photo.url}
                        alt={photo.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReportTarget({
                            type: 'media',
                            id: photo.id,
                            title: photo.title || `Photograph in ${memorial.fullName}'s Gallery`,
                          });
                          setReportOpen(true);
                        }}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/60 hover:bg-red-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer shadow-sm"
                        title="Report inappropriate image (nudity, explicit content, abuse)"
                        aria-label="Report photograph"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div
                      className={`p-4 border-t ${
                        isDark
                          ? 'bg-[#182337]/95 border-[#202C40]'
                          : 'bg-[#FCFAF5] border-[#E5DED2]'
                      }`}
                    >
                      <h4
                        className={`text-sm font-serif transition-colors ${
                          isDark
                            ? 'text-[#F8F5EE] group-hover:text-[#B99452]'
                            : 'text-[#20242A] group-hover:text-[#23324A]'
                        }`}
                      >
                        {photo.title}
                      </h4>
                      {photo.caption && (
                        <p
                          className={`text-xs mt-0.5 line-clamp-1 ${
                            isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                          }`}
                        >
                          {photo.caption}
                        </p>
                      )}
                      {photo.year && (
                        <span
                          className={`text-[11px] font-mono mt-1 block ${
                            isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                          }`}
                        >
                          {photo.year}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* VOICE MEMORIES TAB */}
        {activeTab === 'voice' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: MOTION_TIMING.standard, ease: MOTION_EASING.easeOut }}
            className="space-y-6"
          >
            <div
              className={`border-b pb-4 ${
                isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
              }`}
            >
              <span
                className={`text-[11px] uppercase tracking-widest font-medium ${
                  isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                }`}
              >
                The Resonance of Memory
              </span>
              <h3
                className={`text-2xl font-serif mt-1 ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                Spoken Voices & Oral Histories
              </h3>
              <p
                className={`text-xs mt-1 ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                Archival audio recordings preserved with waveforms and transcripts.
              </p>
            </div>

            {memorial.voiceMemories && memorial.voiceMemories.length > 0 && (
              <div
                className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isDark ? 'bg-[#182337]/70 border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                }`}
              >
                <div>
                  <span
                    className={`text-[10px] font-mono tracking-wider uppercase font-semibold ${
                      isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                    }`}
                  >
                    Voices of {memorial.preferredName || memorial.fullName.split(' ')[0]}
                  </span>
                  <h4
                    className={`text-base font-serif mt-0.5 ${
                      isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                    }`}
                  >
                    Curated Oral Remembrance Collection
                  </h4>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                    Spoken memories and words of love preserved with full audio playback and transcripts.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSlideshowOpen(true)}
                  icon={Play}
                  className="flex-shrink-0"
                >
                  Play Remembrance
                </Button>
              </div>
            )}

            {memorial.voiceMemories && memorial.voiceMemories.length > 0 ? (
              <div className="space-y-4">
                {memorial.voiceMemories.map((vm) => (
                  <AudioPlayer key={vm.id} memory={vm} />
                ))}
              </div>
            ) : (
              <div
                className={`py-16 text-center text-sm ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                No voice memories preserved for this memorial yet.
              </div>
            )}
          </motion.div>
        )}

        {/* TRIBUTES TAB — Digital Condolence Book */}
        {activeTab === 'tributes' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: MOTION_TIMING.standard, ease: MOTION_EASING.easeOut }}
            className="space-y-6"
          >
            <div
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${
                isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
              }`}
            >
              <div>
                <span
                  className={`text-[11px] uppercase tracking-widest font-medium ${
                    isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                  }`}
                >
                  Digital Condolence Book
                </span>
                <h3
                  className={`text-2xl font-serif mt-1 ${
                    isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                  }`}
                >
                  Reflections & Tributes
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOfferingOpen(true)}
                  icon={Flame}
                >
                  Leave a Gesture
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowTributeForm(!showTributeForm)}
                  icon={Plus}
                >
                  {showTributeForm ? 'Close Form' : 'Write a Tribute'}
                </Button>
              </div>
            </div>

            {/* Offerings Placed in Memory */}
            {memorial.offerings && memorial.offerings.length > 0 && (
              <div
                className="p-5 rounded-2xl border space-y-3.5"
                style={{
                  backgroundColor: isDark ? 'rgba(24, 35, 55, 0.4)' : 'rgba(252, 250, 245, 0.8)',
                  borderColor: isDark ? '#202C40' : '#E5DED2',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-serif font-medium uppercase tracking-wider ${isDark ? 'text-[#B99452]' : 'text-[#23324A]'}`}>
                    Offerings Placed in Memory ({memorial.offerings.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setOfferingOpen(true)}
                    className={`text-xs font-medium underline-offset-4 hover:underline cursor-pointer ${
                      isDark ? 'text-[#B99452]' : 'text-[#8C5C0F]'
                    }`}
                  >
                    + Place Gesture
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {memorial.offerings.map((off) => (
                    <div
                      key={off.id}
                      className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                        isDark ? 'border-[#2D3D56] bg-[#182337]' : 'border-[#E5DED2] bg-[#FFFFFF]'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl border border-amber-500/20 bg-amber-500/10 flex items-center justify-center flex-shrink-0 shadow-sm">
                        {renderOfferingIcon(off.type, 26)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-xs font-medium truncate ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}>
                          {off.senderName}
                        </div>
                        {off.message ? (
                          <div className={`text-[11px] italic truncate ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                            "{off.message}"
                          </div>
                        ) : (
                          <div className={`text-[10px] uppercase font-mono tracking-wider ${isDark ? 'text-[#737982]' : 'text-[#9EA3AA]'}`}>
                            {off.type}
                          </div>
                        )}
                        <div className={`text-[9px] mt-0.5 ${isDark ? 'text-[#737982]' : 'text-[#9EA3AA]'}`}>
                          {off.timestamp}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Leave a Tribute Form */}
            <AnimatePresence>
              {showTributeForm && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: MOTION_TIMING.standard, ease: MOTION_EASING.easeOut }}
                  onSubmit={handleTributeSubmit}
                  className={`p-6 rounded-2xl border space-y-4 overflow-hidden ${
                    isDark
                      ? 'border-[#2D3D56] bg-[#182337]'
                      : 'border-[#E5DED2] bg-[#FCFAF5]'
                  }`}
                >
                  <h4
                    className={`text-base font-serif ${
                      isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                    }`}
                  >
                    Share Your Memory or Words of Comfort
                  </h4>

                  {tributeSuccess ? (
                    <div
                      className={`p-4 rounded-xl flex items-center gap-2.5 text-xs ${
                        isDark
                          ? 'bg-[#2D7A5F]/20 text-[#6EE7B7] border border-[#2D7A5F]/40'
                          : 'bg-[#EAF5EF] text-[#245C45] border border-[#96CBB4]'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      <span>Thank you. Your tribute has been received with care and will appear in the remembrance book once reviewed by the family custodian.</span>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            className={`block text-xs font-medium mb-1 ${
                              isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                            }`}
                          >
                            Your Full Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={tributeAuthor}
                            onChange={(e) => setTributeAuthor(e.target.value)}
                            placeholder="e.g. Meera S."
                            className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                              isDark
                                ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                                : 'bg-[#E5DED2] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                            }`}
                          />
                        </div>
                        <div>
                          <label
                            className={`block text-xs font-medium mb-1 ${
                              isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                            }`}
                          >
                            Relationship to {memorial.preferredName || memorial.fullName.split(' ')[0]}
                          </label>
                          <input
                            type="text"
                            value={tributeRelation}
                            onChange={(e) => setTributeRelation(e.target.value)}
                            placeholder="e.g. Colleague, Granddaughter, Lifelong Friend"
                            className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors ${
                              isDark
                                ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                                : 'bg-[#E5DED2] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          className={`block text-xs font-medium mb-1 ${
                            isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                          }`}
                        >
                          Your Tribute or Story *
                        </label>
                        <textarea
                          required
                          rows={4}
                          value={tributeMessage}
                          onChange={(e) => setTributeMessage(e.target.value)}
                          placeholder="Write your reflection, an enduring story, or a tribute to their life..."
                          className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none transition-colors resize-none ${
                            isDark
                              ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                              : 'bg-[#E5DED2] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                          }`}
                        />
                      </div>

                      <div className="flex justify-end gap-2.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowTributeForm(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" variant="primary" size="sm" isLoading={tributeSubmitting}>
                          Submit Tribute for Review
                        </Button>
                      </div>
                    </>
                  )}
                </motion.form>
              )}
            </AnimatePresence>

            {/* Tribute List — Letter / Condolence Book format */}
            {memorial.tributes.length === 0 ? (
              <div
                className={`py-16 text-center space-y-3 ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                <p className="text-sm">Be the first to leave a remembrance in this book.</p>
                <Button variant="primary" size="sm" onClick={() => setShowTributeForm(true)}>
                  Write a Tribute
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {memorial.tributes.map((tr) => (
                  <article
                    key={tr.id}
                    className={`p-6 rounded-2xl border space-y-3 transition-colors ${
                      isDark
                        ? tr.isPinned
                          ? 'border-[#B99452]/40 bg-[#182337]'
                          : 'border-[#202C40] bg-[#182337]'
                        : tr.isPinned
                        ? 'border-[#23324A]/50 bg-[#FCFAF5]'
                        : 'border-[#E5DED2] bg-[#FCFAF5]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span
                          className={`font-serif text-sm font-medium ${
                            isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                          }`}
                        >
                          {tr.authorName}
                        </span>
                        <span
                          className={`ml-2 ${
                            isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                          }`}
                        >
                          • {tr.relationship}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] ${
                            isDark ? 'text-[#737982]' : 'text-[#7D766D]'
                          }`}
                        >
                          {tr.date}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setReportTarget({
                              type: 'tribute',
                              id: tr.id,
                              title: `Tribute reflection by ${tr.authorName}`,
                            });
                            setReportOpen(true);
                          }}
                          className={`p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity cursor-pointer ${
                            isDark ? 'text-[#9EA3AA] hover:text-[#F87171]' : 'text-[#7D766D] hover:text-[#B91C1C]'
                          }`}
                          title="Report inappropriate tribute"
                          aria-label="Report tribute"
                        >
                          <Flag className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p
                      className={`text-sm font-editorial italic leading-relaxed ${
                        isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                      }`}
                    >
                      “{tr.message}”
                    </p>
                  </article>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* FAMILY CONSTELLATION TAB */}
        {activeTab === 'family' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: MOTION_TIMING.standard, ease: MOTION_EASING.easeOut }}
            className="space-y-8"
          >
            <div
              className={`border-b pb-4 ${
                isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
              }`}
            >
              <span
                className={`text-[11px] uppercase tracking-widest font-medium ${
                  isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                }`}
              >
                Lineage & Kinship
              </span>
              <h3
                className={`text-2xl font-serif mt-1 ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                Family Constellation
              </h3>
              <p
                className={`text-xs mt-1 ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                Visual relationship map of close kin and family circle custodians.
              </p>
            </div>

            <Constellation
              memorialName={memorial.fullName}
              familyMembers={memorial.family}
            />
          </motion.div>
        )}

        {/* DIGITAL LEGACY TAB */}
        {activeTab === 'legacy' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: MOTION_TIMING.standard, ease: MOTION_EASING.easeOut }}
            className="space-y-6"
          >
            <div
              className={`border-b pb-4 ${
                isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
              }`}
            >
              <span
                className={`text-[11px] uppercase tracking-widest font-medium ${
                  isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                }`}
              >
                Digital Presence & Archives
              </span>
              <h3
                className={`text-2xl font-serif mt-1 ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                Connected Digital Legacy
              </h3>
              <p
                className={`text-xs mt-1 ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                Curated links to their published writings, memorial lectures, and web archives.
              </p>
            </div>

            {memorial.legacyLinks && memorial.legacyLinks.length > 0 ? (
              <div className="space-y-3">
                {memorial.legacyLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-4 rounded-xl border flex items-center justify-between text-xs transition-colors group ${
                      isDark
                        ? 'border-[#202C40] bg-[#182337] hover:border-[#B99452]/40'
                        : 'border-[#E5DED2] bg-[#FCFAF5] hover:border-[#23324A]/50'
                    }`}
                  >
                    <div>
                      <h4
                        className={`font-serif text-sm transition-colors ${
                          isDark
                            ? 'text-[#F8F5EE] group-hover:text-[#B99452]'
                            : 'text-[#20242A] group-hover:text-[#23324A]'
                        }`}
                      >
                        {link.label}
                      </h4>
                      {link.notes && (
                        <p
                          className={`text-[11px] mt-0.5 ${
                            isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                          }`}
                        >
                          {link.notes}
                        </p>
                      )}
                    </div>
                    <ExternalLink
                      className={`w-4 h-4 transition-colors ${
                        isDark
                          ? 'text-[#9EA3AA] group-hover:text-[#B99452]'
                          : 'text-[#7D766D] group-hover:text-[#23324A]'
                      }`}
                    />
                  </a>
                ))}
              </div>
            ) : (
              <div
                className={`py-16 text-center text-sm ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                No external legacy links configured.
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* LIGHTBOX */}
      <Lightbox
        isOpen={lightboxOpen}
        images={photoMedia}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(newIdx) => setLightboxIndex(newIdx)}
        onReport={(photo) => {
          setLightboxOpen(false);
          setReportTarget({
            type: 'media',
            id: photo.id,
            title: photo.title || `Photograph in ${memorial.fullName}'s Gallery`,
          });
          setReportOpen(true);
        }}
      />

      {/* SHARE MODAL */}
      <ShareModal
        isOpen={shareOpen}
        memorial={memorial}
        onClose={() => setShareOpen(false)}
      />

      {/* REPORT MODAL */}
      <ReportModal
        isOpen={reportOpen}
        targetTitle={reportTarget.title}
        targetType={reportTarget.type}
        targetId={reportTarget.id}
        onClose={() => setReportOpen(false)}
      />

      {/* FAMILY DISPUTE / STEWARDSHIP CLAIM MODAL */}
      <DisputeModal
        isOpen={disputeOpen}
        memorial={memorial}
        onClose={() => setDisputeOpen(false)}
      />

      {/* OFFERING MODAL */}
      <OfferingModal
        isOpen={offeringOpen}
        memorialName={memorial.fullName}
        onClose={() => setOfferingOpen(false)}
        onSubmit={handleOfferingSubmit}
        onNavigate={onNavigate}
      />

      {/* VERIFICATION DRAWER */}
      <VerificationDrawer
        isOpen={verificationDrawerOpen}
        onClose={() => setVerificationDrawerOpen(false)}
        badgeType={memorial.verificationBadgeType}
      />

      {/* MEMORIAL BOOK MODAL (Keepsake Pack) */}
      <MemorialBookModal
        isOpen={bookModalOpen}
        onClose={() => setBookModalOpen(false)}
        memorial={memorial}
      />

      {/* MEMORY INVITE MODAL (Viral Frictionless Memory Submission) */}
      <MemoryInviteModal
        isOpen={memoryInviteOpen}
        onClose={() => setMemoryInviteOpen(false)}
        memorial={memorial}
        initialMode={memoryInviteMode}
        onMemorySubmitted={() => onRefreshMemorial?.()}
      />

      {/* MEMORY MOSAIC MODAL ("A Life in 9 Moments") */}
      <MemoryMosaicModal
        isOpen={memoryMosaicOpen}
        onClose={() => setMemoryMosaicOpen(false)}
        memorial={memorial}
      />

      {/* CINEMATIC REMEMBRANCE SLIDESHOW ("Enter Remembrance") */}
      <CinematicRemembranceModal
        isOpen={slideshowOpen}
        onClose={() => setSlideshowOpen(false)}
        memorial={memorial}
      />

      {/* MEMORIAL THEME SELECTOR MODAL */}
      <ThemeSelectorModal
        isOpen={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
        activeThemeId={activeThemeId}
        onSelectTheme={(newThemeId) => {
          setActiveThemeId(newThemeId);
        }}
        canUsePremiumThemes={true}
        onUpgradeClick={() => onNavigate?.('pricing')}
      />
    </div>
  );
};
