import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  BookOpen,
  Camera,
  Mic,
  Eye,
  ArrowRight,
  Sparkles,
  Lock,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { api } from '../../services/api';
import { Memorial, FamilyContributorRole } from '../../types';

interface AcceptInvitationViewProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  memorials?: Memorial[];
}

const ROLE_DETAILS: Record<
  FamilyContributorRole,
  { title: string; icon: React.ElementType; badge: string; description: string; permissions: string[] }
> = {
  steward: {
    title: 'Co-Steward',
    icon: ShieldCheck,
    badge: 'Full Custody',
    description: 'Shared custodianship over memorial settings, privacy, and invitations.',
    permissions: ['Edit story & chapters', 'Upload photos & voice', 'Manage contributors', 'Review tributes'],
  },
  biographer: {
    title: 'Biographer',
    icon: BookOpen,
    badge: 'Narrative Lead',
    description: 'Write, refine, and curate chapters of their life story and timeline milestones.',
    permissions: ['Write & edit biography chapters', 'Add timeline milestones', 'View private archives'],
  },
  archivist: {
    title: 'Photo Archivist',
    icon: Camera,
    badge: 'Archival Curator',
    description: 'Preserve and curate vintage family albums, portraits, and high-resolution galleries.',
    permissions: ['Upload photographs & albums', 'Curate photo galleries', 'View private archives'],
  },
  contributor: {
    title: 'Memory Contributor',
    icon: Mic,
    badge: 'Oral & Written Memories',
    description: 'Record oral voice memories, write personal reflections, and share cherished memories.',
    permissions: ['Record spoken voice memories', 'Submit personal reflections', 'View family archives'],
  },
  reviewer: {
    title: 'Guest Reviewer',
    icon: Eye,
    badge: 'Community Moderation',
    description: 'Help the family review incoming condolences and memories from friends and colleagues.',
    permissions: ['Review & approve public condolences', 'Flag inappropriate entries', 'View memory stream'],
  },
  viewer: {
    title: 'Family Viewer',
    icon: Lock,
    badge: 'Private Kinship Access',
    description: 'Dignified, private access to view family-only stories, audio recordings, and albums.',
    permissions: ['View private stories & audio', 'View family tree & timeline', 'Place quiet offerings'],
  },
};

