import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  ShieldCheck,
  Lock,
  Users,
  Compass,
  ArrowRight,
  Sparkles,
  Check,
  ChevronDown,
  Eye,
  Heart,
  Globe,
  Share2,
  Calendar,
  MapPin,
  Clock,
  Sparkle,
  BookOpen,
  Printer,
  FileText,
  Volume2,
  Image as ImageIcon,
  QrCode,
  Download,
  Flower2,
  Layers,
  HelpCircle,
  Truck,
  FileCheck,
  CheckCircle2,
  Minus,
  Shield,
  X,
  Play,
  Pause,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { StarField, MemorialGlow } from '../components/visual/VisualComponents';
import { TimelinePath } from '../components/visual/TimelinePath';
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
import {
  MOTION_TIMING,
  MOTION_EASING,
  Reveal,
  Stagger,
  FadeIn,
  SlideUp,
  ScaleReveal,
} from '../lib/motion';
import { useTheme } from '../context/ThemeContext';
import { VerificationDrawer } from '../components/verification/VerificationDrawer';
import { MemorialBookModal } from '../components/memorial/MemorialBookModal';
import { pricingPlans } from '../data/mockData';

interface LandingViewProps {
  onNavigate: (route: string) => void;
  onOpenMemorial: (slug: string) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onNavigate,
  onOpenMemorial,
}) => {
  const { isDark } = useTheme();
  const shouldReduceMotion = useReducedMotion();

  // Modals & Drawers
  const [verificationDrawerOpen, setVerificationDrawerOpen] = useState(false);
  const [verificationDrawerType, setVerificationDrawerType] = useState<
    'Family Managed' | 'Document Reviewed' | 'Enhanced Verification'
  >('Document Reviewed');
  const [memorialBookOpen, setMemorialBookOpen] = useState(false);

  // Interactive offering gesture state
  const [selectedOffering, setSelectedOffering] = useState<string>('light');
  const [ambientRibbons, setAmbientRibbons] = useState<
    { id: string; text: string; icon: string }[]
  >([]);

  // Interactive privacy mode selector
  const [activePrivacyTab, setActivePrivacyTab] = useState<'private' | 'family' | 'unlisted' | 'public'>('family');

  // Interactive family contributions demo
  const [activeFamilyTab, setActiveFamilyTab] = useState<
    'steward' | 'biographer' | 'archivist' | 'contributor' | 'reviewer' | 'viewer'
  >('biographer');

  // FAQ state
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Subtle hero mouse tracking
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (shouldReduceMotion) return;
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 12;
      const y = (e.clientY / innerHeight - 0.5) * 12;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [shouldReduceMotion]);

  // Handle placing a quiet gesture of remembrance (no counters, ephemeral notification ribbon)
  const handlePlaceGesture = (offeringId: string, label: string) => {
    setSelectedOffering(offeringId);
    const newRibbon = {
      id: `ribbon_${Date.now()}`,
      text:
        offeringId === 'flower'
          ? 'A flower was placed.'
          : offeringId === 'light'
          ? 'A light was left.'
          : offeringId === 'dove'
          ? 'A quiet dove was released.'
          : offeringId === 'memory'
          ? 'Someone shared a memory.'
          : offeringId === 'heart'
          ? 'A thought of love was left.'
          : 'A gesture of remembrance was placed.',
      icon: offeringId,
    };

    setAmbientRibbons((prev) => [newRibbon, ...prev.slice(0, 2)]);
    setTimeout(() => {
      setAmbientRibbons((prev) => prev.filter((r) => r.id !== newRibbon.id));
    }, 4500);
  };

  const gestureItems = [
    { id: 'dove', name: 'Dove', meaning: 'Peace & Serenity', component: DoveSymbol },
    { id: 'flower', name: 'Flower', meaning: 'Gentle Remembrance', component: FlowerSymbol },
    { id: 'hands', name: 'Folded Hands', meaning: 'Gratitude & Prayer', component: FoldedHandsSymbol },
    { id: 'light', name: 'Light', meaning: 'Enduring Warmth', component: OfferingLightSymbol },
    { id: 'star', name: 'Star', meaning: 'Guiding Light', component: StarSymbol },
    { id: 'love', name: 'With Love', meaning: 'Deep Devotion', component: HeartSymbol },
    { id: 'honor', name: 'In Honor', meaning: 'Respect & Dignity', component: WreathSymbol },
    { id: 'memory', name: 'Memory', meaning: 'A Story Shared', component: MemorySymbol },
  ];

  const familyRoles = [
    {
      id: 'steward',
      title: 'Steward',
      who: 'Anita (Daughter)',
      action: 'Approves memorial chapters, manages privacy settings, safeguards permissions.',
      contribution: 'Protected family archive and verified municipal birth record.',
      tag: 'Primary Guardian',
    },
    {
      id: 'biographer',
      title: 'Biographer',
      who: 'Ramesh (Brother)',
      action: 'Writes the early childhood years in Fort Kochi and university adventures.',
      contribution: 'Added 4 biographical stories & 1970 expedition notes.',
      tag: 'Storyteller',
    },
    {
      id: 'archivist',
      title: 'Photo Archivist',
      who: 'Vikram (Son)',
      action: 'Scans fragile photo albums, restores film negatives, and tags dates.',
      contribution: 'Digitized 48 archival photographs in full resolution.',
      tag: 'Visual Custodian',
    },
    {
      id: 'contributor',
      title: 'Memory Contributor',
      who: 'Deepa (Colleague)',
      action: 'Records an oral voice memory sharing how Dr. Arun mentored young botanists.',
      contribution: 'Recorded 3-minute oral history voice memory.',
      tag: 'Voice & Memories',
    },
    {
      id: 'reviewer',
      title: 'Guest Reviewer',
      who: 'Parvathi (Family Elder)',
      action: 'Reviews newly submitted tributes and condolences before they are published.',
      contribution: 'Ensures condolence notes reflect family dignity.',
      tag: 'Quiet Moderation',
    },
    {
      id: 'viewer',
      title: 'Family Viewer',
      who: 'Extended Grandchildren',
      action: 'Private, secure access to explore family stories and listen to ancestral voices.',
      contribution: 'Listens to stories and leaves quiet remembrance lights.',
      tag: 'Family Circle',
    },
  ];

  const privacyTiers = [
    {
      id: 'private',
      label: 'Private',
      audience: 'Only You',
      desc: 'Completely closed. Hidden from all search engines and visitors. A personal sanctuary for your reflections.',
      indicators: ['No public link', 'Invitation required', 'Encrypted storage'],
    },
    {
      id: 'family',
      label: 'Family Circle',
      audience: 'Invited Loved Ones',
      desc: 'Accessible solely to invited family members and close friends via secure magic link or stewardship account.',
      indicators: ['Curated family access', 'Closed tribute ledger', 'Private audio recordings'],
    },
    {
      id: 'unlisted',
      label: 'Unlisted Link',
      audience: 'Anyone with the Link',
      desc: 'Not indexed on Google or searchable on Pithros. Only people you directly share the secret link with can view.',
      indicators: ['Search engines blocked', 'Discreet gathering share', 'QR memorial ready'],
    },
    {
      id: 'public',
      label: 'Public Memorial',
      audience: 'Open to the World',
      desc: 'A permanent digital monument celebrating a public life, educator, mentor, or leader accessible to all who knew them.',
      indicators: ['Community tributes', 'Searchable registry', 'Permanent public address'],
    },
  ];

  const faqs = [
    {
      q: 'Is my loved one’s memorial private?',
      a: 'Yes, completely by default. You can choose whether the memorial is visible only to you, shared with specific invited family members, accessible via private unlisted link, or public to the community. You retain full control at all times.',
    },
    {
      q: 'Can other family members add photos and memories?',
      a: 'Yes. You can invite siblings, children, cousins, and friends with tailored roles — such as Biographer, Photo Archivist, or Memory Contributor. Everything arrives in one place, and you can review submissions before they appear.',
    },
    {
      q: 'Can we hold the story in our hands?',
      a: 'Yes. Pithros can compile the entire biography, milestone timeline, curated photos, and family tributes into a beautiful Commemorative Memorial Book that you can preview, download as a high-resolution PDF, or print.',
    },
    {
      q: 'Is Pithros free to begin?',
      a: 'Yes. Every family can create a permanent digital memorial, add their life story, milestone timeline, photo memories, and receive tributes without paying anything. Optional preservation tiers are available for voice archives and keepsake plaques.',
    },
    {
      q: 'What makes Pithros different from social networks?',
      a: 'Pithros has no followers, no likes, no algorithms, and zero third-party advertising. Someone’s memory is never monetized as social content or ranked by popularity.',
    },
    {
      q: 'What happens if we need help with immediate practical farewell arrangements?',
      a: 'Through the Farewell Network, we connect families with verified, compassionate farewell providers — from memorial gatherings and floral tributes to stone plaques and ceremonial assistance.',
    },
  ];

  return (
    <div
      className={`min-h-screen font-sans selection:bg-[#B99452]/20 selection:text-[#B99452] transition-colors relative overflow-hidden ${
        isDark ? 'bg-[#111820] text-[#F8F5EE]' : 'bg-[#F3EEE4] text-[#20242A]'
      }`}
    >
      {/* Background StarField */}
      <StarField count={24} />

      {/* ─────────────────────────────────────────────────────────────
          1. HERO SECTION (Part B: Exact copy, no fake deceased props)
          ───────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 pt-20 pb-24">
        {/* Ambient Memorial Glow Centered Behind Headline (Soft radial falloff, zero rectangular edges) */}
        <MemorialGlow
          className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          size="w-[750px] h-[480px] max-w-[92vw]"
          intensity="soft"
        />

        <div className="relative z-10 max-w-4xl mx-auto space-y-8">
          {/* Emotional Header */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: MOTION_TIMING.emotional, ease: MOTION_EASING.easeOut }}
            className="space-y-5"
          >
            <h1
              className={`text-3xl sm:text-5xl md:text-6xl font-serif tracking-tight leading-[1.18] ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              When someone we love is gone,
              <br />
              <span
                className={`italic font-normal ${
                  isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                }`}
              >
                what remains are the stories.
              </span>
            </h1>

            <p
              className={`text-base sm:text-xl font-normal leading-relaxed max-w-2xl mx-auto ${
                isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
              }`}
            >
              The photographs. The voice. The little moments. The people who knew them best.
              <br className="hidden sm:inline" />
              <span className="font-medium"> Pithros gives those memories a place to stay together.</span>
            </p>
          </motion.div>

          {/* Primary & Secondary Call to Actions */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: MOTION_TIMING.emotional,
              delay: 0.15,
              ease: MOTION_EASING.easeOut,
            }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
          >
            <Button
              variant="primary"
              size="lg"
              onClick={() => onNavigate('/create-memorial')}
              className="w-full sm:w-auto px-8 py-3.5 text-base shadow-lg shadow-black/15"
              icon={Sparkles}
            >
              Create a Memorial
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                const el = document.getElementById('story-together');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-8 py-3.5 text-base"
            >
              See how Pithros works
            </Button>
          </motion.div>

          {/* Trust Line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: MOTION_TIMING.emotional,
              delay: 0.3,
            }}
            className={`pt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-mono tracking-wide ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#B99452]" />
              Private by default
            </span>
            <span className="hidden sm:inline opacity-40">•</span>
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#B99452]" />
              Family controlled
            </span>
            <span className="hidden sm:inline opacity-40">•</span>
            <span className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-[#B99452]" />
              Free to begin
            </span>
          </motion.div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. KEEP THEIR STORY TOGETHER
          ───────────────────────────────────────────────────────────── */}
      <section
        id="story-together"
        className="py-24 px-4 sm:px-6 lg:px-8 border-t transition-colors relative"
        style={{ borderColor: isDark ? '#1C1610' : '#E8DEC8' }}
      >
        <div className="max-w-5xl mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <span
              className={`text-[10px] uppercase font-mono tracking-widest ${
                isDark ? 'text-[#B99452]' : 'text-[#23324A]'
              }`}
            >
              A Gathering Place
            </span>
            <h2
              className={`text-2xl sm:text-4xl font-serif leading-tight ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Memories become scattered.
              <br />
              Pithros gives them one home.
            </h2>
            <p
              className={`text-sm sm:text-base leading-relaxed ${
                isDark ? 'text-[#D0C2AE]' : 'text-[#5C5346]'
              }`}
            >
              Photographs buried in old phones, handwritten notes in forgotten drawers, voice messages on WhatsApp, and stories shared only at family tables. Pithros brings them together into one serene, enduring memorial.
            </p>
          </div>

          {/* Archive Gathering Visual (The 6 threads arriving together) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {[
              {
                icon: FileText,
                title: 'Life Story',
                desc: 'Who they were, in your words',
                tag: 'Biography',
              },
              {
                icon: ImageIcon,
                title: 'Photographs',
                desc: 'Albums, portraits & scanned memories',
                tag: 'High-Res Vault',
              },
              {
                icon: Volume2,
                title: 'Voice Notes',
                desc: 'The sound of their laughter and voice',
                tag: 'Oral History',
              },
              {
                icon: Calendar,
                title: 'Timeline',
                desc: 'The journey of their life and milestones',
                tag: 'Chronicle',
              },
              {
                icon: Users,
                title: 'Family',
                desc: 'Kinship, stories and generations',
                tag: 'Collaboration',
              },
              {
                icon: Heart,
                title: 'Tributes',
                desc: 'Quiet condolences and memories',
                tag: 'Shared Love',
              },
            ].map((col, idx) => {
              const Icon = col.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: MOTION_TIMING.emotional,
                    delay: idx * 0.08,
                    ease: MOTION_EASING.easeOut,
                  }}
                  className={`p-5 rounded-2xl border text-center flex flex-col items-center justify-between transition-all ${
                    isDark
                      ? 'bg-[#182337] border-[#202C40] hover:border-[#3D3328]'
                      : 'bg-[#FCFAF5] border-[#E5DED2] hover:border-[#BFAF9B]'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                      isDark ? 'bg-[#1F1810] text-[#B99452]' : 'bg-[#E5DED2] text-[#23324A]'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-serif text-sm font-medium">{col.title}</h3>
                    <p
                      className={`text-[11px] leading-snug ${
                        isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                      }`}
                    >
                      {col.desc}
                    </p>
                  </div>
                  <span
                    className={`mt-3 text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isDark ? 'bg-[#1C1610] text-[#9EA3AA]' : 'bg-[#E5DED2] text-[#7D766D]'
                    }`}
                  >
                    {col.tag}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. A LIFE IS MORE THAN DATES (TimelinePath SVG & Milestones)
          ───────────────────────────────────────────────────────────── */}
      <section
        className="py-24 px-4 sm:px-6 lg:px-8 border-t transition-colors relative"
        style={{ borderColor: isDark ? '#1C1610' : '#E8DEC8' }}
      >
        <div className="max-w-4xl mx-auto space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <span
              className={`text-[10px] uppercase font-mono tracking-widest ${
                isDark ? 'text-[#B99452]' : 'text-[#23324A]'
              }`}
            >
              Milestones & Journey
            </span>
            <h2
              className={`text-2xl sm:text-4xl font-serif ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              A life is more than dates.
            </h2>
            <p
              className={`text-xs sm:text-sm leading-relaxed ${
                isDark ? 'text-[#D0C2AE]' : 'text-[#5C5346]'
              }`}
            >
              Birth years and passing dates tell only when someone lived. Pithros preserves the places they loved, the work that brought them joy, and the moments that shaped them.
            </p>
          </div>

          {/* Interactive Animated Timeline with TimelinePath SVG */}
          <div className="relative pl-8 md:pl-0">
            {/* SVG Timeline Path */}
            <TimelinePath className="hidden md:block" />

            <div className="space-y-10">
              {[
                {
                  year: '1948',
                  title: 'A childhood by the river',
                  location: 'Fort Kochi',
                  narrative:
                    'Growing up along the backwaters, listening to ancestral stories and developing a reverence for ancient rain trees and native flora.',
                  media: 'Archival family portrait in sepia',
                },
                {
                  year: '1975',
                  title: 'A morning under the rain trees',
                  location: 'Thrissur',
                  narrative:
                    'A quiet morning ceremony attended by family and teachers, beginning forty-nine years of shared life, laughter, and companionable silence.',
                  media: 'Wedding photograph preserved',
                },
                {
                  year: '1982',
                  title: 'Protecting the Silent Valley',
                  location: 'Palakkad Rainforest',
                  narrative:
                    'Documenting endangered orchids and medicinal shrubs, teaching students that observing quietly is the highest form of patience.',
                  media: 'Botanical field notes & audio recordings',
                },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: MOTION_TIMING.emotional, delay: idx * 0.15 }}
                  className={`relative md:grid md:grid-cols-2 md:gap-12 items-center ${
                    idx % 2 === 1 ? 'md:grid-flow-dense' : ''
                  }`}
                >
                  {/* Point Marker */}
                  <div
                    className={`absolute -left-8 md:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isDark
                        ? 'bg-[#111820] border-[#B99452]'
                        : 'bg-[#F3EEE4] border-[#23324A]'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isDark ? 'bg-[#B99452]' : 'bg-[#23324A]'
                      }`}
                    />
                  </div>

                  {/* Content card */}
                  <div
                    className={`p-6 rounded-2xl border ${
                      idx % 2 === 1 ? 'md:col-start-2' : 'md:col-start-1 md:text-right'
                    } ${
                      isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1 justify-start md:justify-end">
                      <span
                        className={`text-xs font-mono font-bold ${
                          isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                        }`}
                      >
                        {item.year}
                      </span>
                      <span className="text-[10px] opacity-50">•</span>
                      <span className="text-[10px] font-mono text-[#9EA3AA]">
                        {item.location}
                      </span>
                    </div>
                    <h3 className="text-base font-serif font-medium">{item.title}</h3>
                    <p
                      className={`text-xs mt-2 leading-relaxed ${
                        isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                      }`}
                    >
                      {item.narrative}
                    </p>
                    <div
                      className={`mt-3 inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-md ${
                        isDark ? 'bg-[#1A140E] text-[#D0C2AE]' : 'bg-[#E5DED2] text-[#5C5346]'
                      }`}
                    >
                      <ImageIcon className="w-3 h-3 text-[#B99452]" />
                      <span>{item.media}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. BRING THE FAMILY INTO THE STORY
          ───────────────────────────────────────────────────────────── */}
      <section
        className="py-24 px-4 sm:px-6 lg:px-8 border-t transition-colors relative"
        style={{ borderColor: isDark ? '#1C1610' : '#E8DEC8' }}
      >
        <div className="max-w-5xl mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span
              className={`text-[10px] uppercase font-mono tracking-widest ${
                isDark ? 'text-[#B99452]' : 'text-[#23324A]'
              }`}
            >
              Shared Remembrance
            </span>
            <h2
              className={`text-2xl sm:text-4xl font-serif ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Everyone remembers differently.
            </h2>
            <p
              className={`text-xs sm:text-sm leading-relaxed ${
                isDark ? 'text-[#D0C2AE]' : 'text-[#5C5346]'
              }`}
            >
              A daughter remembers bedtime stories. A brother remembers childhood adventures. A colleague remembers mentorship. Pithros lets each family member contribute their part with clear, respectful permissions.
            </p>
          </div>

          {/* Multi-contributor Visual Interactive Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Roles Selector list (4 cols) */}
            <div className="md:col-span-4 space-y-2">
              {familyRoles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setActiveFamilyTab(role.id as any)}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all ${
                    activeFamilyTab === role.id
                      ? isDark
                        ? 'border-[#B99452] bg-[#1A140E] text-[#F8F5EE]'
                        : 'border-[#23324A] bg-[#E5DED2] text-[#20242A]'
                      : isDark
                      ? 'border-[#202C40] text-[#9EA3AA] hover:border-[#3D3328]'
                      : 'border-[#E5DED2] text-[#554F48] hover:border-[#BFAF9B]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-sm font-medium">{role.title}</span>
                    <span className="text-[10px] font-mono opacity-70">{role.tag}</span>
                  </div>
                  <div className="text-[11px] opacity-75 mt-0.5">{role.who}</div>
                </button>
              ))}
            </div>

            {/* Active Contribution Preview Card (8 cols) */}
            <div className="md:col-span-8">
              <AnimatePresence mode="wait">
                {(() => {
                  const activeRole = familyRoles.find((r) => r.id === activeFamilyTab)!;
                  return (
                    <motion.div
                      key={activeRole.id}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.2 }}
                      className={`p-6 sm:p-8 rounded-3xl border space-y-6 ${
                        isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span
                            className={`text-[10px] uppercase font-mono tracking-wider ${
                              isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                            }`}
                          >
                            Family Contribution Stream
                          </span>
                          <h3 className="text-xl font-serif mt-1">
                            {activeRole.title} • {activeRole.who}
                          </h3>
                        </div>
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-mono ${
                            isDark ? 'bg-[#1F1810] text-[#B99452]' : 'bg-[#E5DED2] text-[#8C5C0F]'
                          }`}
                        >
                          {activeRole.tag}
                        </span>
                      </div>

                      <div className="space-y-3 text-xs leading-relaxed">
                        <div
                          className={`p-4 rounded-2xl border ${
                            isDark ? 'bg-[#0E0B08] border-[#202C40]' : 'bg-[#F9F5EC] border-[#E8DEC8]'
                          }`}
                        >
                          <div className="font-semibold text-sm mb-1">What this family role does:</div>
                          <p className={isDark ? 'text-[#D0C2AE]' : 'text-[#5C5346]'}>
                            {activeRole.action}
                          </p>
                        </div>

                        <div className="p-4 rounded-2xl border border-dashed border-[#B99452]/40 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-mono uppercase text-[#9EA3AA]">
                              Latest Contribution
                            </span>
                            <div className="font-medium text-xs text-emerald-500">
                              {activeRole.contribution}
                            </div>
                          </div>
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                      </div>

                      <div
                        className={`pt-4 border-t text-[11px] flex items-center justify-between ${
                          isDark ? 'border-[#202C40] text-[#9EA3AA]' : 'border-[#E5DED2] text-[#7D766D]'
                        }`}
                      >
                        <span>Steward preserves full approval authority</span>
                        <span className="font-mono">Real-time sync</span>
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. LEAVE A GESTURE OF REMEMBRANCE (8 SVG gestures, NOT likes, no counts)
          ───────────────────────────────────────────────────────────── */}
      <section
        className="py-24 px-4 sm:px-6 lg:px-8 border-t transition-colors relative"
        style={{ borderColor: isDark ? '#1C1610' : '#E8DEC8' }}
      >
        <div className="max-w-4xl mx-auto space-y-12 text-center">
          <div className="max-w-xl mx-auto space-y-3">
            <span
              className={`text-[10px] uppercase font-mono tracking-widest ${
                isDark ? 'text-[#B99452]' : 'text-[#23324A]'
              }`}
            >
              Quiet Remembrance
            </span>
            <h2
              className={`text-2xl sm:text-4xl font-serif ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              There is more than one way to remember someone.
            </h2>
            <p
              className={`text-xs sm:text-sm leading-relaxed ${
                isDark ? 'text-[#D0C2AE]' : 'text-[#5C5346]'
              }`}
            >
              These are not likes. There are no counters, no popularity rankings, and no algorithms. A gesture is simply a quiet symbol left in honor of someone who mattered.
            </p>
          </div>

          {/* Ambient Ribbon ephemeral toast container */}
          <div className="h-10 flex items-center justify-center">
            <AnimatePresence>
              {ambientRibbons.map((ribbon) => (
                <motion.div
                  key={ribbon.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className={`px-4 py-1.5 rounded-full text-xs font-serif flex items-center gap-2 border shadow-lg ${
                    isDark
                      ? 'bg-[#1A140E] border-[#B99452]/40 text-[#B99452]'
                      : 'bg-[#E5DED2] border-[#23324A]/40 text-[#8C5C0F]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  <span>{ribbon.text}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* 8 Gestures Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {gestureItems.map((g) => {
              const SymbolComponent = g.component;
              const isSelected = selectedOffering === g.id;

              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => handlePlaceGesture(g.id, g.name)}
                  className={`p-5 rounded-2xl border text-center transition-all flex flex-col items-center justify-between group ${
                    isSelected
                      ? isDark
                        ? 'border-[#B99452] bg-[#1F1810] shadow-xl shadow-amber-950/40'
                        : 'border-[#23324A] bg-[#E5DED2] shadow-lg shadow-amber-900/10'
                      : isDark
                      ? 'border-[#202C40] bg-[#182337] hover:border-[#3D3328]'
                      : 'border-[#E5DED2] bg-[#FCFAF5] hover:border-[#BFAF9B]'
                  }`}
                >
                  <div className="w-12 h-12 flex items-center justify-center transition-transform group-hover:scale-110">
                    <SymbolComponent size={36} />
                  </div>
                  <div className="mt-3 space-y-0.5">
                    <div className="text-sm font-serif font-medium">{g.name}</div>
                    <div className="text-[10px] text-[#9EA3AA]">{g.meaning}</div>
                  </div>
                  <span
                    className={`mt-3 text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full transition-colors ${
                      isSelected
                        ? isDark
                          ? 'bg-[#B99452] text-black font-semibold'
                          : 'bg-[#23324A] text-white font-semibold'
                        : isDark
                        ? 'bg-[#1C1610] text-[#9EA3AA]'
                        : 'bg-[#E5DED2] text-[#7D766D]'
                    }`}
                  >
                    {isSelected ? 'Placed' : 'Place Gesture'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. YOU DECIDE WHO SEES IT (Privacy Architecture)
          ───────────────────────────────────────────────────────────── */}
      <section
        className="py-24 px-4 sm:px-6 lg:px-8 border-t transition-colors relative"
        style={{ borderColor: isDark ? '#1C1610' : '#E8DEC8' }}
      >
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <span
              className={`text-[10px] uppercase font-mono tracking-widest ${
                isDark ? 'text-[#B99452]' : 'text-[#23324A]'
              }`}
            >
              Privacy & Discretion
            </span>
            <h2
              className={`text-2xl sm:text-4xl font-serif ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Some memories are for everyone.
              <br />
              Some are just for family.
            </h2>
            <p
              className={`text-xs sm:text-sm leading-relaxed ${
                isDark ? 'text-[#D0C2AE]' : 'text-[#5C5346]'
              }`}
            >
              You decide who can view, contribute, or listen. Change privacy settings at any time with a single tap.
            </p>
          </div>

          {/* Privacy Preview Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {privacyTiers.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActivePrivacyTab(t.id as any)}
                className={`p-3.5 rounded-xl border text-center transition-all ${
                  activePrivacyTab === t.id
                    ? isDark
                      ? 'border-[#B99452] bg-[#1A140E] text-[#B99452]'
                      : 'border-[#23324A] bg-[#E5DED2] text-[#8C5C0F]'
                    : isDark
                    ? 'border-[#202C40] text-[#9EA3AA]'
                    : 'border-[#E5DED2] text-[#554F48]'
                }`}
              >
                <div className="font-serif text-sm font-medium">{t.label}</div>
                <div className="text-[10px] opacity-75 mt-0.5">{t.audience}</div>
              </button>
            ))}
          </div>

          {/* Active Privacy Description Card */}
          {(() => {
            const tier = privacyTiers.find((t) => t.id === activePrivacyTab)!;
            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`p-6 sm:p-8 rounded-3xl border space-y-4 ${
                  isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-serif text-lg font-medium">{tier.label} Tier</div>
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-500">
                    {tier.audience}
                  </span>
                </div>
                <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#D0C2AE]' : 'text-[#5C5346]'}`}>
                  {tier.desc}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t text-xs">
                  {tier.indicators.map((ind, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] text-[#9EA3AA]">
                      <Check className="w-3.5 h-3.5 text-[#B99452]" />
                      <span>{ind}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })()}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. BUILT FOR TRUST (Verification Badges & Drawer Trigger)
          ───────────────────────────────────────────────────────────── */}
      <section
        className="py-24 px-4 sm:px-6 lg:px-8 border-t transition-colors relative"
        style={{ borderColor: isDark ? '#1C1610' : '#E8DEC8' }}
      >
        <div className="max-w-4xl mx-auto space-y-12 text-center">
          <div className="max-w-xl mx-auto space-y-3">
            <span
              className={`text-[10px] uppercase font-mono tracking-widest ${
                isDark ? 'text-[#B99452]' : 'text-[#23324A]'
              }`}
            >
              Integrity & Trust
            </span>
            <h2
              className={`text-2xl sm:text-4xl font-serif ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Built for trust.
            </h2>
            <p
              className={`text-xs sm:text-sm leading-relaxed ${
                isDark ? 'text-[#D0C2AE]' : 'text-[#5C5346]'
              }`}
            >
              We protect families from impersonation, fraudulent claims, and unwanted alterations. Click any verification badge below to review our honest trust standards.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                type: 'Family Managed' as const,
                title: 'Family Managed',
                desc: 'Created and curated by designated next-of-kin or verified direct family steward.',
              },
              {
                type: 'Document Reviewed' as const,
                title: 'Document Reviewed',
                desc: 'Official municipal registration or civil record verified by our trust officers.',
              },
              {
                type: 'Enhanced Verification' as const,
                title: 'Enhanced Verification',
                desc: 'Multi-party consensus with institutional or family lineage confirmation.',
              },
            ].map((badge, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setVerificationDrawerType(badge.type);
                  setVerificationDrawerOpen(true);
                }}
                className={`p-6 rounded-2xl border text-left transition-all hover:scale-[1.02] ${
                  isDark
                    ? 'bg-[#182337] border-[#202C40] hover:border-[#B99452]'
                    : 'bg-[#FCFAF5] border-[#E5DED2] hover:border-[#23324A]'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <span className="font-serif text-sm font-semibold">{badge.title}</span>
                </div>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
                  {badge.desc}
                </p>
                <div className="mt-4 text-[11px] font-mono text-[#B99452] flex items-center gap-1">
                  <span>Learn what this means</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          8. TURN THE STORY INTO A KEEPSAKE (Memorial Book)
          ───────────────────────────────────────────────────────────── */}
      <section
        className="py-24 px-4 sm:px-6 lg:px-8 border-t transition-colors relative"
        style={{ borderColor: isDark ? '#1C1610' : '#E8DEC8' }}
      >
        <div className="max-w-4xl mx-auto space-y-10 text-center">
          <div className="max-w-xl mx-auto space-y-3">
            <span
              className={`text-[10px] uppercase font-mono tracking-widest ${
                isDark ? 'text-[#B99452]' : 'text-[#23324A]'
              }`}
            >
              Tangible Keepsake
            </span>
            <h2
              className={`text-2xl sm:text-4xl font-serif ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              And one day, you can hold the story in your hands.
            </h2>
            <p
              className={`text-xs sm:text-sm leading-relaxed ${
                isDark ? 'text-[#D0C2AE]' : 'text-[#5C5346]'
              }`}
            >
              Pithros formats the biography, timeline milestones, archival photos, family kinship, and tributes into an editorial keepsake volume ready for home printing or high-quality bookbinding.
            </p>
          </div>

          <div
            className={`p-8 sm:p-12 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-8 ${
              isDark ? 'bg-[#14100C] border-[#2E241A]' : 'bg-[#FCFAF5] border-[#E5DED2]'
            }`}
          >
            <div className="text-left space-y-3 max-w-md">
              <div className="flex items-center gap-2 text-xs font-mono text-[#B99452]">
                <BookOpen className="w-4 h-4" />
                <span>Commemorative Memorial Book</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-serif">
                A printed family heirloom for generations to hold.
              </h3>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
                Includes archival frontispiece, chaptered biography, chronological timeline milestones, family constellation chart, condolence messages, and permanent QR scan plaque.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <Button
                variant="primary"
                size="md"
                onClick={() => setMemorialBookOpen(true)}
                icon={BookOpen}
                className="w-full sm:w-auto"
              >
                Preview Memorial Book
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => setMemorialBookOpen(true)}
                icon={Printer}
                className="w-full sm:w-auto"
              >
                Print / Save as PDF
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          9. KEEP THE LIFE ARCHIVE (Unified Archive)
          ───────────────────────────────────────────────────────────── */}
      <section
        className="py-24 px-4 sm:px-6 lg:px-8 border-t transition-colors relative"
        style={{ borderColor: isDark ? '#1C1610' : '#E8DEC8' }}
      >
        <div className="max-w-4xl mx-auto space-y-12 text-center">
          <div className="max-w-xl mx-auto space-y-3">
            <span
              className={`text-[10px] uppercase font-mono tracking-widest ${
                isDark ? 'text-[#B99452]' : 'text-[#23324A]'
              }`}
            >
              The Full Vault
            </span>
            <h2
              className={`text-2xl sm:text-4xl font-serif ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Everything that made them who they were.
            </h2>
            <p
              className={`text-xs sm:text-sm leading-relaxed ${
                isDark ? 'text-[#D0C2AE]' : 'text-[#5C5346]'
              }`}
            >
              Not isolated feature cards, but a single unified family archive designed to endure for decades.
            </p>
          </div>

          <div
            className={`p-8 rounded-3xl border grid grid-cols-2 sm:grid-cols-4 gap-6 text-left ${
              isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
            }`}
          >
            {[
              { label: 'Life Story', sub: 'Biography & early memories' },
              { label: 'Timeline', sub: 'Milestones & travels' },
              { label: 'Photographs', sub: 'High-resolution restoration' },
              { label: 'Voice Notes', sub: 'Waveform audio histories' },
              { label: 'Family Tree', sub: 'Kinship & relationships' },
              { label: 'Tribute Ledger', sub: 'Condolences & letters' },
              { label: 'Keepsake Book', sub: 'Printable editorial PDF' },
              { label: 'Offline Export', sub: 'ZIP backup of all media' },
            ].map((item, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-1.5 font-serif text-sm font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#B99452]" />
                  <span>{item.label}</span>
                </div>
                <div className="text-[11px] text-[#9EA3AA] pl-5">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          10. PRACTICAL FAREWELL SUPPORT (Calm & Positioned Later)
          ───────────────────────────────────────────────────────────── */}
      <section
        className="py-24 px-4 sm:px-6 lg:px-8 border-t transition-colors relative"
        style={{ borderColor: isDark ? '#1C1610' : '#E8DEC8' }}
      >
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <span
              className={`text-[10px] uppercase font-mono tracking-widest ${
                isDark ? 'text-[#B99452]' : 'text-[#23324A]'
              }`}
            >
              Farewell Network
            </span>
            <h2
              className={`text-2xl sm:text-4xl font-serif ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              When remembering also means taking care of what comes next.
            </h2>
            <p
              className={`text-xs sm:text-sm leading-relaxed ${
                isDark ? 'text-[#D0C2AE]' : 'text-[#5C5346]'
              }`}
            >
              During difficult days, practical arrangements can feel overwhelming. We connect families with verified, vetted providers who assist with dignity.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                title: 'Ceremony Coordination',
                desc: 'Support with floral offerings, prayer gatherings, and transit arrangements.',
              },
              {
                title: 'Memorial Plaques & Stone',
                desc: 'Custom engraved stone markers and archival QR plaques mailed to your home.',
              },
              {
                title: 'Family Logistics Desk',
                desc: 'Transparent quotes, verified partner credentials, and zero hidden markups.',
              },
            ].map((s, i) => (
              <div
                key={i}
                className={`p-6 rounded-2xl border space-y-2 ${
                  isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                }`}
              >
                <h4 className="font-serif text-sm font-semibold">{s.title}</h4>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center pt-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => onNavigate('/farewell')}
              icon={ArrowRight}
            >
              Explore Farewell Services & Partners
            </Button>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          11. NOT ANOTHER SOCIAL NETWORK (Product Philosophy)
          ───────────────────────────────────────────────────────────── */}
      <section
        className="py-20 px-4 sm:px-6 lg:px-8 border-t transition-colors relative"
        style={{ borderColor: isDark ? '#1C1610' : '#E8DEC8' }}
      >
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <span
            className={`text-[10px] uppercase font-mono tracking-widest ${
              isDark ? 'text-[#B99452]' : 'text-[#23324A]'
            }`}
          >
            Our Philosophy
          </span>
          <h2
            className={`text-2xl sm:text-4xl font-serif ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Not another social network.
          </h2>
          <p
            className={`text-sm sm:text-base leading-relaxed ${
              isDark ? 'text-[#D0C2AE]' : 'text-[#5C5346]'
            }`}
          >
            A memory is not content to be scrolled past. Pithros was intentionally designed with:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 text-xs font-mono text-left">
            {[
              'No followers or following',
              'No popularity like counters',
              'No trending memorials',
              'No algorithmic feeds',
              'No third-party advertisements',
              'No data brokerage or tracking',
            ].map((p, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl border flex items-center gap-2 ${
                  isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                }`}
              >
                <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          12. HONEST PRICING (Free to begin, clear plans)
          ───────────────────────────────────────────────────────────── */}
      <section
        className="py-24 px-4 sm:px-6 lg:px-8 border-t transition-colors relative"
        style={{ borderColor: isDark ? '#1C1610' : '#E8DEC8' }}
      >
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <span
              className={`text-[10px] uppercase font-mono tracking-widest ${
                isDark ? 'text-[#B99452]' : 'text-[#23324A]'
              }`}
            >
              Honest Stewardship
            </span>
            <h2
              className={`text-2xl sm:text-4xl font-serif ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Free to begin. Dignified always.
            </h2>
            <p
              className={`text-xs sm:text-sm leading-relaxed ${
                isDark ? 'text-[#D0C2AE]' : 'text-[#5C5346]'
              }`}
            >
              Every family can create a permanent memorial without paying anything. Optional one-time contributions unlock expanded audio storage and physical plaque craft.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricingPlans.map((plan) => (
              <div
                key={plan.id}
                className={`p-8 rounded-3xl border flex flex-col justify-between transition-all ${
                  plan.popular
                    ? isDark
                      ? 'border-[#B99452] bg-[#16120E] shadow-2xl shadow-amber-950/30'
                      : 'border-[#23324A] bg-[#FCFAF5] shadow-xl shadow-amber-900/10'
                    : isDark
                    ? 'border-[#202C40] bg-[#182337]'
                    : 'border-[#E5DED2] bg-[#FCFAF5]'
                }`}
              >
                <div>
                  {plan.popular && (
                    <span
                      className={`text-[10px] uppercase font-mono tracking-wider px-2.5 py-0.5 rounded-full inline-block mb-3 ${
                        isDark ? 'bg-[#B99452]/20 text-[#B99452]' : 'bg-[#E5DED2] text-[#8C5C0F]'
                      }`}
                    >
                      Most Chosen by Families
                    </span>
                  )}
                  <h3 className="text-xl font-serif">{plan.name}</h3>
                  <div className="mt-3 mb-1 flex items-baseline gap-1">
                    <span className="text-3xl font-serif font-bold">{plan.price}</span>
                    <span className="text-xs text-[#9EA3AA]">/ {plan.period}</span>
                  </div>
                  <p className={`text-xs mt-2 mb-6 ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
                    {plan.description}
                  </p>

                  <div className="space-y-2.5 text-xs pt-4 border-t border-current/10">
                    {plan.features.slice(0, 6).map((f, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-[#B99452] mt-0.5 flex-shrink-0" />
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
                    onClick={() => {
                      if (plan.id === 'plan_free') {
                        onNavigate('/create-memorial');
                      } else {
                        onNavigate(`/checkout?plan=${plan.id}`);
                      }
                    }}
                  >
                    {plan.ctaText}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          13. FREQUENTLY ASKED QUESTIONS
          ───────────────────────────────────────────────────────────── */}
      <section
        className="py-24 px-4 sm:px-6 lg:px-8 border-t transition-colors relative"
        style={{ borderColor: isDark ? '#1C1610' : '#E8DEC8' }}
      >
        <div className="max-w-3xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span
              className={`text-[10px] uppercase font-mono tracking-widest ${
                isDark ? 'text-[#B99452]' : 'text-[#23324A]'
              }`}
            >
              Clear Answers
            </span>
            <h2
              className={`text-2xl sm:text-3xl font-serif ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Questions Families Often Ask
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => {
              const isOpen = activeFaq === i;
              return (
                <div
                  key={i}
                  className={`rounded-2xl border transition-colors overflow-hidden ${
                    isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : i)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-serif text-sm font-medium"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#B99452] transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`px-5 pb-5 text-xs leading-relaxed ${
                        isDark ? 'text-[#D0C2AE]' : 'text-[#5C5346]'
                      }`}
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          14. FINAL EMOTIONAL CALL TO ACTION (Part B exact prompt specs)
          ───────────────────────────────────────────────────────────── */}
      <section
        className="py-28 px-4 sm:px-6 lg:px-8 border-t transition-colors text-center relative"
        style={{ borderColor: isDark ? '#1C1610' : '#E8DEC8' }}
      >
        <div className="max-w-2xl mx-auto space-y-6">
          <h2
            className={`text-3xl sm:text-5xl font-serif leading-tight ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Give their story a place to live.
          </h2>
          <div
            className={`text-sm sm:text-base leading-relaxed space-y-1 ${
              isDark ? 'text-[#D0C2AE]' : 'text-[#5C5346]'
            }`}
          >
            <p>You don't need to have everything ready.</p>
            <p>Start with a name, a photograph and a memory.</p>
            <p className="opacity-80">You can return whenever you're ready.</p>
          </div>

          <div className="pt-4">
            <Button
              variant="primary"
              size="lg"
              onClick={() => onNavigate('/create-memorial')}
              className="px-8 py-3.5 text-base shadow-xl"
              icon={Sparkles}
            >
              Create a Memorial
            </Button>
          </div>
        </div>
      </section>

      {/* Modals & Slide-overs */}
      <VerificationDrawer
        isOpen={verificationDrawerOpen}
        onClose={() => setVerificationDrawerOpen(false)}
        badgeType={verificationDrawerType}
      />

      <MemorialBookModal
        isOpen={memorialBookOpen}
        onClose={() => setMemorialBookOpen(false)}
        memorial={{
          fullName: 'Dr. Arun Krishnan',
          birthDate: '14 August 1948',
          deathDate: '12 January 2026',
          birthPlace: 'Fort Kochi, Kerala',
          restingPlace: 'Kaveri Memorial Quietude, Bengaluru',
          shortEpitaph: 'Botanist, quiet mentor, and gardener who saw eternity in the leaves of the Western Ghats.',
          story: {
            overview:
              'Dr. Arun Krishnan dedicated forty-four years to teaching plant taxonomy and documenting endangered flora across the rainforests of Kerala and Karnataka.',
            earlyLife:
              'Born by the tranquil backwaters of Fort Kochi, Arun was the eldest son of schoolteachers.',
            passionsAndValues:
              'Arun believed that patience was the greatest form of intelligence.',
            enduringLegacy:
              'He is remembered by three generations of students whom he taught to observe rather than merely look.',
            favoriteQuotes: [
              '“To walk quietly through a forest is to listen to a conversation that began a million years before us.”',
            ],
          },
          timeline: [
            {
              id: 'tl_1',
              year: '1948',
              dateStr: '14 August 1948',
              title: 'Born in Fort Kochi',
              description: 'Born along the backwaters to schoolteachers.',
            },
            {
              id: 'tl_2',
              year: '1975',
              dateStr: '28 December 1975',
              title: 'Marriage to Anita Varma',
              description: 'Married Anita in a quiet morning ceremony under rain trees in Thrissur.',
            },
            {
              id: 'tl_3',
              year: '1982',
              dateStr: 'October 1982',
              title: 'Silent Valley Expeditions',
              description: 'Led the landmark ecological biodiversity census in Silent Valley.',
            },
          ],
          family: [
            { id: 'f1', name: 'Anita Krishnan', relationship: 'Wife & Steward', role: 'steward' },
            { id: 'f2', name: 'Vikram Krishnan', relationship: 'Son', role: 'archivist' },
            { id: 'f3', name: 'Sunita Krishnan', relationship: 'Daughter', role: 'contributor' },
          ],
          tributes: [
            {
              id: 'tr_1',
              authorName: 'Father George Mathew',
              relationship: 'Lifelong Family Friend',
              message:
                'A soul of deep harmony and peace. Arun brought gentle patience to every life he touched.',
              date: '18 Jan 2026',
              isApproved: true,
            },
          ],
        } as any}
      />
    </div>
  );
};
