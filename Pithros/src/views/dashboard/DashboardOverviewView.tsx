import React, { useState } from 'react';
import {
  Heart,
  Users,
  Calendar,
  ShieldCheck,
  Flame,
  ArrowRight,
  Plus,
  Share2,
  Download,
  CheckCircle2,
  ExternalLink,
  Volume2,
  Bell,
  Sparkles,
} from 'lucide-react';
import { Memorial } from '../../types';
import { Button } from '../../components/ui/Button';
import { VerificationBadge, PrivacyBadge } from '../../components/ui/Badge';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../components/ui/Toast';
import { AnniversarySettingsModal } from '../../components/ui/AnniversarySettingsModal';

interface DashboardOverviewViewProps {
  memorial: Memorial;
  onNavigate: (route: string) => void;
  onOpenMemorial: (slug: string) => void;
}

export const DashboardOverviewView: React.FC<DashboardOverviewViewProps> = ({
  memorial,
  onNavigate,
  onOpenMemorial,
}) => {
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const [downloadingBook, setDownloadingBook] = useState(false);
  const [anniversaryModalOpen, setAnniversaryModalOpen] = useState(false);

  const handleDownloadMemorialBook = () => {
    setDownloadingBook(true);
    setTimeout(() => {
      setDownloadingBook(false);
      showToast(
        `Memorial Book compiled for ${memorial.fullName}. High-resolution PDF ready.`,
        { type: 'success' }
      );
    }, 1500);
  };

  const tasks = [
    { title: 'Add portrait photograph', completed: !!memorial.portraitUrl, route: '/dashboard/editor' },
    { title: 'Write life story overview', completed: !!memorial.story.overview, route: '/dashboard/editor' },
    { title: 'Add 3 timeline milestones', completed: memorial.timeline.length >= 3, route: '/dashboard/timeline' },
    { title: 'Record or upload a voice memory', completed: (memorial.voiceMemories?.length || 0) > 0, route: '/dashboard/media' },
    { title: 'Invite family members', completed: memorial.family.length > 1, route: '/dashboard/contributors' },
    { title: 'Upload verification document', completed: memorial.verificationStatus === 'approved', route: '/dashboard/verification' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div
        className={`rounded-3xl border p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm transition-colors ${
          isDark
            ? 'border-[#202C40] bg-gradient-to-r from-[#16120E] via-[#182337] to-[#16120E]'
            : 'border-[#E5DED2] bg-gradient-to-r from-[#E5DED2] via-[#FCFAF5] to-[#E5DED2]'
        }`}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs uppercase tracking-widest font-medium ${
                isDark ? 'text-[#B99452]' : 'text-[#23324A]'
              }`}
            >
              Family Custodian
            </span>
            <span className={isDark ? 'text-[#737982]' : 'text-[#C4B7A5]'}>•</span>
            <VerificationBadge type={memorial.verificationBadgeType} />
          </div>
          <h1
            className={`text-2xl sm:text-3xl font-serif ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Remembering {memorial.fullName}
          </h1>
          <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
            Created by {memorial.stewardName}
            {memorial.stewardRelationship ? ` (${memorial.stewardRelationship})` : ''}. All tributes and media are guarded by your approval.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenMemorial(memorial.slug)}
            icon={ExternalLink}
          >
            Open Public View
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleDownloadMemorialBook}
            icon={Download}
            isLoading={downloadingBook}
          >
            Download Memorial Book (PDF)
          </Button>
        </div>
      </div>

      {/* Pending Contributions Banner */}
      {memorial.tributes?.filter((t) => !t.isApproved).length > 0 && (
        <div
          className={`p-4 sm:p-5 rounded-3xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
            isDark ? 'bg-[#182337] border-[#B99452]/40' : 'bg-[#E5DED2] border-[#B99452]/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B99452] animate-pulse flex-shrink-0" />
            <div>
              <h4
                className={`text-sm font-medium ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                {memorial.tributes.filter((t) => !t.isApproved).length}{' '}
                {memorial.tributes.filter((t) => !t.isApproved).length === 1
                  ? 'contribution'
                  : 'contributions'}{' '}
                waiting for review.
              </h4>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
                Family tributes and condolences awaiting custodian approval before appearing publicly.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('/dashboard/tributes')}
          >
            Review Contributions
          </Button>
        </div>
      )}

      {/* On This Day / Memory Resurfacing Card */}
      {memorial.timeline.length > 0 && (
        <div
          className={`p-5 rounded-3xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
            isDark ? 'bg-[#182337] border-[#202C40]' : 'bg-[#FCFAF5] border-[#E5DED2]'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] uppercase font-mono tracking-widest ${
                  isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                }`}
              >
                On This Day • From the Archive ({memorial.timeline[0].year})
              </span>
            </div>
            <h4
              className={`text-base font-serif font-medium ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              {memorial.timeline[0].title}
            </h4>
            <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
              {memorial.timeline[0].description}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('/dashboard/timeline')}
            >
              View in Timeline
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('/dashboard/editor')}
            >
              Add a Note
            </Button>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tributes Received', count: memorial.tributes.length, icon: Heart, route: '/dashboard/tributes' },
          { label: 'Offerings Placed', count: memorial.offerings?.length || 0, icon: Flame, route: '/dashboard/tributes' },
          { label: 'Family Contributors', count: memorial.family.length, icon: Users, route: '/dashboard/contributors' },
          { label: 'Voice Memories', count: memorial.voiceMemories?.length || 0, icon: Volume2, route: '/dashboard/media' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              onClick={() => onNavigate(stat.route)}
              className={`p-5 rounded-2xl border transition-colors cursor-pointer ${
                isDark
                  ? 'border-[#202C40] bg-[#182337] hover:border-[#B99452]/40'
                  : 'border-[#E5DED2] bg-[#FCFAF5] hover:border-[#23324A]/50'
              }`}
            >
              <div
                className={`flex items-center justify-between mb-3 ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                <span className="text-xs uppercase tracking-wider">{stat.label}</span>
                <Icon
                  className={`w-4 h-4 ${
                    isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                  }`}
                />
              </div>
              <div
                className={`text-3xl font-serif ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                {stat.count}
              </div>
            </div>
          );
        })}
      </div>

      {/* Completeness Checklist & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Checklist */}
        <div
          className={`lg:col-span-7 rounded-2xl border p-6 space-y-5 ${
            isDark
              ? 'border-[#202C40] bg-[#182337]'
              : 'border-[#E5DED2] bg-[#FCFAF5]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2
                className={`text-base font-serif ${
                  isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                }`}
              >
                Memorial Completeness
              </h2>
              <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'}`}>
                Steps to preserve a complete archival remembrance record.
              </p>
            </div>
            <span
              className={`text-sm font-mono font-bold ${
                isDark ? 'text-[#B99452]' : 'text-[#23324A]'
              }`}
            >
              {memorial.completenessPercent}%
            </span>
          </div>

          <div
            className={`w-full h-2 rounded-full overflow-hidden ${
              isDark ? 'bg-[#182337]' : 'bg-[#E5DED2]'
            }`}
          >
            <div
              className={`h-full transition-all duration-500 ${
                isDark ? 'bg-[#B99452]' : 'bg-[#23324A]'
              }`}
              style={{ width: `${memorial.completenessPercent}%` }}
            />
          </div>

          <div className="space-y-2 pt-2">
            {tasks.map((t, idx) => (
              <div
                key={idx}
                onClick={() => onNavigate(t.route)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer text-xs ${
                  isDark
                    ? 'bg-[#182337]/60 hover:bg-[#182337] border-[#202C40]'
                    : 'bg-[#E5DED2] hover:bg-[#EAE2D5] border-[#E5DED2]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      t.completed
                        ? isDark
                          ? 'bg-[#2D7A5F]/20 text-[#6EE7B7]'
                          : 'bg-[#EAF5EF] text-[#245C45]'
                        : isDark
                        ? 'bg-[#202C40] text-[#737982]'
                        : 'bg-[#E5DED2] text-[#7D766D]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span
                    className={
                      t.completed
                        ? isDark
                          ? 'text-[#D9D2C6] line-through opacity-70'
                          : 'text-[#7D766D] line-through opacity-70'
                        : isDark
                        ? 'text-[#F8F5EE]'
                        : 'text-[#20242A]'
                    }
                  >
                    {t.title}
                  </span>
                </div>
                <ArrowRight
                  className={`w-3.5 h-3.5 ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right Quick Actions */}
        <div
          className={`lg:col-span-5 rounded-2xl border p-6 space-y-4 ${
            isDark
              ? 'border-[#202C40] bg-[#182337]'
              : 'border-[#E5DED2] bg-[#FCFAF5]'
          }`}
        >
          <h2
            className={`text-base font-serif ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Quick Actions
          </h2>

          <div className="space-y-2.5">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              icon={Plus}
              onClick={() => onNavigate('/dashboard/media')}
            >
              Add Photographs or Voice Clip
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              icon={Calendar}
              onClick={() => onNavigate('/dashboard/timeline')}
            >
              Add Life Milestone Event
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              icon={Users}
              onClick={() => onNavigate('/dashboard/contributors')}
            >
              Invite Family Contributor
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              icon={ShieldCheck}
              onClick={() => onNavigate('/dashboard/verification')}
            >
              Submit Verification Document
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              icon={Bell}
              onClick={() => setAnniversaryModalOpen(true)}
            >
              Quiet Anniversary Notifications
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              icon={Sparkles}
              onClick={() => onNavigate('/dashboard/billing')}
            >
              Lifetime Preservation & Invoices
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              icon={Share2}
              onClick={() => onNavigate('/dashboard/privacy')}
            >
              Adjust Privacy & Sharing Settings
            </Button>
          </div>

          <div
            className={`pt-4 border-t ${
              isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
            }`}
          >
            <span
              className={`text-[11px] uppercase tracking-wider block mb-1 ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
              }`}
            >
              Active Privacy Mode
            </span>
            <div className="flex items-center justify-between">
              <PrivacyBadge privacy={memorial.privacy} />
              <button
                onClick={() => onNavigate('/dashboard/privacy')}
                className={`text-xs hover:underline cursor-pointer ${
                  isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                }`}
              >
                Change
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnniversarySettingsModal
        isOpen={anniversaryModalOpen}
        memorial={memorial}
        onClose={() => setAnniversaryModalOpen(false)}
      />
    </div>
  );
};