export const AcceptInvitationView: React.FC<AcceptInvitationViewProps> = ({
  currentRoute,
  onNavigate,
  memorials = [],
}) => {
  const { isDark } = useTheme();
  const { currentUser, setReturnUrl, switchRole } = useAuth();
  const { showToast } = useToast();

  const [memorial, setMemorial] = useState<Memorial | null>(null);
  const [role, setRole] = useState<FamilyContributorRole>('contributor');
  const [token, setToken] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Parse memorialId and role from route: /invite/:memorialId?role=...
  useEffect(() => {
    try {
      const pathPart = currentRoute.split('?')[0];
      const parts = pathPart.split('/invite/');
      const memorialId = parts[1] || '';

      const searchParams = new URLSearchParams(window.location.search || (currentRoute.includes('?') ? currentRoute.split('?')[1] : ''));
      const qRole = searchParams.get('role') as FamilyContributorRole;
      if (qRole && ROLE_DETAILS[qRole]) {
        setRole(qRole);
      }
      const qToken = searchParams.get('token');
      if (qToken) {
        setToken(qToken);
      }

      // Find in existing memorials or fetch from API
      const found = memorials.find((m) => m.id === memorialId || m.slug === memorialId);
      if (found) {
        setMemorial(found);
        setIsLoading(false);
      } else {
        api.getMemorialBySlug(memorialId).then((res: Memorial | null) => {
          if (res) {
            setMemorial(res);
          } else if (memorials.length > 0) {
            setMemorial(memorials[0]);
          }
          setIsLoading(false);
        }).catch(() => {
          // Fallback to first available memorial if demo/offline
          if (memorials.length > 0) {
            setMemorial(memorials[0]);
          }
          setIsLoading(false);
        });
      }
    } catch {
      setIsLoading(false);
    }
  }, [currentRoute, memorials]);

  const roleInfo = ROLE_DETAILS[role] || ROLE_DETAILS.contributor;
  const RoleIcon = roleInfo.icon;

  const handleAccept = async () => {
    if (!currentUser) {
      setReturnUrl(currentRoute);
      onNavigate('/signin');
      return;
    }

    if (!token) {
      showToast(
        'This invitation link is incomplete. Ask the steward to resend the invitation.',
        { type: 'warning' },
      );
      return;
    }

    setIsAccepting(true);
    try {
      // The server records the contributor relationship; nothing about access is
      // decided by the client.
      await api.acceptInvitation(token);
      setIsAccepted(true);
      showToast(`Welcome to the family circle as ${roleInfo.title}.`, { type: 'success' });
      setTimeout(() => {
        onNavigate('/dashboard');
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to accept invitation';
      showToast(msg, { type: 'warning' });
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-[70vh] flex items-center justify-center ${isDark ? 'bg-[#111820]' : 'bg-[#F3EEE4]'}`}>
        <div className="w-8 h-8 rounded-full border-2 border-[#B99452] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div
      className={`min-h-[85vh] flex items-center justify-center p-4 sm:p-6 lg:p-8 transition-colors ${
        isDark ? 'bg-[#111820] text-[#F8F5EE]' : 'bg-[#F3EEE4] text-[#20242A]'
      }`}
    >
      <div className="w-full max-w-xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-7 sm:p-9 rounded-3xl border shadow-xl space-y-6 ${
            isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
          }`}
        >
          {/* Header Badge */}
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] uppercase font-mono tracking-widest px-3 py-1 rounded-full ${
                isDark ? 'bg-[#B99452]/15 text-[#B99452] border border-[#B99452]/30' : 'bg-[#23324A]/10 text-[#23324A] border border-[#23324A]/20'
              }`}
            >
              Family Custodianship Invitation
            </span>
            <span className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
              Pithros Sanctuary
            </span>
          </div>

          {/* Invitation Subject */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold">
              Join the Circle of Remembrance
            </h1>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'}`}>
              You have been invited by the family steward to help gather and preserve the life memories of{' '}
              <strong>{memorial?.fullName || 'their beloved loved one'}</strong>.
            </p>
          </div>

          {/* Role Specification Card */}
          <div
            className={`p-5 rounded-2xl border space-y-3.5 ${
              isDark ? 'bg-[#111820]/70 border-[#202C40]' : 'bg-[#F3EEE4]/60 border-[#E5DED2]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  isDark ? 'bg-[#B99452]/20 text-[#B99452]' : 'bg-[#23324A]/15 text-[#23324A]'
                }`}
              >
                <RoleIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-serif font-bold">{roleInfo.title}</h3>
                  <span
                    className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded-full ${
                      isDark ? 'bg-[#B99452]/20 text-[#B99452]' : 'bg-[#23324A]/15 text-[#23324A]'
                    }`}
                  >
                    {roleInfo.badge}
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                  {roleInfo.description}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-inherit">
              <span className={`text-[10px] uppercase font-mono tracking-wider block mb-1.5 ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                Your Scoped Custodial Permissions:
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                {roleInfo.permissions.map((perm, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{perm}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Deceased Preview Mini Card */}
          {memorial && (
            <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-inherit bg-transparent">
              <div className="w-12 h-12 rounded-full overflow-hidden border flex-shrink-0">
                <img
                  src={memorial.portraitUrl}
                  alt={memorial.fullName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="truncate">
                <span className="font-serif font-semibold text-sm block truncate">
                  {memorial.fullName}
                </span>
                <span className={`text-[11px] block truncate ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                  {memorial.shortEpitaph}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-2">
            {isAccepted ? (
              <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-center text-xs font-medium flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Invitation accepted! Opening your memorial dashboard…</span>
              </div>
            ) : currentUser ? (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleAccept}
                isLoading={isAccepting}
              >
                Accept Invitation & Enter Sanctuary
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <div className="space-y-2.5">
                <p className={`text-xs text-center ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                  To protect the family's privacy and bind your custodianship, please sign in or create an account.
                </p>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={() => {
                    setReturnUrl(currentRoute);
                    onNavigate('/signup');
                  }}
                >
                  Create Account to Accept Invitation
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  className="w-full"
                  onClick={() => {
                    setReturnUrl(currentRoute);
                    onNavigate('/signin');
                  }}
                >
                  Sign In to Existing Account
                </Button>
              </div>
            )}

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => onNavigate(`/m/${memorial?.slug || 'arun-krishnan'}`)}
                className={`text-xs underline hover:no-underline cursor-pointer ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                Or view public memorial without joining circle
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
