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
  X,
  UploadCloud,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { MediaUploader } from '../components/ui/MediaUploader';
import { api } from '../services/api';
import { mediaApi } from '../services/api/media';
import {
  DOCUMENT_TYPE_LABELS,
  verificationApi,
  type VerificationEvidenceItem,
} from '../services/api/verification';
import { PrivacyLevel, Memorial, FamilyMember, FamilyRole } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { useToast } from '../components/ui/Toast';
import { wizardStepVariants, MOTION_TIMING, MOTION_EASING } from '../lib/motion';

interface CreateMemorialViewProps {
  onSuccess: (newMemorial: Memorial) => void;
  onCancel: () => void;
  onNavigate?: (route: string) => void;
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

const StewardshipAuthGate: React.FC<{
  isDark: boolean;
  metadata: { uiFontFamily?: string };
  onNavigate?: (route: string) => void;
  onCancel: () => void;
  setReturnUrl: (url: string) => void;
}> = ({ isDark, metadata, onNavigate, onCancel, setReturnUrl }) => {
  const handleSignIn = () => {
    setReturnUrl('/create-memorial');
    if (onNavigate) {
      onNavigate('/signin');
    } else {
      window.location.pathname = '/signin';
    }
  };

  const handleSignUp = () => {
    setReturnUrl('/create-memorial');
    if (onNavigate) {
      onNavigate('/signup');
    } else {
      window.location.pathname = '/signup';
    }
  };

  return (
    <div
      data-ui-component="auth-gate"
      style={{ fontFamily: metadata.uiFontFamily }}
      className={`min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors ${
        isDark ? 'bg-[#111820] text-[#F8F5EE]' : 'bg-[#F3EEE4] text-[#20242A]'
      }`}
    >
      <div className="max-w-xl w-full space-y-8">
        {/* Top Cancel/Back button */}
        <div className="flex items-center justify-between pb-2 border-b border-inherit/20 text-xs">
          <button
            onClick={onCancel}
            className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
              isDark ? 'text-[#9EA3AA] hover:text-[#F8F5EE]' : 'text-[#7D766D] hover:text-[#20242A]'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Sanctuary</span>
          </button>
          <span className={`text-[11px] font-mono uppercase tracking-widest ${isDark ? 'text-[#B99452]' : 'text-[#8C5C0F]'}`}>
            Identity Guarded
          </span>
        </div>

        {/* Central Card */}
        <div
          className={`p-6 sm:p-8 rounded-3xl border shadow-xl backdrop-blur-md space-y-6 ${
            isDark
              ? 'bg-[#182337]/75 border-[#202C40] shadow-black/40'
              : 'bg-[#FCFAF5]/90 border-[#E5DED2] shadow-amber-900/5'
          }`}
        >
          {/* Header & Crest */}
          <div className="text-center space-y-3">
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-500 mb-1">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <span
              className={`text-[11px] uppercase tracking-[0.25em] font-semibold block ${
                isDark ? 'text-[#B99452]' : 'text-[#23324A]'
              }`}
            >
              Memorial Stewardship Gate
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif leading-tight">
              Begin a Sacred Memorial Sanctuary
            </h1>
            <p
              className={`text-xs sm:text-sm max-w-md mx-auto leading-relaxed ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
              }`}
            >
              Every memorial on Pithros is a permanent, secure tribute. To establish verified family
              stewardship, strict privacy controls, and archival safety for your loved one, please sign in or create your free account before beginning.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="space-y-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full justify-center shadow-md cursor-pointer"
              onClick={handleSignIn}
            >
              Sign In to Begin
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full justify-center cursor-pointer"
              onClick={handleSignUp}
            >
              Create Free Family Account
            </Button>
          </div>

          {/* Three Sacred Trust Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-inherit/15 text-left">
            <div className="p-3 rounded-xl bg-inherit/20 space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-xs">
                <Users className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Sole Custody</span>
              </div>
              <p className={`text-[11px] leading-snug ${isDark ? 'text-[#7D8490]' : 'text-[#7D766D]'}`}>
                Full stewardship over privacy, kinship circles, and tribute approvals.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-inherit/20 space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-xs">
                <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Zero Tracking</span>
              </div>
              <p className={`text-[11px] leading-snug ${isDark ? 'text-[#7D8490]' : 'text-[#7D766D]'}`}>
                No advertisements, data brokers, or search indexing without explicit consent.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-inherit/20 space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-xs">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Enduring Light</span>
              </div>
              <p className={`text-[11px] leading-snug ${isDark ? 'text-[#7D8490]' : 'text-[#7D766D]'}`}>
                Permanent archival retention preserved safely for future generations.
              </p>
            </div>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => onNavigate ? onNavigate('/memorials') : onCancel()}
              className={`text-xs hover:underline cursor-pointer ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
              }`}
            >
              Explore existing public remembrance sanctuaries &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CreateMemorialView: React.FC<CreateMemorialViewProps> = ({
  onSuccess,
  onCancel,
  onNavigate,
}) => {
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const { metadata } = useLocale();
  const { currentUser, isLoading: authLoading, setReturnUrl } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'saved_locally'>('saved');
  const [showAuthGateModal, setShowAuthGateModal] = useState(false);
  const [isCustomUrlOpen, setIsCustomUrlOpen] = useState(false);
  const [hasExistingDraft, setHasExistingDraft] = useState(false);
  const [savedDraftMeta, setSavedDraftMeta] = useState<{ fullName?: string; savedAt?: string } | null>(null);
  const isInitialMount = useRef(true);

  // User-scoped draft key: strictly isolated per authenticated user ID
  const draftKey = currentUser ? `pithros_draft_${currentUser.uid}` : null;

  // Form State: Step 1 (Beginning: Name, Photo, Birth/Passing Year) - Empty by default
  const [fullName, setFullName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [deathYear, setDeathYear] = useState('');
  const [portraitUrl, setPortraitUrl] = useState('');
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceDocType, setEvidenceDocType] =
    useState<VerificationEvidenceItem['documentType']>('death_certificate');
  const [stewardRelation, setStewardRelation] = useState('');
  const [stewardName, setStewardName] = useState(() => {
    return currentUser?.displayName || (currentUser?.email ? currentUser.email.split('@')[0] : '');
  });
  const [stewardEmail, setStewardEmail] = useState(() => {
    return currentUser?.email || '';
  });

  // Form State: Step 2 (Story & Timeline) - Empty by default
  const [shortEpitaph, setShortEpitaph] = useState('');
  const [overview, setOverview] = useState('');
  const [firstMilestoneYear, setFirstMilestoneYear] = useState('');
  const [firstMilestoneTitle, setFirstMilestoneTitle] = useState('');
  const [firstMilestoneDesc, setFirstMilestoneDesc] = useState('');

  // Form State: Step 3 (Family Collaboration) - Derived purely from authenticated steward
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(() => {
    const sName = currentUser?.displayName || (currentUser?.email ? currentUser.email.split('@')[0] : '');
    const sEmail = currentUser?.email || '';
    if (!sName && !sEmail) return [];
    return [
      {
        id: 'fm-steward',
        name: sName,
        relationship: 'Steward',
        role: 'steward',
        email: sEmail,
      },
    ];
  });
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRelation, setNewMemberRelation] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<FamilyRole>('biographer');

  // Form State: Step 4 (Privacy, Verification & Preview)
  const [privacy, setPrivacy] = useState<PrivacyLevel>('private');
  const [hasVerificationDoc, setHasVerificationDoc] = useState(false);
  const [previewMode, setPreviewMode] = useState<'visitor' | 'family'>('visitor');

  // Synchronize steward identity when authenticated user state changes
  useEffect(() => {
    if (currentUser) {
      const uName = currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Family Steward');
      const uEmail = currentUser.email || '';
      setStewardName((prev) => (!prev ? uName : prev));
      setStewardEmail((prev) => (!prev ? uEmail : prev));
      setFamilyMembers((prev) => {
        if (prev.length === 0) {
          return [
            {
              id: 'fm-steward',
              name: uName,
              relationship: stewardRelation || 'Steward',
              role: 'steward',
              email: uEmail,
            },
          ];
        }
        return prev.map((m) =>
          m.id === 'fm-steward' && (!m.name || !m.email)
            ? { ...m, name: uName, email: uEmail }
            : m
        );
      });
    }
  }, [currentUser, stewardRelation]);

  // Load saved draft on initial mount ONLY if belonging to this authenticated user
  useEffect(() => {
    // Purge legacy, un-namespaced global drafts that caused cross-user leakage
    try {
      localStorage.removeItem('pithros_memorial_draft');
    } catch {
      // ignore
    }

    if (!draftKey) return;

    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.fullName || parsed.overview || parsed.birthYear) {
          setHasExistingDraft(true);
          setSavedDraftMeta({
            fullName: parsed.fullName || '',
            savedAt: parsed.savedAt || '',
          });
        }
      }
    } catch {
      // ignore
    }
  }, [draftKey]);

  const handleResumeDraft = () => {
    if (!draftKey) return;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFullName(parsed.fullName || '');
        setPreferredName(parsed.preferredName || '');
        setBirthYear(parsed.birthYear || '');
        setDeathYear(parsed.deathYear || '');
        // Validate portraitUrl is not an expired blob URL
        if (parsed.portraitUrl && !parsed.portraitUrl.startsWith('blob:')) {
          setPortraitUrl(parsed.portraitUrl);
        }
        setShortEpitaph(parsed.shortEpitaph || '');
        setOverview(parsed.overview || '');
        setFirstMilestoneYear(parsed.firstMilestoneYear || '');
        setFirstMilestoneTitle(parsed.firstMilestoneTitle || '');
        setFirstMilestoneDesc(parsed.firstMilestoneDesc || '');
        setStewardRelation(parsed.stewardRelation || '');
        if (parsed.stewardName) setStewardName(parsed.stewardName);
        if (parsed.stewardEmail) setStewardEmail(parsed.stewardEmail);
        if (Array.isArray(parsed.familyMembers) && parsed.familyMembers.length > 0) {
          setFamilyMembers(parsed.familyMembers);
        }
        if (parsed.privacy) setPrivacy(parsed.privacy);
        if (parsed.currentStep && parsed.currentStep > 1 && parsed.currentStep <= 5) {
          setCurrentStep(parsed.currentStep);
        }
        showToast('Draft restored.', { type: 'success' });
      }
    } catch {
      // ignore
    } finally {
      setHasExistingDraft(false);
    }
  };

  const handleDiscardDraft = () => {
    if (draftKey) {
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // ignore
      }
    }
    setHasExistingDraft(false);
    setSavedDraftMeta(null);
    showToast('Starting with a clean memorial.', { type: 'info' });
  };

  // Auto-save draft changes strictly under the user-scoped draft key
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!draftKey) return;

    // Don't auto-save if everything is empty
    if (!fullName && !birthYear && !deathYear && !shortEpitaph && !overview && !portraitUrl) {
      return;
    }

    setSaveStatus('unsaved');
    const savingTimer = setTimeout(() => {
      setSaveStatus('saving');
    }, 250);

    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({
            currentStep,
            fullName,
            preferredName,
            birthYear,
            deathYear,
            portraitUrl: portraitUrl.startsWith('blob:') ? '' : portraitUrl,
            stewardRelation,
            stewardName,
            stewardEmail,
            shortEpitaph,
            overview,
            firstMilestoneYear,
            firstMilestoneTitle,
            firstMilestoneDesc,
            familyMembers,
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
  }, [
    draftKey,
    currentStep,
    fullName,
    preferredName,
    birthYear,
    deathYear,
    portraitUrl,
    stewardRelation,
    stewardName,
    stewardEmail,
    shortEpitaph,
    overview,
    firstMilestoneYear,
    firstMilestoneTitle,
    firstMilestoneDesc,
    familyMembers,
    privacy,
  ]);

  const handleSaveAndContinueLater = () => {
    if (!draftKey) {
      showToast('Please sign in to save your draft.', { type: 'warning' });
      return;
    }
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          currentStep,
          fullName,
          preferredName,
          birthYear,
          deathYear,
          portraitUrl: portraitUrl.startsWith('blob:') ? '' : portraitUrl,
          stewardRelation,
          stewardName,
          stewardEmail,
          shortEpitaph,
          overview,
          firstMilestoneYear,
          firstMilestoneTitle,
          firstMilestoneDesc,
          familyMembers,
          privacy,
          savedAt: new Date().toISOString(),
        })
      );
      showToast('Draft saved safely to your account.', { type: 'success' });
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

    if (newMemberEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newMemberEmail.trim())) {
        showToast('Please enter a valid email address for invitation.', { type: 'warning' });
        return;
      }
    }

    const newMem: FamilyMember = {
      id: `fm-${Date.now()}`,
      name: newMemberName.trim(),
      relationship: newMemberRelation.trim() || 'Kin',
      email: newMemberEmail.trim() || undefined,
      invitedEmail: newMemberEmail.trim() || undefined,
      role: newMemberRole,
    };

    setFamilyMembers((prev) => [...prev, newMem]);
    setNewMemberName('');
    setNewMemberRelation('');
    setNewMemberEmail('');
    showToast(`${newMem.name} added as ${newMem.role}.`, { type: 'success' });
  };

  const handleNext = () => {
    console.log('handleNext CALLED! currentStep:', currentStep);
    console.log('fullName:', fullName, 'bYear:', birthYear, 'dYear:', deathYear);
    
    if (currentStep === 1) {
      if (!fullName.trim()) {
        console.log('Validation failed: fullName is empty!');
        showToast('Please enter their name to begin.', { type: 'warning' });
        return;
      }
      
      const bYearNum = birthYear.trim() ? parseInt(birthYear.trim().replace(/\D/g, ''), 10) : null;
      const dYearNum = deathYear.trim() ? parseInt(deathYear.trim().replace(/\D/g, ''), 10) : null;
      const currentYear = new Date().getFullYear();
      console.log('bYearNum:', bYearNum, 'dYearNum:', dYearNum, 'currentYear:', currentYear);
      
      if (bYearNum !== null) {
        if (bYearNum > currentYear) {
          console.log('Validation failed: bYearNum > currentYear');
          showToast('Birth year cannot be in the future.', { type: 'warning' });
          return;
        }
        if (bYearNum < 1800) {
          console.log('Validation failed: bYearNum < 1800');
          showToast('Please enter a valid 4-digit birth year.', { type: 'warning' });
          return;
        }
      }

      if (dYearNum !== null) {
        if (dYearNum > currentYear) {
          console.log('Validation failed: dYearNum > currentYear');
          showToast('Passing year cannot be in the future.', { type: 'warning' });
          return;
        }
        if (bYearNum !== null && dYearNum < bYearNum) {
          console.log('Validation failed: dYearNum < bYearNum');
          showToast('Passing year cannot be earlier than birth year.', { type: 'warning' });
          return;
        }
      }
    }

    console.log('Validation passed! Advancing to step:', currentStep + 1);
    setCurrentStep((prev) => Math.min(5, prev + 1));
  };



  const handleBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      setReturnUrl('/create-memorial');
      setShowAuthGateModal(true);
      return;
    }

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
        portraitUrl: portraitUrl.startsWith('blob:') ? undefined : portraitUrl.trim() || undefined,
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

      // The portrait file is uploaded after creation: storage needs a memorial to
      // attach to, and the API refuses client URLs, so the reference is set
      // server-side once the real bytes are verified.
      if (portraitFile) {
        try {
          const { mediaId } = await mediaApi.uploadFile(created.id, portraitFile, {
            kind: 'photo',
            title: 'Portrait',
          });
          await api.updateMemorial(created.id, { portraitMediaId: mediaId });
        } catch {
          showToast(
            'The memorial was created, but the portrait upload did not complete. You can add it from your dashboard.',
            { type: 'warning' },
          );
        }
      }

      // Evidence of passing is submitted through the real verification pipeline:
      // the file lands in the sensitive tier and reviewers are notified.
      if (evidenceFile) {
        try {
          await verificationApi.submitDocument(created.id, evidenceFile, {
            documentType: evidenceDocType,
            label: DOCUMENT_TYPE_LABELS[evidenceDocType],
          });
          showToast('Evidence submitted for review. You will get a notification when it is reviewed.', {
            type: 'success',
          });
        } catch {
          showToast(
            'The memorial was created, but the evidence upload did not complete. You can submit it from your dashboard verification page.',
            { type: 'warning' },
          );
        }
      }

      // Persist first milestone if specified
      if (firstMilestoneTitle.trim()) {
        try {
          await api.addTimelineEvent(created.id, {
            year: firstMilestoneYear.trim() || birthYear || '1970',
            title: firstMilestoneTitle.trim(),
            description: firstMilestoneDesc.trim() || '',
            category: 'milestone',
          });
        } catch {
          // non-blocking
        }
      }

      // Invite additional family members if added in step 3
      for (const fm of familyMembers) {
        if (fm.role !== 'steward' && (fm.email || fm.invitedEmail)) {
          try {
            await api.inviteFamilyMember(created.id, fm);
          } catch {
            // non-blocking
          }
        }
      }

      if (draftKey) {
        try {
          localStorage.removeItem(draftKey);
        } catch {
          // ignore
        }
      }
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

  if (authLoading) {
    return (
      <div className={`min-h-[70vh] flex flex-col items-center justify-center gap-3 ${isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'}`}>
        <div className="w-8 h-8 rounded-full border-2 border-[#D9941E] border-t-transparent animate-spin" />
        <span className="text-xs font-serif tracking-wider">Verifying sanctuary identity…</span>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <StewardshipAuthGate
        isDark={isDark}
        metadata={metadata}
        onNavigate={onNavigate}
        onCancel={onCancel}
        setReturnUrl={setReturnUrl}
      />
    );
  }

  return (
    <div
      data-ui-component="form"
      style={{ fontFamily: metadata.uiFontFamily }}
      className={`min-h-screen py-10 px-4 sm:px-6 lg:px-8 transition-colors ${
        isDark ? 'bg-[#111820] text-[#F8F5EE]' : 'bg-[#F3EEE4] text-[#20242A]'
      }`}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* User-Scoped Draft Recovery Banner */}
        {hasExistingDraft && savedDraftMeta && (
          <div
            className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
              isDark
                ? 'bg-[#B99452]/10 border-[#B99452]/30 text-[#D9D2C6]'
                : 'bg-[#FAF6EE] border-[#D4C3A3] text-[#4A4237]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 text-[#D9941E] shrink-0" />
              <span>
                Unfinished memorial draft found
                {savedDraftMeta.fullName ? (
                  <> for <strong className="font-semibold">{savedDraftMeta.fullName}</strong></>
                ) : null}
                {savedDraftMeta.savedAt ? (
                  <span className="opacity-75"> ({new Date(savedDraftMeta.savedAt).toLocaleDateString()})</span>
                ) : null}. Would you like to resume?
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="primary" onClick={handleResumeDraft}>
                Resume Draft
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDiscardDraft}>
                Discard & Start Clean
              </Button>
            </div>
          </div>
        )}

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
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: 'Beginning', sub: 'Name & Portrait' },
            { label: 'Their Story', sub: 'Memories & Dates' },
            { label: 'Family Circle', sub: 'Roles & Custodians' },
            { label: 'Privacy & Review', sub: 'Permissions & Live' },
            { label: 'Evidence', sub: 'Certificate or Notice' },
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
                    placeholder="Enter their full name"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none transition-colors ${
                      isDark
                        ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                        : 'bg-[#E5DED2] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                    }`}
                  />
                </div>

                {/* Portrait Upload / Sample */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label
                      className={`block text-xs font-medium ${
                        isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                      }`}
                    >
                      Portrait Photograph
                    </label>
                    <span className="text-[11px] opacity-75 font-mono">JPG, PNG, WebP</span>
                  </div>

                  <div
                    className={`flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl border transition-colors ${
                      isDark ? 'border-[#202C40] bg-[#182337]/50' : 'border-[#E5DED2] bg-[#FCFAF5]'
                    }`}
                  >
                    <div
                      className={`w-20 h-20 rounded-full overflow-hidden border-2 flex-shrink-0 relative shadow-sm flex items-center justify-center ${
                        isDark ? 'border-[#B99452]/50 bg-[#182337]' : 'border-[#23324A]/50 bg-[#E5DED2]'
                      }`}
                    >
                      {portraitUrl ? (
                        <img
                          src={portraitUrl}
                          alt="Memorial Portrait"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Camera className={`w-8 h-8 opacity-40 ${isDark ? 'text-[#B99452]' : 'text-[#23324A]'}`} />
                      )}
                    </div>

                    <div className="flex-1 space-y-2.5 w-full">
                      <MediaUploader
                        label="Upload photo from device or drag here"
                        accept="image/*"
                        className="w-full"
                        onUploadComplete={(fileInfo) => {
                          setPortraitUrl(fileInfo.url);
                          setPortraitFile(fileInfo.file ?? null);
                          showToast('Portrait photo loaded.', { type: 'success' });
                        }}
                      />

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setIsCustomUrlOpen(!isCustomUrlOpen)}
                          className={`hover:underline cursor-pointer ${
                            isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                          }`}
                        >
                          {isCustomUrlOpen ? 'Hide URL input' : 'Or paste direct image URL'}
                        </button>
                      </div>

                      {isCustomUrlOpen && (
                        <input
                          type="text"
                          value={portraitUrl}
                          onChange={(e) => {
                            setPortraitUrl(e.target.value);
                            setPortraitFile(null);
                          }}
                          placeholder="https://example.com/photo.jpg"
                          className={`w-full px-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
                            isDark
                              ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE]'
                              : 'bg-[#E5DED2] border-[#E5DED2] text-[#20242A]'
                          }`}
                        />
                      )}
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
                          {(m.email || m.invitedEmail) && (
                            <span className={`text-[10px] ml-2 font-mono block sm:inline ${isDark ? 'text-[#737982]' : 'text-[#9C9488]'}`}>
                              ({m.email || m.invitedEmail})
                            </span>
                          )}
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
                <form onSubmit={handleAddFamilyMember} className="space-y-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium block ${isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'}`}>
                      Add a family custodian
                    </span>
                    <span className={`text-[10px] ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                      Optional — you can also invite kin anytime later from your dashboard
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input
                      type="text"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="Full Name (e.g. Vikram)"
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
                    <input
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="Email for invitation (optional)"
                      className={`px-3 py-1.5 rounded-xl border text-xs focus:outline-none ${
                        isDark ? 'bg-[#16120E] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
                      }`}
                    />
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value as FamilyRole)}
                      className={`px-3 py-1.5 rounded-xl border text-xs focus:outline-none cursor-pointer ${
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

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <p className={`text-[11px] leading-relaxed ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                      <strong>How it works:</strong> Like adding collaborators on GitHub or Drive, invited kin receive a secure email or direct invite link with scoped permissions (e.g. writing life chapters or uploading family albums).
                    </p>
                    <Button type="submit" variant="outline" size="sm" className="self-start sm:self-auto shrink-0">
                      + Add to Circle
                    </Button>
                  </div>
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

            {currentStep === 5 && (
              <motion.div
                key="step-evidence"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3 }}
                className={`p-6 rounded-2xl border space-y-5 ${
                  isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
                }`}
              >
                <div className="space-y-1.5">
                  <h3
                    className={`text-base font-serif ${isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'}`}
                  >
                    Evidence of passing
                  </h3>
                  <p
                    className={`text-xs leading-relaxed ${
                      isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                    }`}
                  >
                    This is optional — you can skip it and add the document later from your
                    dashboard. When a reviewer confirms it, a small “Document Reviewed” note
                    appears on the memorial.
                  </p>
                </div>

                <ul
                  className={`text-xs space-y-1.5 leading-relaxed ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                  }`}
                >
                  <li>
                    • <strong>What to share:</strong> a death certificate, a newspaper obituary or
                    funeral notice, or another official document (PDF, JPG, PNG).
                  </li>
                  <li>
                    • <strong>Who sees it:</strong> only credentialed reviewers. It is kept in a
                    restricted vault and never shown on the public memorial.
                  </li>
                  <li>
                    • <strong>What happens next:</strong> a reviewer checks it against the memorial
                    details and you are told either way. If something is unclear, they will ask you
                    for one more document.
                  </li>
                </ul>

                <div className="space-y-1.5">
                  <label
                    htmlFor="evidence-doc-type"
                    className={`block text-xs font-medium ${
                      isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                    }`}
                  >
                    What kind of document is this?
                  </label>
                  <select
                    id="evidence-doc-type"
                    value={evidenceDocType}
                    onChange={(e) =>
                      setEvidenceDocType(e.target.value as VerificationEvidenceItem['documentType'])
                    }
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                      isDark
                        ? 'border-[#202C40] bg-[#111820] text-[#F8F5EE]'
                        : 'border-[#E5DED2] bg-white text-[#20242A]'
                    }`}
                  >
                    {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <MediaUploader
                  label="Choose the document, or drag it here"
                  accept=".pdf,.png,.jpg,.jpeg"
                  isVerificationDocument={true}
                  onUploadComplete={(fileInfo) => {
                    setEvidenceFile(fileInfo.file ?? null);
                  }}
                />

                {evidenceFile && (
                  <p className={`text-[11px] ${isDark ? 'text-[#6EE7B7]' : 'text-[#2D7A5F]'}`}>
                    {evidenceFile.name} will be uploaded when you create the memorial.
                  </p>
                )}
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

            {currentStep < 5 ? (
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

      {/* Auth Gate Modal for New / Unauthenticated Visitors */}
      {showAuthGateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`max-w-md w-full rounded-3xl border p-6 sm:p-7 space-y-5 shadow-2xl ${
              isDark ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE]' : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A]'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#B99452]/20 flex items-center justify-center text-[#B99452]">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-mono text-[#B99452] font-semibold">
                    Stewardship Account
                  </span>
                  <h3 className="text-lg font-serif font-bold">Preserve This Sanctuary</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthGateModal(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs leading-relaxed">
              <p className={isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'}>
                Your tribute draft for <strong>{fullName || 'your loved one'}</strong> is securely saved on this device.
              </p>
              <p className={isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}>
                To publish and retain permanent custody as the designated family steward, please sign in or create your free account. You will return right here to finish.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => {
                  setReturnUrl('/create-memorial');
                  if (onNavigate) {
                    onNavigate('/signup');
                  } else {
                    window.location.hash = '/signup';
                  }
                }}
              >
                Create Free Steward Account
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <Button
                variant="outline"
                size="md"
                className="w-full"
                onClick={() => {
                  setReturnUrl('/create-memorial');
                  if (onNavigate) {
                    onNavigate('/signin');
                  } else {
                    window.location.hash = '/signin';
                  }
                }}
              >
                Sign In to Existing Account
              </Button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setShowAuthGateModal(false)}
                  className={`text-[11px] underline hover:no-underline cursor-pointer ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                  }`}
                >
                  Continue editing draft on this device
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
