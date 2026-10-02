import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Shield,
  KeyRound,
  Mail,
  Phone,
  Smartphone,
  LogOut,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Laptop,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/Button';
import { privacyApi, type DeletionRequest } from '../../services/api/privacy';

interface AccountSecurityViewProps {
  onNavigate: (route: string) => void;
}

export const AccountSecurityView: React.FC<AccountSecurityViewProps> = ({ onNavigate }) => {
  const { isDark } = useTheme();
  const {
    currentUser,
    pithrosUser,
    isEmailVerified,
    changePassword,
    reauthenticate,
    resendVerificationEmail,
    signOut,
  } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passMessage, setPassMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [mfaEnabled, setMfaEnabled] = useState(Boolean(pithrosUser?.mfa_enabled));
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletionRequest, setDeletionRequest] = useState<DeletionRequest | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [dispositions, setDispositions] = useState<
    Record<string, { disposition: string; successorEmail: string }>
  >({});

  useEffect(() => {
    let cancelled = false;
    privacyApi
      .getDeletionRequest()
      .then((request) => {
        if (!cancelled) setDeletionRequest(request);
      })
      .catch(() => {
        /* no request, or not signed in to the live API */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRequestDeletion = async () => {
    if (!pithrosUser?.email) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const reauth = await reauthenticate(deletePassword);
      if (!reauth.success) {
        setDeleteError(reauth.error || 'Re-authentication failed.');
        return;
      }
      const request = await privacyApi.requestDeletion({
        confirmEmail: pithrosUser.email,
        reason: deleteReason || undefined,
      });
      setDeletionRequest(request);
      setDeleteConfirmOpen(false);
      setDeletePassword('');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'The request could not be submitted.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleCancelDeletion = async () => {
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const request = await privacyApi.cancelDeletion();
      setDeletionRequest(request);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'The request could not be cancelled.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleDisposition = async (memorialId: string) => {
    if (!deletionRequest) return;
    const choice = dispositions[memorialId] || { disposition: 'orphan', successorEmail: '' };
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const request = await privacyApi.setDisposition(deletionRequest.id, {
        memorialId,
        disposition: choice.disposition,
        successorEmail: choice.successorEmail || undefined,
      });
      setDeletionRequest(request);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'That choice could not be saved.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPassMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setIsChangingPass(true);
    setPassMessage(null);

    const res = await changePassword(newPassword);
    setIsChangingPass(false);

    if (res.success) {
      setPassMessage({ type: 'success', text: 'Your password was updated securely.' });
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPassMessage({ type: 'error', text: res.error || 'Failed to change password.' });
    }
  };

  const handleResendVerify = async () => {
    const res = await resendVerificationEmail();
    if (res.success) {
      setEmailNotice('Verification email sent. Check your inbox.');
    } else {
      setEmailNotice('Unable to send verification email. Try again later.');
    }
  };

  return (
    <div
      className={`min-h-[calc(100vh-80px)] py-8 px-4 sm:px-6 lg:px-8 transition-colors ${
        isDark ? 'bg-[#111820] text-[#F8F5EE]' : 'bg-[#F3EEE4] text-[#20242A]'
      }`}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb / Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-inherit">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif">Account Security</h1>
            <p
              className={`text-xs sm:text-sm mt-1 ${
                isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
              }`}
            >
              Safeguard your authentication credentials, recovery methods, and active sessions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('/account/profile')}
            >
              View Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={LogOut}
              onClick={async () => {
                await signOut();
                onNavigate('/signin');
              }}
            >
              Sign Out
            </Button>
          </div>
        </div>

        {/* 1. Identity & Verification Status */}
        <div
          className={`p-6 rounded-2xl border transition-colors ${
            isDark
              ? 'bg-[#182337] border-[#202C40]'
              : 'bg-[#FCFAF5] border-[#E5DED2]'
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-medium">Email Verification</h2>
              <p
                className={`text-xs ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                Primary email: <span className="font-mono">{currentUser?.email || pithrosUser?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-inherit">
            <div className="flex items-center gap-2 text-xs">
              {isEmailVerified ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  Pending verification
                </span>
              )}
              {emailNotice && <span className="text-stone-400">{emailNotice}</span>}
            </div>

            {!isEmailVerified && (
              <Button variant="outline" size="sm" onClick={handleResendVerify}>
                Resend Verification Email
              </Button>
            )}
          </div>
        </div>

        {/* 2. Phone Authentication / Linked Phone */}
        <div
          className={`p-6 rounded-2xl border transition-colors ${
            isDark
              ? 'bg-[#182337] border-[#202C40]'
              : 'bg-[#FCFAF5] border-[#E5DED2]'
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-medium">Phone Number</h2>
              <p
                className={`text-xs ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                Used for instant SMS verification codes and security alerts.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-inherit">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-sm">
                {currentUser?.phoneNumber || pithrosUser?.phone || 'No phone linked'}
              </span>
              {pithrosUser?.phone_verified && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px]">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified
                </span>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('/auth/phone')}
            >
              {pithrosUser?.phone ? 'Update Phone' : 'Link Phone Number'}
            </Button>
          </div>
        </div>

        {/* 3. Password Management */}
        <div
          className={`p-6 rounded-2xl border transition-colors ${
            isDark
              ? 'bg-[#182337] border-[#202C40]'
              : 'bg-[#FCFAF5] border-[#E5DED2]'
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-medium">Update Password</h2>
              <p
                className={`text-xs ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                Change your password to ensure strong ongoing protection.
              </p>
            </div>
          </div>

          {passMessage && (
            <div
              className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                passMessage.type === 'success'
                  ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  : 'border border-red-500/20 bg-red-500/10 text-red-400'
              }`}
            >
              {passMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span>{passMessage.text}</span>
            </div>
          )}

          <form onSubmit={handlePasswordUpdate} className="space-y-3 pt-2 border-t border-inherit">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  disabled={isChangingPass}
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs transition-colors focus:outline-none ${
                    isDark
                      ? 'border-[#202C40] bg-[#182337] text-[#F8F5EE] focus:border-[#B99452]'
                      : 'border-[#E5DED2] bg-white text-[#20242A] focus:border-[#23324A]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  required
                  disabled={isChangingPass}
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs transition-colors focus:outline-none ${
                    isDark
                      ? 'border-[#202C40] bg-[#182337] text-[#F8F5EE] focus:border-[#B99452]'
                      : 'border-[#E5DED2] bg-white text-[#20242A] focus:border-[#23324A]'
                  }`}
                />
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary" size="sm" disabled={isChangingPass}>
                {isChangingPass ? 'Updating…' : 'Save New Password'}
              </Button>
            </div>
          </form>
        </div>

        {/* 4. Two-Factor Authentication */}
        <div
          className={`p-6 rounded-2xl border transition-colors ${
            isDark
              ? 'bg-[#182337] border-[#202C40]'
              : 'bg-[#FCFAF5] border-[#E5DED2]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-medium">Two-Factor Authentication (2FA)</h2>
                <p
                  className={`text-xs ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                  }`}
                >
                  Require a verification code when signing in from an unrecognized browser.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMfaEnabled(!mfaEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                mfaEnabled ? 'bg-amber-500' : isDark ? 'bg-stone-800' : 'bg-stone-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  mfaEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 5. Active Sessions */}
        <div
          className={`p-6 rounded-2xl border transition-colors ${
            isDark
              ? 'bg-[#182337] border-[#202C40]'
              : 'bg-[#FCFAF5] border-[#E5DED2]'
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-medium">Active Sessions</h2>
              <p
                className={`text-xs ${
                  isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                }`}
              >
                Devices currently authenticated into this stewardship account.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-inherit">
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                isDark
                  ? 'border-[#202C40] bg-[#16120D]'
                  : 'border-[#E5DED2] bg-[#F4ECE1]'
              }`}
            >
              <div className="space-y-0.5">
                <p className="font-medium">Current Web Session (This Browser)</p>
                <p className="opacity-70 text-[11px]">Last active: Just now • Session token verified</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-medium">
                Active
              </span>
            </div>
          </div>
        </div>

        {/* 6. Danger Zone / Delete Account */}
        <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-red-400">Delete Account</h3>
              <p className="text-xs text-stone-400 mt-1">
                Request permanent deletion of your account and personal data. Shared memorials stay
                with their other stewards; a memorial you alone steward needs a disposition first.
              </p>
            </div>
            {!deletionRequest && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-400 border-red-500/30 hover:bg-red-500/10 w-fit"
                icon={Trash2}
                onClick={() => setDeleteConfirmOpen(true)}
              >
                Request Deletion
              </Button>
            )}
          </div>

          {deleteError && (
            <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-xs">
              {deleteError}
            </div>
          )}

          {deletionRequest && (
            <div className="p-4 rounded-xl border border-red-500/30 bg-[#1A0F0F] text-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-red-300 font-medium">
                  Deletion status: {deletionRequest.status.replace(/_/g, ' ')}
                </span>
                {deletionRequest.scheduledFor && (
                  <span className="text-stone-400 font-mono text-[11px]">
                    Scheduled for {new Date(deletionRequest.scheduledFor).toLocaleDateString()}
                  </span>
                )}
              </div>

              {deletionRequest.status === 'BLOCKED_BY_DISPOSITION' && (
                <div className="space-y-3">
                  <p className="text-stone-400">
                    You are the only steward of these memorials. Choose what happens to each before
                    your account can be deleted.
                  </p>
                  {deletionRequest.dispositions.map((disposition) => {
                    const choice = dispositions[disposition.memorialId] || {
                      disposition: 'orphan',
                      successorEmail: '',
                    };
                    return (
                      <div
                        key={disposition.id}
                        className="p-3 rounded-xl border border-[#3A2020] space-y-2"
                      >
                        <div className="text-stone-200 font-medium">{disposition.memorialName}</div>
                        {disposition.status === 'completed' ? (
                          <span className="text-emerald-400 text-[11px]">
                            Recorded: {disposition.disposition}
                          </span>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <select
                                value={choice.disposition}
                                onChange={(e) =>
                                  setDispositions((prev) => ({
                                    ...prev,
                                    [disposition.memorialId]: {
                                      ...choice,
                                      disposition: e.target.value,
                                    },
                                  }))
                                }
                                className="w-full px-3 py-2 rounded-xl border border-[#202C40] bg-[#182337] text-[#F8F5EE] text-xs focus:outline-none"
                              >
                                <option value="transfer">Transfer stewardship</option>
                                <option value="delete">Delete memorial</option>
                                <option value="orphan">Keep in restricted state</option>
                              </select>
                              {choice.disposition === 'transfer' && (
                                <input
                                  type="email"
                                  value={choice.successorEmail}
                                  onChange={(e) =>
                                    setDispositions((prev) => ({
                                      ...prev,
                                      [disposition.memorialId]: {
                                        ...choice,
                                        successorEmail: e.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="Successor's email"
                                  className="w-full px-3 py-2 rounded-xl border border-[#202C40] bg-[#182337] text-[#F8F5EE] text-xs focus:outline-none"
                                />
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={deleteBusy}
                              onClick={() => handleDisposition(disposition.memorialId)}
                            >
                              Save choice
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                disabled={deleteBusy}
                onClick={handleCancelDeletion}
              >
                Cancel deletion request
              </Button>
            </div>
          )}

          {deleteConfirmOpen && !deletionRequest && (
            <div className="p-4 rounded-xl border border-red-500/30 bg-[#1A0F0F] text-xs space-y-3">
              <p className="text-red-300 font-medium">Request account deletion</p>
              <p className="text-stone-400">
                Re-enter your password to confirm. Future recurring billing is cancelled
                immediately; your data is erased only after the grace period, which you can cancel
                any time.
              </p>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Your password"
                className="w-full px-3.5 py-2 rounded-xl border border-[#202C40] bg-[#182337] text-[#F8F5EE] text-xs focus:outline-none"
              />
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Reason (optional)"
                rows={2}
                className="w-full px-3.5 py-2 rounded-xl border border-[#202C40] bg-[#182337] text-[#F8F5EE] text-xs focus:outline-none"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                  disabled={deleteBusy || deletePassword.length === 0}
                  onClick={handleRequestDeletion}
                >
                  {deleteBusy ? 'Submitting…' : 'Submit deletion request'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(false)}>
                  Dismiss
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
