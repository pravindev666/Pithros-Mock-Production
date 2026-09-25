import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Mail, Phone, Shield, Calendar, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';

interface AccountProfileViewProps {
  onNavigate: (route: string) => void;
}

export const AccountProfileView: React.FC<AccountProfileViewProps> = ({ onNavigate }) => {
  const { isDark } = useTheme();
  const { pithrosUser, currentUser, isEmailVerified, updateProfile } = useAuth();

  const [name, setName] = useState(pithrosUser?.name || currentUser?.displayName || '');
  const [phone, setPhone] = useState(pithrosUser?.phone || currentUser?.phoneNumber || '');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const formatRole = (roleStr?: string) => {
    switch (roleStr) {
      case 'admin':
        return 'System Administrator';
      case 'partner':
        return 'Care Partner';
      case 'family_contributor':
        return 'Family Contributor';
      case 'family_steward':
      default:
        return 'Family Steward';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    const res = await updateProfile({
      name: name.trim(),
      phone: phone.trim() || undefined,
    });
    setIsSaving(false);

    if (res.success) {
      setStatusMessage({ type: 'success', text: 'Profile details saved.' });
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to save changes.' });
    }
  };

  return (
    <div
      className={`min-h-[calc(100vh-80px)] py-8 px-4 sm:px-6 lg:px-8 transition-colors ${
        isDark ? 'bg-[#111820] text-[#F8F5EE]' : 'bg-[#F3EEE4] text-[#20242A]'
      }`}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-inherit">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif">Account Profile</h1>
            <p
              className={`text-xs sm:text-sm mt-1 ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
              }`}
            >
              Manage your personal identity and stewardship credentials.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('/account/security')}
          >
            Security & Credentials
          </Button>
        </div>

        {/* Profile Card */}
        <div
          className={`p-6 sm:p-8 rounded-2xl border transition-colors ${
            isDark
              ? 'bg-[#182337] border-[#202C40]'
              : 'bg-[#FCFAF5] border-[#E5DED2]'
          }`}
        >
          {statusMessage && (
            <div
              className={`mb-5 p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  : 'border border-red-500/20 bg-red-500/10 text-red-400'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-5">
            {/* Avatar & Role Badge Header */}
            <div className="flex items-center gap-4 pb-5 border-b border-inherit">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-500/40 bg-stone-800">
                <img
                  src={
                    pithrosUser?.avatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
                  }
                  alt={pithrosUser?.name || 'User avatar'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-medium">{pithrosUser?.name || 'Memorial Steward'}</h2>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/20">
                    <Shield className="w-3 h-3" />
                    {formatRole(pithrosUser?.role)}
                  </span>
                  <span
                    className={`text-xs ${
                      isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                    }`}
                  >
                    Status: Active
                  </span>
                </div>
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isSaving}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none ${
                    isDark
                      ? 'border-[#202C40] bg-[#182337] text-[#F8F5EE] focus:border-[#B99452]'
                      : 'border-[#E5DED2] bg-white text-[#20242A] focus:border-[#23324A]'
                  }`}
                />
              </div>
            </div>

            {/* Email (Read-only / Verified status) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium">Email Address</label>
                {isEmailVerified ? (
                  <span className="text-[11px] text-emerald-400 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                ) : (
                  <span className="text-[11px] text-amber-400">Unverified</span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={pithrosUser?.email || currentUser?.email || ''}
                  disabled
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm opacity-80 cursor-not-allowed ${
                    isDark
                      ? 'border-[#202C40] bg-[#16120D] text-[#F8F5EE]'
                      : 'border-[#E5DED2] bg-[#F4ECE1] text-[#20242A]'
                  }`}
                />
              </div>
              <p
                className={`text-[11px] ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                To change your authentication email address, contact Pithros stewardship support.
              </p>
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium">Contact Phone</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98450 11223"
                  disabled={isSaving}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none ${
                    isDark
                      ? 'border-[#202C40] bg-[#182337] text-[#F8F5EE] focus:border-[#B99452]'
                      : 'border-[#E5DED2] bg-white text-[#20242A] focus:border-[#23324A]'
                  }`}
                />
              </div>
            </div>

            {/* Member Since metadata */}
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                isDark
                  ? 'border-[#202C40] bg-[#16120D] text-[#9EA3AA]'
                  : 'border-[#E5DED2] bg-[#F4ECE1] text-[#7D766D]'
              }`}
            >
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>
                Stewardship established on{' '}
                {pithrosUser?.created_at
                  ? new Date(pithrosUser.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'January 15, 2025'}
              </span>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <Button type="submit" variant="primary" disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save Changes'}
              </Button>

              <button
                type="button"
                onClick={() => onNavigate('/account/security')}
                className={`text-xs inline-flex items-center gap-1 hover:underline ${
                  isDark ? 'text-[#B99452]' : 'text-[#23324A]'
                }`}
              >
                Go to security settings
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
