import React, { useState } from 'react';
import { Memorial, FamilyMember, FamilyContributorRole } from '../../types';
import { Button } from '../../components/ui/Button';
import { Users, UserPlus, Mail, Shield, Trash2, CheckCircle2, Check, Minus, Info } from 'lucide-react';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

interface DashboardContributorsViewProps {
  memorial: Memorial;
  onUpdate: () => void;
  onNavigate?: (route: string) => void;
}

export const DashboardContributorsView: React.FC<DashboardContributorsViewProps> = ({
  memorial,
  onUpdate,
  onNavigate,
}) => {
  const { isDark } = useTheme();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const [role, setRole] = useState<FamilyContributorRole>('contributor');
  const [invitedSuccess, setInvitedSuccess] = useState(false);

  const roleLabels: Record<FamilyContributorRole, string> = {
    steward: 'Steward',
    biographer: 'Biographer',
    archivist: 'Photo Archivist',
    contributor: 'Memory Contributor',
    reviewer: 'Guest Reviewer',
    viewer: 'Family Viewer',
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !relationship.trim()) return;

    const newMember: FamilyMember = {
      id: `fm-${Date.now()}`,
      name: name.trim(),
      relationship: relationship.trim(),
      role: role,
      invitedEmail: email.trim() || undefined,
    };

    await api.updateMemorial(memorial.id, {
      family: [...memorial.family, newMember],
    });

    setInvitedSuccess(true);
    setTimeout(() => {
      setInvitedSuccess(false);
      setShowInviteModal(false);
      setName('');
      setEmail('');
      setRelationship('');
      setRole('contributor');
      onUpdate();
    }, 1200);
  };

  const handleRemoveMember = async (id: string) => {
    const updated = memorial.family.filter((f) => f.id !== id);
    await api.updateMemorial(memorial.id, { family: updated });
    onUpdate();
  };

  const handleRoleChange = async (memberId: string, newRole: FamilyContributorRole) => {
    const updated = memorial.family.map((f) =>
      f.id === memberId ? { ...f, role: newRole } : f
    );
    await api.updateMemorial(memorial.id, { family: updated });
    onUpdate();
  };

  // Multi-Contributor Permission Matrix definitions
  const permissionMatrix = [
    { permission: 'View Memorial & Private Archive', steward: true, biographer: true, archivist: true, contributor: true, reviewer: true, viewer: true },
    { permission: 'Edit Biography & Story', steward: true, biographer: true, archivist: false, contributor: false, reviewer: 'Review', viewer: false },
    { permission: 'Manage Timeline & Milestones', steward: true, biographer: true, archivist: false, contributor: 'Add', reviewer: 'Review', viewer: false },
    { permission: 'Upload & Curate Photos / Audio', steward: true, biographer: false, archivist: true, contributor: 'Add', reviewer: 'Review', viewer: false },
    { permission: 'Moderate Condolences & Tributes', steward: true, biographer: false, archivist: false, contributor: true, reviewer: true, viewer: false },
    { permission: 'Publish Changes & Export Book', steward: true, biographer: false, archivist: false, contributor: false, reviewer: false, viewer: false },
    { permission: 'Manage Privacy & Custodians', steward: true, biographer: false, archivist: false, contributor: false, reviewer: false, viewer: false },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${
          isDark ? 'border-[#202C40]' : 'border-[#E5DED2]'
        }`}
      >
        <div>
          <span
            className={`text-[11px] uppercase tracking-widest font-medium ${
              isDark ? 'text-[#B99452]' : 'text-[#23324A]'
            }`}
          >
            Family Governance
          </span>
          <h2
            className={`text-2xl font-serif mt-0.5 ${
              isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
            }`}
          >
            Family Custodians & Contributors
          </h2>
          <p
            className={`text-xs mt-1 ${
              isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
            }`}
          >
            Distribute stewardship and archival responsibilities across trusted family members.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={UserPlus}
          onClick={() => setShowInviteModal(true)}
        >
          Invite Family Member
        </Button>
      </div>

      {/* Contributor Limit Banner */}
      {memorial.family.length >= 1 && (
        <div
          className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
            isDark
              ? 'border-[#B99452]/40 bg-[#16120E] text-[#F8F5EE]'
              : 'border-[#23324A]/30 bg-[#FCFAF5] text-[#20242A]'
          }`}
        >
          <div className="space-y-1">
            <span
              className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
                isDark ? 'text-[#B99452]' : 'text-[#8C5C0F]'
              }`}
            >
              Free Memorial Limit (Owner + 1 Contributor)
            </span>
            <p className="text-xs leading-relaxed max-w-xl">
              Free Memorial includes Owner + 1 Family Contributor. Upgrade to Memorial Care to invite extended relatives, biographers, photo archivists, and guest reviewers (up to 20 collaborators).
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            className="whitespace-nowrap flex-shrink-0"
            onClick={() => {
              if (onNavigate) {
                onNavigate('/checkout?plan=plan_care_annual');
              } else {
                window.location.href = '/checkout?plan=plan_care_annual';
              }
            }}
          >
            Expand Collaboration (₹999/yr)
          </Button>
        </div>
      )}

      {/* Pending Contributions Banner */}
      {memorial.tributes?.filter((t) => !t.isApproved).length > 0 && (
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            isDark
              ? 'bg-[#182337] border-[#B99452]/40 text-[#F8F5EE]'
              : 'bg-[#E5DED2] border-[#B99452]/50 text-[#20242A]'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B99452] animate-pulse flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold">
                {memorial.tributes.filter((t) => !t.isApproved).length}{' '}
                {memorial.tributes.filter((t) => !t.isApproved).length === 1
                  ? 'contribution'
                  : 'contributions'}{' '}
                waiting for review.
              </p>
              <p className={`text-[11px] ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
                Family tributes and stories awaiting custodian approval before publication.
              </p>
            </div>
          </div>
          <a
            href="#/dashboard/tributes"
            className={`text-xs px-3.5 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
              isDark
                ? 'bg-[#B99452] text-[#111820] hover:bg-[#D1B477]'
                : 'bg-[#23324A] text-white hover:bg-[#182337]'
            }`}
          >
            Review Contributions
          </a>
        </div>
      )}

      {/* Active Family Members Table */}
      <div
        className={`rounded-2xl border overflow-hidden transition-colors ${
          isDark
            ? 'border-[#202C40] bg-[#182337]'
            : 'border-[#E5DED2] bg-[#FCFAF5] shadow-xs'
        }`}
      >
        <div
          className={`p-4 border-b text-xs font-semibold grid grid-cols-12 ${
            isDark
              ? 'border-[#202C40] text-[#9EA3AA]'
              : 'border-[#E5DED2] text-[#7D766D] bg-[#F3EEE4]/50'
          }`}
        >
          <div className="col-span-5 sm:col-span-4">MEMBER</div>
          <div className="col-span-3 sm:col-span-3">RELATIONSHIP</div>
          <div className="col-span-4 sm:col-span-3">CONTRIBUTOR ROLE</div>
          <div className="hidden sm:block sm:col-span-2 text-right">ACTIONS</div>
        </div>

        <div
          className={`divide-y ${
            isDark ? 'divide-[#202C40]' : 'divide-[#E5DED2]'
          }`}
        >
          {memorial.family.map((member) => (
            <div
              key={member.id}
              className={`p-4 grid grid-cols-12 items-center text-xs ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              <div className="col-span-5 sm:col-span-4 flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs ${
                    isDark
                      ? 'bg-[#182337] text-[#B99452] border-[#202C40]'
                      : 'bg-[#E5DED2] text-[#23324A] border-[#E5DED2]'
                  }`}
                >
                  {member.name.slice(0, 1)}
                </div>
                <div className="truncate">
                  <span className="font-medium block truncate">{member.name}</span>
                  {member.invitedEmail && (
                    <span
                      className={`text-[10px] block truncate ${
                        isDark ? 'text-[#9EA3AA]' : 'text-[#7D766D]'
                      }`}
                    >
                      {member.invitedEmail}
                    </span>
                  )}
                </div>
              </div>

              <div
                className={`col-span-3 sm:col-span-3 ${
                  isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                }`}
              >
                {member.relationship}
              </div>

              <div className="col-span-4 sm:col-span-3">
                {member.role === 'steward' ? (
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium ${
                      isDark
                        ? 'bg-[#B99452]/15 text-[#B99452] border border-[#B99452]/30'
                        : 'bg-[#E5DED2] text-[#8C5C0F] border border-[#D9941E]/40'
                    }`}
                  >
                    Primary Steward
                  </span>
                ) : (
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value as FamilyContributorRole)}
                    className={`px-2 py-1 rounded-lg border text-[11px] focus:outline-none cursor-pointer ${
                      isDark
                        ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE]'
                        : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A]'
                    }`}
                  >
                    <option value="biographer">Biographer</option>
                    <option value="archivist">Photo Archivist</option>
                    <option value="contributor">Memory Contributor</option>
                    <option value="reviewer">Guest Reviewer</option>
                    <option value="viewer">Family Viewer</option>
                  </select>
                )}
              </div>

              <div className="hidden sm:block sm:col-span-2 text-right">
                {member.role !== 'steward' && (
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="p-1 rounded text-[#9EA3AA] hover:text-red-500 cursor-pointer"
                    title="Remove member"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Multi-Contributor Permission Matrix Section */}
      <div
        className={`rounded-2xl border p-6 space-y-4 transition-colors ${
          isDark ? 'border-[#202C40] bg-[#182337]' : 'border-[#E5DED2] bg-[#FCFAF5]'
        }`}
      >
        <div className="flex items-center gap-2">
          <Shield className={`w-4 h-4 ${isDark ? 'text-[#B99452]' : 'text-[#23324A]'}`} />
          <h3 className="text-base font-serif font-medium">Multi-Contributor Permission Matrix</h3>
        </div>
        <p className={`text-xs ${isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'}`}>
          Each invited family member receives specific archival permissions to protect the integrity of the memorial.
        </p>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr
                className={`border-b text-[11px] uppercase tracking-wider ${
                  isDark ? 'border-[#202C40] text-[#9EA3AA]' : 'border-[#E5DED2] text-[#7D766D]'
                }`}
              >
                <th className="pb-3 font-semibold">Permission</th>
                <th className="pb-3 text-center">Steward</th>
                <th className="pb-3 text-center">Biographer</th>
                <th className="pb-3 text-center">Archivist</th>
                <th className="pb-3 text-center">Contributor</th>
                <th className="pb-3 text-center">Reviewer</th>
                <th className="pb-3 text-center">Viewer</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y ${
                isDark ? 'divide-[#182337]' : 'divide-[#E5DED2]'
              }`}
            >
              {permissionMatrix.map((row, idx) => (
                <tr key={idx} className="py-2.5">
                  <td className="py-3 pr-4 font-medium">{row.permission}</td>
                  {(['steward', 'biographer', 'archivist', 'contributor', 'reviewer', 'viewer'] as const).map(
                    (col) => {
                      const val = row[col];
                      return (
                        <td key={col} className="py-3 text-center">
                          {val === true ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#2D7A5F]/20 text-[#6EE7B7]">
                              <Check className="w-3 h-3 text-[#2D7A5F]" />
                            </span>
                          ) : typeof val === 'string' ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#E5DED2] font-medium opacity-85">
                              {val}
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center opacity-30">
                              <Minus className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </td>
                      );
                    }
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${
            isDark ? 'bg-[#111820]/85' : 'bg-[#182337]/50'
          }`}
        >
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4 ${
              isDark
                ? 'border-[#202C40] bg-[#182337]'
                : 'border-[#E5DED2] bg-[#FCFAF5]'
            }`}
          >
            <h3
              className={`text-lg font-serif ${
                isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
              }`}
            >
              Invite a Family Contributor
            </h3>

            {invitedSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2
                  className={`w-8 h-8 mx-auto ${
                    isDark ? 'text-[#6EE7B7]' : 'text-[#2D7A5F]'
                  }`}
                />
                <p
                  className={`text-sm font-serif ${
                    isDark ? 'text-[#F8F5EE]' : 'text-[#20242A]'
                  }`}
                >
                  Invitation Dispatched
                </p>
                <p
                  className={`text-xs ${
                    isDark ? 'text-[#9EA3AA]' : 'text-[#554F48]'
                  }`}
                >
                  They will receive a secure token to join with {roleLabels[role]} permissions.
                </p>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-3.5">
                <div>
                  <label
                    className={`block text-xs font-medium mb-1 ${
                      isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                    }`}
                  >
                    Relative’s Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Vikram Krishnan"
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                      isDark
                        ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                        : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                    }`}
                  />
                </div>

                <div>
                  <label
                    className={`block text-xs font-medium mb-1 ${
                      isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                    }`}
                  >
                    Relationship *
                  </label>
                  <input
                    type="text"
                    required
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    placeholder="e.g. Son, Sister, Grandchild, Niece"
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                      isDark
                        ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                        : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                    }`}
                  />
                </div>

                <div>
                  <label
                    className={`block text-xs font-medium mb-1 ${
                      isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                    }`}
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="relative@example.com"
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                      isDark
                        ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE] focus:border-[#B99452]'
                        : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A] focus:border-[#23324A]'
                    }`}
                  />
                </div>

                <div>
                  <label
                    className={`block text-xs font-medium mb-1 ${
                      isDark ? 'text-[#D9D2C6]' : 'text-[#554F48]'
                    }`}
                  >
                    Contributor Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as FamilyContributorRole)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                      isDark
                        ? 'bg-[#182337] border-[#202C40] text-[#F8F5EE]'
                        : 'bg-[#FCFAF5] border-[#E5DED2] text-[#20242A]'
                    }`}
                  >
                    <option value="biographer">Biographer (Can edit story & timeline milestones)</option>
                    <option value="archivist">Photo Archivist (Can manage photographs & audio)</option>
                    <option value="contributor">Memory Contributor (Can add stories & milestones with review)</option>
                    <option value="reviewer">Guest Reviewer (Can review public condolences)</option>
                    <option value="viewer">Family Viewer (Private viewing access only)</option>
                    <option value="steward">Co-Steward (Full administrative custody)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowInviteModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm">
                    Send Invitation
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
