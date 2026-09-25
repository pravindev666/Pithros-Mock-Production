import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ShieldCheck,
  Lock,
  Globe,
  Users,
  EyeOff,
  Sparkles,
  Info,
  Clock,
  Heart,
  BookOpen,
  Camera,
  Calendar,
  Save,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { MediaUploader } from '../components/ui/MediaUploader';
import { api } from '../services/api';
import { PrivacyLevel, Memorial, FamilyMember, FamilyRole } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { useToast } from '../components/ui/Toast';
import { wizardStepVariants, MOTION_TIMING, MOTION_EASING } from '../lib/motion';

interface CreateMemorialViewProps {
  onSuccess: (newMemorial: Memorial) => void;
  onCancel: () => void;
}

const MEMORY_PROMPTS = [
  'Where did they grow up?',
  'What were they known for?',
  'What story does your family always tell?',
  'What did they love?',
  'Do you have a voice recording?',
  'Would someone in the family have old photographs?',
  'What phrase or advice did they always give?',
  'A cherished memory from a gathering',
];

const FAMILY_ROLE_DESCRIPTIONS: { role: FamilyRole; title: string; desc: string }[] = [
  { role: 'steward', title: 'Steward', desc: 'Full stewardship over memorial settings, privacy, and invitations.' },
  { role: 'biographer', title: 'Biographer', desc: 'Can write, refine, and edit chapters of the life story.' },
  { role: 'archivist', title: 'Photo Archivist', desc: 'Can upload and curate vintage family albums and high-res photos.' },
  { role: 'contributor', title: 'Memory Contributor', desc: 'Can record voice memories and submit stories for approval.' },
  { role: 'reviewer', title: 'Guest Reviewer', desc: 'Helps review incoming condolences and tribute submissions.' },
  { role: 'viewer', title: 'Family Viewer', desc: 'Private, secure access to explore family stories and audio.' },
];

export const CreateMemorialView: React.FC<CreateMemorialViewProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const { metadata } = useLocale();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'saved_locally'>('saved_locally');
  const isInitialMount = useRef(true);

  // Form State: Step 1 (Beginning: Name, Photo, Birth/Passing Year)
  const [fullName, setFullName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [deathYear, setDeathYear] = useState('');
  const [portraitUrl, setPortraitUrl] = useState(
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800'
  );
  const [stewardRelation, setStewardRelation] = useState('Daughter');
  const [stewardName, setStewardName] = useState('Anita Krishnan');
  const [stewardEmail, setStewardEmail] = useState('anita.k@example.com');

  // Form State: Step 2 (Story & Timeline)
  const [shortEpitaph, setShortEpitaph] = useState('');
  const [overview, setOverview] = useState('');
  const [firstMilestoneYear, setFirstMilestoneYear] = useState('');
  const [firstMilestoneTitle, setFirstMilestoneTitle] = useState('');
  const [firstMilestoneDesc, setFirstMilestoneDesc] = useState('');

  // Form State: Step 3 (Family Collaboration)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    {
      id: 'fm-steward',
      name: 'Anita Krishnan',
      relationship: 'Daughter',
      role: 'steward',
      email: 'anita.k@example.com',
    },
  ]);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRelation, setNewMemberRelation] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<FamilyRole>('biographer');

  // Form State: Step 4 (Privacy, Verification & Preview)
  const [privacy, setPrivacy] = useState<PrivacyLevel>('private');
  const [hasVerificationDoc, setHasVerificationDoc] = useState(false);
  const [previewMode, setPreviewMode] = useState<'visitor' | 'family'>('visitor');

  // Auto-save draft changes to localStorage with distinct saving/saved/unsaved states
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setSaveStatus('unsaved');
    const savingTimer = setTimeout(() => {
      setSaveStatus('saving');
    }, 250);

    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          'pithros_memorial_draft',
          JSON.stringify({
            fullName,
            preferredName,
            birthYear,
            deathYear,
            portraitUrl,
            shortEpitaph,
            overview,
            privacy,
            savedAt: new Date().toISOString(),
          })
        );
        setSaveStatus('saved_locally');
      } catch {
        setSaveStatus('saved');
      }
    }, 700);

    return () => {
      clearTimeout(savingTimer);
      clearTimeout(timer);
    };
  }, [fullName, preferredName, birthYear, deathYear, portraitUrl, shortEpitaph, overview, privacy]);

  // Load saved draft on initial mount if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pithros_memorial_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.fullName && !fullName) {
          setFullName(parsed.fullName || '');
          setPreferredName(parsed.preferredName || '');
          setBirthYear(parsed.birthYear || '');
          setDeathYear(parsed.deathYear || '');
          if (parsed.portraitUrl) setPortraitUrl(parsed.portraitUrl);
          if (parsed.shortEpitaph) setShortEpitaph(parsed.shortEpitaph);
          if (parsed.overview) setOverview(parsed.overview);
          if (parsed.privacy) setPrivacy(parsed.privacy);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSaveAndContinueLater = () => {
    try {
      localStorage.setItem(
        'pithros_memorial_draft',
        JSON.stringify({
          fullName,
          preferredName,
          birthYear,
          deathYear,
          portraitUrl,
          shortEpitaph,
          overview,
          privacy,
          savedAt: new Date().toISOString(),
        })
      );
      showToast('Draft saved safely. You can return whenever you are ready.', { type: 'success' });
      onCancel();
    } catch {
      showToast('Draft recorded locally.', { type: 'info' });
      onCancel();
    }
  };

  const handleAddPromptToStory = (promptText: string) => {
    setOverview((prev) => {
      const addition = prev.trim()
        ? `\n\n${promptText}\n`
        : `${promptText}\n`;
      return prev + addition;
    });
  };

  const handleAddFamilyMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const newMem: FamilyMember = {
      id: `fm-${Date.now()}`,
      name: newMemberName.trim(),
      relationship: newMemberRelation.trim() || 'Kin',
      role: newMemberRole,
    };

    setFamilyMembers((prev) => [...prev, newMem]);
    setNewMemberName('');
    setNewMemberRelation('');
    showToast(`${newMem.name} added as ${newMem.role}.`, { type: 'success' });
  };

  const handleNext = () => {
    if (currentStep === 1 && !fullName.trim()) {
      showToast('Please enter their name to begin.', { type: 'warning' });
      return;
    }
    setCurrentStep((prev) => Math.min(4, prev + 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // The memorial is created by the server, which makes the signed-in user its
      // steward. Ownership fields are deliberately not sent: the API rejects them,
      // and the previous hardcoded `stewardId: 'user-steward-1'` is exactly the
      // bug this replaces.
      const created = await api.createMemorial({
        fullName: fullName.trim(),
        preferredName: preferredName.trim() || undefined,
        birthDate: birthYear || undefined,
        deathDate: deathYear || undefined,
        birthPlace: 'Ancestral Roots',
        shortEpitaph:
          shortEpitaph.trim() || 'A life lived with gentle kindness and quiet grace.',
        portraitUrl,
        privacy,
        story: {
          overview:
            overview.trim() ||
            `${fullName} was cherished by all who knew them. Their warmth, wisdom, and laughter remain an enduring light in our hearts.`,
          earlyLife: '',
          passionsAndValues: '',
          enduringLegacy: '',
          favoriteQuotes: [],
        },
      });

      try {
        localStorage.removeItem('pithros_memorial_draft');
      } catch {
        // ignore
      }

      showToast('Memorial created. You can return whenever you are ready.', { type: 'success' });
      onSuccess(created);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : 'The memorial could not be created. Please try again.',
        { type: 'warning' },
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const privacyOptions = [
    {
      level: 'private' as PrivacyLevel,
      title: 'Private',
      badge: 'Personal Sanctuary',
      summary: 'Only you and family stewards you explicitly invite.',
      whoCanSee: 'Designated family stewards with secure authentication.',
      sharingImpact: 'Completely unsearchable. Search engines blocked.',
      icon: Lock,
    },
    {
      level: 'family' as PrivacyLevel,
      title: 'Family Circle',
      badge: 'Invited Loved Ones',
      summary: 'Accessible to authenticated family members in your circle.',
      whoCanSee: 'Family members accepted into the kinship circle.',
      sharingImpact: 'Not indexed on search engines. Closed remembrance ledger.',
      icon: Users,
    },
    {
      level: 'unlisted' as PrivacyLevel,
      title: 'Unlisted',
      badge: 'Discreet Share Link',
      summary: 'Anyone who receives the direct link can view without searching.',
      whoCanSee: 'Colleagues, friends, or extended kin with the private link.',
      sharingImpact: 'Not listed in public directories or search engine results.',
      icon: EyeOff,
    },
    {
      level: 'public' as PrivacyLevel,
      title: 'Public Memorial',
      badge: 'Open Remembrance',
      summary: 'Discoverable in the Pithros memorial registry.',
      whoCanSee: 'Anyone seeking to pay respects or celebrate their life.',
      sharingImpact: 'Searchable by name so former colleagues and students can tribute.',
      icon: Globe,
    },
  ];

  return (
    <div
      data-ui-component="form"
      style={{ fontFamily: metadata.uiFontFamily }}
      className={`min-h-screen py-10 px-4 sm:px-6 lg:px-8 transition-colors ${
        isDark ? 'bg-[#111820] text-[#F8F5EE]' : 'bg-[#F3EEE4] text-[#20242A]'
      }`}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Top bar with back button, save status, and save & continue later */}
        <div className="flex items-center justify-between pb-2 border-b text-xs">
          <button
            onClick={onCancel}
            className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
              isDark ? 'text-[#9EA3AA] hover:text-[#F8F5EE]' : 'text-[#7D766D] hover:text-[#20242A]'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancel</span>
          </button>

          {/* Save Status Indicator */}
          <div className="flex items-center gap-4">
            <span
              className={`flex items-center gap-1.5 font-mono text-[11px] ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              {saveStatus === 'saving'
                ? 'Saving'
                : saveStatus === 'unsaved'
                ? 'Unsaved Changes'
                : saveStatus === 'saved_locally'
                ? 'Saved Locally'
                : 'Saved'}
            </span>

            <button
              type="button"
              onClick={handleSaveAndContinueLater}
              className={`flex items-center gap-1 font-medium transition-colors cursor-pointer ${
                isDark ? 'text-[#B99452] hover:text-[#D1B477]' : 'text-[#23324A] hover:text-[#182337]'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save & Continue Later</span>
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-1.5">
          <span
            className={`text-[11px] uppercase tracking-[0.2em] font-medium ${
              isDark ? 'text-[#B99452]' : 'text-[#23324A]'
            }`}
          >
            Create Memorial
          </span>
          <h1
            className={`text-2xl sm:text-3xl font-serif ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Give their story a place to live.
          </h1>
          <p
            className={`text-xs max-w-md mx-auto leading-relaxed ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
            }`}
          >
            Start with what you know. You can return whenever you're ready. Everything is private by default.
          </p>
        </div>

        {/* Step Progress Pills */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Beginning', sub: 'Name & Portrait' },
            { label: 'Their Story', sub: 'Memories & Dates' },
            { label: 'Family Circle', sub: 'Roles & Custodians' },
            { label: 'Privacy & Review', sub: 'Permissions & Live' },
          ].map((item, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;
            return (
              <button
                type="button"
                key={item.label}
                onClick={() => {
                  if (stepNum < currentStep) setCurrentStep(stepNum);
                }}
                className={`text-left p-2.5 rounded-2xl border text-xs transition-all ${
                  isCurrent
                    ? isDark
                      ? 'border-[#B99452] bg-[#B99452]/10 text-[#B99452]'
                      : 'border-[#23324A] bg-[#FCFAF5] text-[#23324A]'
                    : isCompleted
                    ? isDark
                      ? 'border-[#2D7A5F]/50 bg-[#2D7A5F]/10 text-[#6EE7B7] cursor-pointer'
                      : 'border-[#96CBB4] bg-[#EAF5EF] text-[#245C45] cursor-pointer'
                    : isDark
                    ? 'border-[#202C40] bg-[#182337] text-[#737982]'
                    : 'border-[#E5DED2] bg-[#E5DED2] text-[#7D766D]'
                }`}
              >
                <div className="flex items-center gap-1 font-medium">
                  {isCompleted ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <span>{stepNum}.</span>}
                  <span className="truncate">{item.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Form Container */}
        <div
          className={`p-6 sm:p-8 rounded-3xl border shadow-sm transition-colors ${
            isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
          }`}
        >
          <AnimatePresence mode="wait">
            {/* ─────────────────────────────────────────────────────────────
                STEP 1: BEGINNING (Name, Photo, Birth Year, Passing Year)
                ───────────────────────────────────────────────────────────── */}
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                variants={wizardStepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-5"
              >
                <div className="space-y-1">
                  <h3
                    className={`text-xl font-serif ${
                      isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                    }`}
                  >
                    Who are we remembering?
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
                    Enter their name and a photograph. You can update this at any time.
                  </p>
                </div>

                {/* Name */}
                <div className="space-y-1.5">
                  <label
                    className={`block text-xs font-medium ${
                      isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                    }`}
                  >
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Arun Krishnan"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none transition-colors ${
                      isDark
                        ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                        : 'bg-[#E5DED2] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                    }`}
                  />
                </div>

                {/* Portrait Upload / Sample */}
                <div className="space-y-2 pt-1">
                  <label
                    className={`block text-xs font-medium ${
                      isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                    }`}
                  >
                    Portrait Photograph
                  </label>
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-20 h-20 rounded-full overflow-hidden border-2 flex-shrink-0 relative ${
                        isDark ? 'border-[#B99452]/50 bg-[#182337]' : 'border-[#23324A]/50 bg-[#E5DED2]'
                      }`}
                    >
                      <img
                        src={portraitUrl}
                        alt="Memorial Portrait"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={portraitUrl}
                        onChange={(e) => setPortraitUrl(e.target.value)}
                        placeholder="Image URL or choose a sample below"
                        className={`w-full px-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
                          isDark
                            ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE]'
                            : 'bg-[#E5DED2] border-[#E5DED2] text-[#20242A]'
                        }`}
                      />
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() =>
                            setPortraitUrl(
                              'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800'
                            )
                          }
                          className={`hover:underline cursor-pointer ${
                            isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                          }`}
                        >
                          Gentle Portrait 1
                        </button>
                        <span className={isDark ? 'text-[#737982]' : 'text-[#C4B7A5]'}>•</span>
                        <button
                          type="button"
                          onClick={() =>
                            setPortraitUrl(
                              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800'
                            )
                          }
                          className={`hover:underline cursor-pointer ${
                            isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                          }`}
                        >
                          Gentle Portrait 2
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Birth & Passing Year */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label
                      className={`block text-xs font-medium mb-1.5 ${
                        isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                      }`}
                    >
                      Year of Birth
                    </label>
                    <input
                      type="text"
                      value={birthYear}
                      onChange={(e) => setBirthYear(e.target.value)}
                      placeholder="e.g. 1954"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none transition-colors ${
                        isDark
                          ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                          : 'bg-[#E5DED2] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                      }`}
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-xs font-medium mb-1.5 ${
                        isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                      }`}
                    >
                      Year of Passing
                    </label>
                    <input
                      type="text"
                      value={deathYear}
                      onChange={(e) => setDeathYear(e.target.value)}
                      placeholder="e.g. 2024"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none transition-colors ${
                        isDark
                          ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                          : 'bg-[#E5DED2] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                      }`}
                    />
                  </div>
                </div>

                {/* Steward Relationship */}
                <div className="pt-1">
                  <label
                    className={`block text-xs font-medium mb-1.5 ${
                      isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                    }`}
                  >
                    Your Relationship to Them
                  </label>
                  <input
                    type="text"
                    value={stewardRelation}
                    onChange={(e) => setStewardRelation(e.target.value)}
                    placeholder="e.g. Daughter, Partner, Grandchild, Lifelong Friend"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none transition-colors ${
                      isDark
                        ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                        : 'bg-[#E5DED2] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                    }`}
                  />
                </div>
              </motion.div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                STEP 2: THEIR STORY & GENTLE MEMORY PROMPTS
                ───────────────────────────────────────────────────────────── */}
            {currentStep === 2 && (
              <motion.div
                key="step-2"
                variants={wizardStepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-5"
              >
                <div className="space-y-1">
                  <h3
                    className={`text-xl font-serif ${
                      isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                    }`}
                  >
                    Their Life & Cherished Stories
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
                    Write a few words to begin. Use the suggested memory prompts if you need inspiration.
                  </p>
                </div>

                {/* Short Epitaph */}
                <div className="space-y-1.5">
                  <label
                    className={`block text-xs font-medium ${
                      isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                    }`}
                  >
                    Short Epitaph or Cherished Verse
                  </label>
                  <input
                    type="text"
                    value={shortEpitaph}
                    onChange={(e) => setShortEpitaph(e.target.value)}
                    placeholder="e.g. A life lived with gentle kindness and quiet grace."
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none transition-colors ${
                      isDark
                        ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                        : 'bg-[#E5DED2] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                    }`}
                  />
                </div>

                {/* Suggested Memory Prompts */}
                <div className="space-y-1.5 pt-1">
                  <span
                    className={`text-[11px] font-medium flex items-center gap-1.5 ${
                      isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Suggested Memory Prompts (click to add to story)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {MEMORY_PROMPTS.map((prompt) => (
                      <button
                        type="button"
                        key={prompt}
                        onClick={() => handleAddPromptToStory(prompt)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                          isDark
                            ? 'bg-[#182337] border-[#202C40] text-[#D9D2C6] hover:border-[#B99452]/50'
                            : 'bg-[#E5DED2] border-[#E5DED2] text-[#554F48] hover:border-[#23324A]/50'
                        }`}
                      >
                        + {prompt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Life Story Textarea */}
                <div className="space-y-1.5">
                  <label
                    className={`block text-xs font-medium ${
                      isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                    }`}
                  >
                    Life Story & Overview
                  </label>
                  <textarea
                    rows={6}
                    value={overview}
                    onChange={(e) => setOverview(e.target.value)}
                    placeholder="Write a few paragraphs about their character, early beginnings, passions, family moments, and legacy..."
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none transition-colors resize-none ${
                      isDark
                        ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                        : 'bg-[#E5DED2] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                    }`}
                  />
                </div>

                {/* First Timeline Milestone (Optional / Skip for now) */}
                <div
                  className={`p-4 rounded-2xl border space-y-3 ${
                    isDark ? 'bg-[#182337]/40 border-[#202C40]' : 'bg-[#F3EEE4]/60 border-[#E5DED2]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium flex items-center gap-1.5 ${isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'}`}>
                      <Calendar className="w-3.5 h-3.5" />
                      First Timeline Milestone (Optional)
                    </span>
                    <span className={`text-[10px] ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                      Can skip for now
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={firstMilestoneYear}
                      onChange={(e) => setFirstMilestoneYear(e.target.value)}
                      placeholder="Year (e.g. 1978)"
                      className={`px-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
                        isDark ? 'bg-[#16120E] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                      }`}
                    />
                    <input
                      type="text"
                      value={firstMilestoneTitle}
                      onChange={(e) => setFirstMilestoneTitle(e.target.value)}
                      placeholder="Milestone title (e.g. First Research Expedition)"
                      className={`col-span-2 px-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
                        isDark ? 'bg-[#16120E] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                      }`}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                STEP 3: FAMILY KINSHIP & ROLES
                ───────────────────────────────────────────────────────────── */}
            {currentStep === 3 && (
              <motion.div
                key="step-3"
                variants={wizardStepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-5"
              >
                <div className="space-y-1">
                  <h3
                    className={`text-xl font-serif ${
                      isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                    }`}
                  >
                    Family Circle & Stewardship
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
                    Invite siblings, children, or close friends to help gather memories together.
                  </p>
                </div>

                {/* Role Explanations */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FAMILY_ROLE_DESCRIPTIONS.map((r) => (
                    <div
                      key={r.role}
                      className={`p-2.5 rounded-2xl border text-left ${
                        isDark ? 'bg-[#16120E] border-[#202C40]' : 'bg-[#F3EEE4] border-[#E5DED2]'
                      }`}
                    >
                      <span className={`text-xs font-medium block ${isDark ? 'text-[#B99452]' : 'text-[#23324A]'}`}>
                        {r.title}
                      </span>
                      <span className={`text-[10px] leading-tight block mt-0.5 ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
                        {r.desc}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Current Family Members */}
                <div className="space-y-2 pt-1">
                  <span className={`text-xs font-medium block ${isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'}`}>
                    Custodians in this Circle ({familyMembers.length})
                  </span>
                  <div className="space-y-1.5">
                    {familyMembers.map((m) => (
                      <div
                        key={m.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                          isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#E5DED2] border-[#E5DED2]'
                        }`}
                      >
                        <div>
                          <span className="font-medium">{m.name}</span>
                          <span className={`text-[11px] ml-2 ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                            {m.relationship}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full ${
                            isDark ? 'bg-[#B99452]/15 text-[#B99452]' : 'bg-[#23324A]/15 text-[#8C5C0F]'
                          }`}
                        >
                          {m.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Member Form */}
                <form onSubmit={handleAddFamilyMember} className="space-y-2 pt-2 border-t">
                  <span className={`text-xs font-medium block ${isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'}`}>
                    Add a family custodian
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="Name (e.g. Vikram)"
                      className={`px-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
                        isDark ? 'bg-[#16120E] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                      }`}
                    />
                    <input
                      type="text"
                      value={newMemberRelation}
                      onChange={(e) => setNewMemberRelation(e.target.value)}
                      placeholder="Relation (e.g. Son)"
                      className={`px-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
                        isDark ? 'bg-[#16120E] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                      }`}
                    />
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value as FamilyRole)}
                      className={`px-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
                        isDark ? 'bg-[#16120E] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                      }`}
                    >
                      <option value="biographer">Biographer</option>
                      <option value="archivist">Photo Archivist</option>
                      <option value="contributor">Contributor</option>
                      <option value="reviewer">Reviewer</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                  <Button type="submit" variant="outline" size="sm">
                    + Add to Circle
                  </Button>
                </form>
              </motion.div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                STEP 4: PRIVACY, PREVIEW & PUBLISH
                ───────────────────────────────────────────────────────────── */}
            {currentStep === 4 && (
              <motion.div
                key="step-4"
                variants={wizardStepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h3
                    className={`text-xl font-serif ${
                      isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                    }`}
                  >
                    Privacy & Who Can See This
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
                    You decide who visits this memorial. You can change this setting at any time.
                  </p>
                </div>

                {/* Privacy Options */}
                <div className="space-y-2.5">
                  {privacyOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = privacy === opt.level;
                    return (
                      <div
                        key={opt.level}
                        onClick={() => setPrivacy(opt.level)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? isDark
                              ? 'border-[#B99452] bg-[#B99452]/10 ring-1 ring-[#B99452]/30'
                              : 'border-[#23324A] bg-[#E5DED2] ring-1 ring-[#23324A]/30'
                            : isDark
                            ? 'border-[#202C40] bg-[#182337]/50 hover:border-[#2D3D56]'
                            : 'border-[#E5DED2] bg-[#F3EEE4]/60 hover:border-[#23324A]/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Icon className={`w-4 h-4 ${isSelected ? (isDark ? 'text-[#B99452]' : 'text-[#23324A]') : ''}`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-serif font-medium text-sm">{opt.title}</span>
                                <span className="text-[10px] px-2 py-0.2 rounded-full font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                  {opt.badge}
                                </span>
                              </div>
                              <p className={`text-xs mt-0.5 ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
                                {opt.summary}
                              </p>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* "What Others Can See" Interactive Preview Toggle */}
                <div
                  className={`p-4 rounded-2xl border space-y-3 ${
                    isDark ? 'bg-[#182337]/70 border-[#202C40]' : 'bg-[#FCFAF5] border-[#E8DEC8]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium flex items-center gap-1.5 ${isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'}`}>
                      <Eye className="w-3.5 h-3.5" />
                      What Others Can See (Preview Mode)
                    </span>
                    <div className="flex rounded-lg border overflow-hidden text-[11px]">
                      <button
                        type="button"
                        onClick={() => setPreviewMode('visitor')}
                        className={`px-2.5 py-1 transition-colors cursor-pointer ${
                          previewMode === 'visitor'
                            ? isDark
                              ? 'bg-[#B99452] text-[#182337] font-medium'
                              : 'bg-[#23324A] text-white font-medium'
                            : isDark
                            ? 'text-[#9EA3AA]'
                            : 'text-[#554F48]'
                        }`}
                      >
                        Visitor View
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewMode('family')}
                        className={`px-2.5 py-1 transition-colors cursor-pointer ${
                          previewMode === 'family'
                            ? isDark
                              ? 'bg-[#B99452] text-[#182337] font-medium'
                              : 'bg-[#23324A] text-white font-medium'
                            : isDark
                            ? 'text-[#9EA3AA]'
                            : 'text-[#554F48]'
                        }`}
                      >
                        Family View
                      </button>
                    </div>
                  </div>

                  <p className={`text-[11px] leading-relaxed ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
                    {previewMode === 'visitor'
                      ? privacy === 'private'
                        ? 'Visitors will see an access request screen. No photographs or stories are visible to outsiders.'
                        : 'Visitors see the public portrait, approved stories, timeline milestones, and can place quiet remembrance gestures.'
                      : 'Family members see all private kinship notes, oral voice memories, unmoderated submissions, and can add their own stories.'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls Footer */}
          <div
            className={`flex items-center justify-between pt-6 mt-6 border-t ${
              isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
            }`}
          >
            {currentStep > 1 ? (
              <Button type="button" variant="outline" size="sm" onClick={handleBack}>
                Previous
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 4 ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleNext}
                icon={ArrowRight}
                iconPosition="right"
                disabled={currentStep === 1 && !fullName.trim()}
              >
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleFinish}
                isLoading={isSubmitting}
                icon={Sparkles}
              >
                Create Memorial
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
